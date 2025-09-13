// Conga Inspector Options Script
console.log('Conga Inspector: Options page loaded');

// Default settings
const DEFAULT_SETTINGS = {
    enableLogging: true,
    autoRefresh: true,
    showNotifications: true,
    apiTimeout: 30,
    maxResults: 100,
    theme: 'light',
    fontSize: 'medium',
    compactMode: false,
    exportFormat: 'json',
    includeMetadata: true,
    dateFormat: 'short',
    interceptNetworkRequests: true,
    cacheApiResponses: false,
    cacheDuration: 5,
    customHeaders: '{}'
};

// Current settings
let currentSettings = { ...DEFAULT_SETTINGS };

// Initialize options page
async function initializeOptions() {
    console.log('Initializing options page...');
    
    // Load settings from storage
    await loadSettings();
    
    // Populate form fields
    populateFormFields();
    
    // Setup event listeners
    setupEventListeners();
    
    // Test connection on load
    await testConnection();
    
    console.log('Options page initialized');
}

// Load settings from storage
async function loadSettings() {
    try {
        const stored = await chrome.storage.local.get(['settings']);
        if (stored.settings) {
            currentSettings = { ...DEFAULT_SETTINGS, ...stored.settings };
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Save settings to storage
async function saveSettings() {
    try {
        await chrome.storage.local.set({ settings: currentSettings });
        showStatusMessage('Settings saved successfully!', 'success');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showStatusMessage('Failed to save settings', 'error');
    }
}

// Populate form fields with current settings
function populateFormFields() {
    // Authentication (read-only)
    document.getElementById('clientId').value = '6ebb98c7-dd82-4780-b1ac-c0dc3f7ed43e';
    document.getElementById('clientSecret').value = 'RK5h@?8gM_-6PEF@4-hzd73W';
    document.getElementById('tokenUrl').value = 'https://login-preview.congacloud.eu/api/v1/auth/connect/token';
    document.getElementById('apiBaseUrl').value = 'https://rls-preview.congacloud.eu/api/data';
    
    // General settings
    document.getElementById('enableLogging').checked = currentSettings.enableLogging;
    document.getElementById('autoRefresh').checked = currentSettings.autoRefresh;
    document.getElementById('showNotifications').checked = currentSettings.showNotifications;
    document.getElementById('apiTimeout').value = currentSettings.apiTimeout;
    document.getElementById('maxResults').value = currentSettings.maxResults;
    
    // Interface settings
    document.getElementById('theme').value = currentSettings.theme;
    document.getElementById('fontSize').value = currentSettings.fontSize;
    document.getElementById('compactMode').checked = currentSettings.compactMode;
    
    // Data & Export settings
    document.getElementById('exportFormat').value = currentSettings.exportFormat;
    document.getElementById('includeMetadata').checked = currentSettings.includeMetadata;
    document.getElementById('dateFormat').value = currentSettings.dateFormat;
    
    // Advanced settings
    document.getElementById('interceptNetworkRequests').checked = currentSettings.interceptNetworkRequests;
    document.getElementById('cacheApiResponses').checked = currentSettings.cacheApiResponses;
    document.getElementById('cacheDuration').value = currentSettings.cacheDuration;
    document.getElementById('customHeaders').value = currentSettings.customHeaders;
}

// Setup event listeners
function setupEventListeners() {
    // Authentication
    document.getElementById('testConnection').addEventListener('click', testConnection);
    document.getElementById('refreshToken').addEventListener('click', refreshToken);
    
    // Settings form changes
    const formElements = [
        'enableLogging', 'autoRefresh', 'showNotifications', 'apiTimeout', 'maxResults',
        'theme', 'fontSize', 'compactMode', 'exportFormat', 'includeMetadata',
        'dateFormat', 'interceptNetworkRequests', 'cacheApiResponses', 'cacheDuration', 'customHeaders'
    ];
    
    formElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('change', updateSetting);
            element.addEventListener('input', updateSetting);
        }
    });
    
    // Action buttons
    document.getElementById('saveSettings').addEventListener('click', handleSaveSettings);
    document.getElementById('resetSettings').addEventListener('click', resetSettings);
    document.getElementById('exportSettings').addEventListener('click', exportSettings);
    document.getElementById('importSettings').addEventListener('click', importSettings);
    
    // Import file handler
    document.getElementById('importFile').addEventListener('change', handleImportFile);
    
    // Theme change handler
    document.getElementById('theme').addEventListener('change', applyTheme);
    
    // Apply initial theme
    applyTheme();
}

