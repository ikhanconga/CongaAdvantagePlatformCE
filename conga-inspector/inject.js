// Conga Inspector Injection Script
// This script runs in the page context and can access page variables
console.log('Conga Inspector: Injection script loaded');

// Monitor page-level events and API calls
(function() {
    'use strict';
    
    // Store original fetch and XMLHttpRequest
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest.prototype.open;
    const originalXHRSend = window.XMLHttpRequest.prototype.send;
    
    // API call tracking
    let apiCallCount = 0;
    const apiCalls = [];
    
    // Intercept fetch requests
    window.fetch = function(...args) {
        const [resource, config] = args;
        const url = typeof resource === 'string' ? resource : resource.url;
        
        // Check if it's a Conga API call
        if (url.includes('congacloud.eu') || url.includes('/api/')) {
            apiCallCount++;
            
            const callInfo = {
                id: apiCallCount,
                method: config?.method || 'GET',
                url: url,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            
            apiCalls.push(callInfo);
            
            // Notify content script
            window.postMessage({
                type: 'CONGA_API_CALL',
                data: callInfo
            }, '*');
        }
        
        // Call original fetch and handle response
        return originalFetch.apply(this, args)
            .then(response => {
                if (url.includes('congacloud.eu') || url.includes('/api/')) {
                    const callInfo = apiCalls.find(call => call.id === apiCallCount);
                    if (callInfo) {
                        callInfo.status = response.status;
                        callInfo.statusText = response.statusText;
                        
                        window.postMessage({
                            type: 'CONGA_API_RESPONSE',
                            data: callInfo
                        }, '*');
                    }
                }
                
                return response;
            })
            .catch(error => {
                if (url.includes('congacloud.eu') || url.includes('/api/')) {
                    const callInfo = apiCalls.find(call => call.id === apiCallCount);
                    if (callInfo) {
                        callInfo.status = 'error';
                        callInfo.error = error.message;
                        
                        window.postMessage({
                            type: 'CONGA_API_ERROR',
                            data: callInfo
                        }, '*');
                    }
                }
                
                throw error;
            });
    };
    
    // Intercept XMLHttpRequest
    window.XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._congaMethod = method;
        this._congaUrl = url;
        
        return originalXHR.apply(this, [method, url, ...args]);
    };
    
    window.XMLHttpRequest.prototype.send = function(data) {
        const xhr = this;
        const method = this._congaMethod;
        const url = this._congaUrl;
        
        if (url && (url.includes('congacloud.eu') || url.includes('/api/'))) {
            apiCallCount++;
            
            const callInfo = {
                id: apiCallCount,
                method: method,
                url: url,
                timestamp: new Date().toISOString(),
                status: 'pending',
                requestData: data
            };
            
            apiCalls.push(callInfo);
            
            window.postMessage({
                type: 'CONGA_API_CALL',
                data: callInfo
            }, '*');
            
            // Add event listeners for response
            xhr.addEventListener('load', function() {
                const callInfo = apiCalls.find(call => call.id === apiCallCount);
                if (callInfo) {
                    callInfo.status = xhr.status;
                    callInfo.statusText = xhr.statusText;
                    callInfo.responseText = xhr.responseText;
                    
                    window.postMessage({
                        type: 'CONGA_API_RESPONSE',
                        data: callInfo
                    }, '*');
                }
            });
            
            xhr.addEventListener('error', function() {
                const callInfo = apiCalls.find(call => call.id === apiCallCount);
                if (callInfo) {
                    callInfo.status = 'error';
                    callInfo.error = 'Network error';
                    
                    window.postMessage({
                        type: 'CONGA_API_ERROR',
                        data: callInfo
                    }, '*');
                }
            });
        }
        
        return originalXHRSend.apply(this, [data]);
    };
    
    // Expose utility functions to page
    window.congaInspector = {
        getApiCalls: () => apiCalls,
        getApiCallCount: () => apiCallCount,
        clearApiCalls: () => {
            apiCalls.length = 0;
            apiCallCount = 0;
        },
        
        // Helper functions for Conga-specific operations
        extractRecordId: (url = window.location.href) => {
            const patterns = [
                /\/record\/([a-zA-Z0-9-]+)/,
                /\/([a-zA-Z0-9-]{36})\/view/,
                /id=([a-zA-Z0-9-]+)/,
                /\/([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    return match[1];
                }
            }
            
            return null;
        },
        
        extractObjectType: (url = window.location.href) => {
            const patterns = [
                /\/([a-zA-Z]+)\/record/,
                /\/object\/([a-zA-Z]+)/,
                /\/([a-zA-Z]+)\/[a-zA-Z0-9-]+\/view/,
                /\/api\/data\/([a-zA-Z]+)/
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    return match[1];
                }
            }
            
            return null;
        },
        
        // Get page metadata
        getPageMetadata: () => {
            return {
                url: window.location.href,
                title: document.title,
                recordId: window.congaInspector.extractRecordId(),
                objectType: window.congaInspector.extractObjectType(),
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                apiCalls: apiCalls.length
            };
        }
    };
    
    // Listen for page changes (SPA navigation)
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            
            window.postMessage({
                type: 'CONGA_PAGE_CHANGE',
                data: {
                    url: url,
                    recordId: window.congaInspector.extractRecordId(),
                    objectType: window.congaInspector.extractObjectType(),
                    timestamp: new Date().toISOString()
                }
            }, '*');
        }
    });
    
    observer.observe(document, { subtree: true, childList: true });
    
    // Notify that injection is complete
    window.postMessage({
        type: 'CONGA_INSPECTOR_READY',
        data: { timestamp: new Date().toISOString() }
    }, '*');
    
    console.log('Conga Inspector: Page injection complete');
})();