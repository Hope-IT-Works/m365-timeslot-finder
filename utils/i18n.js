// Custom i18n utility — supports runtime language switching via chrome.storage.
// Loads messages from _locales/{lang}/messages.json independently of the browser UI language.
export const i18n = (() => {
    let messages = {};
    let _locale = 'de';

    const SUPPORTED = ['de', 'en'];

    async function load(locale) {
        const target = SUPPORTED.includes(locale) ? locale : 'de';
        const url = chrome.runtime.getURL(`_locales/${target}/messages.json`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load locale: ${target}`);
        messages = await response.json();
        _locale = target;
    }

    function getMessage(key, substitutions) {
        const entry = messages[key];
        if (!entry) return key;
        let msg = entry.message;
        // Resolve named placeholders (e.g. $COUNT$)
        if (entry.placeholders) {
            for (const [name, placeholder] of Object.entries(entry.placeholders)) {
                let value = placeholder.content;
                if (Array.isArray(substitutions)) {
                    const match = value.match(/^\$(\d+)$/);
                    if (match) {
                        const idx = parseInt(match[1]) - 1;
                        if (substitutions[idx] != null) value = String(substitutions[idx]);
                    }
                }
                msg = msg.replace(new RegExp('\\$' + name + '\\$', 'gi'), value);
            }
        }
        return msg;
    }

    function applyToDOM() {
        document.documentElement.lang = _locale;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const msg = getMessage(el.dataset.i18n);
            if (!msg || msg === el.dataset.i18n) return;
            if (el.childElementCount === 0) {
                el.textContent = msg;
            } else {
                for (let i = el.childNodes.length - 1; i >= 0; i--) {
                    if (el.childNodes[i].nodeType === Node.TEXT_NODE) {
                        el.childNodes[i].textContent = '\n' + msg + '\n';
                        break;
                    }
                }
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const msg = getMessage(el.dataset.i18nTitle);
            if (msg && msg !== el.dataset.i18nTitle) el.title = msg;
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const msg = getMessage(el.dataset.i18nPlaceholder);
            if (msg && msg !== el.dataset.i18nPlaceholder) el.placeholder = msg;
        });
    }

    async function init() {
        const stored = await new Promise(resolve =>
            chrome.storage.local.get(['language'], resolve)
        );
        let lang = stored.language;
        if (!lang || lang === 'auto') {
            lang = navigator.language.startsWith('de') ? 'de' : 'en';
        }
        await load(lang);
    }

    // Kick off loading immediately; main.js awaits initPromise before running
    const initPromise = init().catch(() => {
        // Locale loading failed (e.g. in test environments without fetch support)
    });

    return {
        initPromise,
        get locale() { return _locale; },
        getMessage,
        applyToDOM,
        // Switch language at runtime (called from saveSettings)
        async setLanguage(lang) {
            chrome.storage.local.set({ language: lang });
            const resolved = (!lang || lang === 'auto')
                ? (navigator.language.startsWith('de') ? 'de' : 'en')
                : lang;
            await load(resolved);
            applyToDOM();
        }
    };
})();
