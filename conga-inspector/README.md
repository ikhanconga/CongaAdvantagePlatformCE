# Conga Advantage Platform Inspector

A powerful Chrome extension for inspecting, debugging, and managing data on the Conga Advantage Platform - similar to Salesforce Inspector Reloaded but specifically designed for Conga.

## 🚀 Features

### Core Functionality
- **API Explorer**: Execute API calls directly from your browser with a built-in query builder
- **Data Browser**: Query and export data from any Conga object
- **Metadata Explorer**: Browse object definitions, fields, and relationships
- **Network Monitor**: Capture and analyze all API requests on Conga pages
- **Record Inspector**: View and export individual record data
- **Element Inspector**: Inspect page elements with enhanced debugging tools

### Advanced Features
- **Floating Panel**: On-page inspector panel with drag-and-drop functionality
- **Keyboard Shortcuts**: Quick access with customizable hotkeys
- **Data Export**: Export data in JSON, CSV, and Excel formats
- **Query Saving**: Save and reuse frequently used API queries
- **Real-time Monitoring**: Track API calls and page changes in real-time
- **Authentication Management**: Secure OAuth2 integration with token management

## 📦 Installation

### From Source (Development)
1. Clone or download this extension
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `conga-inspector` folder
5. The extension will appear in your extensions list

### Configuration
The extension is pre-configured with:
- **Client ID**: `6ebb98c7-dd82-4780-b1ac-c0dc3f7ed43e`
- **Client Secret**: `RK5h@?8gM_-6PEF@4-hzd73W`
- **Token URL**: `https://login-preview.congacloud.eu/api/v1/auth/connect/token`
- **API Base**: `https://rls-preview.congacloud.eu/api/data`
- **Platform Domain**: `https://rls-preview.congacloud.eu`

## 🛠️ Usage

### Getting Started
1. Navigate to any Conga Advantage Platform page (`*.congacloud.eu`)
2. Click the Conga Inspector icon in your toolbar
3. The extension will automatically authenticate and display connection status

### Main Interface
- **Popup**: Quick actions and status overview
- **Side Panel**: Full-featured API explorer and data browser
- **Content Panel**: Floating on-page inspector (press Ctrl+Shift+I)

### Keyboard Shortcuts
- `Ctrl+Shift+I`: Toggle floating inspector panel
- `Ctrl+Shift+E`: Start element inspection mode
- `Ctrl+Shift+A`: Open API explorer side panel

### API Explorer
1. Open the side panel (click "API Explorer" in popup)
2. Select HTTP method (GET, POST, PUT, DELETE, PATCH)
3. Enter endpoint (e.g., `/api/data/objects`)
4. Add query parameters as JSON
5. Add request body for POST/PUT operations
6. Click "Execute Query"

### Data Browser
1. Go to the "Data Browser" tab in side panel
2. Select an object from the dropdown
3. Specify fields to retrieve (or use * for all)
4. Add WHERE clause for filtering (optional)
5. Set result limit
6. Click "Query Data"

### Export Data
- **Individual Records**: Use "Export Record" in floating panel
- **Query Results**: Use "Export CSV" in data browser
- **Settings**: Configure export format in options page

## ⚙️ Configuration

### Settings Page
Access via popup → "Settings" or right-click extension icon → "Options"

#### Authentication
- View connection status
- Test API connectivity
- Refresh access tokens

#### General Settings
- Enable/disable debug logging
- Configure auto-refresh behavior
- Set API timeout values
- Adjust maximum results per query

#### Interface
- Choose theme (Light/Dark/Auto)
- Adjust font size
- Enable compact mode

#### Data & Export
- Default export format
- Date format preferences
- Include metadata options

#### Advanced
- Network request interception
- API response caching
- Custom headers
- Cache duration settings

## 🔧 Technical Details

### Architecture
- **Manifest V3**: Latest Chrome extension standard
- **Service Worker**: Background script for API calls and token management
- **Content Scripts**: Page enhancement and DOM interaction
- **Side Panel**: Advanced features interface
- **Popup**: Quick actions and status display

### Permissions
- `storage`: Save settings and cached data
- `activeTab`: Access current tab for content injection
- `scripting`: Inject content scripts dynamically
- `sidePanel`: Side panel interface
- `host_permissions`: Access to Conga domains

### Security
- OAuth2 authentication with client credentials
- Secure token storage using Chrome storage API
- CSP-compliant implementation
- No eval() or unsafe inline scripts

## 🐛 Troubleshooting

### Common Issues

#### Connection Failed
- Check internet connectivity
- Verify Conga platform is accessible
- Test credentials in options page
- Try refreshing access token

#### API Calls Failing
- Check endpoint URL format
- Verify request method and parameters
- Review network monitor for errors
- Check authentication status

#### Extension Not Loading
- Ensure all files are present
- Check Chrome console for errors
- Reload extension in chrome://extensions/
- Clear browser cache and restart

#### Content Script Not Working
- Refresh the Conga page
- Check if extension is enabled for the domain
- Verify host permissions in manifest
- Look for JavaScript errors in console

### Debug Mode
Enable debug logging in settings to see detailed console output:
1. Open extension options
2. Check "Enable debug logging"
3. Save settings
4. Open browser console (F12)
5. Look for "Conga Inspector" messages

## 📊 API Coverage

### Supported Endpoints
- `/api/data/objects` - List all objects
- `/api/data/{object}` - Query object data
- `/api/data/objects/{object}/describe` - Object metadata
- `/api/data/records/{id}` - Individual record access
- Custom endpoints via API explorer

### Authentication
- OAuth2 Client Credentials flow
- Automatic token refresh
- Secure credential storage
- Session management

## 🔄 Updates & Maintenance

### Version History
- **v1.0.0**: Initial release with core functionality

### Roadmap
- Enhanced data visualization
- Bulk data operations
- Advanced filtering options
- Custom dashboard creation
- Integration with external tools

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Make changes to source files
3. Test in Chrome developer mode
4. Submit pull requests with detailed descriptions

### Code Structure
```
conga-inspector/
├── manifest.json           # Extension configuration
├── background.js          # Service worker
├── popup.html/js          # Extension popup
├── sidepanel.html/js      # Side panel interface
├── options.html/js        # Settings page
├── content.js/css         # Content script
├── inject.js              # Page injection script
├── styles/                # CSS files
├── icons/                 # Extension icons
└── README.md              # Documentation
```

## 📄 License

This extension is provided as-is for use with Conga Advantage Platform. Ensure compliance with your organization's policies before use.

## 🆘 Support

For issues, questions, or feature requests:
1. Check troubleshooting section above
2. Review browser console for errors
3. Test with clean browser profile
4. Document steps to reproduce issues

## 🔐 Privacy & Security

- No data is sent to external servers
- All API calls go directly to Conga platform
- Credentials stored securely in browser
- No tracking or analytics
- Open source and auditable code

---

**Built for Conga Advantage Platform users who need powerful inspection and debugging tools similar to Salesforce Inspector Reloaded.**