// Update setting when form field changes
function updateSetting(event) {
    const element = event.target;
    const settingName = element.id;
    
    let value;
    if (element.type === 'checkbox') {
        value = element.checked;
    } else if (element.type === 'number') {
        value = parseInt(element.value) || 0;
    } else {
        value = element.value;
    }
    
    currentSettings[settingName] = value;
    
    // Special handling for certain settings
    if (settingName === 'customHeaders') {
        try {
            JSON.parse(value);
            element.style.borderColor = '';
        } catch (error) {
            element.style.borderColor = '#dc3545';
        }
    }
}

// Test connection to Conga API
async function testConnection() {
    const statusDot = document.getElementById('authStatusDot');
    const statusText = document.getElementById('authStatusText');
    const testBtn = document.getElementById('testConnection');
    
    try {
        statusDot.className = 'status-indicator connecting';
        statusText.textContent = 'Testing connection...';
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        
        const response = await sendMessage({ action: 'getToken' });
        
        if (response.success) {
            statusDot.className = 'status-indicator connected';
            statusText.textContent = 'Connected successfully';
            showStatusMessage('Connection test successful!', 'success');
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        statusDot.className = 'status-indicator error';
        statusText.textContent = 'Connection failed';
        showStatusMessage('Connection test failed: ' + error.message, 'error');
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Test Connection';
    }
}

// Refresh access token
async function refreshToken() {
    const refreshBtn = document.getElementById('refreshToken');
    
    try {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
        
        // Clear stored token
        await chrome.storage.local.remove(['accessToken', 'tokenExpiry']);
        
        // Get new token
        const response = await sendMessage({ action: 'getToken' });
        
        if (response.success) {
            showStatusMessage('Token refreshed successfully!', 'success');
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        showStatusMessage('Token refresh failed: ' + error.message, 'error');
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh Token';
    }
}

// Handle save settings button
async function handleSaveSettings() {
    const saveBtn = document.getElementById('saveSettings');
    
    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        // Validate custom headers
        try {
            JSON.parse(currentSettings.customHeaders);
        } catch (error) {
            throw new Error('Invalid JSON in custom headers');
        }
        
        await saveSettings();
    } catch (error) {
        console.error('Save failed:', error);
        showStatusMessage('Save failed: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Settings';
    }
}

// Reset settings to defaults
async function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        return;
    }
    
    try {
        currentSettings = { ...DEFAULT_SETTINGS };
        populateFormFields();
        await saveSettings();
        showStatusMessage('Settings reset to defaults', 'success');
    } catch (error) {
        console.error('Reset failed:', error);
        showStatusMessage('Reset failed: ' + error.message, 'error');
    }
}

// Export settings to file
function exportSettings() {
    try {
        const settingsData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            settings: currentSettings
        };
        
        const dataStr = JSON.stringify(settingsData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `conga-inspector-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showStatusMessage('Settings exported successfully!', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showStatusMessage('Export failed: ' + error.message, 'error');
    }
}

// Import settings from file
function importSettings() {
    document.getElementById('importFile').click();
}

// Handle import file selection
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            if (!importData.settings) {
                throw new Error('Invalid settings file format');
            }
            
            // Merge imported settings with defaults
            currentSettings = { ...DEFAULT_SETTINGS, ...importData.settings };
            populateFormFields();
            await saveSettings();
            
            showStatusMessage('Settings imported successfully!', 'success');
        } catch (error) {
            console.error('Import failed:', error);
            showStatusMessage('Import failed: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
    
    // Clear file input
    event.target.value = '';
}

// Apply theme
function applyTheme() {
    const theme = document.getElementById('theme').value;
    const body = document.body;
    
    body.className = body.className.replace(/theme-\w+/, '');
    
    if (theme === 'dark') {
        body.classList.add('theme-dark');
    } else if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            body.classList.add('theme-dark');
        }
    }
}

// Show status message
function showStatusMessage(message, type = 'info') {
    // Create status message element
    const statusMessage = document.createElement('div');
    statusMessage.className = `status-message ${type}`;
    statusMessage.textContent = message;
    
    // Style the message
    statusMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            statusMessage.style.backgroundColor = '#28a745';
            break;
        case 'error':
            statusMessage.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            statusMessage.style.backgroundColor = '#ffc107';
            statusMessage.style.color = '#333';
            break;
        default:
            statusMessage.style.backgroundColor = '#007bff';
    }
    
    document.body.appendChild(statusMessage);
    
    // Animate in
    setTimeout(() => {
        statusMessage.style.opacity = '1';
        statusMessage.style.transform = 'translateY(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        statusMessage.style.opacity = '0';
        statusMessage.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (statusMessage.parentNode) {
                statusMessage.parentNode.removeChild(statusMessage);
            }
        }, 300);
    }, 3000);
}

// Send message to background script
function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOptions);
} else {
    initializeOptions();
}