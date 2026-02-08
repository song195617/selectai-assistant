// --- Constants & Globals ---
const KATEX_CSS_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
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

let shadowHost = null, shadowRoot = null, iconContainer = null, popup = null, resizeObserver = null;
let currentSelection = '', port = null, lastMouseX = 0, lastMouseY = 0;
let isDragging = false, dragOffsetX = 0, dragOffsetY = 0, isFixed = true;
let isChatMode = false, chatHistory = [], currentStreamingMessage = '';

// --- Initialization ---

async function getShadowRoot() {
  if (shadowRoot) { updateHostSize(); return shadowRoot; }
  shadowHost = document.createElement('div');
  shadowHost.id = 'ai-assistant-host';
  shadowHost.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; z-index: 2147483647; pointer-events: none;`;
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  injectStyle(CRITICAL_BTN_CSS);
  await injectExternalStyle(KATEX_CSS_URL);
  const localCssUrl = safeRuntimeGetURL('content.css');
  if (localCssUrl) await injectExternalStyle(localCssUrl);

  document.documentElement.appendChild(shadowHost);
  updateHostSize();
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

async function injectExternalStyle(url) {
  try {
    const res = await fetch(url);
    const css = await res.text();
    injectStyle(css);
  } catch(e) { console.warn(`Failed to load CSS: ${url}`); }
}

function updateHostSize() {
  if (!shadowHost) return;
  const docHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight
  );
  shadowHost.style.height = `${docHeight}px`;
}

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
    iconContainer.appendChild(createFloatBtn("翻译/解释", iconTranslate, () => initPopup('translate')));
    iconContainer.appendChild(createFloatBtn("AI 对话", iconChat, () => initPopup('chat')));
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
  createPopupFrame(rect, mode);

  if (mode === 'translate') { isChatMode = false; startTranslation(); }
  else { isChatMode = true; chatHistory = []; addChatMessage('user', currentSelection); sendChatRequest(); }
}

function createPopupFrame(targetRect, mode) {
  if (popup) { handleStop(); if (resizeObserver) resizeObserver.disconnect(); popup.remove(); }

  isFixed = true;
  currentStreamingMessage = '';

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

  const title = mode === 'translate' ? 'AI 翻译' : 'AI 对话';
  const footerHtml = mode === 'chat' ? `
    <div id="ai-popup-footer">
      <input type="text" id="ai-chat-input" placeholder="输入问题..." />
      <button id="ai-chat-send">➤</button>
    </div>` : '';

  popup.innerHTML = `
    <div id="ai-popup-header">
      <div id="ai-header-title-wrapper">
        <span id="ai-title-icon" class="ai-status-icon"></span>
        <span id="ai-header-text">${title}</span>
      </div>
    <div id="ai-header-actions">
        <span id="ai-popup-stop" title="停止生成">${ICON_STOP}</span>
        <span id="ai-popup-pin" title="固定/跟随" style="font-weight:bold;">📌</span>
        <span id="ai-popup-close" title="关闭">✕</span>
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
  const mathBlocks = [];
  const protectMath = (regex, isDisplay) => {
    text = text.replace(regex, (_, tex) => {
      mathBlocks.push({ tex, display: isDisplay });
      return `MathPlaceholder${mathBlocks.length - 1}End`;
    });
  };

  protectMath(/\$\$([\s\S]+?)\$\$/g, true);
  protectMath(/\\\[([\s\S]+?)\\\]/g, true);
  protectMath(/\\\(([\s\S]+?)\\\)/g, false);
  protectMath(/\$([^\$\s](?:[^$]*[^\s])?)\$/g, false);

  let html = marked.parse(text);

  html = html.replace(/MathPlaceholder(\d+)End/g, (_, index) => {
    const item = mathBlocks[index];
    try { return katex.renderToString(item.tex, { displayMode: item.display, throwOnError: false, fleqn: false }); }
    catch(e) { return item.tex; }
  });

  return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html, {
    ADD_TAGS: ['math', 'annotation', 'semantics', 'mtext', 'mn', 'mo', 'mi', 'jsp', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    ADD_ATTR: ['class', 'style', 'aria-hidden', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width']
  }) : html;
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
    return '扩展上下文已失效（通常是扩展重载导致），请刷新当前页面后重试。';
  }
  return raw || '请求失败。';
}

