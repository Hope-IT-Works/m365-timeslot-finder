# M365 Timeslot-Finder for Outlook

A modern Chrome Extension that finds free time slots in Microsoft 365 Outlook and provides them as copyable text.

## Features

- **Smart Slot Search**: Automatically finds free times for all attendees
- **Flexible Time Ranges**: Search any time period for available slots
- **Attendee Search**: Searchable list of all users in your organization
- **Copyable Text**: Easily share meeting suggestions via email or chat
- **Microsoft Design**: Modern UI in Microsoft Fluent Design with dark mode
- **Configurable**: Client ID changeable directly in the UI
- **Customizable Template**: Output format freely configurable with template variables
- **Multilingual**: UI available in German and English

## Prerequisites

### Azure AD App Registration

Before using the extension, register an app in Azure Active Directory:

1. **Open Azure Portal**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to "Azure Active Directory" > "App registrations"

2. **Register a new app**
   - Click "New registration"
   - Name: `M365 Timeslot-Finder for Outlook`
   - Supported account types: "Accounts in this organizational directory only"
   - Click "Register"

3. **Configure Authentication**
   - Go to "Authentication"
   - Click "Add a platform" > "Single-page application"
   - Redirect URI: `https://<extension-id>.chromiumapp.org/`
     - You will get the extension ID after loading the extension in Chrome (see below)
   - **Implicit Grant is not required** – the extension uses OAuth 2.0 Authorization Code Flow with PKCE; do not enable any tokens under "Implicit grant and hybrid flows"
   - Save

4. **Configure API Permissions**
   - Go to "API permissions"
   - Click "Add a permission" > "Microsoft Graph" > "Delegated permissions"
   - Add the following permissions:
     - `openid`
     - `profile`
     - `offline_access`
     - `User.Read`
     - `User.ReadBasic.All`
     - `Calendars.Read`
     - `Calendars.Read.Shared`
   - Click "Add permissions"
   - Optional: "Grant admin consent" (recommended)

5. **Copy the Client ID**
   - Go to "Overview"
   - Copy the "Application (client) ID"
   - This is required on first launch of the extension

## Installation

### Step 1: Load the Extension in Chrome

1. **Clone or download the repository**

   ```bash
   git clone https://github.com/Hope-IT-Works/m365-timeslot-finder.git
   cd m365-timeslot-finder
   ```

2. **Open Chrome**
   - Navigate to `chrome://extensions/`

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `m365-timeslot-finder` folder

5. **Note the Extension ID**
   - The extension ID is shown below the extension name
   - Format: `abcdefghijklmnopqrstuvwxyz123456`
   - This ID is needed for the Redirect URI in Azure AD (see above)

### Step 2: Configure the Extension

1. **Open the extension**
   - Click the extension icon in the Chrome toolbar
   - The extension opens as a **Side Panel** in the browser window

2. **Enter the Client ID**
   - Click the gear icon in the side panel to open Settings
   - Go to the **Azure AD** tab
   - Enter the Application (client) ID
   - The ID is stored in `chrome.storage.local` and can be changed at any time

3. **Update the Redirect URI in Azure AD**
   - The correct Redirect URI is displayed on the **Azure AD** settings tab and can be copied from there
   - Add the displayed URI to your Azure AD App Registration if not already done

## Usage

### 1. First Sign-In

- Click "Sign in with Microsoft"
- Sign in with your Microsoft 365 account
- Accept the requested permissions
- You will be automatically added as an attendee

### 2. Finding Time Slots

1. **Set the time range**
   - Select start and end of the search period
   - Select the desired meeting duration

2. **Select attendees**
   - Search for colleagues by name or email address
   - Select attendees from the list

3. **Start the search**
   - Click "Find Free Slots"
   - Available slots are displayed

4. **Copy a slot**
   - Click "Copy" on a slot to copy the formatted text

### Example Output

```text
1. Meeting Suggestion:
Date: Tuesday, 28.01.2026
Time: 14:00 - 15:00
Duration: 60 minutes
```

## Security & Privacy

- **No data storage**: Calendar data is never stored locally
- **Secure authentication**: OAuth 2.0 PKCE with Microsoft Identity Platform
- **Minimal permissions**: Read-only access to calendars
- **HTTPS only**: All API calls use encrypted connections
- **Tokens in memory only**: Access tokens are never written to disk

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for details.

