import { describe, test, expect } from 'vitest';
import { AuthManager } from '../utils/auth.js';

// ---------------------------------------------------------------------------
// AuthManager.generateRandomString
// ---------------------------------------------------------------------------
describe('AuthManager.generateRandomString', () => {
    const auth = new AuthManager();
    const ALLOWED_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

    test('returns a string of the requested length', () => {
        expect(auth.generateRandomString(32)).toHaveLength(32);
        expect(auth.generateRandomString(128)).toHaveLength(128);
    });

    test('uses only allowed PKCE characters', () => {
        const result = auth.generateRandomString(200);
        for (const char of result) {
            expect(ALLOWED_CHARSET).toContain(char);
        }
    });

    test('produces different strings on two consecutive calls', () => {
        const a = auth.generateRandomString(64);
        const b = auth.generateRandomString(64);
        expect(a).not.toBe(b);
    });
});

// ---------------------------------------------------------------------------
// AuthManager.base64URLEncode
// ---------------------------------------------------------------------------
describe('AuthManager.base64URLEncode', () => {
    const auth = new AuthManager();

    test('returns a Base64URL-safe string without +, / or =', () => {
        const buffer = new Uint8Array([0, 255, 128, 64, 1, 32, 16]).buffer;
        const result = auth.base64URLEncode(buffer);
        expect(result).not.toContain('+');
        expect(result).not.toContain('/');
        expect(result).not.toContain('=');
    });

    test('encodes an empty buffer as an empty string', () => {
        const buffer = new Uint8Array([]).buffer;
        expect(auth.base64URLEncode(buffer)).toBe('');
    });

    test('produces non-empty output for non-empty input', () => {
        const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
        expect(auth.base64URLEncode(buffer).length).toBeGreaterThan(0);
    });

    test('produces consistent output for the same input', () => {
        const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
        expect(auth.base64URLEncode(buffer)).toBe(auth.base64URLEncode(buffer));
    });
});

// ---------------------------------------------------------------------------
// AuthManager.generateCodeChallenge (async, uses crypto.subtle)
// ---------------------------------------------------------------------------
describe('AuthManager.generateCodeChallenge', () => {
    const auth = new AuthManager();

    test('returns a Base64URL-safe string', async () => {
        const challenge = await auth.generateCodeChallenge('test-verifier-string');
        expect(challenge).not.toContain('+');
        expect(challenge).not.toContain('/');
        expect(challenge).not.toContain('=');
        expect(challenge.length).toBeGreaterThan(0);
    });

    test('is deterministic – same input produces same output', async () => {
        const c1 = await auth.generateCodeChallenge('my-code-verifier');
        const c2 = await auth.generateCodeChallenge('my-code-verifier');
        expect(c1).toBe(c2);
    });

    test('different inputs produce different outputs', async () => {
        const c1 = await auth.generateCodeChallenge('verifier-alpha');
        const c2 = await auth.generateCodeChallenge('verifier-beta');
        expect(c1).not.toBe(c2);
    });
});

// ---------------------------------------------------------------------------
// AuthManager.parseCodeFromUrl
// ---------------------------------------------------------------------------
describe('AuthManager.parseCodeFromUrl', () => {
    const auth = new AuthManager();

    test('extracts the authorization code from a redirect URL', () => {
        const url = 'https://mock.chromiumapp.org/?code=abc123xyz&state=random';
        expect(auth.parseCodeFromUrl(url)).toBe('abc123xyz');
    });

    test('returns null when no code is present', () => {
        const url = 'https://mock.chromiumapp.org/?error=access_denied';
        expect(auth.parseCodeFromUrl(url)).toBeNull();
    });

    test('correctly handles URLs with multiple query parameters', () => {
        const url = 'https://mock.chromiumapp.org/?state=xyz&code=secret-code&session=42';
        expect(auth.parseCodeFromUrl(url)).toBe('secret-code');
    });
});

// ---------------------------------------------------------------------------
// AuthManager.isAuthenticated
// ---------------------------------------------------------------------------
describe('AuthManager.isAuthenticated', () => {
    test('returns false for a new instance without a token', () => {
        const auth = new AuthManager();
        expect(auth.isAuthenticated()).toBe(false);
    });

    test('returns true when a valid token is present', () => {
        const auth = new AuthManager();
        auth.accessToken = 'valid-token';
        auth.tokenExpiry = Date.now() + 60_000;
        expect(auth.isAuthenticated()).toBe(true);
    });

    test('returns false when the token has expired', () => {
        const auth = new AuthManager();
        auth.accessToken = 'expired-token';
        auth.tokenExpiry = Date.now() - 1000;
        expect(auth.isAuthenticated()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// AuthManager.buildAuthUrl
// ---------------------------------------------------------------------------
describe('AuthManager.buildAuthUrl', () => {
    test('builds a valid Microsoft OAuth URL', () => {
        const auth = new AuthManager();
        auth.clientId = 'test-client-id';
        auth.redirectUri = 'https://mock.chromiumapp.org/';
        const url = auth.buildAuthUrl('test-challenge');

        expect(url).toContain('login.microsoftonline.com');
        expect(url).toContain('client_id=test-client-id');
        expect(url).toContain('code_challenge=test-challenge');
        expect(url).toContain('code_challenge_method=S256');
        expect(url).toContain('response_type=code');
        expect(url).toContain('grant_type' in new URLSearchParams(url.split('?')[1]) ? '' : 'scope=');
    });

    test('includes all required OAuth 2.0 parameters', () => {
        const auth = new AuthManager();
        auth.clientId = 'my-app-id';
        auth.redirectUri = 'https://mock.chromiumapp.org/';
        const urlParams = new URLSearchParams(auth.buildAuthUrl('challenge').split('?')[1]);

        expect(urlParams.get('client_id')).toBe('my-app-id');
        expect(urlParams.get('response_type')).toBe('code');
        expect(urlParams.get('code_challenge_method')).toBe('S256');
        expect(urlParams.get('code_challenge')).toBe('challenge');
        expect(urlParams.get('redirect_uri')).toBe('https://mock.chromiumapp.org/');
    });
});
