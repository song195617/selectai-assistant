// --- Constants & Globals ---
const KATEX_CSS_PATH = "lib/katex.min.css";
const CRITICAL_BTN_CSS = `
  #ai-btn-container { display: flex; gap: 8px; position: absolute; z-index: 1000; font-family: sans-serif; pointer-events: auto; }
  .ai-float-btn { width: 32px; height: 32px; background: white; border: 1px solid #ccc; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; display: flex; align-items: center; justify-content: center; color: #4285F4; transition: transform 0.1s; }
  .ai-float-btn:hover { transform: scale(1.1); background: #f0f0f0; }
  #ai-popup-stop { display: none; align-items: center; justify-content: center; color: #d32f2f; cursor: pointer; width: 28px; height: 28px; border-radius: 4px; background-color: #ffebee; transition: background 0.2s; }
  #ai-popup-stop:hover { background-color: #ffcdd2; }
`;
const ICON_LOADING = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>`;
const ICON_DONE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`;
const ICON_ERROR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
const ICON_STOP = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>`;
const PORT_DISCONNECT_DELAY_MS = 50;
const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const LANGUAGE_MODE_STORAGE_KEY = 'languageMode';
const CONTENT_I18N = {
  zh: {
    btn_translate: '翻译/解释',
    btn_chat: 'AI 对话',
    title_translate: 'AI 翻译',
    title_chat: 'AI 对话',
    chat_input_placeholder: '输入问题...',
    tooltip_stop: '停止生成',
    tooltip_pin: '固定/跟随',
    tooltip_close: '关闭',
    thinking_loading: '思考中...',
    model_no_content: '模型未返回内容。',
    error_prefix: '错误:',
    context_invalidated: '扩展上下文已失效（通常是扩展重载导致），请刷新当前页面后重试。',
    request_failed: '请求失败。',
    retry: '重试',
    open_settings: '打开设置'
  },
  en: {
    btn_translate: 'Translate/Explain',
    btn_chat: 'AI Chat',
    title_translate: 'AI Translate',
    title_chat: 'AI Chat',
    chat_input_placeholder: 'Ask a question...',
    tooltip_stop: 'Stop',
    tooltip_pin: 'Pin/Follow',
    tooltip_close: 'Close',
    thinking_loading: 'Thinking...',
    model_no_content: 'Model returned no content.',
    error_prefix: 'Error:',
    context_invalidated: 'Extension context was invalidated (usually after reloading the extension). Refresh this page and try again.',
    request_failed: 'Request failed.',
    retry: 'Retry',
    open_settings: 'Open Settings'
  }
};

let shadowHost = null, shadowRoot = null, iconContainer = null, popup = null, resizeObserver = null;
let currentSelection = '', port = null, lastMouseX = 0, lastMouseY = 0;
let isDragging = false, dragOffsetX = 0, dragOffsetY = 0, isFixed = true;
let isChatMode = false, chatHistory = [], currentStreamingMessage = '';
let currentStreamingRawMessage = '', currentThinkingMessage = '';
let currentLocale = resolveContentLocale('auto');

// --- Initialization ---

async function getShadowRoot() {
  if (shadowRoot) { updateHostSize(); return shadowRoot; }
  shadowHost = document.createElement('div');
  shadowHost.id = 'ai-assistant-host';
  shadowHost.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; z-index: 2147483647; pointer-events: none;`;
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  injectStyle(CRITICAL_BTN_CSS);

  // Attach first, then load stylesheets to avoid waiting on detached link elements.
  document.documentElement.appendChild(shadowHost);
  updateHostSize();

  const katexCssUrl = safeRuntimeGetURL(KATEX_CSS_PATH);
  if (katexCssUrl) await injectStylesheetLink(katexCssUrl);
  const localCssUrl = safeRuntimeGetURL('content.css');
  if (localCssUrl) await injectStylesheetLink(localCssUrl);
  return shadowRoot;
}

function safeRuntimeGetURL(path) {
  try {
    return chrome.runtime.getURL(path);
  } catch (error) {
    console.warn('Extension context invalidated while resolving URL:', path);
    return '';
  }
}

function resolveContentLocale(languageMode) {
  const mode = typeof languageMode === 'string' ? languageMode.trim().toLowerCase() : 'auto';
  if (mode === 'zh' || mode === 'en') return mode;
  const browserLang = String(navigator.language || '').toLowerCase();
  return browserLang.startsWith('zh') ? 'zh' : 'en';
}

function t(key) {
  const langPack = CONTENT_I18N[currentLocale] || CONTENT_I18N.zh;
  return langPack[key] || CONTENT_I18N.zh[key] || key;
}

function refreshLocalizedTexts() {
  if (iconContainer) {
    const buttons = iconContainer.querySelectorAll('.ai-float-btn');
    if (buttons[0]) buttons[0].title = t('btn_translate');
    if (buttons[1]) buttons[1].title = t('btn_chat');
  }

  if (!popup) return;
  const isCurrentChatMode = Boolean(popup.querySelector('#ai-chat-input'));
  const headerText = popup.querySelector('#ai-header-text');
  if (headerText) {
    headerText.textContent = isCurrentChatMode ? t('title_chat') : t('title_translate');
  }
  const stopBtn = popup.querySelector('#ai-popup-stop');
  if (stopBtn) stopBtn.title = t('tooltip_stop');
  const pinBtn = popup.querySelector('#ai-popup-pin');
  if (pinBtn) pinBtn.title = t('tooltip_pin');
  const closeBtn = popup.querySelector('#ai-popup-close');
  if (closeBtn) closeBtn.title = t('tooltip_close');
  const chatInput = popup.querySelector('#ai-chat-input');
  if (chatInput) chatInput.placeholder = t('chat_input_placeholder');
  const translateLoader = popup.querySelector('.ai-loading');
  if (translateLoader) translateLoader.textContent = t('thinking_loading');
}

