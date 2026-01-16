function performSearch() {
  const searchTerm = document.getElementById('globalSearch').value.trim().toLowerCase();
  const rows = document.querySelectorAll('.user-row');

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (!searchTerm || text.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

const searchInput = document.getElementById('globalSearch');
if (searchInput) {
  searchInput.addEventListener('input', performSearch);
}

window.performSearch = performSearch;
