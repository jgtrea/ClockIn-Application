const scheduleList = document.getElementById("scheduleList");
const USERS_TABLE = 'user_employee_data';
const SCHEDULE_TABLE = 'schedule';
const SECTIONS_TABLE = 'sections';

let userSchedules = [];
let searchTerm = '';
let expandedRows = {};
let expandedAddForms = {};
let editingSlotId = null;
let editingDaySchedules = {};
let sortAscending = true;
let selectedDays = {};

document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabaseClient;
  
  if (!supabase) {
    setTimeout(() => {
      if (typeof initializeSchedule === 'function') {
        initializeSchedule();
      }
    }, 500);
    return;
  }
  
  initializeSchedule();
});

function initializeSchedule() {
  const supabase = window.supabaseClient;
  
  PaginationManager.init({
    containerId: 'schedule_db',
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

function applyScheduleSearch() {
  if (!searchTerm) {
    DataTableManager.setSearchTerm('');
    DataTableManager.applySearch(['name', 'subtitle']);
  } else {
    DataTableManager.setSearchTerm(searchTerm);
    DataTableManager.applySearch(['name', 'subtitle']);
  }
}

window.performScheduleSearch = function(term) {
  searchTerm = term || '';
  applyScheduleSearch();
};

async function loadSchedule(userId, selectedDay = 'Monday') {
  const supabase = window.supabaseClient;
  const scheduleTable = document.getElementById(`schedule-table-${userId}`);
  
  if (!scheduleTable) return;
  
  selectedDays[userId] = selectedDay;
  
  scheduleTable.innerHTML = '<p style="text-align:center; color:#999; padding:10px;">Loading...</p>';
  
  try {
    const { data: scheduleData, error } = await supabase
      .from(SCHEDULE_TABLE)
      .select('*')
      .eq('employeeId', userId)
      .eq('weekday', selectedDay)
      .order('startTime', { ascending: true });
    
    if (error) {
      console.error('Error loading schedule:', error);
      scheduleTable.innerHTML = '<p style="text-align:center; color:#ef4444; padding:10px;">Error loading schedule.</p>';
      return;
    }
    
    if (!scheduleData || scheduleData.length === 0) {
      scheduleTable.innerHTML = '<p style="text-align:center; color:#999; padding:10px;">No schedule found for ' + selectedDay + '.</p>';
      return;
    }
    
    const sectIds = [...new Set(scheduleData.map(item => item.sectId).filter(Boolean))];
    let sectionNames = {};
    
    if (sectIds.length > 0) {
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('sectId, sectionName')
        .in('sectId', sectIds);
      
      if (sectionsData) {
        sectionsData.forEach(section => {
          sectionNames[section.sectId] = section.sectionName;
        });
      }
    }
    
    scheduleTable.innerHTML = scheduleData.map(item => {
      const isEditing = editingSlotId === item.schedId;
      const editingKey = `${userId}-${selectedDay}`;
      
      if (isEditing && editingDaySchedules[editingKey] === item.schedId) {
        return `
          <div class="slot-row editing-row">
            <span><input type="time" id="edit-start-${item.schedId}" value="${item.startTime || ''}"></span>
            <span><input type="time" id="edit-end-${item.schedId}" value="${item.endTime || ''}"></span>
            <span><select id="edit-section-${item.schedId}" data-current-sectid="${item.sectId}" style="width: 90%; padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 12px;"><option>Loading...</option></select></span>
            <span><input type="text" id="edit-subject-${item.schedId}" value="${item.subject || ''}"></span>
            <span class="actions-cell">
              <button type="button" class="action-icon-btn" onclick="window.updateSchedule('${userId}', '${item.schedId}', '${selectedDay}')"><span class="material-symbols-outlined">check</span></button>
              <button type="button" class="action-icon-btn" onclick="window.cancelScheduleEdit()"><span class="material-symbols-outlined">close</span></button>
            </span>
          </div>`;
      }
      
      return `
        <div class="slot-row">
          <span>${formatTime(item.startTime)}</span>
          <span>${formatTime(item.endTime)}</span>
          <span>${sectionNames[item.sectId] || item.sectionName || '-'}</span>
          <span>${item.subject || '-'}</span>
          <span class="actions-cell">
            <button type="button" class="action-icon-btn" onclick="window.toggleScheduleEdit('${userId}', '${item.schedId}', '${selectedDay}')"><span class="material-symbols-outlined">edit</span></button>
            <button type="button" class="action-icon-btn delete" onclick="window.deleteSchedule('${userId}', '${item.schedId}')"><span class="material-symbols-outlined">delete</span></button>
          </span>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading teacher schedule:', error);
    scheduleTable.innerHTML = '<p style="text-align:center; color:#ef4444; padding:10px;">Error loading schedule.</p>';
  }
}

async function toggleScheduleEdit(userId, schedId, day) {
  const editingKey = `${userId}-${day}`;
  if (editingSlotId === schedId && editingDaySchedules[editingKey] === schedId) {
    editingSlotId = null;
    delete editingDaySchedules[editingKey];
  } else {
    editingSlotId = schedId;
    editingDaySchedules[editingKey] = schedId;
  }
  await loadSchedule(userId, day);
  
  if (editingSlotId === schedId) {
    const sections = await loadSectionsForDropdown(userId);
    const sectionSelect = document.getElementById(`edit-section-${schedId}`);
    if (sectionSelect && sections.length > 0) {
      const currentSectId = sectionSelect.getAttribute('data-current-sectid');
      sectionSelect.innerHTML = sections.map(s => 
        `<option value="${s.sectId}" ${s.sectId === currentSectId ? 'selected' : ''}>${s.sectionName}</option>`
      ).join('');
    }
  }
}
window.toggleScheduleEdit = toggleScheduleEdit;

function cancelScheduleEdit() {
  editingSlotId = null;
  Object.keys(editingDaySchedules).forEach(key => {
    delete editingDaySchedules[key];
  });
  Object.keys(expandedRows).forEach(uid => {
    if (expandedRows[uid]) {
      loadSchedule(uid, selectedDays[uid] || 'Monday');
    }
  });
}
window.cancelScheduleEdit = cancelScheduleEdit;

async function updateSchedule(userId, schedId, day) {
  const supabase = window.supabaseClient;
  const newStartTime = document.getElementById(`edit-start-${schedId}`).value;
  const newEndTime = document.getElementById(`edit-end-${schedId}`).value;
  const newSectId = document.getElementById(`edit-section-${schedId}`).value;
  const newSubject = document.getElementById(`edit-subject-${schedId}`).value;
  
  if (!newStartTime || !newEndTime || !newSectId || !newSubject) {
    alert('Please fill in all required fields');
    return;
  }
  
  try {
    const { error } = await supabase
      .from(SCHEDULE_TABLE)
      .update({
        startTime: newStartTime,
        endTime: newEndTime,
        sectId: newSectId,
        subject: newSubject
      })
      .eq('schedId', schedId);
    
    if (error) {
      console.error('Error updating schedule:', error);
      alert('Error updating schedule: ' + error.message);
      return;
    }
    
    editingSlotId = null;
    const editingKey = `${userId}-${day}`;
    delete editingDaySchedules[editingKey];
    
    loadSchedule(userId, day);
  } catch (error) {
    console.error('Error updating schedule:', error);
    alert('Error updating schedule. Please try again.');
  }
}
window.updateSchedule = updateSchedule;

async function loadUsersFromDB() {
  const supabase = window.supabaseClient;
  if (!supabase) return;
  
  try {
    const { data: usersData, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error loading users:', error);
      return;
    }
    
    userSchedules = usersData.map(user => ({
      uid: user.employeeId,
      name: user.name || '',
      subtitle: `${user.email || 'N/A'} | ${user.employment || 'N/A'}`
    }));
    
    DataTableManager.setSearchTerm('');
    DataTableManager.applySearch(['name', 'subtitle']);
    PaginationManager.setTotalItems(userSchedules.length);
    render();
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

function formatTime(time) {
  if (!time) return '';
  const parts = time.split(':');
  return `${parseInt(parts[0])}:${parts[1] || '00'}`;
}

async function loadSectionsForDropdown(userId) {
  const supabase = window.supabaseClient;
  try {
    const { data, error } = await supabase
      .from('sections')
      .select('sectId, sectionName')
      .order('sectionName', { ascending: true });
    
    if (error) {
      console.error('Error loading sections:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error loading sections:', error);
    return [];
  }
}

function toggleUser(uid) {
  expandedRows[uid] = !expandedRows[uid];
  if (!expandedRows[uid]) {
    expandedAddForms[uid] = false;
    editingSlotId = null;
    Object.keys(editingDaySchedules).forEach(key => {
      if (key.startsWith(uid + '-')) {
        delete editingDaySchedules[key];
      }
    });
  } else {
    if (!selectedDays[uid]) {
      selectedDays[uid] = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    }
  }
  render();
  
  if (expandedRows[uid]) {
    loadSchedule(uid, selectedDays[uid]);
  }
}
window.toggleUser = toggleUser;

async function toggleAddSchedule(uid) {
  expandedAddForms[uid] = !expandedAddForms[uid];
  render();
  
  if (expandedAddForms[uid]) {
    const sections = await loadSectionsForDropdown(uid);
    const sectionSelect = document.getElementById(`add-section-${uid}`);
    if (sectionSelect && sections.length > 0) {
      sectionSelect.innerHTML = '<option value="">Select a section</option>' + 
        sections.map(s => `<option value="${s.sectId}">${s.sectionName}</option>`).join('');
    }
  }
}
window.toggleAddSchedule = toggleAddSchedule;

async function saveSchedule(uid) {
  const supabase = window.supabaseClient;
  const time = document.getElementById(`add-time-${uid}`).value;
  const endTime = document.getElementById(`add-endtime-${uid}`).value;
  const sectId = document.getElementById(`add-section-${uid}`).value;
  const subject = document.getElementById(`add-subject-${uid}`).value;
  
  if (!time || !endTime || !sectId || !subject) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const { error } = await supabase
      .from(SCHEDULE_TABLE)
      .insert({
        employeeId: uid,
        sectId: sectId,
        subject: subject,
        startTime: time,
        endTime: endTime,
        weekday: selectedDays[uid] || new Date().toLocaleDateString('en-US', { weekday: 'long' })
      });
    
    if (error) {
      console.error('Error saving schedule:', error);
      alert('Error saving schedule: ' + error.message);
      return;
    }
    
    toggleAddSchedule(uid);
    loadSchedule(uid, selectedDays[uid] || new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    
  } catch (error) {
    console.error('Error saving schedule:', error);
    alert('Error saving schedule. Please try again.');
  }
}
window.saveSchedule = saveSchedule;

async function deleteSchedule(uid, schedId) {
  const supabase = window.supabaseClient;
  if (!confirm('Are you sure you want to delete this schedule entry?')) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from(SCHEDULE_TABLE)
      .delete()
      .eq('schedId', schedId);
    
    if (error) {
      console.error('Error deleting schedule:', error);
      alert('Error deleting schedule: ' + error.message);
      return;
    }
    
    loadSchedule(uid, selectedDays[uid] || 'Monday');
    
  } catch (error) {
    console.error('Error deleting schedule:', error);
    alert('Error deleting schedule. Please try again.');
  }
}
window.deleteSchedule = deleteSchedule;

function render() {
  const pageData = PaginationManager.getPageData(DataTableManager.getFilteredData());
  
  scheduleList.innerHTML = '';
  
  if (!pageData || pageData.length === 0) {
    scheduleList.innerHTML = '<div class="no-records">No user records found.</div>';
    document.getElementById('pagination').style.display = 'none';
    return;
  }
  
  pageData.forEach(user => {
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
            <button type="button" class="btn-outline" onclick="window.toggleUser('${user.uid}')">View</button>
          </div>
        </div>`;
    } else {
      row.innerHTML = `
        <div class="user-expanded-content">
          <div class="schedule-main-section">
            <div class="user-text-details">
              <span class="user-name">${user.name}</span>
              <span class="user-subtitle">${user.subtitle}</span>
            </div>
            
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: 600;">Select Day:</label>
              <select id="day-select-${user.uid}" onchange="window.loadScheduleForDay('${user.uid}', this.value)" style="width: 200px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                <option value="Monday" ${selectedDays[user.uid] === 'Monday' ? 'selected' : ''}>Monday</option>
                <option value="Tuesday" ${selectedDays[user.uid] === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
                <option value="Wednesday" ${selectedDays[user.uid] === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
                <option value="Thursday" ${selectedDays[user.uid] === 'Thursday' ? 'selected' : ''}>Thursday</option>
                <option value="Friday" ${selectedDays[user.uid] === 'Friday' ? 'selected' : ''}>Friday</option>
                <option value="Saturday" ${selectedDays[user.uid] === 'Saturday' ? 'selected' : ''}>Saturday</option>
                <option value="Sunday" ${selectedDays[user.uid] === 'Sunday' ? 'selected' : ''}>Sunday</option>
              </select>
            </div>
            
            <div class="schedule-table-header">
              <span>Start Time</span><span>End Time</span><span>Section</span><span>Subject</span><span>Actions</span>
            </div>
            <div id="schedule-table-${user.uid}">
              <p style="text-align:center; color:#999; padding:10px;">Click "View" to load schedule</p>
            </div>
            
            <button type="button" class="btn-outline" onclick="window.toggleAddSchedule('${user.uid}')" style="margin-top: 15px;">Add Schedule</button>
            
            ${isAddFormOpen ? `
            <div id="add-schedule-form-${user.uid}" style="margin-top: 20px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
              <h4 style="margin: 0 0 15px 0;">Add New Schedule</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: 600;">Start Time:</label>
                  <input type="time" id="add-time-${user.uid}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: 600;">End Time:</label>
                  <input type="time" id="add-endtime-${user.uid}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: 600;">Section:</label>
                  <select id="add-section-${user.uid}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                    <option value="">Loading sections...</option>
                  </select>
                </div>
                <div></div>
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Subject:</label>
                <input type="text" id="add-subject-${user.uid}" placeholder="e.g. Mathematics, English" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
              </div>
              <div style="display: flex; gap: 10px;">
                <button type="button" class="btn-outline" onclick="window.saveSchedule('${user.uid}')">Save</button>
                <button type="button" class="btn-outline" onclick="window.toggleAddSchedule('${user.uid}')">Cancel</button>
              </div>
            </div>` : `<div id="add-schedule-form-${user.uid}" style="display: none;"></div>`}
          </div>
          
          <div class="sidebar-actions">
            <div class="btn-group">
              <button type="button" class="btn-outline" onclick="window.toggleUser('${user.uid}')">Close</button>
            </div>
          </div>
        </div>`;
    }
    scheduleList.appendChild(row);
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

function sortSchedules(field) {
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

window.loadScheduleForDay = function(userId, selectedDay) {
  loadSchedule(userId, selectedDay);
};
window.loadSchedule = loadSchedule;