function loadLocaleFromStorage(onDone) {
  const done = typeof onDone === 'function' ? onDone : () => {};
  try {
    chrome.storage.sync.get({ [LANGUAGE_MODE_STORAGE_KEY]: 'auto' }, (items) => {
      const runtimeErr = chrome.runtime && chrome.runtime.lastError;
      if (runtimeErr) {
        currentLocale = resolveContentLocale('auto');
      } else {
        currentLocale = resolveContentLocale(items[LANGUAGE_MODE_STORAGE_KEY]);
      }
      refreshLocalizedTexts();
      done();
    });
  } catch (error) {
    currentLocale = resolveContentLocale('auto');
    refreshLocalizedTexts();
    done();
  }
}

function initializeLocaleSync() {
  loadLocaleFromStorage();
  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes[LANGUAGE_MODE_STORAGE_KEY]) return;
      currentLocale = resolveContentLocale(changes[LANGUAGE_MODE_STORAGE_KEY].newValue);
      refreshLocalizedTexts();
    });
  } catch (error) {}
}

function getEffectiveThemeMode(themeMode) {
  if (themeMode === 'dark') return 'dark';
  if (themeMode === 'light') return 'light';
  if (!window.matchMedia) return 'light';
  return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
}

function applyPopupTheme(targetPopup) {
  if (!targetPopup) return;
  const applyThemeClass = (themeMode) => {
    if (!targetPopup || targetPopup !== popup) return;
    const effectiveTheme = getEffectiveThemeMode(themeMode);
    targetPopup.classList.toggle('theme-dark', effectiveTheme === 'dark');
  };
  try {
    chrome.storage.sync.get({ themeMode: 'system' }, (items) => {
      const runtimeErr = chrome.runtime && chrome.runtime.lastError;
      if (runtimeErr) {
        applyThemeClass('system');
        return;
      }
      applyThemeClass(items.themeMode);
    });
  } catch (error) {
    applyThemeClass('system');
  }
}

function injectStyle(cssContent) {
  const style = document.createElement('style');
  style.textContent = cssContent;
  shadowRoot.appendChild(style);
}

function injectStylesheetLink(url) {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => {
      console.warn(`Failed to load stylesheet link: ${url}`);
      resolve();
    };
    shadowRoot.appendChild(link);
  });
}

function updateHostSize() {
  if (!shadowHost) return;
  const docHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight
  );
  shadowHost.style.height = `${docHeight}px`;
}

initializeLocaleSync();

// --- Event Listeners ---

document.addEventListener('mouseup', (e) => {
  const target = e.target;
  if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
  if (e.composedPath().some(el => el === shadowHost)) return;
  if (isDragging) { isDragging = false; return; }

  lastMouseX = e.pageX; lastMouseY = e.pageY;
  setTimeout(() => {
    const text = window.getSelection().toString().trim();
    if (text.length > 0) { currentSelection = text; showButtons(lastMouseX, lastMouseY); }
    else hideButtons();
  }, 10);
});

document.addEventListener('mousedown', (e) => {
  if (!e.composedPath().some(el => el === shadowHost)) hideButtons();
});

// --- UI Components ---

async function showButtons(x, y) {
  const root = await getShadowRoot();
  if (!iconContainer) {
    iconContainer = document.createElement('div');
    iconContainer.id = 'ai-btn-container';
    const iconTranslate = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a14 14 0 0 1 0 18"></path><path d="M12 3a14 14 0 0 0 0 18"></path></svg>`;
    const iconChat = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
    iconContainer.appendChild(createFloatBtn(t('btn_translate'), iconTranslate, () => initPopup('translate')));
    iconContainer.appendChild(createFloatBtn(t('btn_chat'), iconChat, () => initPopup('chat')));
    root.appendChild(iconContainer);
  }
  iconContainer.style.display = 'flex';
  iconContainer.style.left = `${x + 10}px`;
  iconContainer.style.top = `${y + 10}px`;
}

function createFloatBtn(title, svg, onClick) {
  const btn = document.createElement('div');
  btn.className = 'ai-float-btn';
  btn.title = title;
  btn.innerHTML = svg;
  btn.onmousedown = (e) => e.stopPropagation();
  btn.onclick = (e) => { e.stopPropagation(); onClick(); };
  return btn;
}

function hideButtons() { if (iconContainer) iconContainer.style.display = 'none'; }

async function initPopup(mode) {
  const rect = iconContainer.getBoundingClientRect();
  hideButtons();
  await getShadowRoot();
  loadLocaleFromStorage();
  createPopupFrame(rect, mode);

  if (mode === 'translate') { isChatMode = false; startTranslation(); }
  else { isChatMode = true; chatHistory = []; addChatMessage('user', currentSelection); sendChatRequest(); }
}

