// Conga Inspector Side Panel Script
console.log('Conga Inspector: Side panel loaded');

// DOM elements
let currentTab = 'explorer';
let connectionStatus = 'disconnected';
let savedQueries = [];
let networkRequests = [];
let objects = [];

// Initialize side panel
async function initializeSidePanel() {
    console.log('Initializing side panel...');
    
    // Set up tab navigation
    setupTabNavigation();
    
    // Set up event listeners
    setupEventListeners();
    
    // Test connection
    await testConnection();
    
    // Initialize tabs
    await initializeExplorer();
    await initializeMetadata();
    await initializeDataBrowser();
    await initializeNetworkMonitor();
    
    console.log('Side panel initialized');
}

// Setup tab navigation
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
            
            currentTab = tabId;
            
            // Tab-specific initialization
            switch (tabId) {
                case 'metadata':
                    refreshObjectList();
                    break;
                case 'network':
                    refreshNetworkList();
                    break;
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // API Explorer
    document.getElementById('httpMethod').addEventListener('change', (e) => {
        const requestBodyGroup = document.getElementById('requestBodyGroup');
        if (['POST', 'PUT', 'PATCH'].includes(e.target.value)) {
            requestBodyGroup.style.display = 'block';
        } else {
            requestBodyGroup.style.display = 'none';
        }
    });
    
    document.getElementById('executeQuery').addEventListener('click', executeApiQuery);
    document.getElementById('clearQuery').addEventListener('click', clearQuery);
    document.getElementById('saveQuery').addEventListener('click', saveQuery);
    
    // Metadata
    document.getElementById('refreshObjects').addEventListener('click', refreshObjectList);
    document.getElementById('objectSearch').addEventListener('input', filterObjects);
    
    // Data Browser
    document.getElementById('queryData').addEventListener('click', queryData);
    document.getElementById('exportData').addEventListener('click', exportData);
    
    // Network Monitor
    document.getElementById('clearNetwork').addEventListener('click', clearNetworkList);
    document.getElementById('exportNetwork').addEventListener('click', exportNetworkLog);
}

// Test connection
async function testConnection() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    try {
        statusDot.className = 'status-dot connecting';
        statusText.textContent = 'Testing connection...';
        
        const response = await sendMessage({ action: 'getToken' });
        
        if (response.success) {
            connectionStatus = 'connected';
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Connected to Conga';
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        connectionStatus = 'error';
        statusDot.className = 'status-dot error';
        statusText.textContent = 'Connection failed';
    }
}

// Send message to background script
function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
    });
}

// Initialize Explorer tab
async function initializeExplorer() {
    // Load saved queries
    const stored = await chrome.storage.local.get(['savedQueries']);
    savedQueries = stored.savedQueries || [];
    updateSavedQueriesList();
    
    // Set default endpoint
    document.getElementById('apiEndpoint').value = '/api/data/objects';
}

