// Conga Inspector Popup Script
console.log('Conga Inspector: Popup loaded');

// DOM elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const openSidePanelBtn = document.getElementById('openSidePanel');
const exportDataBtn = document.getElementById('exportData');
const importDataBtn = document.getElementById('importData');
const viewMetadataBtn = document.getElementById('viewMetadata');
const openOptionsBtn = document.getElementById('openOptions');
const viewLogsBtn = document.getElementById('viewLogs');
const refreshBtn = document.getElementById('refresh');
const activityList = document.getElementById('activityList');

// Stats elements
const apiCallsSpan = document.getElementById('apiCalls');
const lastSyncSpan = document.getElementById('lastSync');
const recordCountSpan = document.getElementById('recordCount');
const errorCountSpan = document.getElementById('errorCount');

// Page info elements
const currentObjectSpan = document.getElementById('currentObject');
const currentRecordIdSpan = document.getElementById('currentRecordId');
const currentUrlSpan = document.getElementById('currentUrl');
const pageInfoSection = document.getElementById('pageInfoSection');

// State
let isConnected = false;
let stats = {
    apiCalls: 0,
    lastSync: null,
    recordCount: 0,
    errorCount: 0
};

// Initialize popup
async function initializePopup() {
    try {
        updateStatus('connecting', 'Connecting...');
        
        // Test connection
        const response = await sendMessage({ action: 'getToken' });
        
        if (response.success) {
            isConnected = true;
            updateStatus('connected', 'Connected');
            addActivity('Connected to Conga platform');
            await loadStats();
            await loadCurrentPageInfo();
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Failed to initialize popup:', error);
        isConnected = false;
        updateStatus('error', 'Connection Failed');
        addActivity(`Connection failed: ${error.message}`, 'error');
    }
}

// Update connection status
function updateStatus(status, text) {
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = text;
}

// Send message to background script
function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
    });
}

// Add activity to list
function addActivity(message, type = 'info') {
    const activityItem = document.createElement('div');
    activityItem.className = `activity-item ${type}`;
    
    const time = new Date().toLocaleTimeString();
    activityItem.innerHTML = `
        <span class="activity-time">${time}</span>
        <span class="activity-desc">${message}</span>
    `;
    
    activityList.insertBefore(activityItem, activityList.firstChild);
    
    // Keep only last 5 activities
    while (activityList.children.length > 5) {
        activityList.removeChild(activityList.lastChild);
    }
}

// Load statistics
async function loadStats() {
    try {
        const stored = await chrome.storage.local.get(['stats']);
        if (stored.stats) {
            stats = { ...stats, ...stored.stats };
        }
        
        updateStatsDisplay();
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Update stats display
function updateStatsDisplay() {
    apiCallsSpan.textContent = stats.apiCalls || 0;
    recordCountSpan.textContent = stats.recordCount || 0;
    errorCountSpan.textContent = stats.errorCount || 0;
    lastSyncSpan.textContent = stats.lastSync ? 
        new Date(stats.lastSync).toLocaleTimeString() : 'Never';
}

// Load current page information
async function loadCurrentPageInfo() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (currentTab && currentTab.url.includes('congacloud.eu')) {
            pageInfoSection.style.display = 'block';
            currentUrlSpan.textContent = currentTab.url;
            
            // Try to extract object info from URL
            const urlParts = currentTab.url.split('/');
            if (urlParts.length > 3) {
                // This is a simplified extraction - would need to be enhanced based on actual Conga URL structure
                currentObjectSpan.textContent = urlParts[urlParts.length - 2] || 'Unknown';
                currentRecordIdSpan.textContent = urlParts[urlParts.length - 1] || 'N/A';
            }
        }
    } catch (error) {
        console.error('Failed to load page info:', error);
    }
}

// Event handlers
openSidePanelBtn.addEventListener('click', async () => {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.sidePanel.open({ tabId: tabs[0].id });
        addActivity('Opened API Explorer');
    } catch (error) {
        console.error('Failed to open side panel:', error);
        addActivity('Failed to open API Explorer', 'error');
    }
});

exportDataBtn.addEventListener('click', () => {
    addActivity('Export data feature clicked');
    // Will implement in next phase
    alert('Export feature coming soon!');
});

importDataBtn.addEventListener('click', () => {
    addActivity('Import data feature clicked');
    // Will implement in next phase
    alert('Import feature coming soon!');
});

viewMetadataBtn.addEventListener('click', () => {
    addActivity('View metadata feature clicked');
    // Will implement in next phase
    alert('Metadata browser coming soon!');
});

openOptionsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
});

viewLogsBtn.addEventListener('click', () => {
    addActivity('View logs clicked');
    alert('Logs feature coming soon!');
});

refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<span class="icon spin">🔄</span> Refreshing...';
    
    try {
        await initializePopup();
        addActivity('Data refreshed');
    } catch (error) {
        addActivity('Refresh failed', 'error');
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<span class="icon">🔄</span> Refresh';
    }
});

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', initializePopup);