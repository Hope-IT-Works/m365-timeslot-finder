// Test setup for Vitest + WXT
import { vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

// Provide chrome.identity.getRedirectURL (not implemented by fake-browser)
fakeBrowser.identity.getRedirectURL = () => 'https://mock-ext-id.chromiumapp.org/';

// Reset the in-memory browser state before each test
beforeEach(() => {
    fakeBrowser.reset();
});

// Mock i18n module to prevent fetch to chrome-extension:// URLs in tests
vi.mock('../utils/i18n.js', () => ({
    i18n: {
        getMessage: (key) => key,
        get locale() { return 'de'; },
        applyToDOM: vi.fn(),
        initPromise: Promise.resolve(),
        load: vi.fn().mockResolvedValue(undefined),
    },
}));

