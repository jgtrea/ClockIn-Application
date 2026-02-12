document.addEventListener('DOMContentLoaded', async () => {
  const usersList = document.getElementById('usersList');
  const addUserBtn = document.getElementById('addUserBtn');

  const supabase = window.supabaseClient;
  const USERS_TABLE = 'user_employee_data';

  let filteredUsers = [];
  let searchTerm = '';

  function applySearch() {
    if (!searchTerm) {
      filteredUsers = [...users];
    } else {
      filteredUsers = users.filter(user => {
        const searchText = `${user.name || ''} ${user.email || ''} ${user.employment || ''}`.toLowerCase();
        return searchText.includes(searchTerm.toLowerCase());
      });
    }
    allUsers = [...filteredUsers];
    currentPage = 1;
    renderUsers();
  }

  window.performUserSearch = function(term) {
    searchTerm = term || '';
    applySearch();
  };

  window.searchUsername = function(term) {
    searchTerm = term || '';
    applyUsernameSearch();
  };

  function applyUsernameSearch() {
    if (!searchTerm) {
      filteredUsers = [...users];
    } else {
      filteredUsers = users.filter(user => {
        const username = (user.name || '').toLowerCase();
        return username.includes(searchTerm.toLowerCase());
      });
    }
    allUsers = [...filteredUsers];
    currentPage = 1;
    renderUsers();
  }

  let users = [];
  let allUsers = [];
  let currentPage = 1;
  let usersPerPage = 10;

  if (!supabase) {
    console.error('users_db: Supabase client is not initialized.');
    usersList.innerHTML = '<div class="error">Supabase not initialized.</div>';
    return;
  }

  function renderUsers() {
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const pageUsers = allUsers.slice(startIndex, endIndex);
    
    usersList.innerHTML = '';
    if (!pageUsers || pageUsers.length === 0) {
      usersList.innerHTML = '<tr><td colspan="6" class="no-records">No user records found.</td></tr>';
      updatePagination(0);
      return;
    }

    pageUsers.forEach((user) => {
      const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-';
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
    
    updatePagination(totalPages);
  }

  function updateSelectAllState() {
    const selectAllBtn = document.getElementById('selectAllUsers');
    const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
    const allCheckboxes = document.querySelectorAll('.user-checkbox');
    const selectionActionRow = document.getElementById('selectionActionRow');
    const selectedCount = document.getElementById('selectedCount');
    
    if (!selectAllBtn) return;
    
    if (checkedBoxes.length > 0) {
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

  window.toggleUserSelection = function(employeeId) {
    const checkbox = document.querySelector(`.user-checkbox[value="${employeeId}"]`);
    if (checkbox) {
      checkbox.checked = checkbox.checked;
    }
    updateSelectAllState();
  };

  function updatePagination(totalPages) {
    const firstBtn = document.getElementById('firstBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const lastBtn = document.getElementById('lastBtn');
    const pageInput = document.getElementById('pageNumberInput');
    const totalUsersSpan = document.getElementById('totalUsersCount');
    const itemsPerPageInput = document.getElementById('itemsPerPageInput');
    
    const totalUsers = allUsers.length;
    totalUsersSpan.textContent = totalUsers;
    
    if (itemsPerPageInput) {
      itemsPerPageInput.value = usersPerPage;
    }
    
    pageInput.value = currentPage;
    pageInput.max = totalPages || 1;
    
    firstBtn.disabled = currentPage === 1;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    lastBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    firstBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
    prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
    nextBtn.style.opacity = (currentPage === totalPages || totalPages === 0) ? '0.5' : '1';
    lastBtn.style.opacity = (currentPage === totalPages || totalPages === 0) ? '0.5' : '1';
    
    updateSelectAllState();
  }
  
  window.changeItemsPerPage = function(count) {
    let newCount = parseInt(count);
    if (isNaN(newCount) || newCount < 1) newCount = 10;
    usersPerPage = newCount;
    currentPage = 1;
    renderUsers();
  };
  
  window.changePage = function(direction) {
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      renderUsers();
    }
  };

  window.goToPage = function(pageNum) {
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    let newPage = parseInt(pageNum);
    
    if (isNaN(newPage)) newPage = 1;
    if (newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages || 1;
    
    currentPage = newPage;
    renderUsers();
  };

  window.goToFirstPage = function() {
    currentPage = 1;
    renderUsers();
  };

  window.goToLastPage = function() {
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    currentPage = totalPages || 1;
    renderUsers();
  };

  let unsubscribe = null;
  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;

      users = data.map(user => ({
        employeeId: user.employeeId,
        name: user.name || '',
        email: user.email || '',
        employment: user.employment || '',
        createdAt: user.createdAt
      }));

      applySearch();
    } catch (err) {
      console.error('users_db: Error loading users:', err);
    }
  }

  window.editUser = (uid) => {
    const user = users.find(u => u.employeeId === uid);
    if (!user) return;
    
    window.originalValues = window.originalValues || {};
    window.originalValues[uid] = {
      name: user.name || '',
      email: user.email || '',
      employment: user.employment || ''
    };
    
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
    const originalValues = window.originalValues?.[uid];
    if (!originalValues) return;
    
    const nameCell = document.getElementById(`name-${uid}`);
    nameCell.textContent = originalValues.name || 'New User';
    
    const emailCell = document.getElementById(`email-${uid}`);
    emailCell.textContent = originalValues.email || '-';
    
    const employmentCell = document.getElementById(`employment-${uid}`);
    employmentCell.textContent = originalValues.employment || '-';
    
    document.getElementById(`actions-${uid}`).style.display = 'flex';
    document.getElementById(`edit-actions-${uid}`).style.display = 'none';
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
      try {
        const { error } = await supabase
          .from(USERS_TABLE)
          .update({
            name: nameVal,
            email: emailVal,
            employment: empVal
          })
          .eq('employeeId', uid);

        if (error) throw error;
        console.log('users_db: User data saved successfully.');
        
        const userIndex = users.findIndex(u => u.employeeId === uid);
        if (userIndex !== -1) {
          users[userIndex] = {
            ...users[userIndex],
            name: nameVal,
            email: emailVal,
            employment: empVal
          };
          applySearch();
        }
      } catch (err) {
        console.error('users_db: Save error:', err);
      }
    } else {
      console.log('users_db: No changes detected.');
    }
  };

  window.closeEditModal = () => {
    const modal = document.getElementById('editUserModal');
    if (modal) modal.style.display = 'none';
  };

  window.deleteUser = async (uid) => {
    if (!confirm('Delete this user?')) return;
    try {
      const { error } = await supabase
        .from(USERS_TABLE)
        .delete()
        .eq('employeeId', uid);

      if (error) throw error;
      loadUsers();
    } catch (err) {
      console.error('users_db: delete error', err);
    }
  };

  async function checkAdminAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      if (!userEmail) {
        users = [];
        renderUsers();
        addUserBtn.style.display = 'none';
        return;
      }
    }

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
    loadUsers();
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      users = [];
      renderUsers();
      addUserBtn.style.display = 'none';
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      checkAdminAndLoad();
    }
  });

  checkAdminAndLoad();
  
  window.toggleSelectAll = function() {
    const selectAllBtn = document.getElementById('selectAllUsers');
    const checkboxes = document.querySelectorAll('.user-checkbox');
    
    if (selectAllBtn.classList.contains('has-selection')) {
      checkboxes.forEach(cb => cb.checked = false);
    } else {
      checkboxes.forEach(cb => cb.checked = true);
    }
    
    updateSelectAllState();
  };

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

  window.toggleFilterMenu = function() {
    const filterMenu = document.getElementById('filterMenu');
    const filterBtn = document.querySelector('.table-filter-wrapper:first-child .filter-btn');
    const isOpen = filterMenu.style.display === 'block';
    
    filterMenu.style.display = isOpen ? 'none' : 'block';
    document.getElementById('sortMenu').style.display = 'none';
    
    if (filterBtn) {
      if (isOpen) {
        filterBtn.classList.remove('active');
      } else {
        filterBtn.classList.add('active');
        const sortBtn = document.querySelector('.table-filter-wrapper:last-child .filter-btn');
        if (sortBtn) sortBtn.classList.remove('active');
      }
    }
  };

  window.toggleSortMenu = function() {
    const sortMenu = document.getElementById('sortMenu');
    const sortBtn = document.querySelector('.table-filter-wrapper:last-child .filter-btn');
    const isOpen = sortMenu.style.display === 'block';
    
    sortMenu.style.display = isOpen ? 'none' : 'block';
    document.getElementById('filterMenu').style.display = 'none';
    
    if (sortBtn) {
      if (isOpen) {
        sortBtn.classList.remove('active');
      } else {
        sortBtn.classList.add('active');
        const filterBtn = document.querySelector('.table-filter-wrapper:first-child .filter-btn');
        if (filterBtn) filterBtn.classList.remove('active');
      }
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
    
    try {
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .insert({
          name: name || 'New User',
          email: email,
          employment: employment
        })
        .select()
        .single();

      if (error) throw error;
      loadUsers();
      console.log('users_db: New user added successfully');
    } catch (err) {
      console.error('users_db: add user error', err);
    }
  };

  let importFileInput = null;
  
  function createImportFileInput(acceptTypes) {
    if (!importFileInput) {
      importFileInput = document.createElement('input');
      importFileInput.type = 'file';
      importFileInput.style.display = 'none';
      document.body.appendChild(importFileInput);
    }
    importFileInput.accept = acceptTypes;
    return importFileInput;
  }

  window.importFromCSV = function() {
    console.log('Import from CSV clicked');
    const fileInput = createImportFileInput('.csv');
    
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
    const fileInput = createImportFileInput('.json');
    
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const jsonContent = await file.text();
        const data = JSON.parse(jsonContent);
        const rows = Array.isArray(data) ? data : [data];
        const csvRows = convertJSONToCSVFormat(rows);
        await importUsersFromData(csvRows, 'JSON');
      } catch (err) {
        console.error('users_db: JSON import error', err);
        alert('Failed to import JSON: ' + err.message);
      }
      fileInput.value = '';
    };
    
    fileInput.click();
    showImportMenu();
  };

  window.importFromExcel = function() {
    console.log('Import from Excel clicked');
    const fileInput = createImportFileInput('.xlsx,.xls');
    
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        if (typeof XLSX !== 'undefined') {
          const workbook = await readExcelFile(file);
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          await importUsersFromData(rows, 'Excel');
        } else {
          const csvContent = await file.text();
          const rows = parseCSV(csvContent);
          await importUsersFromData(rows, 'Excel');
        }
      } catch (err) {
        console.error('users_db: Excel import error', err);
        alert('Failed to import Excel: ' + err.message);
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

  function convertJSONToCSVFormat(jsonArray) {
    if (!jsonArray || jsonArray.length === 0) return [];
    
    const firstItem = jsonArray[0];
    const hasHeaders = 'name' in firstItem || 'email' in firstItem || 'employment' in firstItem;
    
    if (!hasHeaders) {
      return jsonArray.map(item => [item.name || '', item.email || '', item.employment || '']);
    }
    
    const rows = [];
    
    for (const item of jsonArray) {
      const name = String(item.name || '');
      const email = String(item.email || '');
      const employment = String(item.employment || '');
      
      const escapedName = name.includes(',') || name.includes('"') || name.includes('\n') ? '"' + name.replace(/"/g, '""') + '"' : name;
      const escapedEmail = email.includes(',') || email.includes('"') || email.includes('\n') ? '"' + email.replace(/"/g, '""') + '"' : email;
      const escapedEmployment = employment.includes(',') || employment.includes('"') || employment.includes('\n') ? '"' + employment.replace(/"/g, '""') + '"' : employment;
      
      rows.push([escapedName, escapedEmail, escapedEmployment]);
    }
    
    return rows;
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

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.exportToCSV = function() {
    console.log('Export to CSV clicked');
    
    const data = getFilteredAndSortedData();
    if (data.length === 0) {
      alert('No data to export');
      toggleExportMenu();
      return;
    }
    
    const rows = [];
    
    for (const user of data) {
      const name = escapeCSVField(user.name || '');
      const email = escapeCSVField(user.email || '');
      const employment = escapeCSVField(user.employment || '');
      const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '';
      
      rows.push(`${name},${email},${employment},${createdAt}`);
    }
    
    const csvContent = rows.join('\n');
    downloadFile(csvContent, 'users_export.csv', 'text/csv;charset=utf-8;');
    
    console.log('users_db: Exported ' + data.length + ' users to CSV');
    toggleExportMenu();
  };

  function escapeCSVField(field) {
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  window.exportToJSON = function() {
    console.log('Export to JSON clicked');
    
    const data = getFilteredAndSortedData();
    if (data.length === 0) {
      alert('No data to export');
      toggleExportMenu();
      return;
    }
    
    const exportData = data.map(user => ({
      name: user.name || '',
      email: user.email || '',
      employment: user.employment || '',
      createdAt: user.createdAt || ''
    }));
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, 'users_export.json', 'application/json;charset=utf-8;');
    
    console.log('users_db: Exported ' + data.length + ' users to JSON');
    toggleExportMenu();
  };

  window.exportToExcel = function() {
    console.log('Export to Excel clicked');
    
    const data = getFilteredAndSortedData();
    if (data.length === 0) {
      alert('No data to export');
      toggleExportMenu();
      return;
    }
    
    if (typeof XLSX !== 'undefined') {
      const rows = [];
      
      for (const user of data) {
        rows.push([
          user.name || '',
          user.email || '',
          user.employment || '',
          user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
        ]);
      }
      
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
      XLSX.writeFile(workbook, 'users_export.xlsx');
    } else {
      alert('SheetJS library not available. Exporting as CSV instead.');
      exportToCSV();
      return;
    }
    
    console.log('users_db: Exported ' + data.length + ' users to Excel');
    toggleExportMenu();
  };

  function getFilteredAndSortedData() {
    return [...allUsers];
  }

  async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  window.deleteSelectedRows = async function() {
    const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
    if (checkedBoxes.length === 0) {
      alert('No rows selected');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${checkedBoxes.length} row(s)?`)) {
      const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
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
      clearSelection();
    }
  };

  window.exportSelectedRows = function() {
    const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
    if (checkedBoxes.length === 0) {
      alert('No rows selected');
      return;
    }
    
    const selectedIds = new Set(Array.from(checkedBoxes).map(cb => cb.value));
    const selectedData = allUsers.filter(user => selectedIds.has(user.employeeId));
    
    if (selectedData.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = ['Name', 'Email', 'Employment', 'Date Created'];
    const rows = [headers.join(',')];
    
    for (const user of selectedData) {
      const name = escapeCSVField(user.name || '');
      const email = escapeCSVField(user.email || '');
      const employment = escapeCSVField(user.employment || '');
      const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '';
      
      rows.push(`${name},${email},${employment},${createdAt}`);
    }
    
    const csvContent = rows.join('\n');
    downloadFile(csvContent, 'users_selected_export.csv', 'text/csv;charset=utf-8;');
    
    console.log('users_db: Exported ' + selectedData.length + ' selected users to CSV');
  };

  window.exportSelectedRowsJSON = function() {
    const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
    if (checkedBoxes.length === 0) {
      alert('No rows selected');
      return;
    }
    
    const selectedIds = new Set(Array.from(checkedBoxes).map(cb => cb.value));
    const selectedData = allUsers.filter(user => selectedIds.has(user.employeeId));
    
    if (selectedData.length === 0) {
      alert('No data to export');
      return;
    }
    
    const exportData = selectedData.map(user => ({
      name: user.name || '',
      email: user.email || '',
      employment: user.employment || '',
      createdAt: user.createdAt || ''
    }));
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, 'users_selected_export.json', 'application/json;charset=utf-8;');
    
    console.log('users_db: Exported ' + selectedData.length + ' selected users to JSON');
  };

  window.clearSelection = function() {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectAllState();
  };

  window.applySort = function() {
    const sorts = [];
    
    const sortRows = document.querySelectorAll('#activeSorts .filter-row');
    sortRows.forEach(row => {
      const select = row.querySelector('select');
      const input = row.querySelector('input');
      if (select && input && input.value.trim()) {
        const orderValue = input.value.trim().toLowerCase();
        sorts.push({
          column: select.value,
          ascending: orderValue === 'asc' || orderValue === 'ascending'
        });
      }
    });
    
    if (sorts.length > 0) {
      allUsers.sort((a, b) => {
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
    
    currentPage = 1;
    renderUsers();
    toggleSortMenu();
  };

  window.clearFilters = function() {
    const activeFilters = document.getElementById('activeFilters');
    if (activeFilters) activeFilters.innerHTML = '';
    
    filteredUsers = [...users];
    allUsers = [...filteredUsers];
    document.getElementById('filterStatus').textContent = '';
    currentPage = 1;
    renderUsers();
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
      <input type="text" class="filter-value-input" placeholder="asc or desc">
      <button class="remove-filter-btn" onclick="this.parentElement.remove()">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;
    
    activeSorts.appendChild(sortRow);
  };

  window.applyFilters = function() {
    const filters = [];
    
    const filterRows = document.querySelectorAll('#activeFilters .filter-row');
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
      allUsers = [...filteredUsers];
      document.getElementById('filterStatus').textContent = '';
    } else {
      filteredUsers = users.filter(user => {
        return filters.every(filter => {
          if (filter.column === 'createdAt') {
            const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '';
            return dateStr.toLowerCase().includes(filter.value);
          } else {
            const cellValue = user[filter.column] || '';
            return cellValue.toLowerCase().includes(filter.value);
          }
        });
      });
      allUsers = [...filteredUsers];
      document.getElementById('filterStatus').textContent = `Filtered (${filters.length})`;
    }
    
    currentPage = 1;
    renderUsers();
    toggleFilterMenu();
    
    const filterBtn = document.querySelector('.table-filter-wrapper:first-child .filter-btn');
    if (filterBtn) filterBtn.classList.remove('active');
  };

  window.addEventListener('message', function(event) {
    if (event.data.type === 'search') {
      window.performUserSearch(event.data.term);
    }
  });

  document.addEventListener('click', function(event) {
    const modal = document.getElementById('addUserModal');
    if (modal && event.target === modal) {
      closeAddUserModal();
    }
  });
});
