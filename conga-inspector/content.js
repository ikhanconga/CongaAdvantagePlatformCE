// Conga Inspector Content Script
console.log('Conga Inspector: Content script loaded');

// Configuration
const INSPECTOR_ID = 'conga-inspector-panel';
let inspectorPanel = null;
let isInjected = false;

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

// Initialize content script
function initializeContentScript() {
    if (isInjected) return;
    
    console.log('Initializing Conga Inspector on:', window.location.href);
    
    // Add inspector panel to page
    createInspectorPanel();
    
    // Add keyboard shortcuts
    addKeyboardShortcuts();
    
    // Monitor page changes
    observePageChanges();
    
    // Inject page enhancement script
    injectPageScript();
    
    isInjected = true;
}

// Create floating inspector panel
function createInspectorPanel() {
    if (document.getElementById(INSPECTOR_ID)) return;
    
    const panel = document.createElement('div');
    panel.id = INSPECTOR_ID;
    panel.className = 'conga-inspector-panel';
    panel.innerHTML = `
        <div class="inspector-header">
            <span class="inspector-title">🔍 Conga Inspector</span>
            <div class="inspector-controls">
                <button class="inspector-btn" id="minimizePanel" title="Minimize">−</button>
                <button class="inspector-btn" id="closePanel" title="Close">×</button>
            </div>
        </div>
        <div class="inspector-content" id="inspectorContent">
            <div class="inspector-section">
                <h4>Quick Actions</h4>
                <div class="inspector-actions">
                    <button class="action-button" id="inspectElement">Inspect Element</button>
                    <button class="action-button" id="viewRecordData">View Record</button>
                    <button class="action-button" id="exportRecord">Export Record</button>
                    <button class="action-button" id="openApiExplorer">API Explorer</button>
                </div>
            </div>
            <div class="inspector-section">
                <h4>Page Info</h4>
                <div class="page-info" id="pageInfo">
                    <div class="info-row">
                        <span class="info-label">Object:</span>
                        <span class="info-value" id="currentObject">Detecting...</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Record ID:</span>
                        <span class="info-value" id="currentRecordId">-</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">API Calls:</span>
                        <span class="info-value" id="apiCallCount">0</span>
                    </div>
                </div>
            </div>
            <div class="inspector-section">
                <h4>Network Monitor</h4>
                <div class="network-monitor" id="networkMonitor">
                    <div class="monitor-empty">No API calls detected</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Add event listeners
    addPanelEventListeners(panel);
    
    // Make panel draggable
    makeDraggable(panel);
    
    inspectorPanel = panel;
}

// Add event listeners to panel
function addPanelEventListeners(panel) {
    // Control buttons
    panel.querySelector('#minimizePanel').addEventListener('click', () => {
        const content = panel.querySelector('.inspector-content');
        const btn = panel.querySelector('#minimizePanel');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            btn.textContent = '−';
        } else {
            content.style.display = 'none';
            btn.textContent = '+';
        }
    });
    
    panel.querySelector('#closePanel').addEventListener('click', () => {
        panel.style.display = 'none';
    });
    
    // Action buttons
    panel.querySelector('#inspectElement').addEventListener('click', startElementInspection);
    panel.querySelector('#viewRecordData').addEventListener('click', viewCurrentRecord);
    panel.querySelector('#exportRecord').addEventListener('click', exportCurrentRecord);
    panel.querySelector('#openApiExplorer').addEventListener('click', openApiExplorer);
}

// Make element draggable
function makeDraggable(element) {
    const header = element.querySelector('.inspector-header');
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragOffset.x = e.clientX - element.offsetLeft;
        dragOffset.y = e.clientY - element.offsetTop;
        header.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        element.style.left = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, newX)) + 'px';
        element.style.top = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, newY)) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'grab';
        }
    });
}

// Add keyboard shortcuts
function addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+I - Toggle inspector panel
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            toggleInspectorPanel();
        }
        
        // Ctrl+Shift+E - Start element inspection
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            startElementInspection();
        }
        
        // Ctrl+Shift+A - Open API explorer
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            openApiExplorer();
        }
    });
}

// Toggle inspector panel visibility
function toggleInspectorPanel() {
    if (!inspectorPanel) {
        createInspectorPanel();
        return;
    }
    
    inspectorPanel.style.display = inspectorPanel.style.display === 'none' ? 'block' : 'none';
}

// Start element inspection mode
function startElementInspection() {
    console.log('Starting element inspection...');
    
    let inspectionOverlay = document.getElementById('inspection-overlay');
    if (!inspectionOverlay) {
        inspectionOverlay = document.createElement('div');
        inspectionOverlay.id = 'inspection-overlay';
        inspectionOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 123, 255, 0.1);
            z-index: 999999;
            cursor: crosshair;
            pointer-events: all;
        `;
        document.body.appendChild(inspectionOverlay);
    }
    
    const highlightElement = document.createElement('div');
    highlightElement.id = 'element-highlight';
    highlightElement.style.cssText = `
        position: absolute;
        border: 2px solid #007bff;
        background: rgba(0, 123, 255, 0.1);
        pointer-events: none;
        z-index: 1000000;
        border-radius: 2px;
    `;
    document.body.appendChild(highlightElement);
    
    function highlightElementUnderMouse(e) {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element || element === inspectionOverlay || element === highlightElement) return;
        
        const rect = element.getBoundingClientRect();
        highlightElement.style.left = rect.left + 'px';
        highlightElement.style.top = rect.top + 'px';
        highlightElement.style.width = rect.width + 'px';
        highlightElement.style.height = rect.height + 'px';
    }
    
    function selectElement(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (element && element !== inspectionOverlay) {
            inspectElementDetails(element);
        }
        
        // Clean up
        inspectionOverlay.remove();
        highlightElement.remove();
        document.removeEventListener('mousemove', highlightElementUnderMouse);
        document.removeEventListener('click', selectElement);
    }
    
    document.addEventListener('mousemove', highlightElementUnderMouse);
    document.addEventListener('click', selectElement);
}

