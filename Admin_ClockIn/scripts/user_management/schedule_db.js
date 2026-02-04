const scheduleList = document.getElementById("scheduleList");
const USERS_TABLE = 'user_employee_data';
const SCHEDULE_TABLE = 'schedule';
const SECTIONS_TABLE = 'sections';

let userSchedules = [];
let allUserSchedules = [];
let filteredSchedules = [];
let searchTerm = '';
let currentPage = 1;
const usersPerPage = 10;
let expandedRows = {};   
let expandedAddForms = {}; 
let editingSlotId = null;
let sortAscending = true;

function applyScheduleSearch() {
  if (!searchTerm) {
    filteredSchedules = [...userSchedules];
  } else {
    filteredSchedules = userSchedules.filter(user => {
      const searchText = `${user.name || ''} ${user.subtitle || ''}`.toLowerCase();
      return searchText.includes(searchTerm.toLowerCase());
    });
  }
  allUserSchedules = [...filteredSchedules];
  currentPage = 1;
  render();
}

window.performScheduleSearch = function(term) {
  searchTerm = term || '';
  applyScheduleSearch();
};

async function loadSchedule(userId) {
  const supabase = window.supabaseClient;
  const scheduleTable = document.getElementById(`schedule-table-${userId}`);
  
  if (!scheduleTable) return;
  
  scheduleTable.innerHTML = '<p style="text-align:center; color:#999; padding:10px;">Loading...</p>';

  try {
    const { data: scheduleData, error } = await supabase
      .from(SCHEDULE_TABLE)
      .select('*')
      .eq('employeeId', userId)
      .order('startTime', { ascending: true });

    if (error) {
      console.error('Error loading schedule:', error);
      scheduleTable.innerHTML = '<p style="text-align:center; color:#ef4444; padding:10px;">Error loading schedule.</p>';
      return;
    }

    if (!scheduleData || scheduleData.length === 0) {
      scheduleTable.innerHTML = '<p style="text-align:center; color:#999; padding:10px;">No schedule found.</p>';
      return;
    }

    scheduleTable.innerHTML = scheduleData.map(item => `
      <div class="slot-row">
        <span>${formatTime(item.startTime)}</span>
        <span>${item.sectionName || '-'}</span>
        <span>${item.subject || '-'}</span>
        <span class="actions-cell">
          <button class="action-icon-btn" onclick="editSchedule('${userId}', '${item.schedId}')"><span class="material-symbols-outlined">edit</span></button>
          <button class="action-icon-btn delete" onclick="deleteSchedule('${userId}', '${item.schedId}')"><span class="material-symbols-outlined">delete</span></button>
        </span>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error loading teacher schedule:', error);
    scheduleTable.innerHTML = '<p style="text-align:center; color:#ef4444; padding:10px;">Error loading schedule.</p>';
  }
}

async function loadUsersFromDB() {
  const supabase = window.supabaseClient;
  if (!supabase) {
    setTimeout(loadUsersFromDB, 500); 
    return;
  }

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
      subtitle: `${user.employeeId || 'T000'} | ${user.email || 'N/A'} | ${user.employment || 'N/A'}`
    }));

    applyScheduleSearch();
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

function formatTime(time) {
  if (!time) return '';
  const parts = time.split(':');
  return `${parseInt(parts[0])}:${parts[1] || '00'}`;
}

function toggleUser(uid) {
  expandedRows[uid] = !expandedRows[uid];
  render();
  
  if (expandedRows[uid]) {
    loadSchedule(uid);
  }
}

function toggleAddSchedule(uid) {
  const form = document.getElementById(`add-schedule-form-${uid}`);
  if (!form) return;
  
  const isVisible = form.style.display !== 'none';
  form.style.display = isVisible ? 'none' : 'block';
  
  if (!isVisible) {
    document.getElementById(`add-time-${uid}`).value = '';
    document.getElementById(`add-section-${uid}`).value = '';
    document.getElementById(`add-subject-${uid}`).value = '';
  }
}

async function saveSchedule(uid) {
  const supabase = window.supabaseClient;
  const time = document.getElementById(`add-time-${uid}`).value;
  const section = document.getElementById(`add-section-${uid}`).value;
  const subject = document.getElementById(`add-subject-${uid}`).value;
  
  if (!time || !section || !subject) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const { error } = await supabase
      .from(SCHEDULE_TABLE)
      .insert({
        employeeId: uid,
        sectionName: section,
        subject: subject,
        startTime: time,
        weekday: new Date().toLocaleDateString('en-US', { weekday: 'long' })
      });

    if (error) {
      console.error('Error saving schedule:', error);
      alert('Error saving schedule: ' + error.message);
      return;
    }
    
    toggleAddSchedule(uid);
    loadSchedule(uid);
    
  } catch (error) {
    console.error('Error saving schedule:', error);
    alert('Error saving schedule. Please try again.');
  }
}

async function editSchedule(uid, schedId) {
  const supabase = window.supabaseClient;
  try {
    const { data, error } = await supabase
      .from(SCHEDULE_TABLE)
      .select('*')
      .eq('schedId', schedId)
      .single();

    if (error) {
      console.error('Error fetching schedule:', error);
      return;
    }
    
    if (data) {
      const newSection = prompt('Edit Section:', data.sectionName || '');
      const newSubject = prompt('Edit Subject:', data.subject || '');
      const newTime = prompt('Edit Time:', data.startTime || '');
      
      if (newSection !== null && newSubject !== null && newTime !== null) {
        const { error: updateError } = await supabase
          .from(SCHEDULE_TABLE)
          .update({
            sectionName: newSection,
            subject: newSubject,
            startTime: newTime
          })
          .eq('schedId', schedId);

        if (updateError) {
          console.error('Error updating schedule:', updateError);
          alert('Error updating schedule: ' + updateError.message);
          return;
        }
        loadSchedule(uid);
      }
    }
  } catch (error) {
    console.error('Error editing schedule:', error);
    alert('Error editing schedule. Please try again.');
  }
}

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
    
    loadSchedule(uid);
    
  } catch (error) {
    console.error('Error deleting schedule:', error);
    alert('Error deleting schedule. Please try again.');
  }
}

function render() {
  const totalPages = Math.ceil(allUserSchedules.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const pageUsers = allUserSchedules.slice(startIndex, endIndex);
  
  scheduleList.innerHTML = '';
  
  if (!pageUsers || pageUsers.length === 0) {
    scheduleList.innerHTML = '<div class="no-records">No user records found.</div>';
    document.getElementById('pagination').style.display = 'none';
    return;
  }
  
  pageUsers.forEach(user => {
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
          <div class="schedule-main-section">
            <div class="user-text-details">
              <span class="user-name">${user.name}</span>
              <span class="user-subtitle">${user.subtitle}</span>
            </div>

            <div class="schedule-table-header">
              <span>Time</span><span>Section</span><span>Subject</span><span>Actions</span>
            </div>
            <div id="schedule-table-${user.uid}"></div>
            
            <button class="btn-outline" onclick="toggleAddSchedule('${user.uid}')" style="margin-top: 15px;">Add Schedule</button>
            
            <div id="add-schedule-form-${user.uid}" style="display: none; margin-top: 20px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
              <h4 style="margin: 0 0 15px 0;">Add New Schedule</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: 600;">Time:</label>
                  <input type="time" id="add-time-${user.uid}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: 600;">Section:</label>
                  <input type="text" id="add-section-${user.uid}" placeholder="e.g. A1, B2" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Subject:</label>
                <input type="text" id="add-subject-${user.uid}" placeholder="e.g. Mathematics, English" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
              </div>
              <div style="display: flex; gap: 10px;">
                <button class="btn-outline" onclick="saveSchedule('${user.uid}')">Save</button>
                <button class="btn-outline" onclick="toggleAddSchedule('${user.uid}')">Cancel</button>
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
    scheduleList.appendChild(row);
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
  const totalPages = Math.ceil(allUserSchedules.length / usersPerPage);
  const newPage = currentPage + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    render();
  }
}

function sortSchedules(field) {
  allUserSchedules.sort((a, b) => {
    let valueA, valueB;
    if (field === 'name') {
      valueA = (a.name || '').toLowerCase();
      valueB = (b.name || '').toLowerCase();
    } else if (field === 'id') {
      valueA = (a.uid || '').toLowerCase();
      valueB = (b.uid || '').toLowerCase();
    } else if (field === 'createdAt') {
      valueA = a.createdat || 0;
      valueB = b.createdat || 0;
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
    window.performScheduleSearch(event.data.term);
  }
});
