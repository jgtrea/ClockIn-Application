function performSearch() {
  const searchTerm = document.getElementById('globalSearch').value.trim();
  
  if (typeof window.performUserSearch === 'function') {
    window.performUserSearch(searchTerm);
  } else if (typeof window.performScheduleSearch === 'function') {
    window.performScheduleSearch(searchTerm);
  } else if (typeof window.performAttendanceSearch === 'function') {
    window.performAttendanceSearch(searchTerm);
  } else {
    const rows = document.querySelectorAll('.user-row');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (!searchTerm || text.includes(searchTerm.toLowerCase())) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }
}

const searchInput = document.getElementById('globalSearch');
if (searchInput) {
  searchInput.addEventListener('input', performSearch);
}

window.performSearch = performSearch;
