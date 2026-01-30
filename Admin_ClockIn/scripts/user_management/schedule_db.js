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

        let slots = [];
        try {
          const scheduleSnap = await window.db.collection(USERS_COLLECTION)
            .doc(userId).collection(SUB_COLLECTION).get();
          
          slots = scheduleSnap.docs.map(sDoc => ({
            slotDocId: sDoc.id,
            ...sDoc.data()
          }));
        } catch (e) { 
            console.error(e); 
        }

        return {
          uid: userId,
          name: userData.name || '',
          subtitle: `${userData.employeeId || 'T000'} | ${userData.department || 'N/A'} | ${userData.employment || 'N/A'}`,
          slots: slots 
        };
      });

      userSchedules = await Promise.all(userPromises);
      applyScheduleSearch();
    })
    .catch(err => {
      console.error(err);
    });
}

function saveSlot(uid) {
  const db = window.db;
  const newSlot = {
    schedId: document.getElementById(`in-id-${uid}`).value,
    weekday: document.getElementById(`in-day-${uid}`).value,
    room: document.getElementById(`in-room-${uid}`).value,
    start_time: document.getElementById(`in-start-${uid}`).value,
    end_time: document.getElementById(`in-end-${uid}`).value
  };

  db.collection(USERS_COLLECTION).doc(uid).collection(SUB_COLLECTION).add(newSlot)
    .then(() => {
      expandedAddForms[uid] = false;
      loadUsersFromDB(); 
    });
}

function updateSlot(uid, slotId) {
  const db = window.db;
  const updatedData = {
    schedId: document.getElementById(`edit-id-${slotId}`).value,
    weekday: document.getElementById(`edit-day-${slotId}`).value,
    start_time: document.getElementById(`edit-start-${slotId}`).value,
    end_time: document.getElementById(`edit-end-${slotId}`).value,
    room: document.getElementById(`edit-room-${slotId}`).value
  };

  db.collection(USERS_COLLECTION).doc(uid).collection(SUB_COLLECTION).doc(slotId).update(updatedData)
    .then(() => {
      editingSlotId = null;
      loadUsersFromDB();
    });
}

function deleteSlot(uid, slotId) {
  if(confirm("Delete this schedule?")) {
    window.db.collection(USERS_COLLECTION).doc(uid).collection(SUB_COLLECTION).doc(slotId).delete()
      .then(() => loadUsersFromDB());
  }
}

function toggleEdit(slotId) {
  editingSlotId = (editingSlotId === slotId) ? null : slotId;
  render();
}

function toggleUser(uid) {
  expandedRows[uid] = !expandedRows[uid];
  if (!expandedRows[uid]) {
    expandedAddForms[uid] = false;
    editingSlotId = null;
  }
  render();
}

function toggleAddForm(uid) {
  expandedAddForms[uid] = !expandedAddForms[uid];
  if (expandedAddForms[uid]) editingSlotId = null;
  render();
}

function render() {
  const totalPages = Math.ceil(allUserSchedules.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const pageUsers = allUserSchedules.slice(startIndex, endIndex);
  
  scheduleList.innerHTML = '';
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
              <span>ID</span><span>Weekday</span><span>Start Time</span><span>End Time</span><span>Room</span><span class="actions-header">Actions</span>
            </div>
            
            <div class="slots-list">
              ${user.slots.length > 0 ? user.slots.map(s => {
                const isEditing = editingSlotId === s.slotDocId;
                if (isEditing) {
                  return `
                    <div class="slot-row editing-row">
                      <span><input type="text" id="edit-id-${s.slotDocId}" value="${s.schedId}"></span>
                      <span><input type="text" id="edit-day-${s.slotDocId}" value="${s.weekday}"></span>
                      <span><input type="time" id="edit-start-${s.slotDocId}" value="${s.start_time}"></span>
                      <span><input type="time" id="edit-end-${s.slotDocId}" value="${s.end_time}"></span>
                      <span><input type="text" id="edit-room-${s.slotDocId}" value="${s.room}"></span>
                      <span class="actions-cell">
                        <button class="action-icon-btn" onclick="updateSlot('${user.uid}', '${s.slotDocId}')"><span class="material-symbols-outlined">check</span></button>
                        <button class="action-icon-btn" onclick="toggleEdit(null)"><span class="material-symbols-outlined">close</span></button>
                      </span>
                    </div>`;
                }
                return `
                  <div class="slot-row">
                    <span>${s.schedId || '-'}</span><span>${s.weekday || '-'}</span><span>${s.start_time || '-'}</span><span>${s.end_time || '-'}</span><span>${s.room || '-'}</span>
                    <span class="actions-cell">
                      <button class="action-icon-btn" onclick="toggleEdit('${s.slotDocId}')"><span class="material-symbols-outlined">edit</span></button>
                      <button class="action-icon-btn delete" onclick="deleteSlot('${user.uid}', '${s.slotDocId}')"><span class="material-symbols-outlined">delete</span></button>
                    </span>
                  </div>`;
              }).join('') : '<p style="text-align:center; color:#999; padding:10px;">No slots assigned.</p>'}
            </div>

            <button class="add-slot-btn ${isAddFormOpen ? 'hidden' : ''}" onclick="toggleAddForm('${user.uid}')">+</button>

            <div class="add-slot-ui ${isAddFormOpen ? '' : 'hidden'}">
              <div class="edit-grid">
                <label>ID</label><input type="text" id="in-id-${user.uid}" value="SCH001">
                <label>Start Time</label><input type="time" id="in-start-${user.uid}">
                <label>Weekday</label><input type="text" id="in-day-${user.uid}">
                <label>End Time</label><input type="time" id="in-end-${user.uid}">
                <label>Room</label><input type="text" id="in-room-${user.uid}">
              </div>
              <div class="btn-group" style="margin-top: 20px;">
                <button class="btn-outline" onclick="toggleAddForm('${user.uid}')">Close</button>
                <button class="btn-outline" onclick="saveSlot('${user.uid}')">Add</button>
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