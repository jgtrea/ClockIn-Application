const scheduleList = document.getElementById("scheduleList");
const USERS_COLLECTION = 'user_employee_data';
const SUB_COLLECTION = 'user_schedule';

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
  console.log('Schedule search called with term:', searchTerm, 'userSchedules length:', userSchedules.length);
  applyScheduleSearch();
};

async function loadSchedule(userId) {
  const scheduleTable = document.getElementById(`schedule-table-${userId}`);
  
  scheduleTable.innerHTML = '<p style="text-align:center; color:#999; padding:10px;">Loading...</p>';

  try {
    // Get the teacher's schedule from their user document (using 'Schedule' collection)
    const scheduleSnapshot = await window.db
      .collection('user_employee_data')
      .doc(userId)
      .collection('Schedule')
      .get();

    if (scheduleSnapshot.empty) {
      scheduleTable.innerHTML = '<p style="text-align:center; color:#999; padding:10px;">No schedule found.</p>';
      return;
    }

    let teacherSchedule = [];
    scheduleSnapshot.docs.forEach(timeDoc => {
      const timeData = timeDoc.data();
      console.log('Time document data:', timeData); // Debug log
      
      teacherSchedule.push({
        time: timeDoc.id,
        section: timeData.section || timeData.Section || timeData.room || timeData.Room || 'N/A',
        subject: timeData.subject || timeData.Subject || timeData.class || timeData.Class || 'N/A'
      });
    });

    // Sort by time
    teacherSchedule.sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    scheduleTable.innerHTML = teacherSchedule.map(item => `
      <div class="slot-row">
        <span>${formatTime(item.time)}</span>
        <span>${item.section}</span>
        <span>${item.subject}</span>
        <span class="actions-cell">
          <button class="action-icon-btn" onclick="editSchedule('${userId}', '${item.time}')"><span class="material-symbols-outlined">edit</span></button>
          <button class="action-icon-btn delete" onclick="deleteSchedule('${userId}', '${item.time}')"><span class="material-symbols-outlined">delete</span></button>
        </span>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error loading teacher schedule:', error);
    scheduleTable.innerHTML = '<p style="text-align:center; color:#ef4444; padding:10px;">Error loading schedule.</p>';
  }
}

function loadUsersFromDB() {
  if (!window.db) {
    setTimeout(loadUsersFromDB, 500); 
    return;
  }

  window.db.collection(USERS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .get()
    .then(async (snapshot) => {
      const userPromises = snapshot.docs.map(async (doc) => {
        const userData = doc.data();
        const userId = doc.id;

        return {
          uid: userId,
          name: userData.name || '',
          subtitle: `${userData.employeeId || 'T000'} | ${userData.department || 'N/A'} | ${userData.employment || 'N/A'}`
        };
      });

      userSchedules = await Promise.all(userPromises);
      applyScheduleSearch();
    })
    .catch(err => {
      console.error(err);
    });
}

function formatTime(time) {
  return time.replace(/^0/, ''); // Remove leading zero
}

function toggleUser(uid) {
  expandedRows[uid] = !expandedRows[uid];
  render();
  
  // Auto-load schedule when expanding
  if (expandedRows[uid]) {
    loadSchedule(uid);
  }
}

function toggleAddSchedule(uid) {
  const form = document.getElementById(`add-schedule-form-${uid}`);
  const isVisible = form.style.display !== 'none';
  form.style.display = isVisible ? 'none' : 'block';
  
  if (!isVisible) {
    // Clear form when opening
    document.getElementById(`add-time-${uid}`).value = '';
    document.getElementById(`add-section-${uid}`).value = '';
    document.getElementById(`add-subject-${uid}`).value = '';
  }
}

async function saveSchedule(uid) {
  const time = document.getElementById(`add-time-${uid}`).value;
  const section = document.getElementById(`add-section-${uid}`).value;
  const subject = document.getElementById(`add-subject-${uid}`).value;
  
  if (!time || !section || !subject) {
    alert('Please fill in all fields');
    return;
  }
  
  // Format time to remove leading zero
  const formattedTime = formatTime(time);
  
  try {
    await window.db
      .collection('user_employee_data')
      .doc(uid)
      .collection('Schedule')
      .doc(formattedTime)
      .set({
        section: section,
        subject: subject
      });
    
    // Hide form and refresh schedule
    toggleAddSchedule(uid);
    loadSchedule(uid);
    
  } catch (error) {
    console.error('Error saving schedule:', error);
    alert('Error saving schedule. Please try again.');
  }
}

async function editSchedule(uid, time) {
  try {
    const doc = await window.db
      .collection('user_employee_data')
      .doc(uid)
      .collection('Schedule')
      .doc(time)
      .get();
    
    if (doc.exists) {
      const data = doc.data();
      const newSection = prompt('Edit Section:', data.section || data.Section || '');
      const newSubject = prompt('Edit Subject:', data.subject || data.Subject || '');
      
      if (newSection !== null && newSubject !== null) {
        await window.db
          .collection('user_employee_data')
          .doc(uid)
          .collection('Schedule')
          .doc(time)
          .update({
            section: newSection,
            subject: newSubject
          });
        
        loadSchedule(uid);
      }
    }
  } catch (error) {
    console.error('Error editing schedule:', error);
    alert('Error editing schedule. Please try again.');
  }
}

async function deleteSchedule(uid, time) {
  if (!confirm('Are you sure you want to delete this schedule entry?')) {
    return;
  }
  
  try {
    await window.db
      .collection('user_employee_data')
      .doc(uid)
      .collection('Schedule')
      .doc(time)
      .delete();
    
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
            <button class="btn-outline">Delete</button>
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
              <button class="btn-outline">Delete</button>
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
  
  if (totalPages > 1) {
    pagination.style.display = 'block';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
    nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
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
    window.performScheduleSearch(event.data.term);
  }
});