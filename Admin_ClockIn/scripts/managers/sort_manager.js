const SortManager = (function() {
  let filteredUsers = [];
  let DataTableManager = null;
  let Paginate = null;
  let renderCallback = null;

  function init(config) {
    filteredUsers = config.filteredUsers || [];
    DataTableManager = config.DataTableManager;
    Paginate = config.Paginate;
    renderCallback = config.render;
  }

  function setFilteredUsers(newFilteredUsers) {
    filteredUsers = newFilteredUsers;
  }

  function applySort(sortFields = ['name', 'email', 'employment']) {
    if (!filteredUsers || filteredUsers.length === 0) {
      console.warn('No data available for sorting');
      return;
    }

    const sortRows = document.querySelectorAll('#activeSorts .filter-row');
    const sorts = [];

    sortRows.forEach(row => {
      const selects = row.querySelectorAll('select');
      if (selects.length >= 2) {
        const column = selects[0].value;
        const orderValue = selects[1].value;
        sorts.push({
          column: column,
          ascending: orderValue === 'asc'
        });
      }
    });

    if (sorts.length > 0) {
      const sortedData = [...filteredUsers].sort((a, b) => {
        for (const sort of sorts) {
          const { column, ascending } = sort;
          let valueA, valueB;

          if (column === 'createdAt') {
            valueA = a.createdAt || '';
            valueB = b.createdAt || '';
          } else {
            valueA = (a[column] || '').toLowerCase();
            valueB = (b[column] || '').toLowerCase();
          }

          if (valueA !== valueB) {
            return ascending ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
          }
        }
        return 0;
      });
      filteredUsers = sortedData;
      if (DataTableManager) DataTableManager.setFilteredData(filteredUsers);
    }

    if (Paginate) {
      Paginate.setPage(1);
    }
    
    toggleSortMenu();
    
    const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
    if (sortWrapper) sortWrapper.classList.remove('active');
    
    if (renderCallback) renderCallback();
  }

  function toggleSortMenu() {
    const sortMenu = document.getElementById('sortMenu');
    const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
    const isOpen = sortMenu && sortMenu.style.display === 'block';
    
    if (sortMenu) {
      sortMenu.style.display = isOpen ? 'none' : 'block';
    }
    
    const filterMenu = document.getElementById('filterMenu');
    if (filterMenu) filterMenu.style.display = 'none';
    
    if (sortWrapper) {
      sortWrapper.classList.toggle('active', !isOpen);
    }
  }

  return {
    init,
    setFilteredUsers,
    applySort,
    toggleSortMenu
  };
})();
