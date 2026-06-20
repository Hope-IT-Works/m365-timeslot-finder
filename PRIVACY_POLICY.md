# Privacy Policy – M365 Timeslot-Finder for Outlook

Last updated: June 2026

## Overview

M365 Timeslot-Finder for Outlook ("the Extension") is a Chrome browser extension that connects to Microsoft 365 via the Microsoft Graph API to help users find available meeting time slots in their Outlook calendar.

## Data Collection

The Extension does **not** collect, store, transmit, or share any personal data with the developer or any third party.

## Data Access

To provide its functionality, the Extension accesses the following data via the Microsoft Graph API on behalf of the authenticated user:

- **Calendar availability** – Used to find free time slots (`/me/findMeetingTimes`). Calendar content is never stored or transmitted outside the user's browser session.
- **User profile** – Display name, email address, and User Principal Name are used solely to identify the signed-in user within the Extension's UI.
- **Directory users** – Basic profile information (name, email) of other users is queried to support attendee search. This data is only displayed in the UI and never persisted.

## Data Storage

- **Azure AD Client ID** – Stored locally in `chrome.storage.local` on the user's device. Never transmitted to the developer.
- **UI preferences** – Language selection, color theme, and output template are stored locally in `chrome.storage.local`.
- **Access tokens** – OAuth 2.0 access tokens are held in memory only for the duration of the browser session and are never written to disk.

No calendar data, user profile data, or directory data is ever written to local storage or transmitted to any server other than Microsoft's own API endpoints (`graph.microsoft.com`, `login.microsoftonline.com`).

## Third-Party Services

The Extension communicates exclusively with:

- **Microsoft Graph API** (`https://graph.microsoft.com`) – To query calendar and directory data.
- **Microsoft Identity Platform** (`https://login.microsoftonline.com`) – For OAuth 2.0 authentication.

No other third-party services, analytics platforms, or tracking tools are used.

## Permissions

| Permission | Reason |
| --- | --- |
| `identity` | Required to perform OAuth 2.0 authentication via `chrome.identity.launchWebAuthFlow` |
| `storage` | Required to persist user preferences and the Azure AD Client ID locally |
| `sidePanel` | Required to display the Extension as a Chrome Side Panel |
| `https://graph.microsoft.com/v1.0/*` | Required to call Microsoft Graph API v1.0 endpoints (`/me`, `/users`, `/me/findMeetingTimes`) |
| `https://login.microsoftonline.com/*` | Required for the OAuth 2.0 token exchange |

## User Control

- Users can log out at any time, which clears all in-memory tokens and profile data.
- Users can remove the Extension at any time via Chrome's extension management page, which removes all locally stored preferences.

## Contact

If you have questions about this privacy policy, please open an issue at:  
[https://github.com/Hope-IT-Works/m365-timeslot-finder](https://github.com/Hope-IT-Works/m365-timeslot-finder)