// Inspect element details
function inspectElementDetails(element) {
    const details = {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        attributes: Array.from(element.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
        })),
        textContent: element.textContent.substring(0, 100),
        computedStyles: window.getComputedStyle(element)
    };
    
    console.log('Element details:', details);
    
    // Update inspector panel with element details
    if (inspectorPanel) {
        const content = inspectorPanel.querySelector('#inspectorContent');
        const detailsSection = document.createElement('div');
        detailsSection.className = 'inspector-section';
        detailsSection.innerHTML = `
            <h4>Selected Element</h4>
            <div class="element-details">
                <div class="detail-row">
                    <span class="detail-label">Tag:</span>
                    <span class="detail-value">${details.tagName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">ID:</span>
                    <span class="detail-value">${details.id || 'None'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Class:</span>
                    <span class="detail-value">${details.className || 'None'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Text:</span>
                    <span class="detail-value">${details.textContent}${details.textContent.length > 100 ? '...' : ''}</span>
                </div>
            </div>
        `;
        
        // Remove previous element details
        const existingDetails = content.querySelector('.element-details');
        if (existingDetails) {
            existingDetails.parentElement.remove();
        }
        
        content.appendChild(detailsSection);
    }
}

// View current record data
async function viewCurrentRecord() {
    try {
        const recordId = extractRecordIdFromUrl();
        if (!recordId) {
            alert('No record ID found on current page');
            return;
        }
        
        // Send message to background script to fetch record data
        const response = await chrome.runtime.sendMessage({
            action: 'apiCall',
            endpoint: `/records/${recordId}`,
            options: { method: 'GET' }
        });
        
        if (response.success) {
            console.log('Record data:', response.data);
            displayRecordData(response.data);
        } else {
            console.error('Failed to fetch record:', response.error);
            alert('Failed to fetch record data: ' + response.error);
        }
    } catch (error) {
        console.error('Error viewing record:', error);
        alert('Error viewing record: ' + error.message);
    }
}

