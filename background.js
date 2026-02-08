const activeRequests = new WeakMap();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "ai-stream") return;

  activeRequests.set(port, { controller: null });

  port.onDisconnect.addListener(() => {
    cancelActiveRequest(port);
  });

  port.onMessage.addListener(async (msg) => {
    if (!msg || !msg.action) return;
    if (msg.action === 'cancel') {
      cancelActiveRequest(port);
      return;
    }
    await processAIRequest(msg, port);
  });
});

function cancelActiveRequest(port) {
  const state = activeRequests.get(port);
  if (!state || !state.controller) return;
  try { state.controller.abort(); } catch (e) {}
  state.controller = null;
}

function tryPostMessage(port, payload) {
  try {
    port.postMessage(payload);
    return true;
  } catch (e) {
    return false;
  }
}

async function processAIRequest(msg, port) {
  let controller = null;
  try {
    const settings = await chrome.storage.sync.get({
      providers: [],
      activeProviderId: '',
      transTemperature: 0.3,
      chatTemperature: 0.7,
      maxTokens: 8192,
      translatePrompt: '',
      chatPrompt: ''
    });

    const activeProvider = settings.providers.find(p => p.id === settings.activeProviderId);
    if (!activeProvider || !activeProvider.key) throw new Error("未选择模型或缺少 API Key。");

    let messages = [];
    let activeTemperature = settings.transTemperature;

    if (msg.action === 'translate') {
      const systemContent = settings.translatePrompt.replace('{text}', msg.text);
      messages = [{ role: 'user', content: systemContent }];
      activeTemperature = settings.transTemperature;
    } else if (msg.action === 'chat') {
      if (settings.chatPrompt) messages.push({ role: 'system', content: settings.chatPrompt });
      if (msg.history && Array.isArray(msg.history)) {
        messages = messages.concat(msg.history.slice(-10)); // 限制上下文长度
      }
      activeTemperature = settings.chatTemperature;
    }

    cancelActiveRequest(port);
    const state = activeRequests.get(port);
    if (!state) return;
    controller = new AbortController();
    state.controller = controller;

    const requestConfig = {
      ...settings,
      temperature: activeTemperature,
      signal: controller.signal
    };

    if (activeProvider.type === 'google') {
      await handleGoogleGenAI(activeProvider, messages, requestConfig, port);
    } else if (activeProvider.type === 'openai') {
      await handleOpenAICompatible(activeProvider, messages, requestConfig, port);
    } else {
      throw new Error(`未知模型类型: ${activeProvider.type}`);
    }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      const state = activeRequests.get(port);
      if (state && state.controller === controller) {
        tryPostMessage(port, { type: 'done' });
      }
      return;
    }
    tryPostMessage(port, { type: 'error', content: error.message });
  } finally {
    const state = activeRequests.get(port);
    if (state && state.controller === controller) state.controller = null;
  }
}

function buildGoogleGenAIUrl(config) {
  const raw = (config.url || '').trim();
  const model = (config.model || '').trim();
  if (!raw) return '';
  if (raw.includes('/models/') && raw.includes(':')) return raw;
  if (!model) return raw;
  let base = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  if (base.endsWith('/models')) base = base.slice(0, -('/models'.length));
  return `${base}/models/${model}:streamGenerateContent`;
}

async function handleGoogleGenAI(config, messages, settings, port) {
  const apiUrl = buildGoogleGenAIUrl(config);
  if (!apiUrl) throw new Error("Google API 地址未配置。");
  if (!config.key) throw new Error("Google API Key 未配置。");
  const urlWithKey = `${apiUrl}?key=${config.key}`;
  const geminiContents = messages.map(m => ({
    role: (m.role === 'assistant' ? 'model' : 'user'),
    parts: [{ text: m.content }]
  }));

  const payload = {
    contents: geminiContents,
    generationConfig: {
      temperature: settings.temperature,
      maxOutputTokens: settings.maxTokens
    }
  };

  const response = await fetch(urlWithKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: settings.signal,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google API Error ${response.status}: ${errText}`);
  }

  await readStreamWithBracketCounting(response, port, (json) => {
    return json.candidates?.[0]?.content?.parts?.[0]?.text;
  });
}

async function handleOpenAICompatible(config, messages, settings, port) {
  const payload = {
    model: config.model,
    messages: messages,
    stream: true,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens
  };

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.key}`
    },
    signal: settings.signal,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error ${response.status}: ${errText}`);
  }

  await readStreamSSE(response, port);
}

async function readStreamWithBracketCounting(response, port, extractor) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let braceCount = 0, jsonStartIndex = -1, inString = false, escape = false;
      for (let i = 0; i < buffer.length; i++) {
        const char = buffer[i];
        if (char === '"' && !escape) inString = !inString;
        if (char === '\\' && !escape) escape = true; else escape = false;
        if (!inString) {
          if (char === '{') {
            if (braceCount === 0) jsonStartIndex = i;
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && jsonStartIndex !== -1) {
              const jsonStr = buffer.substring(jsonStartIndex, i + 1);
              try {
                const json = JSON.parse(jsonStr);
                const chunk = extractor(json);
                if (chunk) tryPostMessage(port, { type: 'chunk', content: chunk });
              } catch (e) {}
              buffer = buffer.substring(i + 1); i = -1; jsonStartIndex = -1;
            }
          }
        }
      }
    }
  } catch (error) {
    if (error && error.name === 'AbortError') throw error;
    throw error;
  }
  tryPostMessage(port, { type: 'done' });
}

async function readStreamSSE(response, port) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const json = JSON.parse(dataStr);
            const chunk = json.choices?.[0]?.delta?.content;
            if (chunk) tryPostMessage(port, { type: 'chunk', content: chunk });
          } catch (e) {}
        }
      }
    }
  } catch (error) {
    if (error && error.name === 'AbortError') throw error;
    throw error;
  }
  tryPostMessage(port, { type: 'done' });
}
