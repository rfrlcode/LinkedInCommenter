const toggleButton = document.getElementById('toggle');
const statusText = document.getElementById('statusText');
const apiStatus = document.getElementById('apiStatus');
const apiKeyInput = document.getElementById('apiKey');
const saveButton = document.getElementById('save');

function updateStatus(enabled, hasApiKey) {
  // Update extension status
  statusText.innerHTML = enabled ? '<span class="emoji">✅</span> Active' : '<span class="emoji">❌</span> Inactive';
  statusText.className = `status-value ${enabled ? 'status-active' : 'status-inactive'}`;
  
  // Update API key status
  apiStatus.innerHTML = hasApiKey ? '<span class="emoji">✅</span> Ready' : '<span class="emoji">❌</span> Not Set';
  apiStatus.className = `status-value ${hasApiKey ? 'status-active' : 'status-inactive'}`;
  
  // Update toggle button
  if (enabled) {
    toggleButton.innerHTML = '<span class="emoji">⏸️</span> Disable';
    toggleButton.className = 'btn btn-danger';
  } else {
    toggleButton.innerHTML = '<span class="emoji">⚡</span> Enable';
    toggleButton.className = 'btn btn-success';
  }
}

function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideDown 0.3s ease;
  `;
  notification.textContent = message;
  
  // Add keyframes for animation
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideDown {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideDown 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize UI
chrome.storage.local.get(['enabled', 'apiKey'], (data) => {
  updateStatus(data.enabled, !!data.apiKey);
  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
  }
});

toggleButton.addEventListener('click', () => {
  // Add loading state
  const originalContent = toggleButton.innerHTML;
  toggleButton.innerHTML = '<span class="emoji">⏳</span> Processing...';
  toggleButton.disabled = true;
  
  chrome.storage.local.get(['enabled', 'apiKey'], (data) => {
    const enabled = !data.enabled;
    chrome.storage.local.set({ enabled }, () => {
      updateStatus(enabled, !!data.apiKey);
      showNotification(`Extension ${enabled ? 'enabled' : 'disabled'} successfully!`);
      toggleButton.disabled = false;
    });
  });
});

saveButton.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showNotification('Please enter an API key', 'error');
    apiKeyInput.focus();
    return;
  }
  
  // Add loading state
  const originalContent = saveButton.innerHTML;
  saveButton.innerHTML = '<span class="emoji">⏳</span> Saving...';
  saveButton.disabled = true;
  
  chrome.storage.local.set({ apiKey }, () => {
    chrome.storage.local.get(['enabled'], (data) => {
      updateStatus(data.enabled, true);
      showNotification('API Key saved successfully!');
      saveButton.innerHTML = originalContent;
      saveButton.disabled = false;
    });
  });
});

// Add input validation feedback
apiKeyInput.addEventListener('input', () => {
  const value = apiKeyInput.value.trim();
  if (value) {
    apiKeyInput.style.borderColor = '#10b981';
  } else {
    apiKeyInput.style.borderColor = '#e5e7eb';
  }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement === apiKeyInput) {
    saveButton.click();
  }
});
