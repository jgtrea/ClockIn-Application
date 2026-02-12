document.addEventListener('DOMContentLoaded', async () => {
  const attendanceList = document.getElementById('attendanceList');
  
  const supabase = window.supabaseClient;
  const USERS_TABLE = 'user_employee_data';
  const ATTENDANCE_TABLE = 'attendance';
  
  let users = [];
  let userAttendance = {};
  let userAttendancePagination = {};
  let searchTerm = '';
  
  Paginate.init({
    containerId: 'attendance_db',
    itemsPerPage: 10,
    onPageChange: renderUsers
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

  window.searchAttendanceUser = function(term) {
    searchTerm = term || '';
    DataTableManager.setSearchTerm(searchTerm);
    DataTableManager.applySearch(['name', 'email', 'employment']);
  };

  function renderUsers() {
    const filteredData = DataTableManager.getFilteredData();
    const pageData = Paginate.getPageData(filteredData);
    const totalItems = filteredData.length;
    
    const totalCountElement = document.getElementById('totalUsersCount');
    if (totalCountElement) {
      totalCountElement.textContent = totalItems;
    }
    
    attendanceList.innerHTML = '';
    
    if (!pageData || pageData.length === 0) {
      attendanceList.innerHTML = '<tr><td colspan="6" class="no-records">No user records found.</td></tr>';
      return;
    }

    pageData.forEach((user) => {
      const createdDate = DataTableManager.formatDate(user.createdAt);
      const isExpanded = DataTableManager.isExpanded(user.employeeId);
      const isSelected = DataTableManager.isSelected(user.employeeId);
      const row = document.createElement('tr');
      row.className = 'user-table-row';
      row.id = `row-${user.employeeId}`;
      
      row.innerHTML = `
        <td class="checkbox-col"><input type="checkbox" class="user-checkbox" value="${user.employeeId}" ${isSelected ? 'checked' : ''} onchange="toggleUserSelection('${user.employeeId}')"></td>
        <td class="username-col" id="name-${user.employeeId}">${user.name || 'New User'}</td>
        <td class="email-col" id="email-${user.employeeId}">${user.email || '-'}</td>
        <td class="employment-col" id="employment-${user.employment}">${user.employment || '-'}</td>
        <td class="date-col">${createdDate}</td>
        <td class="actions-col">
          <div class="action-buttons">
            <button class="btn-icon expand-btn" onclick="window.toggleUserExpand('${user.employeeId}')" title="${isExpanded ? 'Collapse' : 'Expand'}">
              <span class="material-symbols-outlined">${isExpanded ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
        </td>
      `;

      attendanceList.appendChild(row);

      if (isExpanded) {
        renderAttendanceRows(user.employeeId);
      }
    });
  }

  function initAttendancePagination(userId) {
    if (!userAttendancePagination[userId]) {
      userAttendancePagination[userId] = {
        currentPage: 1,
        itemsPerPage: 5
      };
    }
  }

  function getAttendancePageData(userId) {
    initAttendancePagination(userId);
    const records = userAttendance[userId] || [];
    const { currentPage, itemsPerPage } = userAttendancePagination[userId];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return records.slice(startIndex, startIndex + itemsPerPage);
  }

  function getAttendanceTotalPages(userId) {
    const records = userAttendance[userId] || [];
    const { itemsPerPage } = userAttendancePagination[userId] || { itemsPerPage: 5 };
    return Math.ceil(records.length / itemsPerPage);
  }

  function getAttendanceTotalRecords(userId) {
    return (userAttendance[userId] || []).length;
  }

  function renderAttendanceRows(userId) {
    const userRow = document.getElementById(`row-${userId}`);
    const existingExpandedRow = document.getElementById(`expanded-${userId}`);
    
    if (existingExpandedRow) {
      existingExpandedRow.remove();
    }

    const expandedRow = document.createElement('tr');
    expandedRow.id = `expanded-${userId}`;
    expandedRow.className = 'expanded-row';
    expandedRow.colSpan = 6;

    const attendanceRecords = userAttendance[userId] || [];
    const totalPages = getAttendanceTotalPages(userId);
    const totalRecords = getAttendanceTotalRecords(userId);
    const currentPage = userAttendancePagination[userId]?.currentPage || 1;
    const itemsPerPage = userAttendancePagination[userId]?.itemsPerPage || 5;
    
    if (attendanceRecords.length === 0) {
      expandedRow.innerHTML = `
        <td colspan="6" style="padding: 0;">
          <div class="attendance-expanded-content" style="padding: 20px; background: #f9fafb;">
            <p style="text-align:center; color:#999; padding:10px;">No attendance records found.</p>
          </div>
        </td>
      `;
    } else {
      const pageData = getAttendancePageData(userId);
      
      const attendanceRows = pageData.map(record => {
        return `
          <tr class="attendance-slot-row" data-userid="${userId}" data-attendid="${record.attendId}">
            <td class="date-col">${record.date || '-'}</td>
            <td class="time-col">${record.timeIn || '-'}</td>
            <td class="time-col">${record.timeOut || '-'}</td>
            <td class="status-col" id="status-cell-${record.attendId}">
              <span class="status-badge status-${(record.status || 'unattended').toLowerCase()}">${record.status || 'Unattended'}</span>
            </td>
          </tr>
        `;
      }).join('');

      const paginationHtml = `
        <div class="attendance-pagination">
          <div class="pagination-left">
            <span>Show</span>
            <input type="number" class="items-per-page-input" value="${itemsPerPage}" min="1" onchange="window.changeAttendanceItemsPerPage('${userId}', this.value)">
            <span>from ${totalRecords} records</span>
          </div>
          <div class="pagination-right">
            <button class="btn-outline pagination-btn" onclick="window.goToFirstAttendancePage('${userId}')" ${currentPage === 1 ? 'disabled' : ''}>
              <span class="material-symbols-outlined">first_page</span>
            </button>
            <button class="btn-outline pagination-btn" onclick="window.goToPrevAttendancePage('${userId}')" ${currentPage === 1 ? 'disabled' : ''}>
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <input type="number" class="page-number-input" value="${currentPage}" onchange="window.goToAttendancePage('${userId}', this.value)">
            <button class="btn-outline pagination-btn" onclick="window.goToNextAttendancePage('${userId}')" ${currentPage === totalPages ? 'disabled' : ''}>
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
            <button class="btn-outline pagination-btn" onclick="window.goToLastAttendancePage('${userId}')" ${currentPage === totalPages ? 'disabled' : ''}>
              <span class="material-symbols-outlined">last_page</span>
            </button>
          </div>
        </div>
      `;

      expandedRow.innerHTML = `
        <td colspan="6" style="padding: 0;">
          <div class="attendance-expanded-content" style="padding: 20px; background: #f9fafb;">
            <table class="attendance-inner-table" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th class="date-col">Date</th>
                  <th class="time-col">Time In</th>
                  <th class="time-col">Time Out</th>
                  <th class="status-col">Status</th>
                </tr>
              </thead>
              <tbody>
                ${attendanceRows}
              </tbody>
            </table>
            ${paginationHtml}
          </div>
        </td>
      `;
    }

    if (userRow) {
      userRow.after(expandedRow);
    }
  }

  window.toggleUserSelection = function(employeeId) {
    DataTableManager.toggleSelection(employeeId);
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

  window.toggleUserExpand = function(employeeId) {
    const isExpanded = DataTableManager.isExpanded(employeeId);
    
    if (isExpanded) {
      DataTableManager.toggleExpanded(employeeId);
      const expandedRow = document.getElementById(`expanded-${employeeId}`);
      if (expandedRow) {
        expandedRow.remove();
      }
    } else {
      DataTableManager.toggleExpanded(employeeId);
      loadAttendanceForUser(employeeId);
    }
    
    renderUsers();
  };

  window.goToFirstAttendancePage = function(userId) {
    initAttendancePagination(userId);
    userAttendancePagination[userId].currentPage = 1;
    renderAttendanceRows(userId);
  };

  window.goToPrevAttendancePage = function(userId) {
    initAttendancePagination(userId);
    if (userAttendancePagination[userId].currentPage > 1) {
      userAttendancePagination[userId].currentPage--;
      renderAttendanceRows(userId);
    }
  };

  window.goToNextAttendancePage = function(userId) {
    initAttendancePagination(userId);
    const totalPages = getAttendanceTotalPages(userId);
    if (userAttendancePagination[userId].currentPage < totalPages) {
      userAttendancePagination[userId].currentPage++;
      renderAttendanceRows(userId);
    }
  };

  window.goToLastAttendancePage = function(userId) {
    initAttendancePagination(userId);
    const totalPages = getAttendanceTotalPages(userId);
    userAttendancePagination[userId].currentPage = totalPages;
    renderAttendanceRows(userId);
  };

  window.goToAttendancePage = function(userId, pageNum) {
    initAttendancePagination(userId);
    const totalPages = getAttendanceTotalPages(userId);
    const page = parseInt(pageNum);
    if (page >= 1 && page <= totalPages) {
      userAttendancePagination[userId].currentPage = page;
      renderAttendanceRows(userId);
    }
  };

  window.changeAttendanceItemsPerPage = function(userId, value) {
    initAttendancePagination(userId);
    userAttendancePagination[userId].itemsPerPage = parseInt(value) || 5;
    userAttendancePagination[userId].currentPage = 1;
    renderAttendanceRows(userId);
  };

  async function loadUsersFromDB() {
    if (!supabase) {
      setTimeout(loadUsersFromDB, 100);
      return;
    }
    
    try {
      const { data: usersData, error: usersError } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (usersError) {
        console.error('Error loading users:', usersError);
        return;
      }
      
      if (!usersData || usersData.length === 0) {
        attendanceList.innerHTML = '<tr><td colspan="6" class="no-records">No user records found.</td></tr>';
        return;
      }
      
      users = usersData.map(user => ({
        employeeId: user.employeeId,
        name: user.name || '',
        email: user.email || '',
        employment: user.employment || '',
        createdAt: user.createdAt
      }));
      
      DataTableManager.loadData = function() { return users; };
      DataTableManager.getFilteredData = function() { return users; };
      DataTableManager.getAllData = function() { return users; };
      
      DataTableManager.setSearchTerm('');
      DataTableManager.applySearch(['name', 'email', 'employment']);
      Paginate.setTotalItems(users.length);
      Paginate.setPage(1);
      
      renderUsers();
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }

  async function loadAttendanceForUser(userId) {
    if (!supabase) return;
    
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from(ATTENDANCE_TABLE)
        .select('*')
        .eq('employeeId', userId)
        .order('timeIn', { ascending: false });
      
      if (attendanceError) {
        console.error('Error loading attendance:', attendanceError);
        return;
      }
      
      userAttendance[userId] = (attendanceData || []).map(record => ({
        attendId: record.attendId,
        date: record.timeIn ? new Date(record.timeIn).toLocaleDateString() : null,
        timeIn: record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : null,
        timeOut: record.timeOut ? new Date(record.timeOut).toLocaleTimeString() : null,
        status: record.status,
        originalStatus: record.status
      }));
      
      initAttendancePagination(userId);
      
      renderAttendanceRows(userId);
    } catch (err) {
      console.error('Error loading attendance:', err);
    }
  }

  window.editAttendance = function(userId, attendId) {
    const statusCell = document.getElementById(`status-cell-${attendId}`);
    const attendance = userAttendance[userId].find(a => a.attendId === attendId);
    if (!attendance) return;
    
    DataTableManager.startEdit(attendId, ['status']);
    
    const row = document.querySelector(`tr[data-attendid="${attendId}"]`);
    if (!row) return;
    
    const editRow = document.createElement('tr');
    editRow.className = 'attendance-edit-row';
    editRow.id = `edit-row-${attendId}`;
    editRow.innerHTML = `
      <td colspan="4" style="padding: 15px; background: #fff3cd;">
        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
          <span style="font-weight: 500; color: #374151;">Edit Status:</span>
          <select class="edit-select" id="edit-status-${attendId}" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; min-width: 150px;">
            <option value="Present" ${attendance.status === 'Present' ? 'selected' : ''}>Present</option>
            <option value="Late" ${attendance.status === 'Late' ? 'selected' : ''}>Late</option>
            <option value="Absent" ${attendance.status === 'Absent' ? 'selected' : ''}>Absent</option>
            <option value="Excused" ${attendance.status === 'Excused' ? 'selected' : ''}>Excused</option>
            <option value="Unattended" ${attendance.status === 'Unattended' ? 'selected' : ''}>Unattended</option>
          </select>
          <button class="btn-icon save-btn" onclick="window.saveAttendance('${userId}', '${attendId}')" title="Save" style="background: #374151; border-color: #374151;">
            <span class="material-symbols-outlined" style="color: #fff;">check</span>
          </button>
          <button class="btn-icon cancel-btn" onclick="window.cancelAttendanceEdit('${userId}', '${attendId}')" title="Cancel" style="background: #fef2f2; border-color: #fecaca;">
            <span class="material-symbols-outlined" style="color: #dc2626;">close</span>
          </button>
        </div>
      </td>
    `;
    
    row.style.display = 'none';
    row.after(editRow);
  };

  window.cancelAttendanceEdit = function(userId, attendId) {
    const editRow = document.getElementById(`edit-row-${attendId}`);
    const originalRow = document.querySelector(`tr[data-attendid="${attendId}"]`);
    
    if (editRow) {
      editRow.remove();
    }
    
    if (originalRow) {
      originalRow.style.display = '';
    }
    
    DataTableManager.cancelEdit(attendId);
  };

  window.saveAttendance = async function(userId, attendId) {
    const statusVal = document.getElementById(`edit-status-${attendId}`).value;
    const attendanceInArray = userAttendance[userId].find(a => a.attendId === attendId);
    
    if (!attendanceInArray) return;
    
    const hasChanged = statusVal !== (attendanceInArray.status || '');
    
    if (hasChanged) {
      if (!supabase) {
        alert('Database connection not available');
        return;
      }
      
      try {
        const { error } = await supabase
          .from(ATTENDANCE_TABLE)
          .update({ status: statusVal })
          .eq('attendId', attendId);
        
        if (error) {
          console.error('Error updating attendance:', error);
          alert('Error updating attendance: ' + error.message);
          return;
        }
        
        console.log('attendance_db: Attendance status saved successfully.');
        
        if (editRow) {
          editRow.remove();
        }
        
        attendanceInArray.status = statusVal;
        
        const originalRow = document.querySelector(`tr[data-attendid="${attendId}"]`);
        if (originalRow) {
          originalRow.style.display = '';
          const statusCell = document.getElementById(`status-cell-${attendId}`);
          if (statusCell) {
            statusCell.innerHTML = `
              <span class="status-badge status-${(statusVal || 'unattended').toLowerCase()}">${statusVal || 'Unattended'}</span>
            `;
          }
        }
      } catch (error) {
        console.error('Error updating attendance:', error);
        alert('Error updating attendance. Please try again.');
      }
    } else {
      console.log('attendance_db: No changes detected.');
      cancelAttendanceEdit(userId, attendId);
    }
  };

  window.exportAllUsersAttendanceCSV = function() {
    if (users.length === 0) {
      alert('No users to export.');
      return;
    }
    
    let exportRows = [];
    let userNames = [];
    
    users.forEach((user, index) => {
      const userAtt = userAttendance[user.employeeId] || [];
      
      if (user) {
        userNames.push(user.name);
      }
      
      if (userAtt.length === 0) {
        exportRows.push({
          userName: user?.name || '',
          userEmail: user?.email || '',
          userEmployment: user?.employment || '',
          dateCreated: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
          attDate: '',
          attTimeIn: '',
          attTimeOut: '',
          attStatus: ''
        });
      } else {
        userAtt.forEach((record, attIndex) => {
          exportRows.push({
            userName: attIndex === 0 ? (user?.name || '') : '',
            userEmail: attIndex === 0 ? (user?.email || '') : '',
            userEmployment: attIndex === 0 ? (user?.employment || '') : '',
            dateCreated: attIndex === 0 ? (user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '') : '',
            attDate: record.date || '',
            attTimeIn: record.timeIn || '',
            attTimeOut: record.timeOut || '',
            attStatus: record.status || ''
          });
        });
      }
    });
    
    if (exportRows.length === 0) {
      alert('No data to export.');
      return;
    }
    
    const headers = ['Username', 'Email', 'Employment', 'Date Created', 'Attendance Date', 'Time In', 'Time Out', 'Status'];
    const rows = [headers.join(',')];
    
    exportRows.forEach(rowData => {
      const values = [
        String(rowData.userName || '').includes(',') ? `"${rowData.userName}"` : (rowData.userName || ''),
        String(rowData.userEmail || '').includes(',') ? `"${rowData.userEmail}"` : (rowData.userEmail || ''),
        String(rowData.userEmployment || '').includes(',') ? `"${rowData.userEmployment}"` : (rowData.userEmployment || ''),
        String(rowData.dateCreated || '').includes(',') ? `"${rowData.dateCreated}"` : (rowData.dateCreated || ''),
        String(rowData.attDate || '').includes(',') ? `"${rowData.attDate}"` : (rowData.attDate || ''),
        String(rowData.attTimeIn || '').includes(',') ? `"${rowData.attTimeIn}"` : (rowData.attTimeIn || ''),
        String(rowData.attTimeOut || '').includes(',') ? `"${rowData.attTimeOut}"` : (rowData.attTimeOut || ''),
        String(rowData.attStatus || '').includes(',') ? `"${rowData.attStatus}"` : (rowData.attStatus || '')
      ];
      rows.push(values.join(','));
    });
    
    const csvContent = rows.join('\n');
    downloadFile(csvContent, 'all_users_attendance.csv', 'text/csv');
  };

  window.exportAllUsersAttendanceJSON = function() {
    if (users.length === 0) {
      alert('No users to export.');
      return;
    }
    
    let exportData = [];
    let userNames = [];
    
    users.forEach(user => {
      const userAtt = userAttendance[user.employeeId] || [];
      
      if (user) {
        userNames.push(user.name);
      }
      
      exportData.push({
        user: {
          name: user?.name || '',
          email: user?.email || '',
          employment: user?.employment || '',
          dateCreated: user?.createdAt || ''
        },
        attendance: userAtt.map(record => ({
          date: record.date || '',
          timeIn: record.timeIn || '',
          timeOut: record.timeOut || '',
          status: record.status || ''
        }))
      });
    });
    
    if (exportData.length === 0) {
      alert('No data to export.');
      return;
    }
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, 'all_users_attendance.json', 'application/json');
  };

  window.exportSelectedUsersAttendance = function() {
    const selectedIds = DataTableManager.getSelectedItems();
    if (selectedIds.length === 0) {
      alert('No users selected. Please select users to export their attendance data.');
      return;
    }
    
    let exportRows = [];
    let userNames = [];
    
    selectedIds.forEach(userId => {
      const user = users.find(u => u.employeeId === userId);
      const userAtt = userAttendance[userId] || [];
      
      if (user) {
        userNames.push(user.name);
      }
      
      if (userAtt.length === 0) {
        exportRows.push({
          userName: user?.name || '',
          userEmail: user?.email || '',
          userEmployment: user?.employment || '',
          dateCreated: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
          attDate: '',
          attTimeIn: '',
          attTimeOut: '',
          attStatus: ''
        });
      } else {
        userAtt.forEach((record, index) => {
          exportRows.push({
            userName: index === 0 ? (user?.name || '') : '',
            userEmail: index === 0 ? (user?.email || '') : '',
            userEmployment: index === 0 ? (user?.employment || '') : '',
            dateCreated: index === 0 ? (user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '') : '',
            attDate: record.date || '',
            attTimeIn: record.timeIn || '',
            attTimeOut: record.timeOut || '',
            attStatus: record.status || ''
          });
        });
      }
    });
    
    if (exportRows.length === 0) {
      alert('No data to export.');
      return;
    }
    
    const headers = ['Username', 'Email', 'Employment', 'Date Created', 'Attendance Date', 'Time In', 'Time Out', 'Status'];
    const rows = [headers.join(',')];
    
    exportRows.forEach(rowData => {
      const values = [
        String(rowData.userName || '').includes(',') ? `"${rowData.userName}"` : (rowData.userName || ''),
        String(rowData.userEmail || '').includes(',') ? `"${rowData.userEmail}"` : (rowData.userEmail || ''),
        String(rowData.userEmployment || '').includes(',') ? `"${rowData.userEmployment}"` : (rowData.userEmployment || ''),
        String(rowData.dateCreated || '').includes(',') ? `"${rowData.dateCreated}"` : (rowData.dateCreated || ''),
        String(rowData.attDate || '').includes(',') ? `"${rowData.attDate}"` : (rowData.attDate || ''),
        String(rowData.attTimeIn || '').includes(',') ? `"${rowData.attTimeIn}"` : (rowData.attTimeIn || ''),
        String(rowData.attTimeOut || '').includes(',') ? `"${rowData.attTimeOut}"` : (rowData.attTimeOut || ''),
        String(rowData.attStatus || '').includes(',') ? `"${rowData.attStatus}"` : (rowData.attStatus || '')
      ];
      rows.push(values.join(','));
    });
    
    const csvContent = rows.join('\n');
    downloadFile(csvContent, `users_attendance_${userNames.join('_')}.csv`, 'text/csv');
  };

  window.exportSelectedUsersAttendanceJSON = function() {
    const selectedIds = DataTableManager.getSelectedItems();
    if (selectedIds.length === 0) {
      alert('No users selected. Please select users to export their attendance data.');
      return;
    }
    
    let exportData = [];
    let userNames = [];
    
    selectedIds.forEach(userId => {
      const user = users.find(u => u.employeeId === userId);
      const userAtt = userAttendance[userId] || [];
      
      if (user) {
        userNames.push(user.name);
      }
      
      exportData.push({
        user: {
          name: user?.name || '',
          email: user?.email || '',
          employment: user?.employment || '',
          dateCreated: user?.createdAt || ''
        },
        attendance: userAtt.map(record => ({
          date: record.date || '',
          timeIn: record.timeIn || '',
          timeOut: record.timeOut || '',
          status: record.status || ''
        }))
      });
    });
    
    if (exportData.length === 0) {
      alert('No data to export.');
      return;
    }
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, `users_attendance_${userNames.join('_')}.json`, 'application/json');
  };

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

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
    if (!activeFilters) return;
    
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
    if (!activeSorts) return;
    
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
    
    const allUsers = DataTableManager.getAllData();
    
    if (filters.length === 0) {
      DataTableManager.setSearchTerm('');
      DataTableManager.applySearch(['name', 'email', 'employment']);
      document.getElementById('filterStatus').textContent = '';
    } else {
      const filtered = allUsers.filter(user => {
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
      DataTableManager.setSearchTerm('');
      DataTableManager.applySearch = function() { return filtered; };
      DataTableManager.getFilteredData = function() { return filtered; };
      document.getElementById('filterStatus').textContent = `Filtered (${filters.length})`;
    }
    
    Paginate.setTotalItems(DataTableManager.getFilteredData().length);
    Paginate.setPage(1);
    renderUsers();
    toggleFilterMenu();
    
    const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
    if (filterWrapper) filterWrapper.classList.remove('active');
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
    
    const allUsers = DataTableManager.getAllData();
    
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
    
    DataTableManager.setSearchTerm('');
    DataTableManager.applySearch = function() { return allUsers; };
    DataTableManager.getFilteredData = function() { return allUsers; };
    
    Paginate.setTotalItems(allUsers.length);
    Paginate.setPage(1);
    renderUsers();
    toggleSortMenu();
    
    const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
    if (sortWrapper) sortWrapper.classList.remove('active');
  };

  document.addEventListener('click', function(event) {
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');
    const filterMenu = document.getElementById('filterMenu');
    const filterBtn = document.querySelector('.table-filter-wrapper:first-child .filter-btn');
    const sortMenu = document.getElementById('sortMenu');
    const sortBtn = document.querySelector('.table-filter-wrapper:last-child .filter-btn');
    
    if (exportBtn && exportMenu && !exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
      exportMenu.style.display = 'none';
    }
    
    if (filterBtn && filterMenu && !filterBtn.contains(event.target) && !filterMenu.contains(event.target)) {
      filterMenu.style.display = 'none';
      if (filterBtn) filterBtn.classList.remove('active');
    }
    
    if (sortBtn && sortMenu && !sortBtn.contains(event.target) && !sortMenu.contains(event.target)) {
      sortMenu.style.display = 'none';
      if (sortBtn) sortBtn.classList.remove('active');
    }
  });

  loadUsersFromDB();
});
