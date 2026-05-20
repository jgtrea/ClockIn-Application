// Alert Prompt Functions
let alertTimeout;

function showAlertPrompt(message, type = 'error', stack = false) {
  if (stack) {
    // Create a new alert element for stacking
    const alertContainer = document.getElementById('alertPromptContainer');
    const newAlert = document.createElement('div');
    newAlert.className = 'alert-prompt ' + type;
    newAlert.innerHTML = `
      <span class="alert-prompt-message">${message}</span>
      <button class="alert-prompt-close" onclick="this.parentElement.remove()">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;
    alertContainer.appendChild(newAlert);
    setTimeout(() => newAlert.classList.add('show'), 10);
    setTimeout(() => {
      newAlert.classList.remove('show');
      setTimeout(() => newAlert.remove(), 300);
    }, 5000);
    return;
  }

  const alertEl = document.getElementById('alertPrompt');
  const messageEl = alertEl.querySelector('.alert-prompt-message');
  messageEl.textContent = message;
  alertEl.className = 'alert-prompt ' + type;
  alertEl.classList.add('show');
  if (alertTimeout) clearTimeout(alertTimeout);
  alertTimeout = setTimeout(() => closeAlertPrompt(), 5000);
}

function closeAlertPrompt() {
  const alertEl = document.getElementById('alertPrompt');
  alertEl.classList.remove('show');
  if (alertTimeout) { clearTimeout(alertTimeout); alertTimeout = null; }
}
