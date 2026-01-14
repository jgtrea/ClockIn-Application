function performSearch() {
  const searchTerm = document.getElementById('globalSearch').value.trim().toLowerCase();
  const rows = document.querySelectorAll('.user-row');

  rows.forEach(row => {
    const nameElem = row.querySelector('.user-name');
    if (!nameElem) return;

    const nameText = nameElem.textContent.toLowerCase();
    if (!searchTerm || nameText.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

document.getElementById('globalSearch').addEventListener('input', performSearch);

window.performSearch = performSearch;
