const DEFAULT_PROVIDERS = [
  {
    id: 'default-gemini',
    label: 'Google Gemini Flash',
    type: 'google',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent',
    model: 'gemini-1.5-flash',
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

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('saveModelBtn').addEventListener('click', handleModelFormSubmit);
  document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
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
  listEl.innerHTML = '';
  const selectEl = document.getElementById('activeModelSelect');
  selectEl.innerHTML = '';

  currentSettings.providers.forEach(p => {
    const item = document.createElement('div');
    item.className = 'model-item';
    item.innerHTML = `
      <div class="model-info">
        <span class="model-name">${escapeHtml(p.label)}</span>
        <span class="model-sub">${p.type.toUpperCase()} - ${p.model}</span>
      </div>
      <div class="item-actions">
        <span class="btn-icon btn-edit" data-id="${p.id}" title="编辑">&#9998;</span>
        <span class="btn-icon btn-delete" data-id="${p.id}" title="删除">&times;</span>
      </div>
    `;
    listEl.appendChild(item);

    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.label;
    if (p.id === currentSettings.activeProviderId) option.selected = true;
    selectEl.appendChild(option);
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); deleteProvider(e.target.dataset.id); });
  });

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); startEdit(e.target.dataset.id); });
  });
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

function handleModelFormSubmit(e) {
  if(e) e.preventDefault();
  const label = document.getElementById('newLabel').value.trim();
  const type = document.getElementById('newType').value;
  const url = document.getElementById('newUrl').value.trim();
  const model = document.getElementById('newModelName').value.trim();
  const key = document.getElementById('newKey').value.trim();

  if (!label || !url || !key) {
    showStatus('\u274C 请填写显示名称、API 地址和 Key。', '#dc3545');
    return;
  }

  if (editingId) {
    const index = currentSettings.providers.findIndex(p => p.id === editingId);
    if (index !== -1) {
      currentSettings.providers[index] = { id: editingId, label, type, url, model, key };
      showStatus('\u2705 模型更新成功！', '#007bff');
    }
    cancelEdit();
  } else {
    const newProvider = { id: 'custom-' + Date.now(), label, type, url, model, key };
    currentSettings.providers.push(newProvider);
    currentSettings.activeProviderId = newProvider.id;
    clearForm();
    showStatus('\u2705 模型已添加到列表！', '#28a745');
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
      if (!imported.providers) throw new Error("配置文件格式错误。");
      currentSettings = { ...DEFAULT_SETTINGS, ...imported };
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

function showStatus(msg, color) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.style.color = color;
  setTimeout(() => el.textContent = '', 3000);
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
