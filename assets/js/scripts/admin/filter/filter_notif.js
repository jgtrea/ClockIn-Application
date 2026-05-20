function filterNotif() {
  const searchTerm = document.getElementById('globalSearch').value.trim().toLowerCase();
  const notifCards = document.querySelectorAll('.notif-card, .feedback-card');
  
  notifCards.forEach(card => {
    const title = card.querySelector('.notif-title, .feedback-title');
    const titleText = title ? title.textContent.toLowerCase() : '';
    
    if (!searchTerm || titleText.includes(searchTerm)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

const searchInput = document.getElementById('globalSearch');
if (searchInput) {
  searchInput.addEventListener('input', filterNotif);
}

window.filterNotif = filterNotif;
