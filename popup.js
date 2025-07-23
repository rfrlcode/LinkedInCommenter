const toggleButton = document.getElementById('toggle');
const statusDiv = document.getElementById('status');
const statusText = document.getElementById('statusText');
const apiStatus = document.getElementById('apiStatus');
const apiKeyInput = document.getElementById('apiKey');
const saveButton = document.getElementById('save');

function updateStatus(enabled, hasApiKey) {
  toggleButton.textContent = enabled ? 'Disable' : 'Enable';
  statusDiv.textContent = enabled ? 'Enabled' : 'Disabled';
  statusText.textContent = enabled ? '✅ Active' : '❌ Inactive';
  statusText.style.color = enabled ? 'green' : 'red';
  
  // Update API key status
  if (hasApiKey) {
    apiStatus.textContent = '✅ Configured';
    apiStatus.style.color = 'green';
  } else {
    apiStatus.textContent = '❌ Not configured';
    apiStatus.style.color = 'red';
  }
}

chrome.storage.local.get(['enabled', 'apiKey'], (data) => {
  updateStatus(data.enabled, !!data.apiKey);
  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
  }
});

toggleButton.addEventListener('click', () => {
  chrome.storage.local.get('enabled', (data) => {
    const enabled = !data.enabled;
    chrome.storage.local.set({ enabled });
    updateStatus(enabled, true);
  });
});

saveButton.addEventListener('click', () => {
  const apiKey = apiKeyInput.value;
  chrome.storage.local.set({ apiKey }, () => {
    // Update status after saving
    chrome.storage.local.get(['enabled'], (data) => {
      updateStatus(data.enabled, !!apiKey);
    });
    alert('API Key Saved!');
  });
});
