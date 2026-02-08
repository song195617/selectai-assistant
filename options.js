const DEFAULT_PROVIDERS = [
  {
    id: 'default-gemini',
    label: 'Google Gemini Flash',
    type: 'google',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent',
    model: 'gemini-flash-latest',
    key: ''
  },
  {
    id: 'default-deepseek',
    label: 'DeepSeek V3',
    type: 'openai',
    url: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    key: ''
  }
];

const DEFAULT_TRANSLATE_PROMPT = '你是一位精通多国语言的资深翻译专家、语言学家和跨文化交流顾问。你不仅擅长将文本从源语言精准翻译成中文，也擅长将中文表达的文本精准地道地翻译成英文，还能敏锐地识别文本类型（单词、句子、段落或长文），并根据不同类型提供深度解析。';
const DEFAULT_CHAT_PROMPT = '你是一位博古通今、风趣幽默的“老教授”，同时也是用户多年的“老朋友”。你拥有海量的知识储备（涵盖科技、人文、历史、语言学等），但你从不掉书袋。你的特长是用最通俗易懂、深入浅出的语言，把复杂的事情讲清楚。你就像在咖啡馆里和老友聊天一样，语气亲切、平和，偶尔带点智慧的幽默。';

const DEFAULT_SETTINGS = {
  providers: DEFAULT_PROVIDERS,
  activeProviderId: 'default-gemini',
  transTemperature: 0.3,
  chatTemperature: 0.7,
  maxTokens: 8192,
  themeMode: 'system',
  languageMode: 'auto',
  translatePrompt: '',
  chatPrompt: ''
};

