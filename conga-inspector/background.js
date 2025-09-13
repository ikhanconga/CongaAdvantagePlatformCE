// Conga Inspector Background Service Worker
console.log('Conga Inspector: Background script loaded');

// Configuration
const CONFIG = {
  CLIENT_ID: '6ebb98c7-dd82-4780-b1ac-c0dc3f7ed43e',
  CLIENT_SECRET: 'RK5h@?8gM_-6PEF@4-hzd73W',
  TOKEN_URL: 'https://login-preview.congacloud.eu/api/v1/auth/connect/token',
  API_BASE_URL: 'https://rls-preview.congacloud.eu/api/data',
  PLATFORM_DOMAIN: 'https://rls-preview.congacloud.eu'
};

// Token management
let accessToken = null;
let tokenExpiry = null;

// Get access token
async function getAccessToken() {
  try {
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
      return accessToken;
    }

    const response = await fetch(CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CONFIG.CLIENT_ID,
        client_secret: CONFIG.CLIENT_SECRET,
        scope: 'data:read data:write'
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const tokenData = await response.json();
    accessToken = tokenData.access_token;
    tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1 minute buffer

    // Store token in chrome storage
    await chrome.storage.local.set({ 
      accessToken, 
      tokenExpiry,
      tokenData 
    });

    return accessToken;
  } catch (error) {
    console.error('Failed to get access token:', error);
    throw error;
  }
}

// Make authenticated API calls
async function makeApiCall(endpoint, options = {}) {
  try {
    const token = await getAccessToken();
    const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Message handler for popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  switch (request.action) {
    case 'getToken':
      getAccessToken()
        .then(token => sendResponse({ success: true, token }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously

    case 'apiCall':
      makeApiCall(request.endpoint, request.options)
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously

    case 'getConfig':
      sendResponse({ 
        success: true, 
        config: { 
          API_BASE_URL: CONFIG.API_BASE_URL,
          PLATFORM_DOMAIN: CONFIG.PLATFORM_DOMAIN
        } 
      });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Conga Inspector installed:', details);
  
  // Initialize storage
  await chrome.storage.local.set({
    settings: {
      apiTimeout: 30000,
      enableLogging: true,
      autoRefresh: false
    }
  });

  // Test initial connection
  try {
    await getAccessToken();
    console.log('Initial token obtained successfully');
  } catch (error) {
    console.error('Failed to get initial token:', error);
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Conga Inspector: Extension started');
});