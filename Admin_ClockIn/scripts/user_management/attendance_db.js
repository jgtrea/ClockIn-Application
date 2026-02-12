const attendanceList = document.getElementById("attendanceList");
const USERS_TABLE = 'user_employee_data';
const ATTENDANCE_TABLE = 'attendance';
const SCHEDULE_TABLE = 'schedule';
const SECTIONS_TABLE = 'sections';

let userAttendance = [];
let searchTerm = '';
let expandedRows = {};
let selectedDates = {};
let editingAttendance = {};
let sortAscending = true;

document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabaseClient;
  
  if (!supabase) {
    setTimeout(() => {
      if (typeof initializeAttendance === 'function') {
        initializeAttendance();
      }
    }, 500);
    return;
  }
  
  initializeAttendance();
});

function initializeAttendance() {
  const supabase = window.supabaseClient;
  
  PaginationManager.init({
    containerId: 'attendance_db',
    itemsPerPage: 10,
    onPageChange: () => render()
  });
  
  DataTableManager.init({
    tableName: USERS_TABLE,
    supabaseClient: supabase,
    primaryKey: 'employeeId',
    render: () => {
      PaginationManager.setTotalItems(DataTableManager.getFilteredData().length);
      render();
    }
  });
  
  loadUsersFromDB();
}

async function loadUsersFromDB() {
  const supabase = window.supabaseClient;
  if (!supabase) return;
  
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
      subtitle: `${user.email || 'N/A'} | ${user.employment || 'N/A'}`,
      records: attendanceByUser[user.employeeId] || []
    }));
    
    DataTableManager.setSearchTerm('');
    DataTableManager.applySearch(['name', 'email']);
    PaginationManager.setTotalItems(userAttendance.length);
    render();
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

window.performAttendanceSearch = function(term) {
  searchTerm = term || '';
  DataTableManager.setSearchTerm(searchTerm);
  DataTableManager.applySearch(['name', 'subtitle']);
};