const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const I18N = {
  zh: {
    app_title: 'AI 助手配置',
    app_subtitle: '配置翻译/对话模型、推理参数、主题与语言，以及连通性测试。',
    btn_export: '导出配置',
    btn_import: '导入配置',
    panel_models: '模型管理',
    chip_models: 'Models',
    label_active_model: '当前使用的模型',
    label_saved_models: '已保存的模型',
    btn_test_all: '连通性测试',
    btn_test_all_running: '测试中...',
    form_title_add: '添加新模型',
    form_title_edit: '正在编辑: {label}',
    placeholder_model_label: '显示名称 (例如: 我的模型)',
    option_openai: 'OpenAI 兼容',
    option_google: 'Google Gemini',
    placeholder_model_url: 'API 接口地址 (Endpoint URL)',
    placeholder_model_name: '模型名称 (例如: deepseek-chat)',
    placeholder_model_key: 'API 密钥 (Key)',
    btn_add_model: '添加到列表',
    btn_update_model: '更新模型',
    btn_cancel_edit: '取消编辑',
    btn_testing: '测试中...',
    panel_appearance: '界面与语言',
    chip_appearance: 'UI',
    label_theme_mode: '主题模式',
    option_theme_system: '跟随浏览器',
    option_theme_light: '浅色',
    option_theme_dark: '黑夜',
    label_language_mode: '界面语言',
    option_lang_auto: '跟随浏览器',
    option_lang_zh: '简体中文',
    option_lang_en: 'English',
    panel_tuning: '推理参数',
    chip_tuning: 'Tuning',
    label_trans_temp: '翻译随机性 (Trans Temp, 默认 0.3)',
    label_chat_temp: '对话随机性 (Chat Temp, 默认 0.7)',
    label_max_tokens: '最大回复长度 (Max Tokens, 默认 8192)',
    panel_prompts: '提示词',
    chip_prompts: 'Prompt',
    label_translate_prompt: '翻译模式提示词',
    label_chat_prompt: '对话/解释模式提示词',
    hint_prompt_text_param: '说明：可使用 {text} 代表选中文本；若未填写 {text}，系统会自动将选中文本追加到提示词末尾。',
    btn_save_all: '保存所有设置',
    action_edit: '编辑',
    action_delete: '删除',
    provider_type_openai: 'OpenAI 兼容',
    provider_type_google: 'Google Gemini',
    connectivity_prefix: '连通性：',
    connectivity_not_tested: '未测试',
    connectivity_testing: '测试中...',
    connectivity_passed: '测试通过',
    connectivity_recent_passed: '最近测试：通过',
    connectivity_failed: '失败',
    status_fill_required: '请填写显示名称、API 地址和 Key。',
    status_testing_single: '正在测试模型连通性...',
    status_testing_failed: '连通性测试失败: {message}',
    status_model_updated: '连通性通过，模型更新成功！',
    status_model_added: '连通性通过，模型已添加到列表！',
    status_keep_one_model: '必须保留至少一个模型。',
    status_settings_saved: '所有设置已保存！',
    status_import_success: '配置导入成功！',
    status_import_failed: '导入失败: {message}',
    status_no_models: '没有可测试的模型。',
    status_batch_running: '正在并行测试 {count} 个模型（15 秒超时）...',
    status_batch_all_pass: '全部通过：{pass}/{total}',
    status_batch_partial: '通过 {pass}，失败 {fail}（共 {total}）',
    err_config_invalid: '配置文件格式错误。',
    err_providers_required: 'providers 必须是非空数组。',
    err_provider_format: '第 {index} 个模型格式错误。',
    err_provider_type: '第 {index} 个模型 type 仅支持 openai/google。',
    err_provider_required: '第 {index} 个模型缺少必要字段。',
    err_provider_id_duplicate: '模型 ID 重复: {id}',
    err_background_unreachable: '无法连接后台服务。',
    err_connectivity_failed: '模型连通性测试失败。'
  },
  en: {
    app_title: 'AI Assistant Settings',
    app_subtitle: 'Configure translation/chat models, tuning, theme, language, and connectivity checks.',
    btn_export: 'Export Config',
    btn_import: 'Import Config',
    panel_models: 'Model Management',
    chip_models: 'Models',
    label_active_model: 'Active Model',
    label_saved_models: 'Saved Models',
    btn_test_all: 'Connectivity Test',
    btn_test_all_running: 'Testing...',
    form_title_add: 'Add New Model',
    form_title_edit: 'Editing: {label}',
    placeholder_model_label: 'Display name (e.g. My Model)',
    option_openai: 'OpenAI Compatible',
    option_google: 'Google Gemini',
    placeholder_model_url: 'API endpoint URL',
    placeholder_model_name: 'Model name (e.g. deepseek-chat)',
    placeholder_model_key: 'API key',
    btn_add_model: 'Add to List',
    btn_update_model: 'Update Model',
    btn_cancel_edit: 'Cancel Edit',
    btn_testing: 'Testing...',
    panel_appearance: 'Appearance & Language',
    chip_appearance: 'UI',
    label_theme_mode: 'Theme Mode',
    option_theme_system: 'Follow Browser',
    option_theme_light: 'Light',
    option_theme_dark: 'Dark',
    label_language_mode: 'Interface Language',
    option_lang_auto: 'Follow Browser',
    option_lang_zh: 'Simplified Chinese',
    option_lang_en: 'English',
    panel_tuning: 'Tuning',
    chip_tuning: 'Tuning',
    label_trans_temp: 'Translation randomness (Trans Temp, default 0.3)',
    label_chat_temp: 'Chat randomness (Chat Temp, default 0.7)',
    label_max_tokens: 'Max response length (Max Tokens, default 8192)',
    panel_prompts: 'Prompts',
    chip_prompts: 'Prompt',
    label_translate_prompt: 'Translation prompt',
    label_chat_prompt: 'Chat/Explain prompt',
    hint_prompt_text_param: 'Tip: Use {text} as selected text. If {text} is omitted, selected text is appended to the end automatically.',
    btn_save_all: 'Save All Settings',
    action_edit: 'Edit',
    action_delete: 'Delete',
    provider_type_openai: 'OpenAI Compatible',
    provider_type_google: 'Google Gemini',
    connectivity_prefix: 'Connectivity: ',
    connectivity_not_tested: 'Not tested',
    connectivity_testing: 'Testing...',
    connectivity_passed: 'Passed',
    connectivity_recent_passed: 'Last test: passed',
    connectivity_failed: 'Failed',
    status_fill_required: 'Please fill display name, API URL, and key.',
    status_testing_single: 'Testing model connectivity...',
    status_testing_failed: 'Connectivity test failed: {message}',
    status_model_updated: 'Connectivity passed, model updated.',
    status_model_added: 'Connectivity passed, model added.',
    status_keep_one_model: 'At least one model must remain.',
    status_settings_saved: 'All settings saved.',
    status_import_success: 'Config imported successfully.',
    status_import_failed: 'Import failed: {message}',
    status_no_models: 'No models available to test.',
    status_batch_running: 'Testing {count} models in parallel (15s timeout)...',
    status_batch_all_pass: 'All passed: {pass}/{total}',
    status_batch_partial: 'Passed {pass}, failed {fail} (total {total})',
    err_config_invalid: 'Invalid config file format.',
    err_providers_required: '`providers` must be a non-empty array.',
    err_provider_format: 'Model #{index} has invalid format.',
    err_provider_type: 'Model #{index} type must be openai/google.',
    err_provider_required: 'Model #{index} is missing required fields.',
    err_provider_id_duplicate: 'Duplicate model ID: {id}',
    err_background_unreachable: 'Cannot reach background service.',
    err_connectivity_failed: 'Model connectivity test failed.'
  }
};

