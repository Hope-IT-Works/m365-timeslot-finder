import { defineConfig } from 'wxt';

export default defineConfig({
    browser: 'chrome',
    manifest: {
        name: '__MSG_appName__',
        version: '1.0.0',
        description: '__MSG_appDescription__',
        default_locale: 'en',
        permissions: ['identity', 'storage', 'sidePanel'],
        host_permissions: [
            'https://graph.microsoft.com/v1.0/*',
            'https://login.microsoftonline.com/*',
        ],
        content_security_policy: {
            extension_pages: "script-src 'self'; object-src 'self'",
        },
        icons: {
            16: '/assets/icons/icon16.png',
            48: '/assets/icons/icon48.png',
            128: '/assets/icons/icon128.png',
        },
        action: {
            default_title: '__MSG_appName__',
            default_icon: {
                16: '/assets/icons/icon16.png',
                48: '/assets/icons/icon48.png',
                128: '/assets/icons/icon128.png',
            },
        },
    },
});