// Extract record ID from current URL
function extractRecordIdFromUrl() {
    const url = window.location.href;
    // This would need to be customized based on actual Conga URL patterns
    const patterns = [
        /\/record\/([a-zA-Z0-9-]+)/,
        /\/([a-zA-Z0-9-]{36})\/view/,
        /id=([a-zA-Z0-9-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

// Display record data
function displayRecordData(data) {
    if (!inspectorPanel) return;
    
    const content = inspectorPanel.querySelector('#inspectorContent');
    const recordSection = document.createElement('div');
    recordSection.className = 'inspector-section';
    recordSection.innerHTML = `
        <h4>Record Data</h4>
        <div class="record-data">
            <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
    `;
    
    // Remove previous record data
    const existingRecord = content.querySelector('.record-data');
    if (existingRecord) {
        existingRecord.parentElement.remove();
    }
    
    content.appendChild(recordSection);
}

// Export current record
async function exportCurrentRecord() {
    try {
        const recordId = extractRecordIdFromUrl();
        if (!recordId) {
            alert('No record ID found on current page');
            return;
        }
        
        const response = await chrome.runtime.sendMessage({
            action: 'apiCall',
            endpoint: `/records/${recordId}`,
            options: { method: 'GET' }
        });
        
        if (response.success) {
            const dataStr = JSON.stringify(response.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `conga-record-${recordId}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('Record exported successfully');
        } else {
            alert('Failed to export record: ' + response.error);
        }
    } catch (error) {
        console.error('Error exporting record:', error);
        alert('Error exporting record: ' + error.message);
    }
}

// Open API explorer
async function openApiExplorer() {
    try {
        // Send message to background script to open side panel
        const response = await chrome.runtime.sendMessage({
            action: 'openSidePanel'
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to open side panel');
        }
    } catch (error) {
        console.error('Failed to open API explorer:', error);
        alert('Failed to open API explorer');
    }
}

// Observe page changes
function observePageChanges() {
    // Monitor URL changes
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            updatePageInfo();
        }
    }).observe(document, { subtree: true, childList: true });
    
    // Initial page info update
    updatePageInfo();
}

// Update page information
function updatePageInfo() {
    if (!inspectorPanel) return;
    
    const currentObject = inspectorPanel.querySelector('#currentObject');
    const currentRecordId = inspectorPanel.querySelector('#currentRecordId');
    
    // Extract object type and record ID from URL
    const objectType = extractObjectTypeFromUrl();
    const recordId = extractRecordIdFromUrl();
    
    if (currentObject) currentObject.textContent = objectType || 'Unknown';
    if (currentRecordId) currentRecordId.textContent = recordId || 'N/A';
}

// Extract object type from URL
function extractObjectTypeFromUrl() {
    const url = window.location.href;
    // This would need to be customized based on actual Conga URL patterns
    const patterns = [
        /\/([a-zA-Z]+)\/record/,
        /\/object\/([a-zA-Z]+)/,
        /\/([a-zA-Z]+)\/[a-zA-Z0-9-]+\/view/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

// Inject page enhancement script
function injectPageScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = function() {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

// Monitor network requests
function monitorNetworkRequests() {
    // This would be enhanced to capture actual network requests
    // For now, we'll simulate monitoring
    const monitor = inspectorPanel?.querySelector('#networkMonitor');
    if (monitor) {
        // Update API call count
        const apiCallCount = inspectorPanel.querySelector('#apiCallCount');
        if (apiCallCount) {
            let count = parseInt(apiCallCount.textContent) || 0;
            apiCallCount.textContent = ++count;
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}