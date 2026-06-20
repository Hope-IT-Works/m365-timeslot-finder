# Timeslot Finder - Chrome Extension for Microsoft 365 Outlook

## Project Overview

A modern Chrome Extension that opens as a **Side Panel** and finds free time slots in Microsoft 365 Outlook, presenting them as copyable text with a customizable template.

## Functional Requirements

### Core Functionality
- Search for available time slots in the Microsoft 365 Outlook calendar
- Consider the availability of multiple attendees
- Generate copyable text for meeting suggestions using a user-defined template

### Input Parameters

1. **Start Time (Datetime)**
   - Date and time for the beginning of the search period
   - Validation: Must be in the future

2. **End Time (Datetime)**
   - Date and time for the end of the search period
   - Validation: Must be after start time

3. **Meeting Duration (Duration)**
   - Desired length of the meeting in minutes
   - Values: 15, 30, 45, 60, 90, 120 minutes
   - Validation: Minimum 15 minutes, maximum 8 hours

4. **Required Attendees**
   - Searchable checkbox list
   - Supports search by name or email address
   - Multiple selection possible
   - Integration with Microsoft Graph API for people search

### Output
- List of available time slots
- Each slot shows: date, start time, end time
- Per-slot copy button and a "Copy All" button
- Output format is fully customizable via a template with named placeholders (e.g. `{{datum}}`, `{{startzeit}}`, `{{dauer}}`)
- Default template (German):
  ```
  Terminvorschlag:
  Datum: {{datum}}
  Uhrzeit: {{startzeit}} – {{endzeit}} Uhr
  Dauer: {{dauer}} Minuten
  ```

## Technical Requirements

### Technology Stack
- **Chrome Extension Manifest V3**
- **Side Panel** (not popup) as the primary UI surface (`chrome.sidePanel` API)
- **Microsoft Graph API** for Outlook integration
- **OAuth 2.0 with PKCE** for authentication
- **Vanilla JavaScript** (ES6+)
- **Modern CSS** for UI styling
- **WXT** as build framework (`bun run build`, `bun run build:zip`)
- **Vitest** as test runner (`bun run test`)

### API Integration

#### Microsoft Graph API Endpoints
- `POST /me/findMeetingTimes` – Find available time slots (delegated authentication)
- `GET /users` – Search users by name or email (OData `$filter`)
- Required Permissions (Delegated):
  - `Calendars.Read`
  - `Calendars.Read.Shared`
  - `User.Read`
  - `User.ReadBasic.All`

#### Authentication
- OAuth 2.0 with PKCE via `chrome.identity.launchWebAuthFlow`
- Azure AD Client ID is stored by the user in `chrome.storage.local` (key: `azureClientId`) — never hardcoded
- Redirect URI is obtained via `chrome.identity.getRedirectURL()`
- Tokens are cached in memory; access token expiry is tracked
- The `AuthManager` class lives in `utils/auth.js`

### Internationalization
- Manifest `default_locale` is `de`; supported locales: `de`, `en`
- All UI strings use `_locales/{de,en}/messages.json`
- Runtime language switching (independent of browser UI language) is handled by the custom `i18n` module in `utils/i18n.js`
- `i18n.load(locale)` fetches the appropriate `messages.json` at runtime
- DOM elements use `data-i18n` / `data-i18n-title` attributes; `i18n.applyToDOM()` applies translations
- The user-selected language is persisted in `chrome.storage.local`

### Settings
- **Azure AD tab**: Input field for the Client ID; displays the Redirect URI (with copy button)
- **Template tab**: Free-text editor for the output template; list of available placeholders; live preview; reset to default