function showPopupError(message) {
  updateTitleStatus('error');
  if (!popup) return;
  const contentEl = popup.querySelector('#ai-popup-content');
  if (!contentEl) return;
  const err = document.createElement('div');
  err.className = 'ai-error';
  err.textContent = `Error: ${message}`;
  contentEl.textContent = '';
  contentEl.appendChild(err);
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

function connectAndSend(payload, onChunk, onDone, onError) {
  disconnectCurrentPort(false);
  let currentPort = null;
  try {
    currentPort = chrome.runtime.connect({ name: 'ai-stream' });
  } catch (error) {
    const message = normalizeRuntimeErrorMessage(error);
    if (onError) onError(message);
    else showPopupError(message);
    return;
  }

  port = currentPort;
  let isFinished = false;
  try {
    currentPort.postMessage(payload);
  } catch (error) {
    const message = normalizeRuntimeErrorMessage(error);
    if (onError) onError(message);
    else showPopupError(message);
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
      else showPopupError(message);
    } else if (!isChatMode) {
      updateTitleStatus('done');
      finalizeTranslateLoadingState();
    }
    disconnectCurrentPort(false);
  });

  currentPort.onMessage.addListener((msg) => {
    if (!popup || port !== currentPort) return;
    if (msg.type === 'chunk') {
      if (isChatMode && onChunk) onChunk(msg.content);
      else if (!isChatMode) {
        const el = popup.querySelector('#ai-popup-content');
        const shouldScroll = isNearBottom(el);
        if (el.querySelector('.ai-loading')) el.innerHTML = '';
        currentStreamingMessage += msg.content;
        el.innerHTML = renderText(currentStreamingMessage);
        if (shouldScroll) scrollToBottom(el);
      }
    } else if (msg.type === 'error') {
      isFinished = true;
      updateTitleStatus('error');
      if (onError) onError(msg.content);
      else {
        const contentEl = popup.querySelector('#ai-popup-content');
        const err = document.createElement('div');
        err.className = 'ai-error';
        err.textContent = `Error: ${msg.content}`;
        contentEl.textContent = '';
        contentEl.appendChild(err);
      }
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
  popup.querySelector('#ai-popup-content').innerHTML = '<div class="ai-loading">思考中...</div>';
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
  if (!contentEl.textContent.trim()) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'ai-error';
    emptyMsg.textContent = '模型未返回内容。';
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
  updateTitleStatus('loading');

  connectAndSend({ action: 'chat', text: currentSelection, history: chatHistory.slice(0, -1) },
    (chunk) => {
      const shouldScroll = isNearBottom(container);
      loadingSpan.remove();
      currentStreamingMessage += chunk;
      responseDiv.innerHTML = renderText(currentStreamingMessage);
      if (shouldScroll) scrollToBottom(container);
    },
    () => {
      updateTitleStatus('done');
      loadingSpan.remove();
      if (!currentStreamingMessage) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'ai-error';
        emptyMsg.textContent = '模型未返回内容。';
        responseDiv.appendChild(emptyMsg);
      }
      if (chatHistory.length > 0) chatHistory[chatHistory.length-1].content = currentStreamingMessage;
    },
    (errMsg) => {
      updateTitleStatus('error');
      chatHistory.pop(); loadingSpan.remove();
      const errDiv = document.createElement('div');
      errDiv.className = 'ai-error'; errDiv.textContent = `Error: ${errMsg}`;
      responseDiv.appendChild(errDiv);
      scrollToBottom(container);
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
