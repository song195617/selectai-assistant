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

const DEFAULT_SETTINGS = {
  providers: DEFAULT_PROVIDERS,
  activeProviderId: 'default-gemini',
  transTemperature: 0.3,
  chatTemperature: 0.7,
  maxTokens: 8192,
  translatePrompt: '将以下文本翻译成中文 (如果已经是中文则进行解释或润色)：\n\n{text}',
  chatPrompt: '你是一个乐于助人的 AI 助手。请用用户的语言简洁地回答。'
};

let currentSettings = { ...DEFAULT_SETTINGS };
let editingId = null;
let isTestingProvider = false;
let isBatchTesting = false;
const connectivityResults = {};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('saveModelBtn').addEventListener('click', handleModelFormSubmit);
  document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
  document.getElementById('testAllModelsBtn').addEventListener('click', handleTestAllModelsConnectivity);
  document.getElementById('exportBtn').addEventListener('click', exportConfig);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', importConfig);
});

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    // 数据迁移：旧版 temperature -> 新版双参数
    if (items.temperature !== undefined && items.transTemperature === undefined) {
       items.transTemperature = items.temperature;
       items.chatTemperature = 0.7;
       delete items.temperature;
    }
    currentSettings = items;
    renderUI();
  });
}

function renderUI() {
  document.getElementById('transTemperature').value = currentSettings.transTemperature;
  document.getElementById('chatTemperature').value = currentSettings.chatTemperature;
  document.getElementById('maxTokens').value = currentSettings.maxTokens;
  document.getElementById('translatePrompt').value = currentSettings.translatePrompt;
  document.getElementById('chatPrompt').value = currentSettings.chatPrompt;

  const listEl = document.getElementById('modelList');
  listEl.textContent = '';
  const selectEl = document.getElementById('activeModelSelect');
  selectEl.textContent = '';

  currentSettings.providers.forEach((p, index) => {
    const providerId = getProviderId(p, index);
    const providerLabel = typeof p.label === 'string' ? p.label : '';
    const providerType = typeof p.type === 'string' ? p.type.toUpperCase() : 'UNKNOWN';
    const providerModel = typeof p.model === 'string' ? p.model : '';

    const item = document.createElement('div');
    item.className = 'model-item';

    const modelInfo = document.createElement('div');
    modelInfo.className = 'model-info';

    const modelName = document.createElement('span');
    modelName.className = 'model-name';
    modelName.textContent = providerLabel;

    const modelSub = document.createElement('span');
    modelSub.className = 'model-sub';
    modelSub.textContent = `${providerType} - ${providerModel}`;

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
    editBtn.title = '编辑';
    editBtn.textContent = '\u270E';
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startEdit(providerId);
    });

    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'btn-icon btn-delete';
    deleteBtn.dataset.id = providerId;
    deleteBtn.title = '删除';
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

  updateBatchTestButtonState();
}

function startEdit(id) {
  const provider = currentSettings.providers.find(p => p.id === id);
  if (!provider) return;
  editingId = id;
  document.getElementById('newLabel').value = provider.label;
  document.getElementById('newType').value = provider.type;
  document.getElementById('newUrl').value = provider.url;
  document.getElementById('newModelName').value = provider.model;
  document.getElementById('newKey').value = provider.key;
  document.getElementById('formTitle').textContent = `正在编辑: ${provider.label}`;
  const saveBtn = document.getElementById('saveModelBtn');
  saveBtn.textContent = '更新模型';
  saveBtn.style.background = '#007bff';
  document.getElementById('cancelEditBtn').style.display = 'inline-block';
  document.getElementById('modelForm').classList.add('editing');
}

function cancelEdit(e) {
  if(e) e.preventDefault();
  editingId = null;
  clearForm();
  document.getElementById('formTitle').textContent = '添加新模型';
  const saveBtn = document.getElementById('saveModelBtn');
  saveBtn.textContent = '添加到列表';
  saveBtn.style.background = '#28a745';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('modelForm').classList.remove('editing');
}

async function handleModelFormSubmit(e) {
  if(e) e.preventDefault();
  if (isTestingProvider || isBatchTesting) return;

  const label = document.getElementById('newLabel').value.trim();
  const type = document.getElementById('newType').value;
  const url = document.getElementById('newUrl').value.trim();
  const model = document.getElementById('newModelName').value.trim();
  const key = document.getElementById('newKey').value.trim();

  if (!label || !url || !key) {
    showStatus('\u274C 请填写显示名称、API 地址和 Key。', '#dc3545');
    return;
  }

  const providerCandidate = {
    id: editingId || ('custom-' + Date.now()),
    label,
    type,
    url,
    model,
    key
  };

  try {
    setModelTestingState(true);
    showStatus('正在测试模型连通性...', '#0f6fff');
    await testProviderConnectivity(providerCandidate);
  } catch (error) {
    showStatus('\u274C 连通性测试失败: ' + error.message, '#dc3545');
    return;
  } finally {
    setModelTestingState(false);
  }

  if (editingId) {
    const index = currentSettings.providers.findIndex(p => p.id === editingId);
    if (index !== -1) {
      currentSettings.providers[index] = providerCandidate;
      setConnectivityResult(providerCandidate.id, 'success', '最近测试：通过');
      showStatus('\u2705 连通性通过，模型更新成功！', '#007bff');
    }
    cancelEdit();
  } else {
    const newProvider = providerCandidate;
    currentSettings.providers.push(newProvider);
    currentSettings.activeProviderId = newProvider.id;
    setConnectivityResult(newProvider.id, 'success', '最近测试：通过');
    clearForm();
    showStatus('\u2705 连通性通过，模型已添加到列表！', '#28a745');
  }
  renderUI();
  chrome.storage.sync.set(currentSettings);
}