### File Structure
```
timeslot-finder/
├── .github/
│   └── copilot-instructions.md
├── wxt.config.js           # WXT configuration (replaces manifest.json)
├── vitest.config.js        # Vitest + WxtVitest plugin configuration
├── package.json            # devDependencies: wxt, vitest
├── entrypoints/
│   ├── background.js       # Service worker (defineBackground); opens side panel
│   └── sidepanel/
│       ├── index.html      # Side panel HTML
│       ├── main.js         # Side panel entry script (imports utils as ES modules)
│       └── style.css
├── public/
│   ├── assets/
│   │   └── icons/
│   │       ├── icon16.png
│   │       ├── icon48.png
│   │       └── icon128.png
│   └── _locales/
│       ├── de/
│       │   └── messages.json
│       └── en/
│           └── messages.json
├── utils/
│   ├── api.js              # GraphAPI class (ES module export)
│   ├── auth.js             # AuthManager class (PKCE OAuth, ES module export)
│   └── i18n.js             # Custom i18n module (ES module export)
├── tests/
│   ├── setup.js            # Vitest setup: fakeBrowser reset + i18n mock
│   ├── api.test.js
│   └── auth.test.js
└── README.md
```

### Manifest Permissions
```json
"permissions": ["identity", "storage", "sidePanel"]
"host_permissions": ["https://graph.microsoft.com/*", "https://login.microsoftonline.com/*"]
```

## UI/UX Requirements

### Design Principles
- **Modern and minimalist**: Clean, uncluttered interface
- **Microsoft Fluent Design**: Aligned with Microsoft 365 design language
- **Responsive**: Works in various side panel widths
- **Intuitive**: Self-explanatory without instructions

### Components
1. **Header**: Title, theme toggle (light/dark), language selector, settings button, logout button
2. **Setup Hint**: Shown when no Client ID is configured; links to settings
3. **Authentication**: Login button for Microsoft account (shown when not signed in)
4. **Search Form**:
   - Date/time pickers for start and end time
   - Dropdown for meeting duration
   - Searchable attendee list with checkboxes (real-time Graph API search)
5. **Results Display**:
   - Count of found slots
   - Per-slot copy button
   - "Copy All" button
6. **Settings Dialog**: Azure AD tab + Template tab
7. **Status Indicators**: Loading spinner, validation error messages, toast notifications

### Interactions
- Real-time attendee search (debounced)
- Input validation before API call
- Visual feedback for copy actions (button label changes briefly)
- Toast notifications for login/logout/search errors

## Security & Privacy

### Privacy
- No local storage of calendar data
- Tokens stored only in memory (not persisted to disk)
- Client ID stored in `chrome.storage.local` (user-provided)
- Minimum necessary permissions requested

### Security
- HTTPS for all API calls
- PKCE prevents authorization code interception
- OData query values are escaped (single quotes doubled) before URL encoding
- Content Security Policy: `script-src 'self'; object-src 'self'`
- Input validation for all user inputs

## Development Guidelines

### Code Quality
- Modular structure with separation of concerns (`AuthManager`, `GraphAPI`, `i18n`)
- Error handling for all API calls with user-facing i18n error messages
- No hardcoded credentials

### Best Practices
- ES6+ features, async/await throughout
- Chrome Extension Manifest V3 patterns
- `chrome.storage.local` for all persistent state

### Testing
- Test runner: **Vitest** (`bun run test`)
- WXT fake-browser polyfill in `tests/setup.js` (via `wxt/testing/fake-browser`)
- `utils/i18n.js` is mocked in setup to prevent `fetch` calls to `chrome-extension://` URLs
- Unit tests for `GraphAPI` (`tests/api.test.js`) and `AuthManager` (`tests/auth.test.js`)
- Build via `wxt` (`bun run build`), ZIP for Chrome Web Store via `bun run build:zip`

## Deployment & Installation

### Prerequisites
1. Azure AD App Registration with:
   - Redirect URI: `https://<extension-id>.chromiumapp.org/` (type: Single-page application)
   - API permissions: `Calendars.Read`, `Calendars.Read.Shared`, `User.Read`, `User.ReadBasic.All`

### Installation
1. Load extension in Chrome via Developer Mode
2. Open the side panel, enter the Azure AD Client ID in Settings
3. Sign in with Microsoft account and accept permissions
4. Ready to use

## Future Enhancements (Optional)

- Direct meeting creation from the extension
- Integration with Teams for online meetings
- Preferences for preferred times of day
- Consideration of working hours (e.g. 09–17, Mon–Fri) and time zones
- Export to various formats (iCal, etc.)

## Support & Documentation

- README with installation instructions
- Link to Microsoft Graph API documentation
