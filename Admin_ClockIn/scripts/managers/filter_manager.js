const FilterManager = (function() {
  let users = [];
  let filteredUsers = [];
  let DataTableManager = null;
  let Paginate = null;
  let renderCallback = null;

  function init(config) {
    users = config.users || [];
    filteredUsers = [...users];
    DataTableManager = config.DataTableManager;
    Paginate = config.Paginate;
    renderCallback = config.render;
  }

  function setUsers(newUsers) {
    users = newUsers;
    filteredUsers = [...users];
  }

  function applyFilters(filterFields = ['name', 'email', 'employment']) {
    if (!users || users.length === 0) {
      console.warn('No data available for filtering');
      return;
    }

    const filterRows = document.querySelectorAll('#activeFilters .filter-row');
    const filters = [];

    filterRows.forEach(row => {
      const select = row.querySelector('select');
      const input = row.querySelector('input');
      if (select && input && input.value.trim()) {
        filters.push({
          column: select.value,
          value: input.value.trim().toLowerCase()
        });
      }
    });

    let sourceData = [...users];

    if (filters.length === 0) {
      filteredUsers = sourceData;
      if (DataTableManager) DataTableManager.setFilteredData(filteredUsers);
      const filterStatus = document.getElementById('filterStatus');
      if (filterStatus) filterStatus.textContent = '';
    } else {
      filteredUsers = sourceData.filter(item => {
        return filters.every(filter => {
          let cellValue = item[filter.column] || '';
          if (filter.column === 'createdAt' && DataTableManager) {
            cellValue = DataTableManager.formatDate(item.createdAt);
          }
          return String(cellValue).toLowerCase().includes(filter.value);
        });
      });
      if (DataTableManager) DataTableManager.setFilteredData(filteredUsers);
      const filterStatus = document.getElementById('filterStatus');
      if (filterStatus) filterStatus.textContent = `Filtered (${filters.length})`;
    }

    if (Paginate) {
      Paginate.setTotalItems(filteredUsers.length);
      Paginate.setPage(1);
    }
    
    toggleFilterMenu();
    
    const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
    if (filterWrapper) filterWrapper.classList.remove('active');
    
    if (renderCallback) renderCallback();
  }

  function toggleFilterMenu() {
    const filterMenu = document.getElementById('filterMenu');
    const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
    const isOpen = filterMenu && filterMenu.style.display === 'block';
    
    if (filterMenu) {
      filterMenu.style.display = isOpen ? 'none' : 'block';
    }
    
    const sortMenu = document.getElementById('sortMenu');
    if (sortMenu) sortMenu.style.display = 'none';
    
    if (filterWrapper) {
      filterWrapper.classList.toggle('active', !isOpen);
    }
  }

  return {
    init,
    setUsers,
    applyFilters,
    toggleFilterMenu
  };
})();