function deleteProvider(id) {
  if (currentSettings.providers.length <= 1) {
    showStatus('\u274C 必须保留至少一个模型。', '#dc3545');
    return;
  }
  if (editingId === id) cancelEdit();
  currentSettings.providers = currentSettings.providers.filter(p => p.id !== id);
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
  currentSettings.translatePrompt = document.getElementById('translatePrompt').value;
  currentSettings.chatPrompt = document.getElementById('chatPrompt').value;
  chrome.storage.sync.set(currentSettings, () => showStatus('\u2705 所有设置已保存！', '#28a745'));
}

function exportConfig() {
  saveSettings();
  const jsonStr = JSON.stringify(currentSettings, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai_assistant_config_${new Date().toISOString().slice(0,10)}.json`;
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
        showStatus('\u2705 配置导入成功！', '#28a745');
      });
    } catch (err) {
      showStatus('\u274C 导入失败: ' + err.message, '#dc3545');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function sanitizeImportedSettings(imported) {
  if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
    throw new Error('配置文件格式错误。');
  }

  if (!Array.isArray(imported.providers) || imported.providers.length === 0) {
    throw new Error('providers 必须是非空数组。');
  }

  const providers = imported.providers.map((provider, index) => sanitizeProvider(provider, index));
  const idSet = new Set();
  for (let i = 0; i < providers.length; i++) {
    const providerId = providers[i].id;
    if (idSet.has(providerId)) throw new Error(`模型 ID 重复: ${providerId}`);
    idSet.add(providerId);
  }

  const activeProviderId = normalizeString(imported.activeProviderId);
  return {
    providers,
    activeProviderId: idSet.has(activeProviderId) ? activeProviderId : providers[0].id,
    transTemperature: sanitizeTemperature(imported.transTemperature, DEFAULT_SETTINGS.transTemperature),
    chatTemperature: sanitizeTemperature(imported.chatTemperature, DEFAULT_SETTINGS.chatTemperature),
    maxTokens: sanitizeMaxTokens(imported.maxTokens, DEFAULT_SETTINGS.maxTokens),
    translatePrompt: sanitizePrompt(imported.translatePrompt, DEFAULT_SETTINGS.translatePrompt),
    chatPrompt: sanitizePrompt(imported.chatPrompt, DEFAULT_SETTINGS.chatPrompt)
  };
}

function sanitizeProvider(provider, index) {
  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
    throw new Error(`第 ${index + 1} 个模型格式错误。`);
  }

  const type = normalizeString(provider.type);
  if (type !== 'openai' && type !== 'google') {
    throw new Error(`第 ${index + 1} 个模型 type 仅支持 openai/google。`);
  }

  const label = normalizeString(provider.label);
  const url = normalizeString(provider.url);
  const model = normalizeString(provider.model);
  if (!label || !url || !model) {
    throw new Error(`第 ${index + 1} 个模型缺少必要字段。`);
  }

  return {
    id: normalizeString(provider.id) || `imported-${Date.now()}-${index}`,
    label: label,
    type: type,
    url: url,
    model: model,
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
  const intValue = Math.floor(num);
  return Math.min(65536, Math.max(128, intValue));
}

function sanitizePrompt(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function showStatus(msg, color) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.style.color = color;
  setTimeout(() => el.textContent = '', 3000);
}

function setModelTestingState(testing) {
  isTestingProvider = testing;
  const saveBtn = document.getElementById('saveModelBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  saveBtn.disabled = testing;
  cancelBtn.disabled = testing;
  saveBtn.textContent = testing ? '测试中...' : (editingId ? '更新模型' : '添加到列表');
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
    showStatus('\u274C 没有可测试的模型。', '#dc3545');
    return;
  }

  setBatchTestingState(true);
  providers.forEach((provider, index) => {
    const providerId = getProviderId(provider, index);
    setConnectivityResult(providerId, 'testing', '测试中...');
  });
  renderUI();
  showStatus(`正在并行测试 ${providers.length} 个模型（30 秒超时）...`, '#0f6fff');

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
      setConnectivityResult(providerId, 'success', '测试通过');
      return;
    }
    failCount++;
    const msg = result.reason && result.reason.message ? result.reason.message : '连通性测试失败。';
    setConnectivityResult(providerId, 'error', `失败：${msg}`);
  });

  setBatchTestingState(false);
  renderUI();

  if (failCount === 0) {
    showStatus(`\u2705 全部通过：${passCount}/${providers.length}`, '#28a745');
  } else {
    showStatus(`\u26A0 通过 ${passCount}，失败 ${failCount}（共 ${providers.length}）`, '#dc3545');
  }
}

function testProviderConnectivity(provider) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'test-provider-connectivity', provider }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || '无法连接后台服务。'));
        return;
      }
      if (!response || response.ok !== true) {
        reject(new Error(response?.error || '模型连通性测试失败。'));
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
  btn.textContent = isBatchTesting ? '测试中...' : '连通性测试';
}

function setConnectivityResult(providerId, state, message) {
  if (!providerId) return;
  connectivityResults[providerId] = { state, message };
}

function getConnectivityResultFor(providerId) {
  return connectivityResults[providerId] || { state: 'idle', message: '未测试' };
}

function getConnectivityStatusClass(state) {
  if (state === 'testing') return 'model-test-testing';
  if (state === 'success') return 'model-test-success';
  if (state === 'error') return 'model-test-error';
  return 'model-test-idle';
}

function getConnectivityStatusText(result) {
  return `连通性：${result.message}`;
}

function getProviderId(provider, index) {
  return normalizeString(provider && provider.id) || `provider-${index}`;
}
