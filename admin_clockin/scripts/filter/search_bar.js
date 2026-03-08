class SearchBar {
  constructor(options = {}) {
    this.searchInput = document.getElementById('sectionSearch') || document.getElementById('globalSearch');
    this.filterType = options.filterType || 'sections'; 
  }

  init() {
    if (this.searchInput) {
      this.searchInput.addEventListener('keyup', () => this.filter());
    }
  }

  filter() {
    if (this.filterType === 'user' && typeof window.filterUser === 'function') {
      window.filterUser();
    } else if ((this.filterType === 'notif' || this.filterType === 'feedback') && typeof window.filterNotif === 'function') {
      window.filterNotif();
    } else {
      this.filterSections();
    }
  }

  filterSections() {
    const searchTerm = this.searchInput.value.toLowerCase();
    const cards = document.querySelectorAll('.section-card');
    
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (!searchTerm || text.includes(searchTerm)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  clearSearch() {
    if (this.searchInput) {
      this.searchInput.value = '';
      this.filter();
    }
  }

  getSearchTerm() {
    return this.searchInput ? this.searchInput.value : '';
  }
}

window.SearchBar = SearchBar;
