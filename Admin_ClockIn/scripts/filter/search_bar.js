// TODO: Apply filter to notif and feedback

class SearchBar {
  constructor() {
    this.searchInput = document.getElementById('sectionSearch');
  }

  init() {
    if (this.searchInput) {
      this.searchInput.addEventListener('keyup', () => this.searchSections());
    }
  }

  searchSections() {
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
      this.searchSections();
    }
  }

  getSearchTerm() {
    return this.searchInput ? this.searchInput.value : '';
  }
}

window.SearchBar = SearchBar;
