let userSchedules = [];
const scheduleList = document.getElementById("scheduleList");

function render() {
  scheduleList.innerHTML = '';
  userSchedules.forEach((user, uIdx) => {
    const row = document.createElement('div');
    row.className = `user-row ${user.expanded ? 'expanded' : ''}`;

    if (!user.expanded) {
      row.innerHTML = `
        <div class="user-bar" onclick="toggleUser(${uIdx})">
          <div class="user-info-brief">
            <div class="user-avatar-placeholder"></div>
            <div class="user-text-details">
              <div class="user-name">${user.name}</div>
              <div class="user-subtitle">${user.details}</div>
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
              <div class="user-subtitle">${user.details}</div>
            </div>

            <div class="schedule-table-header">
              <span>ID</span><span>Weekday</span><span>Start Time</span><span>End Time</span><span>Room</span>
            </div>

            <div class="slots-list">
              ${user.slots.map((s) => `
                <div class="slot-row" style="display:flex; justify-content:space-around; padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <span>${s.id}</span><span>${s.weekday}</span><span>${s.start}</span><span>${s.end}</span><span>${s.room}</span>
                </div>
              `).join('')}
            </div>

            <div class="add-slot-ui">
              <div class="edit-grid">
                <label>ID</label><input type="text" id="in-id-${uIdx}" value="SCH001">
                <label>Start Time</label><input type="time" id="in-start-${uIdx}">
                <label>Weekday</label><input type="text" id="in-day-${uIdx}" placeholder="day.">
                <label>End Time</label><input type="time" id="in-end-${uIdx}">
                <label>Room</label><input type="text" id="in-room-${uIdx}" placeholder="no.">
              </div>
            </div>
            
            <button class="add-slot-btn" onclick="saveSlot(${uIdx})">+</button>
          </div>

          <div class="sidebar-actions">
            <div class="btn-group">
              <button class="btn-outline" onclick="toggleUser(${uIdx})">Close</button>
              <button class="btn-outline" onclick="deleteUser(${uIdx})">Delete</button>
            </div>
            
            <div class="btn-group bottom-group">
              <button class="btn-outline" onclick="toggleUser(${uIdx})">Close</button>
              <button class="btn-outline" onclick="saveSlot(${uIdx})">Add</button>
            </div>
          </div>
        </div>`;
    }
    scheduleList.appendChild(row);
  });
}

function toggleUser(i) { userSchedules[i].expanded = !userSchedules[i].expanded; render(); }
function deleteUser(i) { userSchedules.splice(i, 1); render(); }

function saveSlot(i) {
  const newSlot = {
    id: document.getElementById(`in-id-${i}`).value,
    weekday: document.getElementById(`in-day-${i}`).value,
    start: document.getElementById(`in-start-${i}`).value,
    end: document.getElementById(`in-end-${i}`).value,
    room: document.getElementById(`in-room-${i}`).value
  };
  userSchedules[i].slots.push(newSlot);
  render();
}

document.getElementById("addUserBtn").onclick = () => {
  userSchedules.push({ name: "New User", details: "Details here", expanded: true, slots: [] });
  render();
};

render();