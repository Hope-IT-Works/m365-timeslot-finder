// Authentication utility for Microsoft Graph API
export class AuthManager {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.refreshToken = null;
        this.userProfile = null;
        this.clientId = '';
        this.redirectUri = chrome.identity.getRedirectURL();
        this.scopes = [
            'openid',
            'profile',
            'offline_access',
            'User.Read',
            'User.ReadBasic.All',
            'Calendars.Read',
            'Calendars.Read.Shared'
        ];
        
        // Load client ID from storage asynchronously
        this.initPromise = this.loadClientId();
    }

    // Load client ID from storage
    async loadClientId() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['azureClientId'], (result) => {
                if (result.azureClientId) {
                    this.clientId = result.azureClientId;
                }
                resolve();
            });
        });
    }

    // Generate PKCE code verifier and challenge
    async generatePKCE() {
        const codeVerifier = this.generateRandomString(128);
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        return { codeVerifier, codeChallenge };
    }

    generateRandomString(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let result = '';
        const randomValues = new Uint8Array(length);
        crypto.getRandomValues(randomValues);
        for (let i = 0; i < length; i++) {
            result += charset[randomValues[i] % charset.length];
        }
        return result;
    }

    async generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return this.base64URLEncode(hash);
    }

    base64URLEncode(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    // Get OAuth token using Chrome Identity API with Microsoft
    async getAccessToken() {
        // Ensure client ID is loaded from storage
        await this.initPromise;

        // Check if we have a valid cached token
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        // Try to get token from storage first
        const stored = await this.getStoredToken();
        if (stored && stored.accessToken && stored.tokenExpiry && Date.now() < stored.tokenExpiry) {
            this.accessToken = stored.accessToken;
            this.tokenExpiry = stored.tokenExpiry;
            this.refreshToken = stored.refreshToken;
            return this.accessToken;
        }

        // Try to refresh token if available
        if (stored && stored.refreshToken) {
            try {
                return await this.refreshAccessToken(stored.refreshToken);
            } catch (error) {
                console.log('Token refresh failed, need to re-authenticate');
            }
        }

        // Need to authenticate – only possible if a client ID is configured
        if (!this.clientId) {
            throw new Error('No Azure Client ID configured');
        }
        return await this.authenticate();
    }

    // Authenticate using Microsoft OAuth flow with PKCE
    async authenticate() {
        const { codeVerifier, codeChallenge } = await this.generatePKCE();
        const authUrl = this.buildAuthUrl(codeChallenge);
        
        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow(
                {
                    url: authUrl,
                    interactive: true
                },
                async (redirectUrl) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    if (!redirectUrl) {
                        reject(new Error('No redirect URL received'));
                        return;
                    }

                    try {
                        // Parse the authorization code from the redirect URL
                        const code = this.parseCodeFromUrl(redirectUrl);
                        
                        if (!code) {
                            reject(new Error('No authorization code found in response'));
                            return;
                        }

                        // Exchange code for token
                        const tokens = await this.exchangeCodeForToken(code, codeVerifier);
                        
                        this.accessToken = tokens.access_token;
                        this.refreshToken = tokens.refresh_token;
                        // Token expires in seconds, convert to milliseconds
                        this.tokenExpiry = Date.now() + (tokens.expires_in * 1000);
                        
                        // Store tokens
                        await this.storeToken();
                        
                        resolve(this.accessToken);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    // Build Microsoft OAuth URL with PKCE
    buildAuthUrl(codeChallenge) {
        const scope = this.scopes.join(' ');
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: scope,
            response_mode: 'query',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });

        return `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?${params.toString()}`;
    }

    // Parse authorization code from redirect URL
    parseCodeFromUrl(url) {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('code');
    }

    // Exchange authorization code for access token
    async exchangeCodeForToken(code, codeVerifier) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            code: code,
            redirect_uri: this.redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier
        });

        const response = await fetch('https://login.microsoftonline.com/organizations/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
        }

        return await response.json();
    }

    // Refresh access token using refresh token
    async refreshAccessToken(refreshToken) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            scope: this.scopes.join(' ')
        });

        const response = await fetch('https://login.microsoftonline.com/organizations/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const tokens = await response.json();
        
        this.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
            this.refreshToken = tokens.refresh_token;
        }
        this.tokenExpiry = Date.now() + (tokens.expires_in * 1000);
        
        await this.storeToken();
        
        return this.accessToken;
    }

    // Store token in Chrome storage
    async storeToken() {
        return new Promise((resolve) => {
            chrome.storage.local.set({
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
                tokenExpiry: this.tokenExpiry
            }, resolve);
        });
    }

    // Get stored token from Chrome storage
    async getStoredToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['accessToken', 'refreshToken', 'tokenExpiry'], (result) => {
                resolve(result);
            });
        });
    }

    // Get user profile from Microsoft Graph
    async getUserProfile() {
        if (this.userProfile) {
            return this.userProfile;
        }

        const token = await this.getAccessToken();
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        this.userProfile = await response.json();
        return this.userProfile;
    }

    // Logout and clear tokens
    async logout() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.refreshToken = null;
        this.userProfile = null;
        
        // Clear stored tokens
        return new Promise((resolve) => {
            chrome.storage.local.remove(['accessToken', 'refreshToken', 'tokenExpiry'], () => {
                console.log('Logout: All tokens cleared');
                resolve();
            });
        });
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.accessToken !== null && this.tokenExpiry && Date.now() < this.tokenExpiry;
    }
}


