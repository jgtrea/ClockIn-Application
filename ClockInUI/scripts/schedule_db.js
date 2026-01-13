const scheduleList = document.getElementById("scheduleList");
const USERS_COLLECTION = 'user_employee_data';
const SUB_COLLECTION = 'user_schedule';

let userSchedules = []; 
let expandedRows = {};  

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

        let dateString = "No Date";
        if (userData.createdAt && userData.createdAt.toDate) {
            dateString = userData.createdAt.toDate().toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }

        let slots = [];
        try {
          const scheduleSnap = await window.db.collection(USERS_COLLECTION)
            .doc(userId).collection(SUB_COLLECTION).get();
          
          slots = scheduleSnap.docs.map(sDoc => ({
            slotDocId: sDoc.id,
            ...sDoc.data()
          }));
        } catch (e) { 
            console.error("Subcollection Access Denied:", e); 
        }

        return {
          uid: userId,
          id: userData.employeeId || '',
          name: userData.name || '',
          department: userData.department || '',
          employment: userData.employment || '',
          dateStr: dateString, 
          slots: slots 
        };
      });

      userSchedules = await Promise.all(userPromises);
      render();
    })
    .catch(err => {
      console.error("Master Load Error:", err);
      alert("Permission Error: Check your Firebase Security Rules.");
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

  if (!newSlot.weekday || !newSlot.start_time) {
    alert("Please enter at least a Weekday and Start Time.");
    return;
  }

  db.collection(USERS_COLLECTION).doc(uid).collection(SUB_COLLECTION).add(newSlot)
    .then(() => {
      console.log("Slot successfully saved to Firebase!");
      loadUsersFromDB(); 
    })
    .catch(err => {
      console.error("Write Error:", err);
      alert("Permission Denied: You don't have access to save here.");
    });
}

function render() {
  scheduleList.innerHTML = '';
  userSchedules.forEach(user => {
    const isExpanded = !!expandedRows[user.uid];
    const row = document.createElement('div');
    row.className = `user-row ${isExpanded ? 'expanded' : ''}`;

    if (!isExpanded) {
      row.innerHTML = `
        <div class="user-bar" onclick="toggleUser('${user.uid}')" style="cursor:pointer; padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
          <div>
            <strong>${user.name}</strong> (${user.id})<br>
            <small style="color:gray;">Employee added on: ${user.dateStr}</small>
          </div>
          <button class="btn-outline">Edit Schedule</button>
        </div>`;
    } else {
      row.innerHTML = `
        <div class="user-expanded-content" style="padding:20px; border:1px solid #4f46e5; border-radius:8px; margin:10px 0;">
          <h3 style="margin-top:0;">${user.name}'s Schedule</h3>
          
          <div class="slots-list" style="margin-bottom:15px;">
            <div style="display:grid; grid-template-columns: repeat(5, 1fr); font-weight:bold; border-bottom:1px solid #ddd; padding-bottom:5px;">
                <span>ID</span><span>Day</span><span>Start</span><span>End</span><span>Room</span>
            </div>
            ${user.slots.length > 0 ? user.slots.map(s => `
              <div style="display:grid; grid-template-columns: repeat(5, 1fr); padding:8px 0; border-bottom:1px solid #f9f9f9;">
                <span>${s.schedId || '-'}</span><span>${s.weekday || '-'}</span><span>${s.start_time || '-'}</span><span>${s.end_time || '-'}</span><span>${s.room || '-'}</span>
              </div>
            `).join('') : '<p style="text-align:center; color:#999; padding:10px;">No slots assigned.</p>'}
          </div>

          <div style="background:#f4f4f4; padding:15px; border-radius:5px;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                <input type="text" id="in-id-${user.uid}" placeholder="Sched ID" value="SCH001">
                <input type="text" id="in-day-${user.uid}" placeholder="Day (e.g. Fri)">
                <input type="text" id="in-room-${user.uid}" placeholder="Room (e.g. 101)">
                <input type="time" id="in-start-${user.uid}">
                <input type="time" id="in-end-${user.uid}">
            </div>
            <button onclick="saveSlot('${user.uid}')" style="background:#4f46e5; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer;">Add Slot</button>
            <button onclick="toggleUser('${user.uid}')" style="background:#666; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; margin-left:10px;">Close</button>
          </div>
        </div>`;
    }
    scheduleList.appendChild(row);
  });
}

function toggleUser(uid) {
  expandedRows[uid] = !expandedRows[uid];
  render();
}

loadUsersFromDB();
window.addEventListener('message', function(event) {
  if (event.data.type === 'search') {
    const searchTerm = event.data.term;
    const rows = document.querySelectorAll('.user-row');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (!searchTerm || text.includes(searchTerm)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }
});