let currentSettings = { ...DEFAULT_SETTINGS };
let currentLocale = 'zh';
let editingId = null;
let isTestingProvider = false;
let isBatchTesting = false;
let themeMediaQuery = null;
let statusTimer = null;
const connectivityResults = {};

document.addEventListener('DOMContentLoaded', () => {
  initializeThemeSync();
  applyOptionsTheme(DEFAULT_SETTINGS.themeMode);
  loadSettings();

  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('saveModelBtn').addEventListener('click', handleModelFormSubmit);
  document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
  document.getElementById('testAllModelsBtn').addEventListener('click', handleTestAllModelsConnectivity);
  document.getElementById('themeMode').addEventListener('change', handleThemeModeChange);
  document.getElementById('languageMode').addEventListener('change', handleLanguageModeChange);
  document.getElementById('exportBtn').addEventListener('click', exportConfig);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', importConfig);
});

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    if (items.temperature !== undefined && items.transTemperature === undefined) {
      items.transTemperature = items.temperature;
      items.chatTemperature = 0.7;
      delete items.temperature;
    }
    currentSettings = { ...DEFAULT_SETTINGS, ...items };
    renderUI();
  });
}

function renderUI() {
  const themeMode = sanitizeThemeMode(currentSettings.themeMode, DEFAULT_SETTINGS.themeMode);
  const languageMode = sanitizeLanguageMode(currentSettings.languageMode, DEFAULT_SETTINGS.languageMode);
  currentSettings.themeMode = themeMode;
  currentSettings.languageMode = languageMode;

  document.getElementById('themeMode').value = themeMode;
  document.getElementById('languageMode').value = languageMode;
  applyOptionsTheme(themeMode);
  applyLocale();

  document.getElementById('transTemperature').value = currentSettings.transTemperature;
  document.getElementById('chatTemperature').value = currentSettings.chatTemperature;
  document.getElementById('maxTokens').value = currentSettings.maxTokens;
  const translatePromptEl = document.getElementById('translatePrompt');
  const chatPromptEl = document.getElementById('chatPrompt');
  translatePromptEl.value = currentSettings.translatePrompt;
  chatPromptEl.value = currentSettings.chatPrompt;
  translatePromptEl.placeholder = DEFAULT_TRANSLATE_PROMPT;
  chatPromptEl.placeholder = DEFAULT_CHAT_PROMPT;

  const listEl = document.getElementById('modelList');
  listEl.textContent = '';
  const selectEl = document.getElementById('activeModelSelect');
  selectEl.textContent = '';

  currentSettings.providers.forEach((provider, index) => {
    const providerId = getProviderId(provider, index);
    const providerLabel = typeof provider.label === 'string' ? provider.label : '';
    const providerTypeLabel = getProviderTypeLabel(provider.type);
    const providerModel = typeof provider.model === 'string' ? provider.model : '';

    const item = document.createElement('div');
    item.className = 'model-item';

    const modelInfo = document.createElement('div');
    modelInfo.className = 'model-info';

    const modelName = document.createElement('span');
    modelName.className = 'model-name';
    modelName.textContent = providerLabel;

    const modelSub = document.createElement('span');
    modelSub.className = 'model-sub';
    modelSub.textContent = `${providerTypeLabel} - ${providerModel}`;

    const testState = getConnectivityResultFor(providerId);
    const statusSpan = document.createElement('span');
    statusSpan.className = `model-test-status ${getConnectivityStatusClass(testState.state)}`;
    statusSpan.textContent = getConnectivityStatusText(testState);

    modelInfo.appendChild(modelName);
    modelInfo.appendChild(modelSub);
    modelInfo.appendChild(statusSpan);

    const itemActions = document.createElement('div');
    itemActions.className = 'item-actions';

    const editBtn = document.createElement('span');
    editBtn.className = 'btn-icon btn-edit';
    editBtn.dataset.id = providerId;
    editBtn.title = t('action_edit');
    editBtn.textContent = '\u270E';
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startEdit(providerId);
    });

    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'btn-icon btn-delete';
    deleteBtn.dataset.id = providerId;
    deleteBtn.title = t('action_delete');
    deleteBtn.textContent = '\u00D7';
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      deleteProvider(providerId);
    });

    itemActions.appendChild(editBtn);
    itemActions.appendChild(deleteBtn);
    item.appendChild(modelInfo);
    item.appendChild(itemActions);
    listEl.appendChild(item);

    const option = document.createElement('option');
    option.value = providerId;
    option.textContent = providerLabel;
    if (providerId === currentSettings.activeProviderId) option.selected = true;
    selectEl.appendChild(option);
  });

  refreshFormHeader();
  refreshModelSaveButton();
  updateBatchTestButtonState();
}

