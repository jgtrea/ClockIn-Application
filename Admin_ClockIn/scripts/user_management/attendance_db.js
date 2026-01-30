const attendanceList = document.getElementById("attendanceList");
const USERS_COLLECTION = 'user_employee_data';
const SUB_COLLECTION = 'user_attendance';

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

        let records = [];
        try {
          const attendanceSnap = await window.db.collection(USERS_COLLECTION)
            .doc(userId).collection(SUB_COLLECTION).orderBy('date', 'desc').get();
          
          records = attendanceSnap.docs.map(rDoc => ({
            recordId: rDoc.id,
            ...rDoc.data()
          }));
        } catch (e) { 
            console.error(e); 
        }

        return {
          uid: userId,
          name: userData.name || '',
          subtitle: `${userData.employeeId || 'T000'} | ${userData.department || 'N/A'} | ${userData.employment || 'N/A'}`,
          records: records 
        };
      });

      userAttendance = await Promise.all(userPromises);
      applyAttendanceSearch();
    })
    .catch(err => {
      console.error(err);
    });
}

function saveRecord(uid) {
  const db = window.db;
  const newRecord = {
    date: document.getElementById(`in-date-${uid}`).value,
    time_in: document.getElementById(`in-in-${uid}`).value,
    time_out: document.getElementById(`in-out-${uid}`).value,
    room: document.getElementById(`in-room-${uid}`).value,
    status: document.getElementById(`in-status-${uid}`).value,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection(USERS_COLLECTION).doc(uid).collection(SUB_COLLECTION).add(newRecord)
    .then(() => {
      expandedAddForms[uid] = false;
      loadUsersFromDB(); 
    });
}

function updateRecord(uid, recordId) {
  const updatedData = {
    date: document.getElementById(`edit-date-${recordId}`).value,
    time_in: document.getElementById(`edit-in-${recordId}`).value,
    time_out: document.getElementById(`edit-out-${recordId}`).value,
    room: document.getElementById(`edit-room-${recordId}`).value,
    status: document.getElementById(`edit-status-${recordId}`).value
  };

  window.db.collection(USERS_COLLECTION).doc(uid).collection(SUB_COLLECTION).doc(recordId).update(updatedData)
    .then(() => {
      editingRecordId = null;
      loadUsersFromDB();
    });
}

function deleteRecord(uid, recordId) {
  if(confirm("Delete this attendance record?")) {
    window.db.collection(USERS_COLLECTION).doc(uid).collection(SUB_COLLECTION).doc(recordId).delete()
      .then(() => loadUsersFromDB());
  }
}

function toggleEdit(recordId) {
  editingRecordId = (editingRecordId === recordId) ? null : recordId;
  render();
}

function toggleUser(uid) {
  expandedRows[uid] = !expandedRows[uid];
  if (!expandedRows[uid]) {
    expandedAddForms[uid] = false;
    editingRecordId = null;
  }
  render();
}

function toggleAddForm(uid) {
  expandedAddForms[uid] = !expandedAddForms[uid];
  if (expandedAddForms[uid]) editingRecordId = null;
  render();
}

function render() {
  const totalPages = Math.ceil(allUserAttendance.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const pageUsers = allUserAttendance.slice(startIndex, endIndex);
  
  attendanceList.innerHTML = '';
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
          <div class="attendance-main-section">
            <div class="user-text-details">
              <span class="user-name">${user.name}</span>
              <span class="user-subtitle">${user.subtitle}</span>
            </div>

            <div class="attendance-table-header">
              <span>Date</span><span>In</span><span>Out</span><span>Room</span><span>Status</span><span class="actions-header">Actions</span>
            </div>
            
            <div class="records-list">
              ${user.records.length > 0 ? user.records.map(r => {
                const isEditing = editingRecordId === r.recordId;
                if (isEditing) {
                  return `
                    <div class="record-row editing-row">
                      <span><input type="date" id="edit-date-${r.recordId}" value="${r.date}"></span>
                      <span><input type="time" id="edit-in-${r.recordId}" value="${r.time_in}"></span>
                      <span><input type="time" id="edit-out-${r.recordId}" value="${r.time_out}"></span>
                      <span><input type="text" id="edit-room-${r.recordId}" value="${r.room || ''}"></span>
                      <span>
                        <select id="edit-status-${r.recordId}">
                          <option value="Present" ${r.status==='Present'?'selected':''}>Present</option>
                          <option value="Late" ${r.status==='Late'?'selected':''}>Late</option>
                          <option value="Absent" ${r.status==='Absent'?'selected':''}>Absent</option>
                        </select>
                      </span>
                      <span class="actions-cell">
                        <button class="action-icon-btn" onclick="updateRecord('${user.uid}', '${r.recordId}')"><span class="material-symbols-outlined">check</span></button>
                        <button class="action-icon-btn" onclick="toggleEdit(null)"><span class="material-symbols-outlined">close</span></button>
                      </span>
                    </div>`;
                }
                return `
                  <div class="record-row">
                    <span>${r.date || '-'}</span><span>${r.time_in || '-'}</span><span>${r.time_out || '-'}</span><span>${r.room || '-'}</span><span>${r.status || '-'}</span>
                    <span class="actions-cell">
                      <button class="action-icon-btn" onclick="toggleEdit('${r.recordId}')"><span class="material-symbols-outlined">edit</span></button>
                      <button class="action-icon-btn delete" onclick="deleteRecord('${user.uid}', '${r.recordId}')"><span class="material-symbols-outlined">delete</span></button>
                    </span>
                  </div>`;
              }).join('') : '<p style="text-align:center; color:#999; padding:10px;">No records found.</p>'}
            </div>

            <button class="add-record-btn ${isAddFormOpen ? 'hidden' : ''}" onclick="toggleAddForm('${user.uid}')">+</button>

            <div class="add-record-ui ${isAddFormOpen ? '' : 'hidden'}">
              <div class="edit-grid">
                <label>Date</label><input type="date" id="in-date-${user.uid}">
                <label>Time In</label><input type="time" id="in-in-${user.uid}">
                <label>Room</label><input type="text" id="in-room-${user.uid}" placeholder="e.g. 101">
                <label>Time Out</label><input type="time" id="in-out-${user.uid}">
                <label>Status</label>
                <select id="in-status-${user.uid}">
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              <div class="btn-group" style="margin-top: 20px;">
                <button class="btn-outline" onclick="toggleAddForm('${user.uid}')">Close</button>
                <button class="btn-outline" onclick="saveRecord('${user.uid}')">Add</button>
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
    attendanceList.appendChild(row);
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