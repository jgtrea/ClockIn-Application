document.addEventListener('DOMContentLoaded', async () => {
  const usersList = document.getElementById('usersList');
  const addUserBtn = document.getElementById('addUserBtn');
  
  const supabase = window.supabaseClient;
  const USERS_TABLE = 'user_employee_data';
  
  let users = [];
  let filteredUsers = [];
  let searchTerm = '';

  Paginate.init({
    containerId: 'users_db',
    itemsPerPage: 10,
    onPageChange: () => renderUsers()
  });

  DataTableManager.init({
    tableName: USERS_TABLE,
    supabaseClient: supabase,
    primaryKey: 'employeeId',
    render: () => {
      Paginate.setTotalItems(DataTableManager.getFilteredData().length);
      renderUsers();
    }
  });

  window.performUserSearch = function(term) {
    searchTerm = term || '';
    DataTableManager.setSearchTerm(searchTerm);
    DataTableManager.applySearch(['name', 'email', 'employment']);
  };

  window.searchUsername = function(term) {
    searchTerm = term || '';
    DataTableManager.setSearchTerm(searchTerm);
    
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
    renderUsers();
  };

  function renderUsers() {
    const pageData = Paginate.getPageData(DataTableManager.getFilteredData());
    const totalItems = DataTableManager.getFilteredData().length;
    
    usersList.innerHTML = '';
    
    if (!pageData || pageData.length === 0) {
      usersList.innerHTML = '<tr><td colspan="6" class="no-records">No user records found.</td></tr>';
      return;
    }

    pageData.forEach((user) => {
      const createdDate = DataTableManager.formatDate(user.createdAt);
      const row = document.createElement('tr');
      row.className = 'user-table-row';
      row.id = `row-${user.employeeId}`;
      
      row.innerHTML = `
        <td class="checkbox-col"><input type="checkbox" class="user-checkbox" value="${user.employeeId}" onchange="toggleUserSelection('${user.employeeId}')"></td>
        <td class="username-col" id="name-${user.employeeId}">${user.name || 'New User'}</td>
        <td class="email-col" id="email-${user.employeeId}">${user.email || '-'}</td>
        <td class="employment-col" id="employment-${user.employeeId}">${user.employment || '-'}</td>
        <td class="date-col">${createdDate}</td>
        <td class="actions-col">
          <div class="action-buttons" id="actions-${user.employeeId}">
            <button class="btn-icon edit-btn" onclick="window.editUser('${user.employeeId}')" title="Edit">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon delete-btn" onclick="window.deleteUser('${user.employeeId}')" title="Delete">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
          <div class="action-buttons" id="edit-actions-${user.employeeId}" style="display: none;">
            <button class="btn-icon save-btn" onclick="window.saveUser('${user.employeeId}')" title="Save">
              <span class="material-symbols-outlined">check</span>
            </button>
            <button class="btn-icon cancel-btn" onclick="window.cancelEdit('${user.employeeId}')" title="Cancel">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </td>
      `;

      usersList.appendChild(row);
    });
  }

  window.toggleUserSelection = function(employeeId) {
    const checkbox = document.querySelector(`.user-checkbox[value="${employeeId}"]`);
    if (checkbox) {
      checkbox.checked = checkbox.checked;
    }
    updateSelectAllState();
  };

  function updateSelectAllState() {
    const selectAllBtn = document.getElementById('selectAllUsers');
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
    const selectAllBtn = document.getElementById('selectAllUsers');
    const checkboxes = document.querySelectorAll('.user-checkbox');
    
    if (selectAllBtn.classList.contains('has-selection')) {
      checkboxes.forEach(cb => cb.checked = false);
      DataTableManager.deselectAll();
    } else {
      checkboxes.forEach(cb => cb.checked = true);
      DataTableManager.selectAll();
    }
    
    updateSelectAllState();
  };

  window.clearSelection = function() {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    DataTableManager.clearSelection();
    updateSelectAllState();
  };

  async function loadUsers() {
    users = await DataTableManager.loadData({
      orderBy: 'createdAt',
      orderAsc: false
    });
    
    users = users.map(user => ({
      employeeId: user.employeeId,
      name: user.name || '',
      email: user.email || '',
      employment: user.employment || '',
      createdAt: user.createdAt
    }));
    
    filteredUsers = [...users];
    DataTableManager.setSearchTerm('');
    DataTableManager.applySearch(['name', 'email', 'employment']);
    Paginate.setTotalItems(users.length);
    Paginate.setPage(1);
  }

  window.editUser = (uid) => {
    const user = users.find(u => u.employeeId === uid);
    if (!user) return;
    
    DataTableManager.startEdit(uid, ['name', 'email', 'employment']);
    
    const nameCell = document.getElementById(`name-${uid}`);
    nameCell.innerHTML = `<input type="text" class="edit-input" id="edit-name-${uid}" value="${user.name || ''}">`;
    
    const emailCell = document.getElementById(`email-${uid}`);
    emailCell.innerHTML = `<input type="email" class="edit-input" id="edit-email-${uid}" value="${user.email || ''}">`;
    
    const employmentCell = document.getElementById(`employment-${uid}`);
    employmentCell.innerHTML = `
      <select class="edit-select" id="edit-employment-${uid}">
        <option value="Full-time" ${user.employment === 'Full-time' ? 'selected' : ''}>Full-time</option>
        <option value="Part-time" ${user.employment === 'Part-time' ? 'selected' : ''}>Part-time</option>
      </select>
    `;
    
    document.getElementById(`actions-${uid}`).style.display = 'none';
    document.getElementById(`edit-actions-${uid}`).style.display = 'flex';
  };

  window.cancelEdit = (uid) => {
    if (!DataTableManager.hasOriginalValues(uid)) return;
    
    const originalValues = DataTableManager.getOriginalValue(uid, 'name') ? {
      name: DataTableManager.getOriginalValue(uid, 'name'),
      email: DataTableManager.getOriginalValue(uid, 'email'),
      employment: DataTableManager.getOriginalValue(uid, 'employment')
    } : null;
    
    if (originalValues) {
      const nameCell = document.getElementById(`name-${uid}`);
      nameCell.textContent = originalValues.name || 'New User';
      
      const emailCell = document.getElementById(`email-${uid}`);
      emailCell.textContent = originalValues.email || '-';
      
      const employmentCell = document.getElementById(`employment-${uid}`);
      employmentCell.textContent = originalValues.employment || '-';
    }
    
    document.getElementById(`actions-${uid}`).style.display = 'flex';
    document.getElementById(`edit-actions-${uid}`).style.display = 'none';
    DataTableManager.cancelEdit(uid);
  };

  window.saveUser = async (uid) => {
    const nameVal = document.getElementById(`edit-name-${uid}`).value;
    const emailVal = document.getElementById(`edit-email-${uid}`).value;
    const empVal = document.getElementById(`edit-employment-${uid}`).value;

    const userInArray = users.find(u => u.employeeId === uid) || {};

    const hasChanged = nameVal !== (userInArray.name || '') ||
      emailVal !== (userInArray.email || '') ||
      empVal !== (userInArray.employment || '');

    if (hasChanged) {
      const result = await DataTableManager.update(uid, {
        name: nameVal,
        email: emailVal,
        employment: empVal
      });

      if (result.error) {
        console.error('users_db: Save error:', result.error);
      } else {
        console.log('users_db: User data saved successfully.');
        loadUsers();
      }
    } else {
      console.log('users_db: No changes detected.');
    }
  };

  window.deleteUser = async (uid) => {
    if (!confirm('Delete this user?')) return;
    
    const result = await DataTableManager.remove(uid);
    if (result.error) {
      console.error('users_db: delete error', result.error);
    } else {
      loadUsers();
    }
  };

  window.exportToCSV = function() {
    DataTableManager.exportToCSV('users_export.csv');
  };

  window.exportToJSON = function() {
    DataTableManager.exportToJSON('users_export.json');
  };

  window.exportSelectedRows = function() {
    const selectedIds = DataTableManager.getSelectedItems();
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    const selectedData = users.filter(user => selectedIds.includes(user.employeeId));
    const headers = ['Name', 'Email', 'Employment', 'Date Created'];
    const rows = [headers.join(',')];
    
    selectedData.forEach(user => {
      const name = String(user.name || '').includes(',') ? `"${user.name}"` : user.name;
      const email = String(user.email || '').includes(',') ? `"${user.email}"` : user.email;
      const employment = String(user.employment || '').includes(',') ? `"${user.employment}"` : user.employment;
      const createdAt = DataTableManager.formatDate(user.createdAt);
      rows.push(`${name},${email},${employment},${createdAt}`);
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_selected_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.exportSelectedRowsJSON = function() {
    const selectedIds = DataTableManager.getSelectedItems();
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    const selectedData = users.filter(user => selectedIds.includes(user.employeeId));
    const exportData = selectedData.map(user => ({
      name: user.name || '',
      email: user.email || '',
      employment: user.employment || '',
      createdAt: user.createdAt || ''
    }));
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_selected_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.deleteSelectedRows = async function() {
    const selectedIds = DataTableManager.getSelectedItems();
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedIds.length} row(s)?`)) {
      console.log('Delete selected rows:', selectedIds);
      
      try {
        const { error } = await supabase
          .from(USERS_TABLE)
          .delete()
          .in('employeeId', selectedIds);
        
        if (error) throw error;
        console.log('users_db: Deleted ' + selectedIds.length + ' users');
        loadUsers();
      } catch (err) {
        console.error('users_db: Delete error', err);
        alert('Failed to delete: ' + err.message);
      }
      DataTableManager.clearSelection();
    }
  };

  window.removeDeviceRecords = async function() {
    const selectedIds = [];
    document.querySelectorAll('.user-checkbox:checked').forEach(cb => {
      selectedIds.push(cb.value);
    });
    
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    if (confirm(`Remove device records for ${selectedIds.length} user(s)?`)) {
      try {
        const { error } = await supabase
          .from('user_devices')
          .delete()
          .in('employeeId', selectedIds);
        
        if (error) throw error;
        alert('Device records removed successfully');
        console.log('users_db: Removed device records for ' + selectedIds.length + ' users');
      } catch (err) {
        console.error('users_db: Remove device records error', err);
        alert('Failed to remove device records: ' + err.message);
      }
    }
  };

  window.addNewUser = function() {
    console.log('Add new user clicked');
    const addUserMenu = document.getElementById('addUserMenu');
    if (addUserMenu) {
      addUserMenu.style.display = 'none';
    }
    
    const modal = document.getElementById('addUserModal');
    if (modal) {
      modal.style.display = 'block';
      document.getElementById('addUserName').value = '';
      document.getElementById('addUserEmail').value = '';
      document.getElementById('addUserEmployment').value = 'Full-time';
    }
  };

  window.closeAddUserModal = function() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
      modal.style.display = 'none';
    }
  };

  window.confirmAddUser = async function() {
    const name = document.getElementById('addUserName').value.trim();
    const email = document.getElementById('addUserEmail').value.trim();
    const employment = document.getElementById('addUserEmployment').value;
    
    if (!name) {
      alert('Please enter a username');
      return;
    }
    
    closeAddUserModal();
    
    const result = await DataTableManager.create({
      name: name || 'New User',
      email: email,
      employment: employment
    });

    if (result.error) {
      console.error('users_db: add user error', result.error);
    } else {
      console.log('users_db: New user added successfully');
      loadUsers();
    }
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

  window.toggleAddUserMenu = function() {
    const addUserMenu = document.getElementById('addUserMenu');
    const exportMenu = document.getElementById('exportMenu');
    
    if (addUserMenu) {
      addUserMenu.style.display = addUserMenu.style.display === 'none' ? 'block' : 'none';
    }
    if (exportMenu) {
      exportMenu.style.display = 'none';
    }
  };

  window.toggleExportMenu = function() {
    const exportMenu = document.getElementById('exportMenu');
    const addUserMenu = document.getElementById('addUserMenu');
    
    if (exportMenu) {
      exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
    }
    if (addUserMenu) {
      addUserMenu.style.display = 'none';
    }
  };

  window.showImportMenu = function() {
    const importMenu = document.getElementById('importMenu');
    const addUserMenu = document.getElementById('addUserMenu');
    
    if (importMenu) {
      importMenu.style.display = importMenu.style.display === 'none' ? 'block' : 'none';
    }
    if (addUserMenu) {
      addUserMenu.style.display = 'none';
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
        <option value="createdAt">Date Created</option>
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
        <option value="createdAt">Date Created</option>
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
    
    if (filters.length === 0) {
      filteredUsers = [...users];
      document.getElementById('filterStatus').textContent = '';
    } else {
      filteredUsers = users.filter(user => {
        return filters.every(filter => {
          if (filter.column === 'createdAt') {
            const dateStr = DataTableManager.formatDate(user.createdAt);
            return dateStr.toLowerCase().includes(filter.value);
          } else {
            const cellValue = user[filter.column] || '';
            return String(cellValue).toLowerCase().includes(filter.value);
          }
        });
      });
      document.getElementById('filterStatus').textContent = `Filtered (${filters.length})`;
    }
    
    DataTableManager.setSearchTerm('');
    DataTableManager.applySearch(['name', 'email', 'employment']);
    Paginate.setTotalItems(filteredUsers.length);
    Paginate.setPage(1);
    toggleFilterMenu();
    
    const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
    if (filterWrapper) filterWrapper.classList.remove('active');
    
    renderUsers();
  };

  window.applySort = function() {
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
      filteredUsers.sort((a, b) => {
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
    }
    
    Paginate.setPage(1);
    toggleSortMenu();
    
    const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
    if (sortWrapper) sortWrapper.classList.remove('active');
    
    renderUsers();
  };

  window.clearFilters = function() {
    const activeFilters = document.getElementById('activeFilters');
    if (activeFilters) activeFilters.innerHTML = '';
    
    filteredUsers = [...users];
    document.getElementById('filterStatus').textContent = '';
    
    DataTableManager.setSearchTerm('');
    DataTableManager.applySearch(['name', 'email', 'employment']);
    Paginate.setTotalItems(users.length);
    Paginate.setPage(1);
    renderUsers();
  };

  window.importFromCSV = function() {
    console.log('Import from CSV clicked');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const csvContent = await file.text();
        const rows = parseCSV(csvContent);
        await importUsersFromData(rows, 'CSV');
      } catch (err) {
        console.error('users_db: CSV import error', err);
        alert('Failed to import CSV: ' + err.message);
      }
      fileInput.value = '';
    };
    
    fileInput.click();
    showImportMenu();
  };

  window.importFromJSON = function() {
    console.log('Import from JSON clicked');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const jsonContent = await file.text();
        const data = JSON.parse(jsonContent);
        const rows = Array.isArray(data) ? data : [data];
        await importUsersFromData(rows, 'JSON');
      } catch (err) {
        console.error('users_db: JSON import error', err);
        alert('Failed to import JSON: ' + err.message);
      }
      fileInput.value = '';
    };
    
    fileInput.click();
    showImportMenu();
  };

  function parseCSV(content) {
    const lines = content.trim().split('\n');
    return lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  }

  async function importUsersFromData(rows, sourceType) {
    if (!rows || rows.length === 0) {
      alert('No data found in ' + sourceType + ' file');
      return;
    }
    
    const firstRowLower = rows[0].map(h => String(h).toLowerCase().trim());
    const headerKeywords = ['name', 'email', 'employment', 'username', 'user', 'date', 'created'];
    const hasHeaders = firstRowLower.some(cell => headerKeywords.some(keyword => cell.includes(keyword)));
    
    let dataRows = rows;
    let headers = [];
    
    if (hasHeaders) {
      headers = firstRowLower.map((h, i) => {
        if (h.includes('name') || h.includes('user')) return 'name';
        if (h.includes('email')) return 'email';
        if (h.includes('employ') || h.includes('type') || h.includes('status')) return 'employment';
        return 'col' + i;
      });
      dataRows = rows.slice(1);
    } else {
      headers = ['name', 'email', 'employment'];
    }
    
    const nameIndex = headers.indexOf('name');
    const emailIndex = headers.indexOf('email');
    const employmentIndex = headers.indexOf('employment');
    
    const newUsers = [];
    
    for (const row of dataRows) {
      if (!row || row.length === 0 || (row.length === 1 && !row[0])) continue;
      
      const name = nameIndex >= 0 ? (row[nameIndex] || 'New User') : 'New User';
      const email = emailIndex >= 0 ? (row[emailIndex] || '') : '';
      const employment = employmentIndex >= 0 ? (row[employmentIndex] || 'Full-time') : 'Full-time';
      
      let empValue = String(employment).trim();
      if (empValue !== 'Full-time' && empValue !== 'Part-time') {
        const empLower = empValue.toLowerCase();
        if (empLower.includes('full') || empLower === 'ft' || empLower === 'fulltime') {
          empValue = 'Full-time';
        } else if (empLower.includes('part') || empLower === 'pt' || empLower === 'parttime') {
          empValue = 'Part-time';
        } else {
          empValue = 'Full-time';
        }
      }
      
      newUsers.push({
        name: String(name).trim(),
        email: String(email).trim(),
        employment: empValue
      });
    }
    
    if (newUsers.length === 0) {
      alert('No valid user data found in ' + sourceType + ' file');
      return;
    }
    
    const confirmMsg = `Import ${newUsers.length} user(s) from ${sourceType}?`;
    if (!confirm(confirmMsg)) return;
    
    try {
      const { error } = await supabase
        .from(USERS_TABLE)
        .insert(newUsers)
        .select();
      
      if (error) throw error;
      
      console.log('users_db: Successfully imported ' + newUsers.length + ' users');
      loadUsers();
      alert('Successfully imported ' + newUsers.length + ' user(s)');
    } catch (err) {
      console.error('users_db: Import error', err);
      alert('Failed to import users: ' + err.message);
    }
  }

  document.addEventListener('click', function(event) {
    const filterWrapper = document.querySelector('.table-filter-wrapper');
    const filterMenu = document.getElementById('filterMenu');
    const filterBtn = document.querySelector('.table-filter-wrapper:first-child .filter-btn');
    const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
    const sortMenu = document.getElementById('sortMenu');
    const sortBtn = document.querySelector('.table-filter-wrapper:last-child .filter-btn');
    const addUserBtn = document.getElementById('addUserBtn');
    const addUserMenu = document.getElementById('addUserMenu');
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');
    const importMenu = document.getElementById('importMenu');
    
    if (filterWrapper && filterMenu && !filterWrapper.contains(event.target)) {
      filterMenu.style.display = 'none';
      if (filterBtn) filterBtn.classList.remove('active');
    }
    if (sortWrapper && sortMenu && !sortWrapper.contains(event.target)) {
      sortMenu.style.display = 'none';
      if (sortBtn) sortBtn.classList.remove('active');
    }
    if (addUserBtn && addUserMenu && !addUserBtn.contains(event.target) && !addUserMenu.contains(event.target)) {
      addUserMenu.style.display = 'none';
    }
    if (exportBtn && exportMenu && !exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
      exportMenu.style.display = 'none';
    }
    if (importMenu && !addUserBtn?.contains(event.target) && !importMenu.contains(event.target)) {
      importMenu.style.display = 'none';
    }
  });

  document.addEventListener('click', function(event) {
    const modal = document.getElementById('addUserModal');
    if (modal && event.target === modal) {
      closeAddUserModal();
    }
  });

  window.addEventListener('message', function(event) {
    if (event.data.type === 'search') {
      window.performUserSearch(event.data.term);
    }
  });

  async function checkAdminAndLoad() {
    if (!supabase) {
      console.error('users_db: Supabase client is not initialized.');
      usersList.innerHTML = '<div class="error">Supabase not initialized.</div>';
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
    
    if (userEmail) {
      const { data: adminData, error } = await supabase
        .from('user_admin_data')
        .select('*')
        .eq('email', userEmail);

      const isAdmin = !error && adminData && adminData.length > 0;
      addUserBtn.style.display = isAdmin ? '' : 'none';
      console.log('users_db: signed in as', userEmail, 'admin?', isAdmin);
    }
    
    await loadUsers();
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      users = [];
      filteredUsers = [];
      DataTableManager.clearSelection();
      renderUsers();
      addUserBtn.style.display = 'none';
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      checkAdminAndLoad();
    }
  });

  checkAdminAndLoad();
});
