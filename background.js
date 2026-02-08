const activeRequests = new WeakMap();
const PROVIDER_TEST_TIMEOUT_MS = 15000;
const DEFAULT_TRANSLATE_PROMPT = '你是一位精通多国语言的资深翻译专家、语言学家和跨文化交流顾问。你不仅擅长将文本从源语言精准翻译成中文，也擅长将中文表达的文本精准地道地翻译成英文，还能敏锐地识别文本类型（单词、句子、段落或长文），并根据不同类型提供深度解析。';
const DEFAULT_CHAT_PROMPT = '你是一位博古通今、风趣幽默的“老教授”，同时也是用户多年的“老朋友”。你拥有海量的知识储备（涵盖科技、人文、历史、语言学等），但你从不掉书袋。你的特长是用最通俗易懂、深入浅出的语言，把复杂的事情讲清楚。你就像在咖啡馆里和老友聊天一样，语气亲切、平和，偶尔带点智慧的幽默。';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== 'test-provider-connectivity') return;
  (async () => {
    try {
      await testProviderConnectivity(msg.provider);
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error?.message || '连通性测试失败。' });
    }
  })();
  return true;
});

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

function composePromptWithSelectedText(prompt, selectedText, fallbackPrompt = '') {
  const rawPrompt = typeof prompt === 'string' ? prompt.trim() : '';
  const defaultPrompt = typeof fallbackPrompt === 'string' ? fallbackPrompt.trim() : '';
  const basePrompt = rawPrompt || defaultPrompt;
  const text = typeof selectedText === 'string' ? selectedText.trim() : '';
  if (!text) return basePrompt;
  if (!basePrompt) return text;
  if (basePrompt.includes('{text}')) {
    return basePrompt.split('{text}').join(text);
  }
  return `${basePrompt}\n\n${text}`;
}

function buildTranslateMessages(prompt, selectedText, fallbackPrompt = '') {
  const rawPrompt = typeof prompt === 'string' ? prompt.trim() : '';
  const defaultPrompt = typeof fallbackPrompt === 'string' ? fallbackPrompt.trim() : '';
  const basePrompt = rawPrompt || defaultPrompt;
  const text = typeof selectedText === 'string' ? selectedText.trim() : '';

  // Keep backward compatibility: if template uses {text}, preserve in-place interpolation.
  if (basePrompt && basePrompt.includes('{text}')) {
    return [{ role: 'user', content: basePrompt.split('{text}').join(text) }];
  }

  const messages = [];
  if (basePrompt) messages.push({ role: 'system', content: basePrompt });
  if (text) messages.push({ role: 'user', content: text });
  if (messages.length === 0) messages.push({ role: 'user', content: '' });
  return messages;
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
      messages = buildTranslateMessages(settings.translatePrompt, msg.text, DEFAULT_TRANSLATE_PROMPT);
      activeTemperature = settings.transTemperature;
    } else if (msg.action === 'chat') {
      const chatSystemContent = composePromptWithSelectedText(settings.chatPrompt, msg.text, DEFAULT_CHAT_PROMPT);
      if (chatSystemContent) messages.push({ role: 'system', content: chatSystemContent });
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

function buildGoogleGenAITestUrl(config) {
  const streamUrl = buildGoogleGenAIUrl(config);
  if (!streamUrl) return '';
  if (streamUrl.includes(':streamGenerateContent')) {
    return streamUrl.replace(':streamGenerateContent', ':generateContent');
  }
  return streamUrl;
}

function normalizeProviderInput(provider) {
  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
    throw new Error('模型配置格式错误。');
  }
  const type = String(provider.type || '').trim();
  const url = String(provider.url || '').trim();
  const model = String(provider.model || '').trim();
  const key = String(provider.key || '').trim();
  if (!type || !url || !key) {
    throw new Error('请填写模型类型、API 地址和 Key。');
  }
  return { type, url, model, key };
}

function parseOpenAITextContent(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => (item && typeof item.text === 'string' ? item.text : ''))
      .join('')
      .trim();
  }
  return '';
}

function extractOpenAIResponseText(json) {
  const choice = json?.choices?.[0];
  if (!choice) return '';
  if (choice.message?.content !== undefined) {
    return parseOpenAITextContent(choice.message.content);
  }
  if (choice.delta?.content !== undefined) {
    return parseOpenAITextContent(choice.delta.content);
  }
  return '';
}

function extractGeminiResponseText(json) {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
    .join('');
}

async function fetchJsonWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('接口返回了非 JSON 响应。');
    }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('连通性测试超时，请检查网络或接口地址。');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function testOpenAIProvider(provider) {
  const payload = {
    model: provider.model,
    messages: [{ role: 'user', content: 'Reply with "ok" only.' }],
    stream: false,
    temperature: 0,
    max_tokens: 16
  };

  const json = await fetchJsonWithTimeout(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.key}`
    },
    body: JSON.stringify(payload)
  });

  const text = extractOpenAIResponseText(json);
  if (!text) throw new Error('模型接口可达，但未返回可用文本。');
}

async function testGoogleProvider(provider) {
  const apiUrl = buildGoogleGenAITestUrl(provider);
  if (!apiUrl) throw new Error('Google API 地址未配置。');
  const urlWithKey = `${apiUrl}?key=${provider.key}`;
  const payload = {
    contents: [{
      role: 'user',
      parts: [{ text: 'Reply with "ok" only.' }]
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 16
    }
  };

  const json = await fetchJsonWithTimeout(urlWithKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = extractGeminiResponseText(json);
  if (!text.trim()) throw new Error('Gemini 接口可达，但未返回可用文本。');
}

async function testProviderConnectivity(providerInput) {
  const provider = normalizeProviderInput(providerInput);
  if (provider.type === 'openai') {
    await testOpenAIProvider(provider);
    return;
  }
  if (provider.type === 'google') {
    await testGoogleProvider(provider);
    return;
  }
  throw new Error(`未知模型类型: ${provider.type}`);
}

async function handleGoogleGenAI(config, messages, settings, port) {
  const apiUrl = buildGoogleGenAIUrl(config);
  if (!apiUrl) throw new Error("Google API 地址未配置。");
  if (!config.key) throw new Error("Google API Key 未配置。");
  const urlWithKey = `${apiUrl}?key=${config.key}`;
  const systemParts = [];
  const geminiContents = [];
  for (const message of messages) {
    const content = typeof message.content === 'string' ? message.content : '';
    if (!content) continue;
    if (message.role === 'system') {
      systemParts.push({ text: content });
      continue;
    }
    geminiContents.push({
      role: (message.role === 'assistant' ? 'model' : 'user'),
      parts: [{ text: content }]
    });
  }
  if (geminiContents.length === 0) {
    geminiContents.push({ role: 'user', parts: [{ text: '' }] });
  }

  const payload = {
    contents: geminiContents,
    generationConfig: {
      temperature: settings.temperature,
      maxOutputTokens: settings.maxTokens
    }
  };
  if (systemParts.length > 0) {
    payload.systemInstruction = { parts: systemParts };
  }

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

  await readStreamWithBracketCounting(response, port, extractGeminiResponseText);
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
