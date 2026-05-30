document.addEventListener('DOMContentLoaded', async () => {
  const { Paginate, DataTableManager } = window;
  
  const schedulesList = document.getElementById('schedulesList');
  const supabase = window.supabaseClient;
  const USERS_TABLE = 'user_employee_data';
  const SCHEDULE_TABLE = 'schedule';
  
  let users = [];
  let schedules = [];
  let filteredUsers = [];
  let searchTerm = '';

  Paginate.init({
    containerId: 'schedule_db',
    itemsPerPage: 10,
    onPageChange: () => renderSchedules()
  });

  DataTableManager.init({
    tableName: USERS_TABLE,
    supabaseClient: supabase,
    primaryKey: 'employeeId',
    render: () => {
      Paginate.setTotalItems(filteredUsers.length);
      renderSchedules();
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
    renderSchedules();
  };

  async function loadSchedules() {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .order('createdAt', { ascending: false });

      if (usersError) throw usersError;

      const { data: schedulesData, error: schedulesError } = await supabase
        .from(SCHEDULE_TABLE)
        .select('*');

      if (schedulesError) throw schedulesError;

      schedules = schedulesData || [];
      
      users = usersData.map(user => {
        const userSchedules = schedules.filter(s => s.employeeId === user.employeeId);
        return {
          employeeId: user.employeeId,
          name: user.name || '',
          email: user.email || '',
          employment: user.employment || '',
          totalSchedules: userSchedules.length,
          schedules: userSchedules
        };
      });

      filteredUsers = [...users];
      applyCurrentSort();
      updateSortHeaders();
      Paginate.setTotalItems(users.length);
      Paginate.setPage(1);
      renderSchedules();
    } catch (err) {
      console.error('Error loading schedules:', err);
    }
  }

  function renderSchedules() {
    const pageData = Paginate.getPageData(filteredUsers);
    
    schedulesList.innerHTML = '';
    
    if (!pageData || pageData.length === 0) {
      schedulesList.innerHTML = '<tr><td colspan="6" class="no-records">No schedule records found.</td></tr>';
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
        <td class="date-col">${user.totalSchedules}</td>
        <td class="actions-col">
          <div class="action-buttons">
            <button class="btn-icon view-btn" onclick="window.viewSchedule('${user.employeeId}')" title="View Schedule">
              <span class="material-symbols-outlined">visibility</span>
            </button>
          </div>
        </td>
      `;

      schedulesList.appendChild(row);
    });
    
    document.getElementById('totalSchedulesCount').textContent = filteredUsers.length;
  }

  window.viewSchedule = function(employeeId) {
    window.location.href = `schedule_detail.html?employeeId=${employeeId}`;
  };

  window.toggleUserSelection = function(employeeId) {
    DataTableManager.toggleSelection(employeeId);
    updateSelectAllState();
  };

  function updateSelectAllState() {
    const selectAllBtn = document.getElementById('selectAllSchedules');
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
    const selectAllBtn = document.getElementById('selectAllSchedules');
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

  window.exportToCSV = function() {
    if (!filteredUsers || filteredUsers.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = ['Name', 'Email', 'Employment', 'Subject', 'Weekday', 'Start Time', 'End Time', 'Room'];
    const rows = [headers.join(',')];
    
    filteredUsers.forEach(user => {
      const userSchedules = user.schedules || [];
      
      if (userSchedules.length === 0) {
        const name = String(user.name || '').includes(',') ? `"${user.name}"` : user.name || '';
        const email = String(user.email || '').includes(',') ? `"${user.email}"` : user.email || '';
        const employment = String(user.employment || '').includes(',') ? `"${user.employment}"` : user.employment || '';
        rows.push(`${name},${email},${employment},,,,`);
      } else {
        userSchedules.forEach(schedule => {
          const name = String(user.name || '').includes(',') ? `"${user.name}"` : user.name || '';
          const email = String(user.email || '').includes(',') ? `"${user.email}"` : user.email || '';
          const employment = String(user.employment || '').includes(',') ? `"${user.employment}"` : user.employment || '';
          const subject = String(schedule.subject || '').includes(',') ? `"${schedule.subject}"` : schedule.subject || '';
          const weekday = String(schedule.weekday || '').includes(',') ? `"${schedule.weekday}"` : schedule.weekday || '';
          const startTime = schedule.startTime || '';
          const endTime = schedule.endTime || '';
          const room = String(schedule.room || '').includes(',') ? `"${schedule.room}"` : schedule.room || '';
          rows.push(`${name},${email},${employment},${subject},${weekday},${startTime},${endTime},${room}`);
        });
      }
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedules_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.exportToJSON = function() {
    if (!filteredUsers || filteredUsers.length === 0) {
      alert('No data to export');
      return;
    }
    
    const exportData = filteredUsers.map(user => {
      const userSchedules = user.schedules || [];
      const schedulesData = userSchedules.map(schedule => ({
        subject: schedule.subject || '',
        weekday: schedule.weekday || '',
        startTime: schedule.startTime || '',
        endTime: schedule.endTime || '',
        room: schedule.room || ''
      }));
      
      return {
        name: user.name || '',
        email: user.email || '',
        employment: user.employment || '',
        schedules: schedulesData
      };
    });
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedules_data.json';
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
    
    let filename = 'schedules_selected_data.csv';
    if (selectedData.length === 1 && selectedData[0].name) {
      const safeName = selectedData[0].name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      filename = `schedules_data_${safeName}.csv`;
    }
    
    const headers = ['Name', 'Email', 'Employment', 'Subject', 'Weekday', 'Start Time', 'End Time', 'Room'];
    const rows = [headers.join(',')];
    
    selectedData.forEach(user => {
      const userSchedules = user.schedules || [];
      
      if (userSchedules.length === 0) {
        const name = String(user.name || '').includes(',') ? `"${user.name}"` : user.name || '';
        const email = String(user.email || '').includes(',') ? `"${user.email}"` : user.email || '';
        const employment = String(user.employment || '').includes(',') ? `"${user.employment}"` : user.employment || '';
        rows.push(`${name},${email},${employment},,,,`);
      } else {
        userSchedules.forEach(schedule => {
          const name = String(user.name || '').includes(',') ? `"${user.name}"` : user.name || '';
          const email = String(user.email || '').includes(',') ? `"${user.email}"` : user.email || '';
          const employment = String(user.employment || '').includes(',') ? `"${user.employment}"` : user.employment || '';
          const subject = String(schedule.subject || '').includes(',') ? `"${schedule.subject}"` : schedule.subject || '';
          const weekday = String(schedule.weekday || '').includes(',') ? `"${schedule.weekday}"` : schedule.weekday || '';
          const startTime = schedule.startTime || '';
          const endTime = schedule.endTime || '';
          const room = String(schedule.room || '').includes(',') ? `"${schedule.room}"` : schedule.room || '';
          rows.push(`${name},${email},${employment},${subject},${weekday},${startTime},${endTime},${room}`);
        });
      }
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
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
    
    let filename = 'schedules_selected_data.json';
    if (selectedData.length === 1 && selectedData[0].name) {
      const safeName = selectedData[0].name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      filename = `schedules_data_${safeName}.json`;
    }
    
    const exportData = selectedData.map(user => {
      const userSchedules = user.schedules || [];
      const schedulesData = userSchedules.map(schedule => ({
        subject: schedule.subject || '',
        weekday: schedule.weekday || '',
        startTime: schedule.startTime || '',
        endTime: schedule.endTime || '',
        room: schedule.room || ''
      }));
      
      return {
        name: user.name || '',
        email: user.email || '',
        employment: user.employment || '',
        schedules: schedulesData
      };
    });
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    alert('Delete functionality not implemented for schedules');
  };

  window.toggleFilterMenu = function() {
    const filterMenu = document.getElementById('filterMenu');
    const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
    const isOpen = filterMenu && filterMenu.style.display === 'block';
    
    if (filterMenu) {
      filterMenu.style.display = isOpen ? 'none' : 'block';
    }
    if (filterWrapper) {
      filterWrapper.classList.toggle('active', !isOpen);
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
      <button class="remove-filter-btn" onclick="event.stopPropagation(); this.parentElement.remove()">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;
    
    activeFilters.appendChild(filterRow);
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
    
    applyCurrentSort();
    Paginate.setTotalItems(filteredUsers.length);
    Paginate.setPage(1);
    toggleFilterMenu();

    const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
    if (filterWrapper) filterWrapper.classList.remove('active');

    renderSchedules();
  };

  let sortCol = 'name';
  let sortAsc = true;

  function applyCurrentSort() {
    filteredUsers = [...filteredUsers].sort((a, b) => {
      const isNum = sortCol === 'totalSchedules';
      const va = isNum ? (a[sortCol] || 0) : String(a[sortCol] || '').toLowerCase();
      const vb = isNum ? (b[sortCol] || 0) : String(b[sortCol] || '').toLowerCase();
      if (va === vb) return 0;
      return (va > vb ? 1 : -1) * (sortAsc ? 1 : -1);
    });
  }

  function updateSortHeaders() {
    document.querySelectorAll('th.sortable-header').forEach(th => th.classList.remove('asc', 'desc'));
    const active = document.querySelector(`th.sortable-header[onclick="sortTable('${sortCol}')"]`);
    if (active) active.classList.add(sortAsc ? 'asc' : 'desc');
  }

  window.sortTable = function(col) {
    sortAsc = sortCol === col ? !sortAsc : true;
    sortCol = col;
    applyCurrentSort();
    updateSortHeaders();
    Paginate.setPage(1);
    renderSchedules();
  };

  document.addEventListener('click', function(event) {
    const filterWrapper = document.querySelector('.table-filter-wrapper');
    const filterMenu = document.getElementById('filterMenu');
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');

    if (filterWrapper && filterMenu && !filterWrapper.contains(event.target)) {
      filterMenu.style.display = 'none';
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

  // Toggle Import Menu
  window.toggleImportScheduleMenu = function() {
    const importMenu = document.getElementById('importScheduleMenu');
    if (importMenu) {
      importMenu.style.display = importMenu.style.display === 'none' ? 'block' : 'none';
    }
  };

  // Import schedules from CSV
  window.importSchedulesFromCSV = function() {
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
        await importSchedulesFromData(rows, 'CSV');
      } catch (err) {
        console.error('CSV import error', err);
        alert('Failed to import CSV');
      }
      fileInput.value = '';
    };
    
    fileInput.click();
  };

  // Import schedules from JSON
  window.importSchedulesFromJSON = function() {
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
        await importSchedulesFromData(rows, 'JSON');
      } catch (err) {
        console.error('JSON import error', err);
        alert('Failed to import JSON');
      }
      fileInput.value = '';
    };
    
    fileInput.click();
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

  async function importSchedulesFromData(rows, sourceType) {
    if (!rows || rows.length === 0) {
      alert('No data found in file');
      return;
    }
    
    const supabase = window.supabaseClient;
    
    const firstRowLower = rows[0].map(h => String(h).toLowerCase().trim());
    const headerKeywords = ['weekday', 'start', 'end', 'time', 'subject', 'employee', 'teacher', 'section', 'sect'];
    const hasHeaders = firstRowLower.some(cell => headerKeywords.some(keyword => cell.includes(keyword)));
    
    let dataRows = rows;
    
    if (hasHeaders) {
      dataRows = rows.slice(1);
    }
    
    const schedulesToInsert = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length < 3) continue;
      
      // Try to find employee by name
      let employeeId = null;
      const employeeName = row[4] || row[3] || '';
      
      if (employeeName && employees) {
        const matchedEmployee = employees.find(e => 
          e.name && e.name.toLowerCase() === employeeName.toLowerCase()
        );
        if (matchedEmployee) {
          employeeId = matchedEmployee.employeeId;
        }
      }
      
      const schedule = {
        weekday: row[0] || 'Monday',
        startTime: row[1] || '',
        endTime: row[2] || '',
        subject: row[3] || '',
        employeeId: employeeId
      };
      
      if (schedule.startTime && schedule.endTime && schedule.subject) {
        schedulesToInsert.push(schedule);
      }
    }
    
    if (schedulesToInsert.length === 0) {
      alert('No valid schedules to import');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('schedule')
        .insert(schedulesToInsert);
      
      if (error) throw error;
      
      alert(`Successfully imported ${schedulesToInsert.length} schedule(s)`);
      loadSchedules();
    } catch (err) {
      console.error('Error importing schedules:', err);
      alert('Failed to import schedules');
    }
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', function(event) {
    const importBtn = document.getElementById('importScheduleBtn');
    const importMenu = document.getElementById('importScheduleMenu');
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');
    
    if (importBtn && importMenu && !importBtn.contains(event.target) && !importMenu.contains(event.target)) {
      importMenu.style.display = 'none';
    }
    if (exportBtn && exportMenu && !exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
      exportMenu.style.display = 'none';
    }
  });

  loadSchedules();
});
