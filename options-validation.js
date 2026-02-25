// options-validation.js — Pure data validation, normalization, and payload builders.
// Loaded before options.js via <script> tag in options.html.

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
  if (!label || !url) {
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

function normalizeProviderKeys(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const keys = {};
  Object.keys(value).forEach((providerId) => {
    const key = normalizeString(value[providerId]);
    if (key) keys[providerId] = key;
  });
  return keys;
}

function mergeProvidersWithKeys(providersInput, localKeys) {
  const sourceProviders = Array.isArray(providersInput) && providersInput.length > 0
    ? providersInput
    : DEFAULT_PROVIDERS;
  const mergedKeys = { ...localKeys };
  let migrated = false;
  const providers = sourceProviders.map((provider, index) => {
    const normalized = sanitizeProviderShape(provider, index);
    const syncKey = normalizeString(provider && provider.key);
    if (syncKey && !mergedKeys[normalized.id]) {
      mergedKeys[normalized.id] = syncKey;
      migrated = true;
    }
    return {
      ...normalized,
      key: mergedKeys[normalized.id] || syncKey
    };
  });
  return { providers, keyMap: mergedKeys, migrated };
}

function sanitizeProviderShape(provider, index) {
  const safeProvider = provider && typeof provider === 'object' && !Array.isArray(provider) ? provider : {};
  const id = getProviderId(safeProvider, index);
  const type = normalizeString(safeProvider.type);
  const normalizedType = (type === 'openai' || type === 'google') ? type : 'openai';
  return {
    id,
    label: normalizeString(safeProvider.label),
    type: normalizedType,
    url: normalizeString(safeProvider.url),
    model: normalizeString(safeProvider.model),
    key: normalizeString(safeProvider.key)
  };
}

function buildSyncSettingsPayload() {
  return {
    ...currentSettings,
    providers: currentSettings.providers.map((provider, index) => {
      const normalized = sanitizeProviderShape(provider, index);
      return { ...normalized, key: '' };
    })
  };
}

function buildProviderKeysPayload() {
  const keyMap = {};
  currentSettings.providers.forEach((provider, index) => {
    const normalized = sanitizeProviderShape(provider, index);
    if (normalized.key) keyMap[normalized.id] = normalized.key;
  });
  return keyMap;
}

function buildExportSettings(includeKeys) {
  return {
    ...currentSettings,
    providers: currentSettings.providers.map((provider, index) => {
      const normalized = sanitizeProviderShape(provider, index);
      return {
        ...normalized,
        key: includeKeys ? normalized.key : ''
      };
    })
  };
}

function getProviderId(provider, index) {
  return normalizeString(provider && provider.id) || `provider-${index}`;
}

function getProviderTypeLabel(type) {
  if (type === 'openai') return t('provider_type_openai');
  if (type === 'google') return t('provider_type_google');
  return (typeof type === 'string' ? type : 'UNKNOWN').toUpperCase();
}