function createPopupFrame(targetRect, mode) {
  if (popup) { handleStop(); if (resizeObserver) resizeObserver.disconnect(); popup.remove(); }

  isFixed = true;
  currentStreamingMessage = '';
  currentStreamingRawMessage = '';
  currentThinkingMessage = '';

  popup = document.createElement('div');
  popup.id = 'ai-assist-popup';
  popup.style.pointerEvents = 'auto';

  // --- Positioning & Sizing Logic ---
  const popupWidth = 525;
  const { innerHeight: windowH, innerWidth: windowW } = window;
  const safeMarginTop = windowH * 0.1;
  const safeMarginBottom = windowH * 0.9;
  const maxTotalHeight = safeMarginBottom - safeMarginTop;

  let left = targetRect.left;
  if (left + popupWidth > windowW) left = windowW - popupWidth - 20;

  let top = targetRect.bottom + 10;
  let transform = 'translateY(0)';

  // Flip if not enough space below
  if (top + 200 > safeMarginBottom) { top = targetRect.top - 10; transform = 'translateY(-100%)'; }
  // Clamp to safe area
  if (transform === 'translateY(0)' && top > safeMarginBottom) top = safeMarginBottom - 200;
  if (transform === 'translateY(-100%)' && top < safeMarginTop) top = safeMarginTop + 200;

  popup.style.position = 'fixed';
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.transform = transform;

  const title = mode === 'translate' ? t('title_translate') : t('title_chat');
  const footerHtml = mode === 'chat' ? `
    <div id="ai-popup-footer">
      <input type="text" id="ai-chat-input" placeholder="${t('chat_input_placeholder')}" />
      <button id="ai-chat-send">➤</button>
    </div>` : '';

  popup.innerHTML = `
    <div id="ai-popup-header">
      <div id="ai-header-title-wrapper">
        <span id="ai-title-icon" class="ai-status-icon"></span>
        <span id="ai-header-text">${title}</span>
      </div>
    <div id="ai-header-actions">
        <span id="ai-popup-stop" title="${t('tooltip_stop')}">${ICON_STOP}</span>
        <span id="ai-popup-pin" title="${t('tooltip_pin')}" style="font-weight:bold;">📌</span>
        <span id="ai-popup-close" title="${t('tooltip_close')}">✕</span>
      </div>
    </div>
    <div id="ai-popup-content" class="${mode === 'chat' ? 'chat-mode' : ''}"></div>
    ${footerHtml}
  `;

  // Apply Max Height constraint
  const headerHeight = 50, footerHeight = mode === 'chat' ? 50 : 0;
  const contentMaxHeight = maxTotalHeight - headerHeight - footerHeight;
  popup.querySelector('#ai-popup-content').style.maxHeight = `${Math.min(500, contentMaxHeight)}px`;

  shadowRoot.appendChild(popup);
  applyPopupTheme(popup);
  refreshLocalizedTexts();

  // ResizeObserver for reverse growth
  if (transform === 'translateY(0)') {
    resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (!popup) return;
        const rect = popup.getBoundingClientRect();
        if (rect.bottom > safeMarginBottom) {
          const overflow = rect.bottom - safeMarginBottom;
          let newTop = parseFloat(popup.style.top) - overflow;
          if (newTop < safeMarginTop) newTop = safeMarginTop;
          popup.style.top = `${newTop}px`;
        }
      }
    });
    resizeObserver.observe(popup);
  }

  // Bind UI Events
  popup.querySelector('#ai-popup-close').onclick = () => { handleStop(); if(resizeObserver) resizeObserver.disconnect(); popup.remove(); };
  popup.querySelector('#ai-popup-stop').onclick = (e) => { e.stopPropagation(); handleStop(); };
  popup.querySelector('#ai-popup-pin').onclick = togglePositionMode;
  popup.querySelector('#ai-popup-header').onmousedown = initDrag;

  if (mode === 'chat') {
    const btnSend = popup.querySelector('#ai-chat-send');
    const inputMsg = popup.querySelector('#ai-chat-input');
    btnSend.onclick = handleUserSubmit;
    inputMsg.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') handleUserSubmit(); };
    setTimeout(() => inputMsg.focus(), 100);
  }
}

// --- Logic: Markdown & KaTeX ---