function startEdit(id) {
  const provider = currentSettings.providers.find((p) => p.id === id);
  if (!provider) return;
  editingId = id;
  document.getElementById('newLabel').value = provider.label;
  document.getElementById('newType').value = provider.type;
  document.getElementById('newUrl').value = provider.url;
  document.getElementById('newModelName').value = provider.model;
  document.getElementById('newKey').value = provider.key;

  document.getElementById('saveModelBtn').style.background = '#007bff';
  document.getElementById('cancelEditBtn').style.display = 'inline-block';
  document.getElementById('modelForm').classList.add('editing');
  refreshFormHeader();
  refreshModelSaveButton();
}

function cancelEdit(e) {
  if (e) e.preventDefault();
  editingId = null;
  clearForm();
  document.getElementById('saveModelBtn').style.background = '#28a745';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('modelForm').classList.remove('editing');
  refreshFormHeader();
  refreshModelSaveButton();
}

async function handleModelFormSubmit(e) {
  if (e) e.preventDefault();
  if (isTestingProvider || isBatchTesting) return;

  const label = document.getElementById('newLabel').value.trim();
  const type = document.getElementById('newType').value;
  const url = document.getElementById('newUrl').value.trim();
  const model = document.getElementById('newModelName').value.trim();
  const key = document.getElementById('newKey').value.trim();

  if (!label || !url || !key) {
    showStatus(`\u274C ${t('status_fill_required')}`, '#dc3545');
    return;
  }

  const providerCandidate = { id: editingId || `custom-${Date.now()}`, label, type, url, model, key };

  try {
    setModelTestingState(true);
    showStatus(t('status_testing_single'), '#0f6fff');
    await testProviderConnectivity(providerCandidate);
  } catch (error) {
    showStatus(`\u274C ${t('status_testing_failed', { message: error.message })}`, '#dc3545');
    return;
  } finally {
    setModelTestingState(false);
  }

  if (editingId) {
    const index = currentSettings.providers.findIndex((p) => p.id === editingId);
    if (index !== -1) {
      currentSettings.providers[index] = providerCandidate;
      setConnectivityResult(providerCandidate.id, 'success', 'connectivity_recent_passed');
      showStatus(`\u2705 ${t('status_model_updated')}`, '#007bff');
    }
    cancelEdit();
  } else {
    currentSettings.providers.push(providerCandidate);
    currentSettings.activeProviderId = providerCandidate.id;
    setConnectivityResult(providerCandidate.id, 'success', 'connectivity_recent_passed');
    clearForm();
    showStatus(`\u2705 ${t('status_model_added')}`, '#28a745');
  }

  renderUI();
  chrome.storage.sync.set(currentSettings);
}

