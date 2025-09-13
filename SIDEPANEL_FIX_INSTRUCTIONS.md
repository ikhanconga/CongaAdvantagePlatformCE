# 🔧 Side Panel Fix Instructions

## ❌ **The Problem**
You're getting this error when clicking "API Explorer":
```
Failed to open API explorer: TypeError: Cannot read properties of undefined (reading 'query')
at HTMLButtonElement.openApiExplorer (content.js:413:40)
```

## 🔍 **Root Cause**
The content script was trying to use `chrome.tabs.query()`, which is **not available** in content scripts. Content scripts have limited access to Chrome extension APIs.

## ✅ **The Fix Applied**

I've updated the code to fix this issue:

### **1. Updated Content Script** (`/app/conga-inspector/content.js`)
- Changed the `openApiExplorer()` function to send a message to the background script
- Background script handles the side panel opening (which has proper API access)

### **2. Updated Background Script** (`/app/conga-inspector/background.js`)  
- Added handler for `openSidePanel` message
- Uses the sender's tab ID to open the side panel correctly

## 🚀 **How to Apply the Fix**

### **Option 1: Reload the Extension (Recommended)**
1. Go to `chrome://extensions/`
2. Find "Conga Advantage Platform Inspector" 
3. Click the **🔄 reload icon** on the extension card
4. The updated code will be loaded

### **Option 2: Re-install the Extension**
1. Go to `chrome://extensions/`
2. **Remove** the current extension
3. Click **"Load unpacked"** again
4. Select the `/app/conga-inspector/` folder

## 🧪 **Testing the Fix**

### **Test 1: From Floating Panel**
1. Go to any Conga page (e.g., `https://rls-preview.congacloud.eu`)
2. Press `Ctrl+Shift+I` to open floating panel
3. Click **"API Explorer"** button in the floating panel
4. Side panel should open without errors

### **Test 2: From Popup**
1. Click the extension icon in toolbar
2. Click **"API Explorer"** in the popup
3. Side panel should open (this was already working)

### **Test 3: Check Console**
1. Right-click on any Conga page → "Inspect"
2. Go to **Console** tab
3. Look for any error messages from the extension
4. Should see success messages instead of errors

## 🔍 **What Changed Technically**

### **Before (Broken):**
```javascript
// content.js - WRONG: Content scripts can't use chrome.tabs
async function openApiExplorer() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true }); // ❌ Fails
    await chrome.sidePanel.open({ tabId: tabs[0].id });
}
```

### **After (Fixed):**
```javascript
// content.js - CORRECT: Send message to background script
async function openApiExplorer() {
    const response = await chrome.runtime.sendMessage({
        action: 'openSidePanel'  // ✅ Works
    });
}

// background.js - Handles the side panel opening
case 'openSidePanel':
    chrome.sidePanel.open({ tabId: sender.tab.id })  // ✅ Background has API access
```

## 🎯 **Expected Behavior After Fix**

- ✅ **Floating panel** → "API Explorer" → Side panel opens
- ✅ **Popup** → "API Explorer" → Side panel opens  
- ✅ **No console errors** when using the extension
- ✅ **All other features** continue to work normally

## 🚨 **If Still Not Working**

Try these additional steps:

1. **Hard Refresh:**
   - Reload the extension in `chrome://extensions/`
   - Hard refresh any open Conga pages (`Ctrl+Shift+R`)

2. **Check Permissions:**
   - Make sure extension has all required permissions
   - Check that you're on a Conga domain (`*.congacloud.eu`)

3. **Console Debug:**
   - Open developer tools (`F12`)
   - Check Console for any new error messages
   - Look for background script messages

4. **Browser Restart:**
   - Close Chrome completely
   - Reopen and test again

The fix should resolve the side panel opening issue completely! 🎉