function renderText(text) {
  if (!text) return '';

  const displayMathEnvs = new Set([
    'equation', 'equation*',
    'align', 'align*', 'aligned',
    'alignedat', 'alignedat*',
    'gather', 'gather*', 'gathered',
    'multline', 'multline*',
    'flalign', 'flalign*',
    'alignat', 'alignat*',
    'split', 'cases', 'cases*', 'array', 'subarray',
    'matrix', 'matrix*',
    'pmatrix', 'pmatrix*',
    'bmatrix', 'bmatrix*',
    'vmatrix', 'vmatrix*',
    'smallmatrix'
  ]);
  const latexMathKeywordPattern = /\\(?:frac|dfrac|tfrac|sum|int|iint|iiint|prod|lim|sqrt|sin|cos|tan|cot|sec|csc|log|ln|exp|theta|alpha|beta|gamma|delta|epsilon|lambda|mu|pi|sigma|omega|cdot|times|leq|geq|neq|infty|partial|nabla|left|right|operatorname|mathrm|mathbf|mathbb)\b/i;
  const hasMathDelimiters = (value) => /\$\$[\s\S]*\$\$|\$[^\$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\\begin\{[A-Za-z*@]+\}[\s\S]*?\\end\{[A-Za-z*@]+\}/.test(value);
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isEscaped = (source, index) => {
    let slashCount = 0;
    let cursor = index - 1;
    while (cursor >= 0 && source[cursor] === '\\') {
      slashCount += 1;
      cursor -= 1;
    }
    return slashCount % 2 === 1;
  };
  const looksLikeBareLatexMath = (value) => {
    const source = String(value || '').trim();
    if (!source || source.length < 2 || source.length > 800) return false;
    if (source.includes('`') || /^#{1,6}\s/.test(source) || /^[-*+]\s/.test(source) || /^\d+\.\s/.test(source) || /^>/.test(source)) return false;
    if (hasMathDelimiters(source) || /https?:\/\//i.test(source)) return false;
    const hasLatexCommand = /\\[A-Za-z]+/.test(source);
    const hasSupOrSub = /(?:\^\{[^{}]+\}|\^[A-Za-z0-9]|\_\{[^{}]+\}|_[A-Za-z0-9])/.test(source);
    const hasMathOps = /[=+\-*/<>]/.test(source);
    const hasBraces = /[{}]/.test(source);
    const hasMathKeyword = latexMathKeywordPattern.test(source);
    const tokenCount = (source.match(/[A-Za-z0-9\\{}^_]+/g) || []).length;
    if (tokenCount < 1) return false;
    if (!(hasLatexCommand || hasSupOrSub || hasBraces)) return false;
    if (!(hasMathOps || hasMathKeyword || hasLatexCommand)) return false;
    return true;
  };
  const hasLikelyMathContent = (value) => {
    const source = String(value || '').trim();
    if (!source || source.length > 2000) return false;
    if (/^\d+(?:[.,]\d+)?$/.test(source) || /^[A-Za-z]+$/.test(source)) return false;
    if (/[\\{}^_&]/.test(source)) return true;
    if (latexMathKeywordPattern.test(source)) return true;
    if (/[=+\-*/<>]/.test(source) && /[A-Za-z0-9]/.test(source)) return true;
    return false;
  };
  const normalizeMathTexForKatex = (source, isDisplay) => {
    let output = String(source || '').replace(/\r/g, '');
    let previous = '';
    while (output !== previous) {
      previous = output;
      output = output.replace(/\\\\(?=[A-Za-z])/g, '\\');
    }
    output = output.trim();
    if (!output) return output;

    // Some model outputs wrap math repeatedly (e.g. "\(...\)" inside $$...$$).
    // KaTeX renderToString expects raw TeX without delimiters, so unwrap outer pairs.
    let unwrapPrev = '';
    while (output !== unwrapPrev) {
      unwrapPrev = output;
      if (/^\\\([\s\S]*\\\)$/.test(output)) {
        output = output.slice(2, -2).trim();
        continue;
      }
      if (/^\\\[[\s\S]*\\\]$/.test(output)) {
        output = output.slice(2, -2).trim();
        continue;
      }
      if (/^\$\$[\s\S]*\$\$$/.test(output)) {
        output = output.slice(2, -2).trim();
        continue;
      }
      if (/^\$[\s\S]*\$$/.test(output)) {
        output = output.slice(1, -1).trim();
      }
    }
    if (!output) return output;

    if (isDisplay) {
      output = output
        .split('\n')
        .map((line) => line.replace(/[ \t]+$/g, ''))
        .join('\n')
        .replace(/\\\\[ \t]+\n/g, '\\\\\n');
      const hasEnvironment = /\\begin\{[A-Za-z*@]+\}/.test(output);
      const hasAlignMarkers = /&/.test(output) || /\\\\/.test(output);
      const hasLineBreak = output.includes('\n');
      if (!hasEnvironment && hasAlignMarkers && (hasLineBreak || /\\\\/.test(output))) {
        output = `\\begin{aligned}\n${output}\n\\end{aligned}`;
      }
    }
    return output;
  };
  const normalizeEscapedMathDelimiters = (source) => {
    let output = String(source || '');
    let previous = '';
    while (output !== previous) {
      previous = output;
      output = output
        .replace(/\\\\\(/g, '\\(')
        .replace(/\\\\\)/g, '\\)')
        .replace(/\\\\\[/g, '\\[')
        .replace(/\\\\\]/g, '\\]')
        .replace(/\\\\begin\{/g, '\\begin{')
        .replace(/\\\\end\{/g, '\\end{');
    }
    return output;
  };
  const autoWrapBareLatexMath = (rawText) => {
    if (!rawText || !/[\\^_]/.test(rawText)) return rawText;
    const lines = String(rawText).split('\n');
    let inFence = false;
    const inlineFormulaPattern = /([A-Za-z0-9()[\]{}\\^_.,]+(?:\s*[=+\-*/<>]\s*[A-Za-z0-9()[\]{}\\^_.,]+)+)/g;
    return lines.map((line) => {
      const trimmedLine = line.trim();
      if (/^```/.test(trimmedLine) || /^~~~/.test(trimmedLine)) {
        inFence = !inFence;
        return line;
      }
      if (inFence || !trimmedLine || hasMathDelimiters(line)) return line;

      const prefixedFormulaMatch = line.match(/^(\s*(?:[-*+]|\d+\.|>)\s+)(.+)$/);
      if (prefixedFormulaMatch) {
        const prefix = prefixedFormulaMatch[1];
        const candidate = prefixedFormulaMatch[2].trim();
        if (looksLikeBareLatexMath(candidate)) return `${prefix}\\(${candidate}\\)`;
      }

      if (looksLikeBareLatexMath(trimmedLine)) {
        const leading = line.match(/^\s*/)?.[0] || '';
        return `${leading}\\(${trimmedLine}\\)`;
      }

      const colonMatch = line.match(/^(\s*[^：:]{0,80}[：:]\s*)(.+)$/);
      if (colonMatch) {
        const prefix = colonMatch[1];
        const candidate = colonMatch[2].trim();
        if (looksLikeBareLatexMath(candidate)) return `${prefix}\\(${candidate}\\)`;
      }

      return line.replace(inlineFormulaPattern, (segment) => {
        const candidate = segment.trim();
        if (!looksLikeBareLatexMath(candidate)) return segment;
        return `\\(${candidate}\\)`;
      });
    }).join('\n');
  };
  const shouldTreatEnvironmentAsMath = (envName, rawBlock) => {
    const normalized = String(envName || '').toLowerCase();
    if (displayMathEnvs.has(normalized)) return true;
    if (/^(?:itemize|enumerate|description|center|flushleft|flushright|quote|quotation|verbatim|lstlisting|tabular|table|figure|thebibliography|document)$/.test(normalized)) return false;
    const body = String(rawBlock || '')
      .replace(new RegExp(`^\\\\begin\\{${escapeRegExp(envName)}\\}`), '')
      .replace(new RegExp(`\\\\end\\{${escapeRegExp(envName)}\\}$`), '')
      .trim();
    if (/\\item\b/.test(body)) return false;
    return hasLikelyMathContent(body);
  };
  const findMarkerEnd = (source, marker, startIndex, stopAtLineBreak) => {
    let cursor = startIndex;
    while (cursor <= source.length - marker.length) {
      if (stopAtLineBreak && (source[cursor] === '\n' || source[cursor] === '\r')) return -1;
      if (source.startsWith(marker, cursor) && !isEscaped(source, cursor)) return cursor;
      cursor += 1;
    }
    return -1;
  };
  const findInlineDollarEnd = (source, startIndex) => {
    let cursor = startIndex;
    while (cursor < source.length) {
      const ch = source[cursor];
      if (ch === '\n' || ch === '\r') return -1;
      if (ch === '$' && !isEscaped(source, cursor) && !source.startsWith('$$', cursor)) {
        const before = source[cursor - 1] || '';
        const after = source[cursor + 1] || '';
        if (!/\s/.test(before) && !(/\d/.test(before) && /\d/.test(after))) return cursor;
      }
      cursor += 1;
    }
    return -1;
  };
  const findEnvironmentEnd = (source, startIndex, envName) => {
    const beginTag = `\\begin{${envName}}`;
    const endTag = `\\end{${envName}}`;
    let depth = 0;
    let cursor = startIndex;
    while (cursor < source.length) {
      if (source.startsWith(beginTag, cursor) && !isEscaped(source, cursor)) {
        depth += 1;
        cursor += beginTag.length;
        continue;
      }
      if (source.startsWith(endTag, cursor) && !isEscaped(source, cursor)) {
        depth -= 1;
        cursor += endTag.length;
        if (depth === 0) return cursor;
        continue;
      }
      cursor += 1;
    }
    return -1;
  };

  const mathBlocks = [];
  const codeBlocks = [];
  const mathTokenPrefix = `AIMATHTOKEN${Date.now().toString(36)}${Math.random().toString(36).slice(2)}X`;
  const mathTokenSuffix = 'XAIMATHEND';
  const codeTokenPrefix = `AICODETOKEN${Date.now().toString(36)}${Math.random().toString(36).slice(2)}X`;
  const codeTokenSuffix = 'XAICODEEND';
  const addMathPlaceholder = (tex, isDisplay) => {
    mathBlocks.push({ tex, display: isDisplay });
    return `${mathTokenPrefix}${mathBlocks.length - 1}${mathTokenSuffix}`;
  };
  const stashCodeBlock = (value) => {
    codeBlocks.push(value);
    return `${codeTokenPrefix}${codeBlocks.length - 1}${codeTokenSuffix}`;
  };
  const stashMarkdownCodeSegments = (source) => {
    let output = source;
    output = output.replace(/```[\s\S]*?```/g, stashCodeBlock);
    output = output.replace(/~~~[\s\S]*?~~~/g, stashCodeBlock);
    output = output.replace(/`[^`\n]*`/g, stashCodeBlock);
    return output;
  };
  const restoreMarkdownCodeSegments = (source) => {
    if (!codeBlocks.length) return source;
    const codePattern = new RegExp(`${escapeRegExp(codeTokenPrefix)}(\\d+)${escapeRegExp(codeTokenSuffix)}`, 'g');
    return source.replace(codePattern, (_, index) => {
      const block = codeBlocks[Number(index)];
      return typeof block === 'string' ? block : '';
    });
  };
  const extractMathBlocks = (source) => {
    let cursor = 0;
    let output = '';
    while (cursor < source.length) {
      if (!isEscaped(source, cursor) && source.startsWith('\\begin{', cursor)) {
        const beginMatch = source.slice(cursor).match(/^\\begin\{([A-Za-z*@]+)\}/);
        if (beginMatch) {
          const envName = beginMatch[1];
          const envEnd = findEnvironmentEnd(source, cursor, envName);
          if (envEnd !== -1) {
            const block = source.slice(cursor, envEnd);
            if (shouldTreatEnvironmentAsMath(envName, block)) {
              output += addMathPlaceholder(block, true);
              cursor = envEnd;
              continue;
            }
          }
        }
      }

      if (!isEscaped(source, cursor) && source.startsWith('$$', cursor)) {
        const displayEnd = findMarkerEnd(source, '$$', cursor + 2, false);
        if (displayEnd !== -1) {
          const inner = source.slice(cursor + 2, displayEnd).trim();
          if (inner) {
            output += addMathPlaceholder(inner, true);
            cursor = displayEnd + 2;
            continue;
          }
        }
      }

      if (!isEscaped(source, cursor) && source.startsWith('\\[', cursor)) {
        const displayEnd = findMarkerEnd(source, '\\]', cursor + 2, false);
        if (displayEnd !== -1) {
          const inner = source.slice(cursor + 2, displayEnd).trim();
          if (inner) {
            output += addMathPlaceholder(inner, true);
            cursor = displayEnd + 2;
            continue;
          }
        }
      }

      if (!isEscaped(source, cursor) && source.startsWith('\\(', cursor)) {
        const inlineEnd = findMarkerEnd(source, '\\)', cursor + 2, false);
        if (inlineEnd !== -1) {
          const inner = source.slice(cursor + 2, inlineEnd).trim();
          if (inner) {
            output += addMathPlaceholder(inner, false);
            cursor = inlineEnd + 2;
            continue;
          }
        }
      }

      if (source[cursor] === '$' && !isEscaped(source, cursor) && !source.startsWith('$$', cursor)) {
        const prev = source[cursor - 1] || '';
        const next = source[cursor + 1] || '';
        const likelyCurrency = /\d/.test(prev) && /\d/.test(next);
        if (!likelyCurrency && next && !/\s/.test(next)) {
          const inlineEnd = findInlineDollarEnd(source, cursor + 1);
          if (inlineEnd !== -1) {
            const inner = source.slice(cursor + 1, inlineEnd).trim();
            if (inner && hasLikelyMathContent(inner)) {
              output += addMathPlaceholder(inner, false);
              cursor = inlineEnd + 1;
              continue;
            }
          }
        }
      }

      output += source[cursor];
      cursor += 1;
    }
    return output;
  };

  let processedText = stashMarkdownCodeSegments(String(text));
  processedText = normalizeEscapedMathDelimiters(processedText);
  processedText = autoWrapBareLatexMath(processedText);
  processedText = extractMathBlocks(processedText);
  processedText = restoreMarkdownCodeSegments(processedText);

  let html = marked.parse(processedText);
  if (typeof DOMPurify !== 'undefined') {
    html = DOMPurify.sanitize(html);
  }
  const placeholderPattern = new RegExp(`${escapeRegExp(mathTokenPrefix)}(\\d+)${escapeRegExp(mathTokenSuffix)}`, 'g');
  html = html.replace(placeholderPattern, (_, index) => {
    const item = mathBlocks[Number(index)];
    if (!item) return '';
    try {
      const normalizedTex = normalizeMathTexForKatex(item.tex, item.display);
      return katex.renderToString(normalizedTex, {
        displayMode: item.display,
        throwOnError: false,
        fleqn: false,
        strict: 'ignore'
      });
    }
    catch (e) {
      return escapeHtml(item.tex);
    }
  });

  return html;
}

function splitThinkingAndAnswer(rawText) {
  const source = typeof rawText === 'string' ? rawText : '';
  const lowerSource = source.toLowerCase();
  const tags = [
    { open: '<think>', close: '</think>' },
    { open: '<thinking>', close: '</thinking>' }
  ];
  let cursor = 0;
  let thinking = '';
  let answer = '';

  while (cursor < source.length) {
    let hitTag = null;
    let openIndex = -1;
    for (const tag of tags) {
      const idx = lowerSource.indexOf(tag.open, cursor);
      if (idx === -1) continue;
      if (openIndex === -1 || idx < openIndex) {
        openIndex = idx;
        hitTag = tag;
      }
    }

    if (!hitTag || openIndex === -1) {
      answer += source.slice(cursor);
      break;
    }
    answer += source.slice(cursor, openIndex);
    const thinkingStart = openIndex + hitTag.open.length;
    const closeIndex = lowerSource.indexOf(hitTag.close, thinkingStart);
    if (closeIndex === -1) {
      thinking += source.slice(thinkingStart);
      break;
    }
    thinking += source.slice(thinkingStart, closeIndex);
    cursor = closeIndex + hitTag.close.length;
  }

  return { thinking, answer };
}

function getThinkingPreview(text) {
  const source = String(text || '').replace(/\r/g, '');
  if (!source.trim()) return t('thinking_loading');

  const lines = source.split('\n');
  const currentLine = lines[lines.length - 1] || '';
  const normalizedCurrentLine = currentLine.replace(/\t/g, '    ');
  if (normalizedCurrentLine.trim()) return normalizedCurrentLine;

  for (let i = lines.length - 2; i >= 0; i--) {
    const candidate = (lines[i] || '').replace(/\t/g, '    ');
    if (candidate.trim()) return candidate;
  }
  return t('thinking_loading');
}

function ensureTranslateRenderNodes(container) {
  if (!container) return { thinkingEl: null, answerEl: null };
  let answerEl = container.querySelector('.ai-translate-answer');
  if (!answerEl) {
    answerEl = document.createElement('div');
    answerEl.className = 'ai-translate-answer';
    container.appendChild(answerEl);
  }
  let thinkingEl = container.querySelector('.ai-thinking');
  return { thinkingEl, answerEl };
}

function renderTranslateOutput(container) {
  if (!container) return;
  const parsed = splitThinkingAndAnswer(currentStreamingRawMessage);
  currentThinkingMessage = parsed.thinking;
  currentStreamingMessage = parsed.answer;

  const nodes = ensureTranslateRenderNodes(container);
  let thinkingEl = nodes.thinkingEl;
  const answerEl = nodes.answerEl;
  const shouldShowThinking = Boolean(parsed.thinking && parsed.thinking.trim());

  if (shouldShowThinking) {
    const wasOpen = Boolean(thinkingEl && thinkingEl.open);
    if (!thinkingEl) {
      thinkingEl = document.createElement('details');
      thinkingEl.className = 'ai-thinking';
      thinkingEl.innerHTML = `
        <summary><span class="ai-thinking-summary-text"></span></summary>
        <div class="ai-thinking-body"></div>
      `;
      container.insertBefore(thinkingEl, answerEl);
    }
    thinkingEl.open = wasOpen;
    const summaryEl = thinkingEl.querySelector('.ai-thinking-summary-text');
    const bodyEl = thinkingEl.querySelector('.ai-thinking-body');
    if (summaryEl) summaryEl.textContent = getThinkingPreview(parsed.thinking);
    if (bodyEl) bodyEl.textContent = parsed.thinking;
  } else if (thinkingEl) {
    thinkingEl.remove();
  }

  answerEl.innerHTML = parsed.answer ? renderText(parsed.answer) : '';
}

function ensureChatRenderNodes(container) {
  if (!container) return { thinkingEl: null, answerEl: null };
  let answerEl = container.querySelector('.ai-chat-answer');
  if (!answerEl) {
    answerEl = document.createElement('div');
    answerEl.className = 'ai-chat-answer';
    container.appendChild(answerEl);
  }
  const thinkingEl = container.querySelector('.ai-thinking');
  return { thinkingEl, answerEl };
}

function renderChatAssistantOutput(container) {
  if (!container) return;
  const parsed = splitThinkingAndAnswer(currentStreamingRawMessage);
  currentThinkingMessage = parsed.thinking;
  currentStreamingMessage = parsed.answer;

  const nodes = ensureChatRenderNodes(container);
  let thinkingEl = nodes.thinkingEl;
  const answerEl = nodes.answerEl;
  const shouldShowThinking = Boolean(parsed.thinking && parsed.thinking.trim());

  if (shouldShowThinking) {
    const wasOpen = Boolean(thinkingEl && thinkingEl.open);
    if (!thinkingEl) {
      thinkingEl = document.createElement('details');
      thinkingEl.className = 'ai-thinking';
      thinkingEl.innerHTML = `
        <summary><span class="ai-thinking-summary-text"></span></summary>
        <div class="ai-thinking-body"></div>
      `;
      container.insertBefore(thinkingEl, answerEl);
    }
    thinkingEl.open = wasOpen;
    const summaryEl = thinkingEl.querySelector('.ai-thinking-summary-text');
    const bodyEl = thinkingEl.querySelector('.ai-thinking-body');
    if (summaryEl) summaryEl.textContent = getThinkingPreview(parsed.thinking);
    if (bodyEl) bodyEl.textContent = parsed.thinking;
  } else if (thinkingEl) {
    thinkingEl.remove();
  }

  answerEl.innerHTML = parsed.answer ? renderText(parsed.answer) : '';
}

// --- Logic: Status & Networking ---

function updateTitleStatus(state) {
  if (!popup) return;
  const iconEl = popup.querySelector('#ai-title-icon');
  const stopBtn = popup.querySelector('#ai-popup-stop');
  if (!iconEl || !stopBtn) return;

  iconEl.className = 'ai-status-icon'; iconEl.innerHTML = '';
  if (state === 'loading') {
    iconEl.innerHTML = ICON_LOADING; iconEl.classList.add('ai-status-loading');
    stopBtn.style.display = 'flex';
  } else {
    if (state === 'done') { iconEl.innerHTML = ICON_DONE; iconEl.classList.add('ai-status-done'); }
    else if (state === 'error') { iconEl.innerHTML = ICON_ERROR; iconEl.classList.add('ai-status-error'); }
    stopBtn.style.display = 'none';
  }
}

function handleStop() {
  disconnectCurrentPort(true);
  updateTitleStatus('done');
  const el = popup ? popup.querySelector('#ai-popup-content') : null;
  if (el) {
    const loader = el.querySelector('.ai-loading-dots') || el.querySelector('.ai-loading');
    if (loader) loader.remove();
  }
}

function normalizeRuntimeErrorMessage(error) {
  const raw = error && error.message ? error.message : String(error || '');
  if (raw.includes('Extension context invalidated')) {
    return t('context_invalidated');
  }
  return raw || t('request_failed');
}

function formatErrorMessage(message) {
  return `${t('error_prefix')} ${message}`;
}

function showPopupError(message, payload) {
  updateTitleStatus('error');
  if (!popup) return;
  const contentEl = popup.querySelector('#ai-popup-content');
  if (!contentEl) return;

  const isConfigError = typeof message === 'string' && message.startsWith('__CONFIG_ERROR__:');
  const displayMsg = isConfigError ? message.slice('__CONFIG_ERROR__:'.length) : message;

  contentEl.innerHTML = '';

  const err = document.createElement('div');
  err.className = 'ai-error';
  err.textContent = formatErrorMessage(displayMsg);
  contentEl.appendChild(err);

  const actions = document.createElement('div');
  actions.className = 'ai-error-actions';

  if (payload) {
    const retryBtn = document.createElement('button');
    retryBtn.className = 'ai-error-btn';
    retryBtn.textContent = t('retry');
    retryBtn.onclick = () => {
      contentEl.innerHTML = `<div class="ai-loading">${t('thinking_loading')}</div>`;
      currentStreamingRawMessage = '';
      currentStreamingMessage = '';
      currentThinkingMessage = '';
      updateTitleStatus('loading');
      connectAndSend(payload,
        null, null,
        (err2) => showPopupError(err2, payload)
      );
    };
    actions.appendChild(retryBtn);
  }

  if (isConfigError) {
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'ai-error-btn ai-error-btn-secondary';
    settingsBtn.textContent = t('open_settings');
    settingsBtn.onclick = () => { try { chrome.runtime.openOptionsPage(); } catch (e) {} };
    actions.appendChild(settingsBtn);
  }

  if (actions.children.length > 0) contentEl.appendChild(actions);
}

function disconnectPort(targetPort, sendCancel) {
  if (!targetPort) return;
  if (sendCancel) {
    try { targetPort.postMessage({ action: 'cancel' }); } catch (e) {}
    setTimeout(() => {
      try { targetPort.disconnect(); } catch (e) {}
    }, PORT_DISCONNECT_DELAY_MS);
    return;
  }
  try { targetPort.disconnect(); } catch (e) {}
}

function disconnectCurrentPort(sendCancel) {
  const targetPort = port;
  port = null;
  disconnectPort(targetPort, sendCancel);
}

function connectAndSend(payload, onChunk, onDone, onError, onThinking) {
  disconnectCurrentPort(false);
  let currentPort = null;
  try {
    currentPort = chrome.runtime.connect({ name: 'ai-stream' });
  } catch (error) {
    const message = normalizeRuntimeErrorMessage(error);
    if (onError) onError(message);
    else showPopupError(message, payload);
    return;
  }

  port = currentPort;
  let isFinished = false;
  try {
    currentPort.postMessage(payload);
  } catch (error) {
    const message = normalizeRuntimeErrorMessage(error);
    if (onError) onError(message);
    else showPopupError(message, payload);
    disconnectCurrentPort(false);
    return;
  }

  currentPort.onDisconnect.addListener(() => {
    if (port !== currentPort) return;
    if (isFinished) return;
    const runtimeErr = chrome.runtime && chrome.runtime.lastError
      ? chrome.runtime.lastError.message
      : '';
    if (runtimeErr) {
      const message = normalizeRuntimeErrorMessage(new Error(runtimeErr));
      if (onError) onError(message);
      else showPopupError(message, payload);
    } else if (!isChatMode) {
      updateTitleStatus('done');
      finalizeTranslateLoadingState();
    }
    disconnectCurrentPort(false);
  });

  currentPort.onMessage.addListener((msg) => {
    if (!popup || port !== currentPort) return;
    if (msg.type === 'thinking') {
      if (isChatMode) {
        if (onThinking) onThinking(msg.content);
      } else {
        const el = popup.querySelector('#ai-popup-content');
        const shouldScroll = isNearBottom(el);
        if (el.querySelector('.ai-loading')) el.innerHTML = '';
        currentThinkingMessage += (typeof msg.content === 'string' ? msg.content : '');
        const answerText = currentStreamingMessage || '';
        currentStreamingRawMessage = currentThinkingMessage
          ? `<think>${currentThinkingMessage}</think>${answerText}`
          : answerText;
        renderTranslateOutput(el);
        if (shouldScroll) scrollToBottom(el);
      }
    } else if (msg.type === 'chunk') {
      if (isChatMode && onChunk) onChunk(msg.content);
      else if (!isChatMode) {
        const el = popup.querySelector('#ai-popup-content');
        const shouldScroll = isNearBottom(el);
        if (el.querySelector('.ai-loading')) el.innerHTML = '';
        currentStreamingRawMessage += msg.content;
        renderTranslateOutput(el);
        if (shouldScroll) scrollToBottom(el);
      }
    } else if (msg.type === 'error') {
      isFinished = true;
      if (onError) { updateTitleStatus('error'); onError(msg.content); }
      else showPopupError(msg.content, payload);
      disconnectCurrentPort(false);
    } else if (msg.type === 'done') {
      isFinished = true;
      if (!isChatMode) {
        updateTitleStatus('done');
        finalizeTranslateLoadingState();
      }
      if (onDone) onDone();
      disconnectCurrentPort(false);
    }
  });
}

function startTranslation() {
  currentStreamingMessage = '';
  currentStreamingRawMessage = '';
  currentThinkingMessage = '';
  popup.querySelector('#ai-popup-content').innerHTML = `<div class="ai-loading">${t('thinking_loading')}</div>`;
  updateTitleStatus('loading');
  connectAndSend({ action: 'translate', text: currentSelection });
}

function finalizeTranslateLoadingState() {
  if (!popup) return;
  const contentEl = popup.querySelector('#ai-popup-content');
  if (!contentEl) return;
  const loader = contentEl.querySelector('.ai-loading');
  if (!loader) return;
  loader.remove();
  if (!String(currentStreamingMessage || '').trim()) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'ai-error';
    emptyMsg.textContent = t('model_no_content');
    contentEl.appendChild(emptyMsg);
  }
}

function sendChatRequest() {
  const container = popup.querySelector('#ai-popup-content');
  const responseDiv = addChatMessage('assistant', '');
  const loadingSpan = document.createElement('span');
  loadingSpan.className = 'ai-loading-dots'; loadingSpan.textContent = '...';
  responseDiv.appendChild(loadingSpan);

  currentStreamingMessage = '';
  currentStreamingRawMessage = '';
  currentThinkingMessage = '';
  updateTitleStatus('loading');

  connectAndSend({ action: 'chat', text: currentSelection, history: chatHistory.slice(0, -1) },
    (chunk) => {
      const shouldScroll = isNearBottom(container);
      loadingSpan.remove();
      currentStreamingRawMessage += chunk;
      renderChatAssistantOutput(responseDiv);
      if (shouldScroll) scrollToBottom(container);
    },
    () => {
      updateTitleStatus('done');
      loadingSpan.remove();
      if (!currentStreamingMessage) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'ai-error';
        emptyMsg.textContent = t('model_no_content');
        responseDiv.appendChild(emptyMsg);
      }
      if (chatHistory.length > 0) chatHistory[chatHistory.length-1].content = currentStreamingMessage;
    },
    (errMsg) => {
      updateTitleStatus('error');
      chatHistory.pop(); loadingSpan.remove();
      const isConfigErr = typeof errMsg === 'string' && errMsg.startsWith('__CONFIG_ERROR__:');
      const displayErrMsg = isConfigErr ? errMsg.slice('__CONFIG_ERROR__:'.length) : errMsg;
      const errDiv = document.createElement('div');
      errDiv.className = 'ai-error'; errDiv.textContent = formatErrorMessage(displayErrMsg);
      responseDiv.appendChild(errDiv);
      if (isConfigErr) {
        const actions = document.createElement('div');
        actions.className = 'ai-error-actions';
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'ai-error-btn ai-error-btn-secondary';
        settingsBtn.textContent = t('open_settings');
        settingsBtn.onclick = () => { try { chrome.runtime.openOptionsPage(); } catch (e) {} };
        actions.appendChild(settingsBtn);
        responseDiv.appendChild(actions);
      }
      scrollToBottom(container);
    },
    (thinkingChunk) => {
      const shouldScroll = isNearBottom(container);
      loadingSpan.remove();
      currentThinkingMessage += (typeof thinkingChunk === 'string' ? thinkingChunk : '');
      const answerText = currentStreamingMessage || '';
      currentStreamingRawMessage = currentThinkingMessage
        ? `<think>${currentThinkingMessage}</think>${answerText}`
        : answerText;
      renderChatAssistantOutput(responseDiv);
      if (shouldScroll) scrollToBottom(container);
    }
  );
}

function handleUserSubmit() {
  const inputEl = popup.querySelector('#ai-chat-input');
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';
  addChatMessage('user', text);
  sendChatRequest();
}

function addChatMessage(role, text) {
  const container = popup.querySelector('#ai-popup-content');
  const msgDiv = document.createElement('div');
  msgDiv.className = `ai-msg ai-msg-${role}`;
  if (text) msgDiv.innerHTML = role === 'user' ? escapeHtml(text) : renderText(text);
  chatHistory.push({ role, content: text });
  container.appendChild(msgDiv);
  scrollToBottom(container);
  return msgDiv;
}

// --- Utils ---

function isNearBottom(el) { return el.scrollHeight <= el.clientHeight || (el.scrollTop + el.clientHeight) >= (el.scrollHeight - 50); }
function scrollToBottom(el) { if(el) el.scrollTop = el.scrollHeight; }
function escapeHtml(text) { return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#039;'}[m])); }

function togglePositionMode() {
  if (!popup) return;
  const rect = popup.getBoundingClientRect();
  isFixed = !isFixed;
  popup.style.transform = 'none';
  popup.querySelector('#ai-popup-pin').style.opacity = isFixed ? '1' : '0.5';

  if (isFixed) { popup.style.position = 'fixed'; popup.style.left = `${rect.left}px`; popup.style.top = `${rect.top}px`; }
  else { popup.style.position = 'absolute'; popup.style.left = `${rect.left + window.scrollX}px`; popup.style.top = `${rect.top + window.scrollY}px`; }
}

function initDrag(e) {
  isDragging = true;
  const rect = popup.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left; dragOffsetY = e.clientY - rect.top;
  popup.style.transform = 'none';

  const setPos = (x, y) => {
    popup.style.left = `${x}px`; popup.style.top = `${y}px`;
  };

  if (isFixed) setPos(rect.left, rect.top);
  else setPos(rect.left + window.scrollX, rect.top + window.scrollY);

  const doDrag = (ev) => {
    ev.preventDefault();
    if (isFixed) setPos(ev.clientX - dragOffsetX, ev.clientY - dragOffsetY);
    else setPos(ev.clientX - dragOffsetX + window.scrollX, ev.clientY - dragOffsetY + window.scrollY);
  };
  const stopDrag = () => {
    isDragging = false;
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
  };
  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDrag);
}