function deleteProvider(id) {
  if (currentSettings.providers.length <= 1) {
    showStatus(`\u274C ${t('status_keep_one_model')}`, '#dc3545');
    return;
  }
  if (editingId === id) cancelEdit();
  currentSettings.providers = currentSettings.providers.filter((p) => p.id !== id);
  delete connectivityResults[id];
  if (currentSettings.activeProviderId === id) {
    currentSettings.activeProviderId = currentSettings.providers[0].id;
  }
  renderUI();
  chrome.storage.sync.set(currentSettings);
}

function clearForm() {
  document.getElementById('newLabel').value = '';
  document.getElementById('newUrl').value = '';
  document.getElementById('newModelName').value = '';
  document.getElementById('newKey').value = '';
}

function saveSettings() {
  currentSettings.activeProviderId = document.getElementById('activeModelSelect').value;
  currentSettings.transTemperature = parseFloat(document.getElementById('transTemperature').value);
  currentSettings.chatTemperature = parseFloat(document.getElementById('chatTemperature').value);
  currentSettings.maxTokens = parseInt(document.getElementById('maxTokens').value);
  currentSettings.themeMode = sanitizeThemeMode(document.getElementById('themeMode').value, DEFAULT_SETTINGS.themeMode);
  currentSettings.languageMode = sanitizeLanguageMode(document.getElementById('languageMode').value, DEFAULT_SETTINGS.languageMode);
  currentSettings.translatePrompt = document.getElementById('translatePrompt').value;
  currentSettings.chatPrompt = document.getElementById('chatPrompt').value;
  applyOptionsTheme(currentSettings.themeMode);
  applyLocale();
  renderUI();
  chrome.storage.sync.set(currentSettings, () => showStatus(`\u2705 ${t('status_settings_saved')}`, '#28a745'));
}

