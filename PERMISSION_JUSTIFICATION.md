# Permission Justification

## `identity`

Used to authenticate the user with their Microsoft 365 account via OAuth 2.0 PKCE flow through `chrome.identity.launchWebAuthFlow`. This is required to obtain an access token for the Microsoft Graph API without storing user credentials.

## `storage`

Used to persist the user-provided Azure AD Client ID, output template, language preference, and color theme locally on the device via `chrome.storage.local`. No sensitive or personal data is stored.

## `sidePanel`

The extension's entire UI is presented as a Chrome Side Panel, which opens when the user clicks the extension icon. This is the only UI surface used by the extension.

## Host permission: `https://graph.microsoft.com/v1.0/*`

Required to call Microsoft Graph API v1.0 endpoints on behalf of the signed-in user:

- `GET /v1.0/me` – retrieves the signed-in user's profile
- `GET /v1.0/users` – searches for other Microsoft 365 users as meeting attendees
- `POST /v1.0/me/findMeetingTimes` – finds free meeting time slots in the user's calendar

The permission is scoped to `/v1.0/` only. Beta and v2.0 endpoints are not used.

## Host permission: `https://login.microsoftonline.com/*`

Required for the OAuth 2.0 authorization code request and access token exchange during the Microsoft 365 sign-in flow.
