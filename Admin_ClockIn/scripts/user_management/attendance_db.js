document.addEventListener('DOMContentLoaded', async () => {
  const attendanceList = document.getElementById('attendanceList');
  const supabase = window.supabaseClient;
  const USERS_TABLE = 'user_employee_data';
  const ATTENDANCE_TABLE = 'attendance';
  
  let users = [];
  let attendance = [];
  let filteredUsers = [];
  let searchTerm = '';

  Paginate.init({
    containerId: 'attendance_db',
    itemsPerPage: 10,
    onPageChange: () => renderAttendance()
  });

  DataTableManager.init({
    tableName: USERS_TABLE,
    supabaseClient: supabase,
    primaryKey: 'employeeId',
    render: () => {
      Paginate.setTotalItems(filteredUsers.length);
      renderAttendance();
    }
  });

  window.searchUsername = function(term) {
    searchTerm = term || '';
    
    if (!searchTerm) {
      filteredUsers = [...users];
    } else {
      filteredUsers = users.filter(user => {
        const username = (user.name || '').toLowerCase();
        return username.includes(searchTerm.toLowerCase());
      });
    }
    Paginate.setTotalItems(filteredUsers.length);
    Paginate.setPage(1);
    renderAttendance();
  };

  async function loadAttendance() {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .order('createdAt', { ascending: false });

      if (usersError) throw usersError;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from(ATTENDANCE_TABLE)
        .select('*');

      if (attendanceError) throw attendanceError;

      attendance = attendanceData || [];
      
      users = usersData.map(user => {
        const userAttendance = attendance.filter(a => a.employeeId === user.employeeId);
        return {
          employeeId: user.employeeId,
          name: user.name || '',
          email: user.email || '',
          employment: user.employment || '',
          totalRecords: userAttendance.length
        };
      });

      filteredUsers = [...users];
      Paginate.setTotalItems(users.length);
      Paginate.setPage(1);
      renderAttendance();
    } catch (err) {
      console.error('Error loading attendance:', err);
    }
  }

  function renderAttendance() {
    const pageData = Paginate.getPageData(filteredUsers);
    
    attendanceList.innerHTML = '';
    
    if (!pageData || pageData.length === 0) {
      attendanceList.innerHTML = '<tr><td colspan="6" class="no-records">No attendance records found.</td></tr>';
      return;
    }

    pageData.forEach((user) => {
      const row = document.createElement('tr');
      row.className = 'user-table-row';
      row.id = `row-${user.employeeId}`;
      
      row.innerHTML = `
        <td class="checkbox-col"><input type="checkbox" class="user-checkbox" value="${user.employeeId}" onchange="toggleUserSelection('${user.employeeId}')"></td>
        <td class="username-col">${user.name || 'New User'}</td>
        <td class="email-col">${user.email || '-'}</td>
        <td class="employment-col">${user.employment || '-'}</td>
        <td class="date-col">${user.totalRecords}</td>
        <td class="actions-col">
          <div class="action-buttons">
            <button class="btn-icon edit-btn" onclick="window.viewAttendance('${user.employeeId}')" title="View Attendance">
              <span class="material-symbols-outlined">visibility</span>
            </button>
          </div>
        </td>
      `;

      attendanceList.appendChild(row);
    });
    
    document.getElementById('totalAttendanceCount').textContent = filteredUsers.length;
  }

  window.viewAttendance = function(employeeId) {
    window.location.href = `attendance_detail.html?employeeId=${employeeId}`;
  };

  window.toggleUserSelection = function(employeeId) {
    updateSelectAllState();
  };

  function updateSelectAllState() {
    const selectAllBtn = document.getElementById('selectAllAttendance');
    const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
    const selectionActionRow = document.getElementById('selectionActionRow');
    const selectedCount = document.getElementById('selectedCount');
    
    if (!selectAllBtn) return;
    
    const hasSelection = checkedBoxes.length > 0;
    if (hasSelection) {
      selectAllBtn.classList.add('has-selection');
      if (selectionActionRow) {
        selectionActionRow.style.display = 'flex';
        if (selectedCount) {
          selectedCount.textContent = checkedBoxes.length;
        }
      }
    } else {
      selectAllBtn.classList.remove('has-selection');
      if (selectionActionRow) {
        selectionActionRow.style.display = 'none';
      }
    }
  }

  window.toggleSelectAll = function() {
    const selectAllBtn = document.getElementById('selectAllAttendance');
    const checkboxes = document.querySelectorAll('.user-checkbox');
    
    if (selectAllBtn.classList.contains('has-selection')) {
      checkboxes.forEach(cb => cb.checked = false);
    } else {
      checkboxes.forEach(cb => cb.checked = true);
    }
    
    updateSelectAllState();
  };

  window.clearSelection = function() {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectAllState();
  };

  window.exportToCSV = function() {
    const headers = ['Name', 'Email', 'Employment', 'Total Records'];
    const rows = [headers.join(',')];
    
    filteredUsers.forEach(user => {
      const name = String(user.name || '').includes(',') ? `"${user.name}"` : user.name;
      const email = String(user.email || '').includes(',') ? `"${user.email}"` : user.email;
      const employment = String(user.employment || '').includes(',') ? `"${user.employment}"` : user.employment;
      rows.push(`${name},${email},${employment},${user.totalRecords}`);
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.exportToJSON = function() {
    const exportData = filteredUsers.map(user => ({
      name: user.name || '',
      email: user.email || '',
      employment: user.employment || '',
      totalRecords: user.totalRecords
    }));
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.exportSelectedRows = function() {
    const selectedIds = [];
    document.querySelectorAll('.user-checkbox:checked').forEach(cb => {
      selectedIds.push(cb.value);
    });
    
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    const selectedData = users.filter(user => selectedIds.includes(user.employeeId));
    const headers = ['Name', 'Email', 'Employment', 'Total Records'];
    const rows = [headers.join(',')];
    
    selectedData.forEach(user => {
      const name = String(user.name || '').includes(',') ? `"${user.name}"` : user.name;
      const email = String(user.email || '').includes(',') ? `"${user.email}"` : user.email;
      const employment = String(user.employment || '').includes(',') ? `"${user.employment}"` : user.employment;
      rows.push(`${name},${email},${employment},${user.totalRecords}`);
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_selected_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.exportSelectedRowsJSON = function() {
    const selectedIds = [];
    document.querySelectorAll('.user-checkbox:checked').forEach(cb => {
      selectedIds.push(cb.value);
    });
    
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    const selectedData = users.filter(user => selectedIds.includes(user.employeeId));
    const exportData = selectedData.map(user => ({
      name: user.name || '',
      email: user.email || '',
      employment: user.employment || '',
      totalRecords: user.totalRecords
    }));
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_selected_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.toggleFilterMenu = function() {
    const filterMenu = document.getElementById('filterMenu');
    const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
    const isOpen = filterMenu && filterMenu.style.display === 'block';
    
    if (filterMenu) {
      filterMenu.style.display = isOpen ? 'none' : 'block';
    }
    const sortMenu = document.getElementById('sortMenu');
    if (sortMenu) {
      sortMenu.style.display = 'none';
    }
    
    if (filterWrapper) {
      filterWrapper.classList.toggle('active', !isOpen);
    }
  };

  window.toggleSortMenu = function() {
    const sortMenu = document.getElementById('sortMenu');
    const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
    const isOpen = sortMenu && sortMenu.style.display === 'block';
    
    if (sortMenu) {
      sortMenu.style.display = isOpen ? 'none' : 'block';
    }
    const filterMenu = document.getElementById('filterMenu');
    if (filterMenu) {
      filterMenu.style.display = 'none';
    }
    
    if (sortWrapper) {
      sortWrapper.classList.toggle('active', !isOpen);
    }
  };

  window.toggleExportMenu = function() {
    const exportMenu = document.getElementById('exportMenu');
    if (exportMenu) {
      exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
    }
  };

  window.addFilterRow = function() {
    const activeFilters = document.getElementById('activeFilters');
    const filterRow = document.createElement('div');
    filterRow.className = 'filter-row';
    
    filterRow.innerHTML = `
      <select class="filter-column-select">
        <option value="name">Username</option>
        <option value="email">Email</option>
        <option value="employment">Employment</option>
      </select>
      <span>:</span>
      <input type="text" class="filter-value-input" placeholder="Enter value...">
      <button class="remove-filter-btn" onclick="this.parentElement.remove()">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;
    
    activeFilters.appendChild(filterRow);
  };

  window.addSortRow = function() {
    const activeSorts = document.getElementById('activeSorts');
    const sortRow = document.createElement('div');
    sortRow.className = 'filter-row';
    
    sortRow.innerHTML = `
      <select class="filter-column-select">
        <option value="name">Username</option>
        <option value="email">Email</option>
        <option value="employment">Employment</option>
        <option value="totalRecords">Total Records</option>
      </select>
      <span>:</span>
      <select class="filter-column-select">
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
      <button class="remove-filter-btn" onclick="this.parentElement.remove()">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;
    
    activeSorts.appendChild(sortRow);
  };

  window.applyFilters = function() {
    if (!users || users.length === 0) {
      console.warn('No users data available for filtering');
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
      document.getElementById('filterStatus').textContent = '';
    } else {
      filteredUsers = sourceData.filter(user => {
        return filters.every(filter => {
          const cellValue = user[filter.column] || '';
          return String(cellValue).toLowerCase().includes(filter.value);
        });
      });
      document.getElementById('filterStatus').textContent = `Filtered (${filters.length})`;
    }
    
    Paginate.setTotalItems(filteredUsers.length);
    Paginate.setPage(1);
    toggleFilterMenu();
    
    const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
    if (filterWrapper) filterWrapper.classList.remove('active');
    
    renderAttendance();
  };

  window.applySort = function() {
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
          let valueA = a[column] || '';
          let valueB = b[column] || '';
          
          if (column !== 'totalRecords') {
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();
          }
          
          if (valueA !== valueB) {
            return ascending ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
          }
        }
        return 0;
      });
      filteredUsers = sortedData;
    }
    
    Paginate.setPage(1);
    toggleSortMenu();
    
    const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
    if (sortWrapper) sortWrapper.classList.remove('active');
    
    renderAttendance();
  };

  document.addEventListener('click', function(event) {
    const filterWrapper = document.querySelector('.table-filter-wrapper');
    const filterMenu = document.getElementById('filterMenu');
    const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
    const sortMenu = document.getElementById('sortMenu');
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');
    
    if (filterWrapper && filterMenu && !filterWrapper.contains(event.target)) {
      filterMenu.style.display = 'none';
    }
    if (sortWrapper && sortMenu && !sortWrapper.contains(event.target)) {
      sortMenu.style.display = 'none';
    }
    if (exportBtn && exportMenu && !exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
      exportMenu.style.display = 'none';
    }
  });

  window.addEventListener('message', function(event) {
    if (event.data.type === 'search') {
      window.searchUsername(event.data.term);
    }
  });

  window.changePage = function(direction) {
    const currentPage = Paginate.getCurrentPage();
    const totalPages = Paginate.getTotalPages();
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
      Paginate.setPage(newPage);
    }
  };

  window.goToFirstPage = function() {
    Paginate.setPage(1);
  };

  window.goToLastPage = function() {
    Paginate.setPage(Paginate.getTotalPages());
  };

  window.goToPage = function(pageNum) {
    const page = parseInt(pageNum);
    if (page >= 1 && page <= Paginate.getTotalPages()) {
      Paginate.setPage(page);
    }
  };

  window.changeItemsPerPage = function(value) {
    const items = parseInt(value);
    if (items > 0) {
      Paginate.setItemsPerPage(items);
    }
  };

  loadAttendance();
});