function exportConfig() {
  saveSettings();
  const jsonStr = JSON.stringify(currentSettings, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai_assistant_config_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importConfig(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      currentSettings = sanitizeImportedSettings(imported);
      chrome.storage.sync.set(currentSettings, () => {
        renderUI();
        cancelEdit();
        showStatus(`\u2705 ${t('status_import_success')}`, '#28a745');
      });
    } catch (err) {
      showStatus(`\u274C ${t('status_import_failed', { message: err.message })}`, '#dc3545');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function sanitizeImportedSettings(imported) {
  if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
    throw new Error(t('err_config_invalid'));
  }
  if (!Array.isArray(imported.providers) || imported.providers.length === 0) {
    throw new Error(t('err_providers_required'));
  }

  const providers = imported.providers.map((provider, index) => sanitizeProvider(provider, index));
  const idSet = new Set();
  for (let i = 0; i < providers.length; i++) {
    const providerId = providers[i].id;
    if (idSet.has(providerId)) throw new Error(t('err_provider_id_duplicate', { id: providerId }));
    idSet.add(providerId);
  }

  const activeProviderId = normalizeString(imported.activeProviderId);
  return {
    providers,
    activeProviderId: idSet.has(activeProviderId) ? activeProviderId : providers[0].id,
    transTemperature: sanitizeTemperature(imported.transTemperature, DEFAULT_SETTINGS.transTemperature),
    chatTemperature: sanitizeTemperature(imported.chatTemperature, DEFAULT_SETTINGS.chatTemperature),
    maxTokens: sanitizeMaxTokens(imported.maxTokens, DEFAULT_SETTINGS.maxTokens),
    themeMode: sanitizeThemeMode(imported.themeMode, DEFAULT_SETTINGS.themeMode),
    languageMode: sanitizeLanguageMode(imported.languageMode, DEFAULT_SETTINGS.languageMode),
    translatePrompt: sanitizePrompt(imported.translatePrompt, DEFAULT_SETTINGS.translatePrompt),
    chatPrompt: sanitizePrompt(imported.chatPrompt, DEFAULT_SETTINGS.chatPrompt)
  };
}

function sanitizeProvider(provider, index) {
  const idx = index + 1;
  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
    throw new Error(t('err_provider_format', { index: idx }));
  }
  const type = normalizeString(provider.type);
  if (type !== 'openai' && type !== 'google') {
    throw new Error(t('err_provider_type', { index: idx }));
  }
  const label = normalizeString(provider.label);
  const url = normalizeString(provider.url);
  const model = normalizeString(provider.model);
  if (!label || !url || !model) {
    throw new Error(t('err_provider_required', { index: idx }));
  }

  return {
    id: normalizeString(provider.id) || `imported-${Date.now()}-${index}`,
    label,
    type,
    url,
    model,
    key: typeof provider.key === 'string' ? provider.key.trim() : ''
  };
}

function sanitizeTemperature(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(2, Math.max(0, num));
}

function sanitizeMaxTokens(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(65536, Math.max(128, Math.floor(num)));
}

function sanitizePrompt(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeThemeMode(value, fallback) {
  const mode = normalizeString(value);
  if (mode === 'light' || mode === 'dark' || mode === 'system') return mode;
  return fallback;
}

function sanitizeLanguageMode(value, fallback) {
  const mode = normalizeString(value);
  if (mode === 'auto' || mode === 'zh' || mode === 'en') return mode;
  return fallback;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function showStatus(msg, color) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.style.color = color;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { el.textContent = ''; }, 3000);
}

function setModelTestingState(testing) {
  isTestingProvider = testing;
  const saveBtn = document.getElementById('saveModelBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  saveBtn.disabled = testing;
  cancelBtn.disabled = testing;
  refreshModelSaveButton();
  updateBatchTestButtonState();
}

function setBatchTestingState(testing) {
  isBatchTesting = testing;
  updateBatchTestButtonState();
}

async function handleTestAllModelsConnectivity(e) {
  if (e) e.preventDefault();
  if (isBatchTesting || isTestingProvider) return;

  const providers = Array.isArray(currentSettings.providers) ? currentSettings.providers : [];
  if (providers.length === 0) {
    showStatus(`\u274C ${t('status_no_models')}`, '#dc3545');
    return;
  }

  setBatchTestingState(true);
  providers.forEach((provider, index) => {
    const providerId = getProviderId(provider, index);
    setConnectivityResult(providerId, 'testing', 'connectivity_testing');
  });
  renderUI();
  showStatus(t('status_batch_running', { count: providers.length }), '#0f6fff');

  const checks = providers.map((provider) => testProviderConnectivity({
    id: provider.id,
    label: provider.label,
    type: provider.type,
    url: provider.url,
    model: provider.model,
    key: provider.key
  }));
  const results = await Promise.allSettled(checks);

  let passCount = 0;
  let failCount = 0;
  results.forEach((result, index) => {
    const providerId = getProviderId(providers[index], index);
    if (result.status === 'fulfilled') {
      passCount++;
      setConnectivityResult(providerId, 'success', 'connectivity_passed');
      return;
    }
    failCount++;
    const msg = result.reason && result.reason.message ? result.reason.message : t('err_connectivity_failed');
    setConnectivityResult(providerId, 'error', 'connectivity_failed', msg);
  });

  setBatchTestingState(false);
  renderUI();

  if (failCount === 0) {
    showStatus(`\u2705 ${t('status_batch_all_pass', { pass: passCount, total: providers.length })}`, '#28a745');
  } else {
    showStatus(`\u26A0 ${t('status_batch_partial', { pass: passCount, fail: failCount, total: providers.length })}`, '#dc3545');
  }
}

function testProviderConnectivity(provider) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'test-provider-connectivity', provider }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || t('err_background_unreachable')));
        return;
      }
      if (!response || response.ok !== true) {
        reject(new Error(response?.error || t('err_connectivity_failed')));
        return;
      }
      resolve();
    });
  });
}

function updateBatchTestButtonState() {
  const btn = document.getElementById('testAllModelsBtn');
  if (!btn) return;
  const hasModels = Array.isArray(currentSettings.providers) && currentSettings.providers.length > 0;
  btn.disabled = !hasModels || isBatchTesting || isTestingProvider;
  btn.textContent = isBatchTesting ? t('btn_test_all_running') : t('btn_test_all');
}

function setConnectivityResult(providerId, state, key, detail = '') {
  if (!providerId) return;
  connectivityResults[providerId] = { state, key, detail };
}

