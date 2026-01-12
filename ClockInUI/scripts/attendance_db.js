let usersAttendance = [];
const attendanceList = document.getElementById("attendanceList");

function render() {
  attendanceList.innerHTML = '';
  usersAttendance.forEach((user, uIdx) => {
    const row = document.createElement('div');
    row.className = `user-row ${user.expanded ? 'expanded' : ''}`;

    if (!user.expanded) {
      row.innerHTML = `
        <div class="user-bar" onclick="toggleUser(${uIdx})">
          <div class="user-info-brief">
            <div class="user-avatar-placeholder"></div>
            <div class="user-text-details">
              <div class="user-name">${user.name}</div>
              <div class="user-subtitle">${user.id} | ${user.department} | Mon-Fri 8:00-12:00 | ${user.employment}</div>
            </div>
          </div>
          <div class="user-actions">
            <button class="btn-outline" onclick="event.stopPropagation(); toggleUser(${uIdx})">Edit</button>
            <button class="btn-outline" onclick="event.stopPropagation(); deleteUser(${uIdx})">Delete</button>
          </div>
        </div>`;
    } else {
      row.innerHTML = `
        <div class="user-expanded-content">
          <div class="schedule-main-section">
            <div class="user-text-details">
              <div class="user-name">${user.name}</div>
              <div class="user-subtitle">${user.id} | ${user.department} | Mon-Fri 8:00-12:00 | ${user.employment}</div>
            </div>

            <div class="attendance-table-header">
              <span>ID</span><span>Date</span><span>Time-In</span><span>Time-Out</span><span>Status</span>
            </div>

            <div class="slots-list">
              ${user.records.map((r, rIdx) => `
                <div class="slot-row" style="display:flex; justify-content:space-around; padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <span>${r.id}</span><span>${r.date}</span><span>${r.timeIn}</span><span>${r.timeOut}</span><span>${r.status}</span>
                </div>`).join('')}
            </div>

            <div class="add-slot-ui">
              <div class="edit-grid">
                <label>ID</label><input type="text" id="att-id-${uIdx}" value="ATT001">
                <label>Time-In</label><input type="time" id="att-in-${uIdx}">
                <label>Date</label><input type="date" id="att-date-${uIdx}">
                <label>Time-Out</label><input type="time" id="att-out-${uIdx}">
                <label>Status</label>
                <select id="att-status-${uIdx}">
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                </select>
              </div>
            </div>
            
            <button class="add-slot-btn" onclick="saveRecord(${uIdx})">+</button>
          </div>

          <div class="sidebar-actions">
            <div class="btn-group">
              <button class="btn-outline" onclick="toggleUser(${uIdx})">Close</button>
              <button class="btn-outline" onclick="deleteUser(${uIdx})">Delete</button>
            </div>
            
            <div class="btn-group bottom-group">
              <button class="btn-outline" onclick="toggleUser(${uIdx})">Close</button>
              <button class="btn-outline" onclick="saveRecord(${uIdx})">Add</button>
            </div>
          </div>
        </div>`;
    }
    attendanceList.appendChild(row);
  });
}

window.toggleUser = (i) => { usersAttendance[i].expanded = !usersAttendance[i].expanded; render(); };
window.toggleForm = (i) => { usersAttendance[i].showAddForm = !usersAttendance[i].showAddForm; render(); };
window.deleteUser = (i) => { usersAttendance.splice(i, 1); render(); };
window.removeRecord = (u, r) => { usersAttendance[u].records.splice(r, 1); render(); };

window.saveRecord = (i) => {
  const newRecord = {
    id: document.getElementById(`att-id-${i}`).value,
    date: document.getElementById(`att-date-${i}`).value,
    timeIn: document.getElementById(`att-in-${i}`).value,
    timeOut: document.getElementById(`att-out-${i}`).value,
    status: document.getElementById(`att-status-${i}`).value
  };
  usersAttendance[i].records.push(newRecord);
  usersAttendance[i].showAddForm = false;
  render();
};

document.getElementById("addUserBtn").onclick = () => {
  usersAttendance.push({ 
    name: "New User", 
    id: "T000", 
    department: "Dept", 
    employment: "Full-Time", 
    expanded: true, 
    showAddForm: false, 
    records: [] 
  });
  render();
};

render();