function render() {
  const pageData = PaginationManager.getPageData(DataTableManager.getFilteredData());
  
  attendanceList.innerHTML = '';
  
  if (!pageData || pageData.length === 0) {
    attendanceList.innerHTML = '<div class="no-records">No user records found.</div>';
    const pagination = document.getElementById('pagination');
    if (pagination) pagination.style.display = 'none';
    return;
  }
  
  pageData.forEach(user => {
    const isExpanded = !!expandedRows[user.uid];
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
            
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: 600;">Select Date:</label>
              <input type="date" id="date-select-${user.uid}" value="${selectedDates[user.uid] || ''}" onchange="window.loadAttendanceForSelectedDate('${user.uid}', this)" style="width: 200px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
            </div>
            
            <div class="schedule-table-header">
              <span>Scheduled Time</span><span>Section</span><span>Subject</span><span>Time In</span><span>Time Out</span><span>Status</span><span>Actions</span>
            </div>
            <div id="attendance-table-${user.uid}">
              <p style="text-align:center; color:#999; padding:10px;">Loading...</p>
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
  
  updatePagination();
}

function updatePagination() {
  const totalPages = PaginationManager.getTotalPages();
  const pagination = document.getElementById('pagination');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (!pagination) return;
  
  if (totalPages > 1) {
    pagination.style.display = 'block';
    if (pageInfo) pageInfo.textContent = `Page ${PaginationManager.getCurrentPage()} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = PaginationManager.getCurrentPage() === 1;
    if (nextBtn) nextBtn.disabled = PaginationManager.getCurrentPage() === totalPages;
    if (prevBtn) prevBtn.style.opacity = PaginationManager.getCurrentPage() === 1 ? '0.5' : '1';
    if (nextBtn) nextBtn.style.opacity = PaginationManager.getCurrentPage() === totalPages ? '0.5' : '1';
  } else {
    pagination.style.display = 'none';
  }
}

function changePage(direction) {
  PaginationManager.changePage(direction);
}

function toggleUser(uid) {
  expandedRows[uid] = !expandedRows[uid];
  if (!expandedRows[uid]) {
    delete selectedDates[uid];
  } else {
    if (!selectedDates[uid]) {
      selectedDates[uid] = new Date().toISOString().split('T')[0];
    }
  }
  render();
  
  if (expandedRows[uid]) {
    loadAttendanceForDate(uid, selectedDates[uid]);
  }
}
window.toggleUser = toggleUser;

async function loadAttendanceForDate(userId, selectedDate) {
  const supabase = window.supabaseClient;
  const attendanceTable = document.getElementById(`attendance-table-${userId}`);
  
  if (!attendanceTable) return;
  
  selectedDates[userId] = selectedDate;
  attendanceTable.innerHTML = '<p style="text-align:center; color:#999; padding:10px;">Loading...</p>';
  
  try {
    const date = new Date(selectedDate);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    const { data: scheduleData, error: schedError } = await supabase
      .from(SCHEDULE_TABLE)
      .select('*')
      .eq('employeeId', userId)
      .eq('weekday', weekday)
      .order('startTime', { ascending: true });
    
    if (schedError) {
      console.error('Error loading schedule:', schedError);
      attendanceTable.innerHTML = '<p style="text-align:center; color:#ef4444; padding:10px;">Error loading schedule.</p>';
      return;
    }
    
    if (!scheduleData || scheduleData.length === 0) {
      attendanceTable.innerHTML = '<p style="text-align:center; color:#999; padding:10px;">No schedule found for ' + weekday + '.</p>';
      return;
    }
    
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const { data: attendanceData, error: attError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select('*')
      .eq('employeeId', userId)
      .gte('timeIn', startOfDay.toISOString())
      .lte('timeIn', endOfDay.toISOString());
    
    if (attError) {
      console.error('Error loading attendance:', attError);
    }
    
    const attendanceMap = {};
    if (attendanceData) {
      attendanceData.forEach(att => {
        if (att.schedId) {
          attendanceMap[att.schedId] = att;
        }
      });
    }
    
    const sectIds = [...new Set(scheduleData.map(item => item.sectId).filter(Boolean))];
    let sectionNames = {};
    
    if (sectIds.length > 0) {
      const { data: sectionsData } = await supabase
        .from(SECTIONS_TABLE)
        .select('sectId, sectionName')
        .in('sectId', sectIds);
      
      if (sectionsData) {
        sectionsData.forEach(section => {
          sectionNames[section.sectId] = section.sectionName;
        });
      }
    }
    
    attendanceTable.innerHTML = scheduleData.map(item => {
      const attendance = attendanceMap[item.schedId];
      const status = attendance ? attendance.status : 'Unattended';
      const timeIn = attendance && attendance.timeIn ? new Date(attendance.timeIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';
      const timeOut = attendance && attendance.timeOut ? new Date(attendance.timeOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';
      const hasAttendance = !!attendance;
      
      return `
        <div class="slot-row">
          <span>${formatTime(item.startTime)} - ${formatTime(item.endTime)}</span>
          <span>${sectionNames[item.sectId] || '-'}</span>
          <span>${item.subject || '-'}</span>
          <span>${timeIn}</span>
          <span>${timeOut}</span>
          <span><span class="status-badge status-${status.toLowerCase()}">${status}</span></span>
          <span class="actions-cell">
            ${hasAttendance ? `<button type="button" class="action-icon-btn" onclick="window.editAttendance('${userId}', '${attendance.attendId}', '${item.schedId}')"><span class="material-symbols-outlined">edit</span></button>` : ''}
          </span>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading attendance:', error);
    attendanceTable.innerHTML = '<p style="text-align:center; color:#ef4444; padding:10px;">Error loading attendance.</p>';
  }
}

function formatTime(time) {
  if (!time) return '';
  const parts = time.split(':');
  return `${parseInt(parts[0])}:${parts[1] || '00'}`;
}

window.loadAttendanceForSelectedDate = function(userId, dateInput) {
  const selectedDate = dateInput.value;
  if (selectedDate) {
    loadAttendanceForDate(userId, selectedDate);
  }
};

window.editAttendance = async function(userId, attendId, schedId) {
  const status = prompt('Edit Status (Present/Late/Absent/Excused):');
  if (!status) return;
  
  const validStatuses = ['Present', 'Late', 'Absent', 'Excused'];
  if (!validStatuses.includes(status)) {
    alert('Invalid status. Please use: Present, Late, Absent, or Excused');
    return;
  }
  
  const supabase = window.supabaseClient;
  try {
    const { error } = await supabase
      .from(ATTENDANCE_TABLE)
      .update({ status: status })
      .eq('attendId', attendId);
    
    if (error) {
      console.error('Error updating attendance:', error);
      alert('Error updating attendance: ' + error.message);
      return;
    }
    
    loadAttendanceForDate(userId, selectedDates[userId]);
  } catch (error) {
    console.error('Error updating attendance:', error);
    alert('Error updating attendance. Please try again.');
  }
};

function sortAttendance(field) {
  const data = DataTableManager.getFilteredData();
  data.sort((a, b) => {
    let valueA, valueB;
    if (field === 'name') {
      valueA = (a.name || '').toLowerCase();
      valueB = (b.name || '').toLowerCase();
    } else if (field === 'createdAt') {
      valueA = a.createdAt || 0;
      valueB = b.createdAt || 0;
    }
    return sortAscending ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
  });
  sortAscending = !sortAscending;
  PaginationManager.setPage(1);
  render();
}

window.addEventListener('message', function(event) {
  if (event.data.type === 'search') {
    window.performAttendanceSearch(event.data.term);
  }
});
