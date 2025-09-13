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

// Helper function to convert string to PascalCase
function toPascalCase(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

// Extract object type and record ID from Conga URL
function extractObjectDetailsFromUrl(callback) {
    chrome.runtime.sendMessage({
        action: "getActiveTab"
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            callback(null, null);
            return;
        }

        if (response && response.url) {
            const currentUrl = new URL(response.url);
            const pathSegments = currentUrl.pathname.split('/').filter(Boolean);

            const entityIndex = pathSegments.indexOf('entity');
            const entityIndexCLM = pathSegments.indexOf('clm');
            const entityIndexCPQ = pathSegments.indexOf('cpq');
            const entityIndexRevAdmin = pathSegments.indexOf('cadmin');

            if (entityIndexCLM !== -1 && entityIndexCLM + 1 < pathSegments.length) {
                let objectnameCLM = 'Agreement';
                const idCLM = pathSegments[pathSegments.length - 1];

                if (pathSegments.length > 3 && pathSegments[3] != undefined) {
                    const obName = toPascalCase(pathSegments[3]);
                    objectnameCLM = obName;
                    if (obName === 'Clause') {
                        objectnameCLM = 'AgreementClause';
                    }

                    if (obName === 'Approval') {
                        objectnameCLM = 'ApprovalRequest';
                    }
                }

                callback(objectnameCLM, idCLM);
            } else if (entityIndexCPQ !== -1 && entityIndexCPQ + 1 < pathSegments.length) {
                let objectnameCPQ = 'Proposal';
                const idCPQ = pathSegments[pathSegments.length - 1];
                
                if (pathSegments.length > 3 && pathSegments[3] != undefined) {
                    const obName = toPascalCase(pathSegments[3]);
                    objectnameCPQ = obName;

                    if (obName === 'Approval') {
                        objectnameCPQ = 'ApprovalRequest';
                    }
                }

                callback(objectnameCPQ, idCPQ);

            } else if (entityIndexRevAdmin !== -1 && entityIndexRevAdmin + 1 < pathSegments.length) {
                let objectnameRevAdmin = toPascalCase(pathSegments[entityIndexRevAdmin + 1]);

                if (objectnameRevAdmin === 'Catalog') {
                    objectnameRevAdmin = 'Category';
                }

                if (objectnameRevAdmin === 'AttributeRule') {
                    objectnameRevAdmin = 'ProductAttributeRule';
                }

                if (objectnameRevAdmin === 'VisibilityRule') {
                    objectnameRevAdmin = 'SearchFilter';
                }

                if (objectnameRevAdmin === 'Rollup') {
                    objectnameRevAdmin = 'FieldExpression';
                }

                if (objectnameRevAdmin === 'WaterfallList') {
                    objectnameRevAdmin = 'Waterfall';
                }

                const idRevAdmin = pathSegments[pathSegments.length - 1];

                if (pathSegments.length > 3 && pathSegments[3] != undefined) {
                    const obName = toPascalCase(pathSegments[3]);
                    objectnameRevAdmin = obName;

                    if (pathSegments[2] == 'edit') {
                        objectnameRevAdmin = toPascalCase(pathSegments[1]);

                        if (pathSegments.length > 4 && pathSegments[4] != undefined) {
                            objectnameRevAdmin = toPascalCase(pathSegments[4]);
                        }
                    }

                    if (objectnameRevAdmin === 'Approval') {
                        objectnameRevAdmin = 'ApprovalRequest';
                    }

                    if (objectnameRevAdmin === 'Catalog') {
                        objectnameRevAdmin = 'Category';
                    }
                }

                callback(objectnameRevAdmin, idRevAdmin);

            } else if (entityIndex !== -1 && entityIndex + 1 < pathSegments.length) {
                const objectname = pathSegments[entityIndex + 1];
                const id = pathSegments[pathSegments.length - 1];
                callback(objectname, id);
            } else {
                callback(null, null);
            }
        } else {
            callback(null, null);
        }
    });
}

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
            
            // Use the new URL extraction method
            extractObjectDetailsFromUrl((objectType, recordId) => {
                currentObjectSpan.textContent = objectType || 'Unknown';
                currentRecordIdSpan.textContent = recordId || 'N/A';
            });
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