// Execute API query
async function executeApiQuery() {
    const method = document.getElementById('httpMethod').value;
    const endpoint = document.getElementById('apiEndpoint').value;
    const queryParams = document.getElementById('queryParams').value;
    const requestBody = document.getElementById('requestBody').value;
    
    const responseStatus = document.getElementById('responseStatus');
    const responseTime = document.getElementById('responseTime');
    const responseBody = document.getElementById('responseBody');
    
    try {
        responseStatus.textContent = 'Executing...';
        responseStatus.className = 'response-status loading';
        responseTime.textContent = '';
        
        const startTime = Date.now();
        
        // Prepare request options
        const options = { method };
        
        // Add query parameters to URL
        let url = endpoint;
        if (queryParams.trim()) {
            try {
                const params = JSON.parse(queryParams);
                const urlParams = new URLSearchParams(params);
                url += (url.includes('?') ? '&' : '?') + urlParams.toString();
            } catch (e) {
                // If not valid JSON, treat as query string
                url += (url.includes('?') ? '&' : '?') + queryParams;
            }
        }
        
        // Add request body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
            try {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(JSON.parse(requestBody));
            } catch (e) {
                throw new Error('Invalid JSON in request body');
            }
        }
        
        const response = await sendMessage({
            action: 'apiCall',
            endpoint: url,
            options
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        responseTime.textContent = `${duration}ms`;
        
        if (response.success) {
            responseStatus.textContent = 'Success';
            responseStatus.className = 'response-status success';
            responseBody.textContent = JSON.stringify(response.data, null, 2);
        } else {
            responseStatus.textContent = 'Error';
            responseStatus.className = 'response-status error';
            responseBody.textContent = response.error;
        }
    } catch (error) {
        console.error('Query execution failed:', error);
        responseStatus.textContent = 'Error';
        responseStatus.className = 'response-status error';
        responseBody.textContent = error.message;
        responseTime.textContent = '';
    }
}

// Clear query form
function clearQuery() {
    document.getElementById('httpMethod').value = 'GET';
    document.getElementById('apiEndpoint').value = '/api/data/objects';
    document.getElementById('queryParams').value = '';
    document.getElementById('requestBody').value = '';
    document.getElementById('requestBodyGroup').style.display = 'none';
    
    document.getElementById('responseStatus').textContent = 'Ready';
    document.getElementById('responseStatus').className = 'response-status';
    document.getElementById('responseTime').textContent = '';
    document.getElementById('responseBody').textContent = 'Execute a query to see results...';
}

// Save query
async function saveQuery() {
    const name = prompt('Enter a name for this query:');
    if (!name) return;
    
    const query = {
        id: Date.now(),
        name,
        method: document.getElementById('httpMethod').value,
        endpoint: document.getElementById('apiEndpoint').value,
        queryParams: document.getElementById('queryParams').value,
        requestBody: document.getElementById('requestBody').value,
        timestamp: new Date().toISOString()
    };
    
    savedQueries.push(query);
    await chrome.storage.local.set({ savedQueries });
    updateSavedQueriesList();
}

// Update saved queries list
function updateSavedQueriesList() {
    const container = document.getElementById('savedQueries');
    
    if (savedQueries.length === 0) {
        container.innerHTML = '<div class="empty-state">No saved queries</div>';
        return;
    }
    
    container.innerHTML = savedQueries.map(query => `
        <div class="query-item" data-id="${query.id}">
            <span class="query-name">${query.name}</span>
            <span class="query-method">${query.method}</span>
            <div class="query-actions">
                <button class="query-load-btn" onclick="loadQuery(${query.id})">Load</button>
                <button class="query-delete-btn" onclick="deleteQuery(${query.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Load saved query
function loadQuery(queryId) {
    const query = savedQueries.find(q => q.id === queryId);
    if (!query) return;
    
    document.getElementById('httpMethod').value = query.method;
    document.getElementById('apiEndpoint').value = query.endpoint;
    document.getElementById('queryParams').value = query.queryParams;
    document.getElementById('requestBody').value = query.requestBody;
    
    // Show/hide request body based on method
    const requestBodyGroup = document.getElementById('requestBodyGroup');
    if (['POST', 'PUT', 'PATCH'].includes(query.method)) {
        requestBodyGroup.style.display = 'block';
    } else {
        requestBodyGroup.style.display = 'none';
    }
}

// Delete saved query
async function deleteQuery(queryId) {
    if (!confirm('Are you sure you want to delete this query?')) return;
    
    savedQueries = savedQueries.filter(q => q.id !== queryId);
    await chrome.storage.local.set({ savedQueries });
    updateSavedQueriesList();
}

// Initialize Metadata tab
async function initializeMetadata() {
    await refreshObjectList();
}

// Refresh object list
async function refreshObjectList() {
    const objectList = document.getElementById('objectList');
    objectList.innerHTML = '<div class="loading">Loading objects...</div>';
    
    try {
        const response = await sendMessage({
            action: 'apiCall',
            endpoint: '/api/data/objects',
            options: { method: 'GET' }
        });
        
        if (response.success) {
            objects = response.data.objects || response.data || [];
            updateObjectList();
        } else {
            objectList.innerHTML = '<div class="error">Failed to load objects: ' + response.error + '</div>';
        }
    } catch (error) {
        console.error('Failed to load objects:', error);
        objectList.innerHTML = '<div class="error">Failed to load objects</div>';
    }
}

// Update object list display
function updateObjectList() {
    const objectList = document.getElementById('objectList');
    const searchTerm = document.getElementById('objectSearch').value.toLowerCase();
    
    const filteredObjects = objects.filter(obj => {
        const name = (obj.name || obj.label || obj.apiName || '').toLowerCase();
        return name.includes(searchTerm);
    });
    
    if (filteredObjects.length === 0) {
        objectList.innerHTML = '<div class="empty-state">No objects found</div>';
        return;
    }
    
    objectList.innerHTML = filteredObjects.map(obj => `
        <div class="object-item" onclick="selectObject('${obj.name || obj.apiName}')">
            <div class="object-name">${obj.name || obj.label || obj.apiName}</div>
            <div class="object-type">${obj.type || 'Object'}</div>
        </div>
    `).join('');
}

// Filter objects based on search
function filterObjects() {
    updateObjectList();
}

// Select object to view details
async function selectObject(objectName) {
    const objectDetails = document.getElementById('objectDetails');
    objectDetails.innerHTML = '<div class="loading">Loading object details...</div>';
    
    try {
        const response = await sendMessage({
            action: 'apiCall',
            endpoint: `/api/data/objects/${objectName}/describe`,
            options: { method: 'GET' }
        });
        
        if (response.success) {
            displayObjectDetails(response.data);
        } else {
            objectDetails.innerHTML = '<div class="error">Failed to load object details: ' + response.error + '</div>';
        }
    } catch (error) {
        console.error('Failed to load object details:', error);
        objectDetails.innerHTML = '<div class="error">Failed to load object details</div>';
    }
}

// Display object details
function displayObjectDetails(objectData) {
    const objectDetails = document.getElementById('objectDetails');
    
    const fields = objectData.fields || [];
    
    objectDetails.innerHTML = `
        <div class="object-summary">
            <h4>${objectData.name || objectData.label}</h4>
            <p>${objectData.description || 'No description available'}</p>
            <div class="object-stats">
                <span class="stat">Fields: ${fields.length}</span>
                <span class="stat">Type: ${objectData.type || 'Standard'}</span>
            </div>
        </div>
        <div class="fields-list">
            <h5>Fields</h5>
            ${fields.map(field => `
                <div class="field-item">
                    <div class="field-name">${field.name}</div>
                    <div class="field-type">${field.type}</div>
                    <div class="field-description">${field.description || ''}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Initialize Data Browser tab  
async function initializeDataBrowser() {
    // Populate object dropdown
    const dataObject = document.getElementById('dataObject');
    if (objects.length === 0) {
        await refreshObjectList();
    }
    
    dataObject.innerHTML = '<option value="">Select Object</option>' +
        objects.map(obj => `<option value="${obj.name || obj.apiName}">${obj.name || obj.label || obj.apiName}</option>`).join('');
}

// Query data
async function queryData() {
    const objectName = document.getElementById('dataObject').value;
    const fields = document.getElementById('dataFields').value || '*';
    const whereClause = document.getElementById('dataWhere').value;
    const limit = document.getElementById('dataLimit').value || 10;
    
    if (!objectName) {
        alert('Please select an object');
        return;
    }
    
    const dataResults = document.getElementById('dataResults');
    dataResults.innerHTML = '<div class="loading">Querying data...</div>';
    
    try {
        let endpoint = `/api/data/${objectName}?limit=${limit}`;
        if (fields !== '*') {
            endpoint += `&fields=${encodeURIComponent(fields)}`;
        }
        if (whereClause) {
            endpoint += `&where=${encodeURIComponent(whereClause)}`;
        }
        
        const response = await sendMessage({
            action: 'apiCall',
            endpoint,
            options: { method: 'GET' }
        });
        
        if (response.success) {
            displayDataResults(response.data);
        } else {
            dataResults.innerHTML = '<div class="error">Query failed: ' + response.error + '</div>';
        }
    } catch (error) {
        console.error('Data query failed:', error);
        dataResults.innerHTML = '<div class="error">Query failed</div>';
    }
}

// Display data results
function displayDataResults(data) {
    const dataResults = document.getElementById('dataResults');
    const records = data.records || data.data || data || [];
    
    if (records.length === 0) {
        dataResults.innerHTML = '<div class="empty-state">No records found</div>';
        return;
    }
    
    // Create table
    const firstRecord = records[0];
    const columns = Object.keys(firstRecord);
    
    dataResults.innerHTML = `
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${records.map(record => `
                        <tr>
                            ${columns.map(col => `<td>${record[col] || ''}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="data-summary">
            Showing ${records.length} records
        </div>
    `;
}

// Export data as CSV
async function exportData() {
    const objectName = document.getElementById('dataObject').value;
    if (!objectName) {
        alert('Please query data first');
        return;
    }
    
    // This would implement CSV export functionality
    alert('Export functionality coming soon!');
}

// Initialize Network Monitor tab
async function initializeNetworkMonitor() {
    // Listen for network requests from content script
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        // This would be implemented to capture network requests
        refreshNetworkList();
    }
}

// Refresh network list
function refreshNetworkList() {
    const networkList = document.getElementById('networkList');
    
    if (networkRequests.length === 0) {
        networkList.innerHTML = `
            <div class="network-header">
                <span class="col-method">Method</span>
                <span class="col-url">URL</span>
                <span class="col-status">Status</span>
                <span class="col-time">Time</span>
            </div>
            <div class="network-empty">No network requests captured</div>
        `;
        return;
    }
    
    networkList.innerHTML = `
        <div class="network-header">
            <span class="col-method">Method</span>
            <span class="col-url">URL</span>
            <span class="col-status">Status</span>
            <span class="col-time">Time</span>
        </div>
        ${networkRequests.map(req => `
            <div class="network-item" onclick="selectNetworkRequest('${req.id}')">
                <span class="col-method method-${req.method.toLowerCase()}">${req.method}</span>
                <span class="col-url">${req.url}</span>
                <span class="col-status status-${req.status}">${req.status}</span>
                <span class="col-time">${new Date(req.timestamp).toLocaleTimeString()}</span>
            </div>
        `).join('')}
    `;
}

// Clear network list
function clearNetworkList() {
    networkRequests = [];
    refreshNetworkList();
}

// Export network log
function exportNetworkLog() {
    // This would implement HAR export functionality
    alert('Network export functionality coming soon!');
}

// Select network request for details
function selectNetworkRequest(requestId) {
    const request = networkRequests.find(req => req.id === requestId);
    if (!request) return;
    
    const requestDetails = document.getElementById('requestDetails');
    requestDetails.innerHTML = `
        <div class="request-summary">
            <h4>${request.method} ${request.url}</h4>
            <div class="request-meta">
                <span>Status: ${request.status}</span>
                <span>Time: ${new Date(request.timestamp).toLocaleString()}</span>
            </div>
        </div>
        <div class="request-data">
            <h5>Request</h5>
            <pre>${JSON.stringify(request.requestData || {}, null, 2)}</pre>
            <h5>Response</h5>
            <pre>${JSON.stringify(request.responseData || {}, null, 2)}</pre>
        </div>
    `;
}

// Make functions globally available
window.loadQuery = loadQuery;
window.deleteQuery = deleteQuery;
window.selectObject = selectObject;
window.selectNetworkRequest = selectNetworkRequest;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSidePanel);
} else {
    initializeSidePanel();
}