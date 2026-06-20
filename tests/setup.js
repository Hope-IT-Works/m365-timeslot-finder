// Chrome API mock – loaded before all tests via bunfig.toml preload

globalThis.chrome = {
    i18n: {
        getMessage: (key) => key,
        getUILanguage: () => 'de-DE',
    },
    identity: {
        getRedirectURL: () => 'https://mock-ext-id.chromiumapp.org/',
        launchWebAuthFlow: (_opts, callback) => callback(null),
    },
    storage: {
        local: {
            get: (_keys, callback) => callback({}),
            set: (_items, callback) => callback?.(),
            remove: (_keys, callback) => callback?.(),
        },
    },
    runtime: {
        lastError: null,
        getURL: (path) => `chrome-extension://mock-ext-id/${path}`,
    },
};

// i18n mock (utils/i18n.js is an IIFE global; api.js references it directly)
globalThis.i18n = {
    getMessage: (key) => key,
    get locale() { return 'de'; },
    applyToDOM: () => {},
    initPromise: Promise.resolve(),
};

// Minimal authManager mock so that api.js can initialise its singleton
globalThis.authManager = {
    getAccessToken: async () => 'mock-token',
};
