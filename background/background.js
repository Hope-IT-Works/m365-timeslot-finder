// Background service worker for Chrome Extension
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('M365 Timeslot-Finder for Outlook Extension installed');
    } else if (details.reason === 'update') {
        console.log('M365 Timeslot-Finder for Outlook Extension updated');
    }
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getAuthToken') {
        // Handle token requests if needed
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ token: token });
            }
        });
        return true; // Will respond asynchronously
    }
});

// Handle authentication token changes
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
    console.log('Sign in status changed:', signedIn);
});
