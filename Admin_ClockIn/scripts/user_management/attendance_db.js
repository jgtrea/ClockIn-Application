const attendanceList = document.getElementById("attendanceList");
const USERS_TABLE = 'user_employee_data';
const ATTENDANCE_TABLE = 'attendance';

let userAttendance = []; 
let allUserAttendance = [];
let filteredAttendance = [];
let searchTerm = '';
let currentPage = 1;
const usersPerPage = 10;
let expandedRows = {};   
let expandedAddForms = {}; 
let editingRecordId = null;
let sortAscending = true;

function applyAttendanceSearch() {
  if (!searchTerm) {
    filteredAttendance = [...userAttendance];
  } else {
    filteredAttendance = userAttendance.filter(user => {
      const searchText = `${user.name || ''} ${user.subtitle || ''}`.toLowerCase();
      return searchText.includes(searchTerm.toLowerCase());
    });
  }
  allUserAttendance = [...filteredAttendance];
  currentPage = 1;
  render();
}

window.performAttendanceSearch = function(term) {
  searchTerm = term || '';
  applyAttendanceSearch();
};

async function loadUsersFromDB() {
  const supabase = window.supabaseClient;
  if (!supabase) {
    setTimeout(loadUsersFromDB, 500); 
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

    const { data: attendanceData, error: attendanceError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select('*');

    if (attendanceError) {
      console.error('Error loading attendance:', attendanceError);
      return;
    }

    const attendanceByUser = {};
    attendanceData.forEach(record => {
      if (!attendanceByUser[record.employeeId]) {
        attendanceByUser[record.employeeId] = [];
      }
      attendanceByUser[record.employeeId].push({
        recordId: record.attendId,
        date: record.timeIn ? new Date(record.timeIn).toLocaleDateString() : null,
        timeIn: record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : null,
        timeOut: record.timeOut ? new Date(record.timeOut).toLocaleTimeString() : null,
        status: record.status,
        originalTimeIn: record.timeIn
      });
    });

    userAttendance = usersData.map(user => ({
      uid: user.employeeId,
      name: user.name || '',
      subtitle: `${user.employeeId || 'T000'} | ${user.email || 'N/A'} | ${user.employment || 'N/A'}`,
      records: attendanceByUser[user.employeeId] || []
    }));

    applyAttendanceSearch();
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

async function updateRecord(uid, recordId) {
  const supabase = window.supabaseClient;
  const newDate = document.getElementById(`edit-date-${recordId}`).value;
  const newTimeIn = document.getElementById(`edit-in-${recordId}`).value;
  const newTimeOut = document.getElementById(`edit-out-${recordId}`).value;
  const newStatus = document.getElementById(`edit-status-${recordId}`).value;

  let timeInValue = null;
  if (newDate && newTimeIn) {
    timeInValue = new Date(`${newDate}T${newTimeIn}:00`).toISOString();
  }

  let timeOutValue = null;
  if (newDate && newTimeOut) {
    timeOutValue = new Date(`${newDate}T${newTimeOut}:00`).toISOString();
  }

  const updatedData = {
    timeIn: timeInValue,
    timeOut: timeOutValue,
    status: newStatus
  };

  try {
    const { error } = await supabase
      .from(ATTENDANCE_TABLE)
      .update(updatedData)
      .eq('attendId', recordId);

    if (error) {
      console.error('Error updating record:', error);
      alert('Error updating record: ' + error.message);
      return;
    }
    editingRecordId = null;
    loadUsersFromDB();
  } catch (err) {
    console.error('Error updating record:', err);
  }
}

function toggleEdit(recordId) {
  editingRecordId = (editingRecordId === recordId) ? null : recordId;
  render();
}

function toggleStatusEdit(recordId) {
  editingRecordId = (editingRecordId === recordId) ? null : recordId;
  render();
}

async function updateStatus(uid, recordId) {
  const supabase = window.supabaseClient;
  const updatedData = {
    status: document.getElementById(`edit-status-${recordId}`).value
  };

  try {
    const { error } = await supabase
      .from(ATTENDANCE_TABLE)
      .update(updatedData)
      .eq('attendId', recordId);

    if (error) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + error.message);
      return;
    }
    editingRecordId = null;
    loadUsersFromDB();
  } catch (err) {
    console.error('Error updating status:', err);
  }
}

function toggleUser(uid) {
  expandedRows[uid] = !expandedRows[uid];
  if (!expandedRows[uid]) {
    expandedAddForms[uid] = false;
    editingRecordId = null;
  }
  render();
}

function toggleAddAttendance(uid) {
  expandedAddForms[uid] = !expandedAddForms[uid];
  render();
}

async function addAttendance(uid) {
  const supabase = window.supabaseClient;
  const date = document.getElementById(`add-date-${uid}`).value;
  const timeIn = document.getElementById(`add-timein-${uid}`).value;
  const timeOut = document.getElementById(`add-timeout-${uid}`).value;
  const status = document.getElementById(`add-status-${uid}`).value;

  if (!date || !timeIn) {
    alert('Please fill in date and time in');
    return;
  }

  const timeInValue = new Date(`${date}T${timeIn}:00`).toISOString();
  const timeOutValue = timeOut ? new Date(`${date}T${timeOut}:00`).toISOString() : null;

  try {
    const { error } = await supabase
      .from(ATTENDANCE_TABLE)
      .insert({
        employeeId: uid,
        timeIn: timeInValue,
        timeOut: timeOutValue,
        status: status
      });

    if (error) {
      console.error('Error adding attendance:', error);
      alert('Error adding attendance: ' + error.message);
      return;
    }
    loadUsersFromDB();
  } catch (err) {
    console.error('Error adding attendance:', err);
    alert('Error adding attendance. Please try again.');
  }
}

function render() {
  const totalPages = Math.ceil(allUserAttendance.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const pageUsers = allUserAttendance.slice(startIndex, endIndex);
  
  attendanceList.innerHTML = '';
  
  if (!pageUsers || pageUsers.length === 0) {
    attendanceList.innerHTML = '<div class="no-records">No user records found.</div>';
    const pagination = document.getElementById('pagination');
    if (pagination) pagination.style.display = 'none';
    return;
  }
  
  pageUsers.forEach(user => {
    const isExpanded = !!expandedRows[user.uid];
    const isAddFormOpen = !!expandedAddForms[user.uid];
    const row = document.createElement('div');
    row.className = `user-row ${isExpanded ? 'expanded' : ''}`;

    if (!isExpanded) {
      row.innerHTML = `
        <div class="user-collapsed-content">
          <div class="user-text-details">
            <span class="user-name">${user.name}</span>
            <span class="user-subtitle">${user.subtitle}</span>
          </div>
          <div class="btn-group">
            <button class="btn-outline" onclick="toggleUser('${user.uid}')">View</button>
          </div>
        </div>`;
    } else {
      row.innerHTML = `
        <div class="user-expanded-content">
          <div class="attendance-main-section">
            <div class="user-text-details">
              <span class="user-name">${user.name}</span>
              <span class="user-subtitle">${user.subtitle}</span>
            </div>

            <div class="attendance-table-header">
              <span>Date</span><span>In</span><span>Out</span><span>Status</span><span class="actions-header">Actions</span>
            </div>
            
            <div class="records-list">
              ${user.records.length > 0 ? user.records.map(r => {
                const isEditing = editingRecordId === r.recordId;
                const editDate = r.originalTimeIn ? new Date(r.originalTimeIn).toISOString().split('T')[0] : '';
                const editTimeIn = r.timeIn || '';
                const editTimeOut = r.timeOut || '';
                
                if (isEditing) {
                  return `
                    <div class="record-row editing-row">
                      <span><input type="date" id="edit-date-${r.recordId}" value="${editDate}"></span>
                      <span><input type="time" id="edit-in-${r.recordId}" value="${editTimeIn}"></span>
                      <span><input type="time" id="edit-out-${r.recordId}" value="${editTimeOut}"></span>
                      <span>
                        <select id="edit-status-${r.recordId}">
                          <option value="Present" ${r.status==='Present'?'selected':''}>Present</option>
                          <option value="Late" ${r.status==='Late'?'selected':''}>Late</option>
                          <option value="Absent" ${r.status==='Absent'?'selected':''}>Absent</option>
                          <option value="Excused" ${r.status==='Excused'?'selected':''}>Excused</option>
                        </select>
                      </span>
                      <span class="actions-cell">
                        <button class="action-icon-btn" onclick="updateRecord('${user.uid}', '${r.recordId}')"><span class="material-symbols-outlined">check</span></button>
                        <button class="action-icon-btn" onclick="toggleStatusEdit(null)"><span class="material-symbols-outlined">close</span></button>
                      </span>
                    </div>`;
                }
                return `
                  <div class="record-row">
                    <span>${r.date || '-'}</span><span>${r.timeIn || '-'}</span><span>${r.timeOut || '-'}</span><span>${r.status || '-'}</span>
                    <span class="actions-cell">
                      <button class="action-icon-btn" onclick="toggleStatusEdit('${r.recordId}')"><span class="material-symbols-outlined">edit</span></button>
                    </span>
                  </div>`;
              }).join('') : '<p style="text-align:center; color:#999; padding:10px;">No records found.</p>'}
            </div>
            
            <button class="btn-outline" onclick="toggleAddAttendance('${user.uid}')" style="margin-top: 15px;">Add Attendance</button>
            
            <div id="add-attendance-form-${user.uid}" style="display: ${isAddFormOpen ? 'block' : 'none'}; margin-top: 20px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
              <h4 style="margin: 0 0 15px 0;">Add New Attendance</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: 600;">Date:</label>
                  <input type="date" id="add-date-${user.uid}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: 600;">Time In:</label>
                  <input type="time" id="add-timein-${user.uid}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: 600;">Time Out:</label>
                  <input type="time" id="add-timeout-${user.uid}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: 600;">Status:</label>
                  <select id="add-status-${user.uid}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                    <option value="Excused">Excused</option>
                  </select>
                </div>
              </div>
              <div style="display: flex; gap: 10px;">
                <button class="btn-outline" onclick="addAttendance('${user.uid}')">Save</button>
                <button class="btn-outline" onclick="toggleAddAttendance('${user.uid}')">Cancel</button>
              </div>
            </div>
          </div>

          <div class="sidebar-actions">
            <div class="btn-group">
              <button class="btn-outline" onclick="toggleUser('${user.uid}')">Close</button>
            </div>
          </div>
        </div>`;
    }
    attendanceList.appendChild(row);
  });
  
  updatePagination(totalPages);
}

function updatePagination(totalPages) {
  const pagination = document.getElementById('pagination');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (!pagination) return;
  
  if (totalPages > 1) {
    pagination.style.display = 'block';
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (prevBtn) prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
    if (nextBtn) nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
  } else {
    pagination.style.display = 'none';
  }
}

function changePage(direction) {
  const totalPages = Math.ceil(allUserAttendance.length / usersPerPage);
  const newPage = currentPage + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    render();
  }
}

function sortAttendance(field) {
  allUserAttendance.sort((a, b) => {
    let valueA, valueB;
    if (field === 'name') {
      valueA = (a.name || '').toLowerCase();
      valueB = (b.name || '').toLowerCase();
    } else if (field === 'id') {
      valueA = (a.uid || '').toLowerCase();
      valueB = (b.uid || '').toLowerCase();
    } else if (field === 'createdAt') {
      valueA = a.createdAt || 0;
      valueB = b.createdAt || 0;
    }
    return sortAscending ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
  });
  sortAscending = !sortAscending;
  currentPage = 1;
  render();
}

loadUsersFromDB();

window.addEventListener('message', function(event) {
  if (event.data.type === 'search') {
    window.performAttendanceSearch(event.data.term);
  }
});
