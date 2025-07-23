const toggleButton = document.getElementById('toggle');
const statusDiv = document.getElementById('status');
const statusText = document.getElementById('statusText');
const apiKeyInput = document.getElementById('apiKey');
const saveButton = document.getElementById('save');

function updateStatus(enabled, hasApiKey) {
  toggleButton.textContent = enabled ? 'Disable' : 'Enable';
  statusDiv.textContent = enabled ? 'Enabled' : 'Disabled';
  statusText.textContent = enabled ? '✅ Active' : '❌ Inactive';
  statusText.style.color = enabled ? 'green' : 'red';
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
    alert('API Key Saved!');
  });
});