function getConnectivityResultFor(providerId) {
  return connectivityResults[providerId] || { state: 'idle', key: 'connectivity_not_tested', detail: '' };
}

function getConnectivityStatusClass(state) {
  if (state === 'testing') return 'model-test-testing';
  if (state === 'success') return 'model-test-success';
  if (state === 'error') return 'model-test-error';
  return 'model-test-idle';
}

function getConnectivityStatusText(result) {
  const baseText = t(result.key || 'connectivity_not_tested');
  if (result.state === 'error' && result.detail) {
    return `${t('connectivity_prefix')}${baseText}: ${result.detail}`;
  }
  return `${t('connectivity_prefix')}${baseText}`;
}

function getProviderId(provider, index) {
  return normalizeString(provider && provider.id) || `provider-${index}`;
}

function getProviderTypeLabel(type) {
  if (type === 'openai') return t('provider_type_openai');
  if (type === 'google') return t('provider_type_google');
  return (typeof type === 'string' ? type : 'UNKNOWN').toUpperCase();
}

function refreshFormHeader() {
  const formTitle = document.getElementById('formTitle');
  if (!formTitle) return;
  if (!editingId) {
    formTitle.textContent = t('form_title_add');
    return;
  }
  const provider = currentSettings.providers.find((p) => p.id === editingId);
  const label = provider && provider.label ? provider.label : '';
  formTitle.textContent = t('form_title_edit', { label });
}

function refreshModelSaveButton() {
  const saveBtn = document.getElementById('saveModelBtn');
  if (!saveBtn) return;
  if (isTestingProvider) {
    saveBtn.textContent = t('btn_testing');
    return;
  }
  saveBtn.textContent = editingId ? t('btn_update_model') : t('btn_add_model');
}

function handleThemeModeChange(e) {
  currentSettings.themeMode = sanitizeThemeMode(e.target.value, DEFAULT_SETTINGS.themeMode);
  applyOptionsTheme(currentSettings.themeMode);
}

function handleLanguageModeChange(e) {
  currentSettings.languageMode = sanitizeLanguageMode(e.target.value, DEFAULT_SETTINGS.languageMode);
  renderUI();
}

function initializeThemeSync() {
  if (!window.matchMedia) return;
  themeMediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
  const onThemeChange = () => {
    if (sanitizeThemeMode(currentSettings.themeMode, DEFAULT_SETTINGS.themeMode) === 'system') {
      applyOptionsTheme('system');
    }
  };
  if (typeof themeMediaQuery.addEventListener === 'function') {
    themeMediaQuery.addEventListener('change', onThemeChange);
  } else if (typeof themeMediaQuery.addListener === 'function') {
    themeMediaQuery.addListener(onThemeChange);
  }
}

function applyOptionsTheme(themeMode) {
  document.body.dataset.theme = getEffectiveTheme(themeMode);
}

function getEffectiveTheme(themeMode) {
  const mode = sanitizeThemeMode(themeMode, DEFAULT_SETTINGS.themeMode);
  if (mode === 'light' || mode === 'dark') return mode;
  if (!window.matchMedia) return 'light';
  return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
}

function applyLocale() {
  currentLocale = resolveLocale(currentSettings.languageMode);
  const langPack = I18N[currentLocale] || I18N.zh;
  document.documentElement.lang = currentLocale;

  const i18nNodes = document.querySelectorAll('[data-i18n]');
  i18nNodes.forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (langPack[key]) node.textContent = langPack[key];
  });

  const placeholderNodes = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderNodes.forEach((node) => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (langPack[key]) node.placeholder = langPack[key];
  });
}

function resolveLocale(languageMode) {
  const mode = sanitizeLanguageMode(languageMode, DEFAULT_SETTINGS.languageMode);
  if (mode === 'zh' || mode === 'en') return mode;
  const browserLang = normalizeString(navigator.language).toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh';
  return 'en';
}

function t(key, params = {}) {
  const langPack = I18N[currentLocale] || I18N.zh;
  let template = langPack[key] || I18N.zh[key] || key;
  Object.keys(params).forEach((paramKey) => {
    template = template.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
  });
  return template;
}