## Development

### Technology Stack

- **Manifest V3**: Chrome Extension API with Side Panel
- **Vanilla JavaScript** (ES6+): No external frameworks
- **Microsoft Graph API**: Calendar and directory integration
- **OAuth 2.0 PKCE**: Authorization Code Flow without client secret
- **Bun**: Test runner (`bun test`)
- **web-ext**: Build and lint (`npm run build`, `npm run lint`)

### Project Structure

```text
m365-timeslot-finder/
├── manifest.json
├── package.json
├── bunfig.toml
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── styles.css
├── background/
│   └── background.js
├── utils/
│   ├── api.js              # GraphAPI class
│   ├── auth.js             # AuthManager class (PKCE OAuth)
│   └── i18n.js             # Runtime i18n module
├── _locales/
│   ├── de/messages.json
│   └── en/messages.json
├── assets/
│   └── icons/
├── tests/
│   ├── setup.js
│   ├── api.test.js
│   └── auth.test.js
├── PRIVACY_POLICY.md
├── PERMISSION_JUSTIFICATION.md
└── README.md
```

### Local Development

1. Edit files as needed – changes take effect after reloading the extension
2. Reload: `chrome://extensions/` → click the reload icon
3. Debug: right-click inside the side panel → "Inspect" → Chrome DevTools

### Running Tests

```bash
bun test
```

## Customization

### Adjusting Minimum Confidence

In [utils/api.js](utils/api.js), change the minimum confidence threshold for meeting suggestions:

```javascript
.filter(suggestion => suggestion.confidence >= 50) // 50%
```

### Maximum Number of Results

In [popup/popup.js](popup/popup.js), line 4:

```javascript
const MAX_DISPLAYED_SLOTS = 10;
```

### Output Template

The text format of copyable meeting suggestions is fully configurable via the gear icon → **Template** tab.

**Available Template Variables:**

| Variable | Description | Example |
| --- | --- | --- |
| `{{date}}` | Full date with weekday | `Tuesday, 28.01.2026` |
| `{{date_short}}` | Date without weekday | `28.01.2026` |
| `{{weekday}}` | Full weekday name | `Tuesday` |
| `{{weekday_short}}` | Abbreviated weekday | `Tue` |
| `{{day}}` | Day (without leading zero) | `28` |
| `{{day_long}}` | Day (with leading zero) | `28` |
| `{{month}}` | Month as number | `1` |
| `{{month_long}}` | Month with leading zero | `01` |
| `{{month_name}}` | Full month name | `January` |
| `{{month_name_short}}` | Abbreviated month name | `Jan` |
| `{{year}}` | Four-digit year | `2026` |
| `{{start_time}}` | Start time | `14:00` |
| `{{end_time}}` | End time | `15:00` |
| `{{duration}}` | Duration in minutes | `60` |
| `{{number}}` | Sequential slot number | `1` |
| `{{number_dot}}` | Period after number (or empty) | `.` |
| `{{number_space}}` | Space after number (or empty) | ` ` |

**Default Template:**

```text
{{number}}{{number_dot}}{{number_space}}Meeting Suggestion:
Date: {{date}}
Time: {{start_time}} - {{end_time}}
Duration: {{duration}} minutes
```

## Troubleshooting

### "Sign-in error"

- Check that the Client ID is correctly entered (Settings → Azure AD tab)
- Verify the Redirect URI in your Azure AD App Registration matches the one shown in settings
- Confirm the API permissions have been granted
- Ensure the "Single-page application" platform is configured (no Implicit Grant needed)

### "No free slots found"

- Expand the search period
- Reduce the number of attendees
- Shorten the meeting duration

### "Error retrieving calendar"

- Check your internet connection and sign-in status
- Check Chrome DevTools console for error details
- Try signing out and back in

### Extension does not load

- Reload the extension at `chrome://extensions/`
- Check the Chrome DevTools console for errors
- Verify `manifest.json` is valid

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome – please open a pull request or an issue at [github.com/Hope-IT-Works/m365-timeslot-finder](https://github.com/Hope-IT-Works/m365-timeslot-finder).

## Further Resources

- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Azure AD App Registration](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

---

**Note**: This extension requires a Microsoft 365 Business or Enterprise license with access to Exchange Online calendars.
