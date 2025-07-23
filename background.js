console.log('LinkedIn AI Commenter: Background script loaded');

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Background: Extension started');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Background: Extension installed/updated');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Received message', request);
  
  if (request.type === 'getComment') {
    console.log('Background: Processing comment request for post:', request.postContent?.substring(0, 100) + '...');
    
    // Handle the request immediately to avoid service worker termination
    const testComment = `Great insights! This really resonates with my experience. Thanks for sharing! 👍`;
    console.log('Background: Sending response:', testComment);
    
    // Send response immediately instead of using setTimeout
    sendResponse({ comment: testComment });
    return true; // Keep the message channel open
  }
  
  return false; // Don't keep channel open for other message types
});

// Keep service worker alive by periodically performing a small task
let keepAliveInterval;

function keepServiceWorkerAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.storage.local.get('keepAlive', () => {
      // This small operation helps keep the service worker active
      if (chrome.runtime.lastError) {
        console.log('Keep alive check:', chrome.runtime.lastError);
      }
    });
  }, 20000); // Every 20 seconds
}

// Start keep alive when extension loads
keepServiceWorkerAlive();

// Clean up on shutdown
chrome.runtime.onSuspend.addListener(() => {
  console.log('Background: Service worker suspending');
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
});
