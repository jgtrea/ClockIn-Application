document.addEventListener('DOMContentLoaded', async () => {
  const usersList = document.getElementById('usersList');
  const addUserBtn = document.getElementById('addUserBtn');

  const db = window.db;
  const USERS_COLLECTION = 'user_employee_data';

  let users = [];
  let expandedRows = {};
  let sortAscending = true;

  if (!db) {
    console.error('users_db: Firestore (window.db) is not initialized.');
    usersList.innerHTML = '<div class="error">Firestore not initialized.</div>';
    return;
  }

  function renderUsers() {
    usersList.innerHTML = '';
    if (!users || users.length === 0) {
      usersList.innerHTML = '<div class="no-records">No user records found.</div>';
      return;
    }

    users.forEach((user) => {
      const isExpanded = !!expandedRows[user.uid];
      const row = document.createElement('div');
      row.className = `user-row ${isExpanded ? 'expanded' : ''}`;

      const subtitle = `${user.id || 'ID'} | ${user.department || 'Dept'} | ${user.employment || 'Status'}`;

      row.innerHTML = `
        <div class="user-bar" onclick="window.toggleUser('${user.uid}')">
          <div class="user-info-brief">
            <div>
              <div class="user-name">${user.name || 'New User'}</div>
              <div class="user-subtitle">${subtitle}</div>
            </div>
          </div>
          <div class="user-actions">
            <button class="btn-outline" onclick="event.stopPropagation(); window.toggleUser('${user.uid}')">Edit</button>
            <button class="btn-outline" onclick="event.stopPropagation(); window.deleteUser('${user.uid}')">Delete</button>
          </div>
        </div>

        <div class="user-expanded-content">
          <div class="user-expanded-left">
            <div class="edit-grid">
              <div class="input-group"><label>ID</label><input type="text" id="id-${user.uid}" value="${user.id || ''}"></div>
              <div class="input-group"><label>Name</label><input type="text" id="name-${user.uid}" value="${user.name || ''}"></div>
              <div class="input-group"><label>Email</label><input type="text" id="email-${user.uid}" value="${user.email || ''}"></div>
              <div class="input-group"><label>Dept</label><input type="text" id="dept-${user.uid}" value="${user.department || ''}"></div>
              <div class="input-group"><label>Status</label><input type="text" id="emp-${user.uid}" value="${user.employment || ''}"></div>
            </div>
          </div>
          <div class="user-expanded-right">
            <div class="expanded-footer">
              <button class="btn-primary" onclick="window.closeAndSave('${user.uid}')">Close</button>
              <button class="btn-outline" onclick="window.deleteUser('${user.uid}')">Delete</button>
            </div>
          </div>
        </div>
      `;

      usersList.appendChild(row);
    });
  }

  let unsubscribe = null;
  function startSync(isAdmin, currentUser) {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }

    if (isAdmin) {
      unsubscribe = db.collection(USERS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
          const remoteData = snapshot.docs.map(doc => ({
            uid: doc.id,
            id: doc.data().employeeId || '',
            name: doc.data().name || '',
            email: doc.data().email || '',
            department: doc.data().department || '',
            employment: doc.data().employment || ''
          }));

          users = remoteData.map(remoteUser => {
            if (expandedRows[remoteUser.uid]) {
              const localUser = users.find(u => u.uid === remoteUser.uid);
              return localUser ? localUser : remoteUser;
            }
            return remoteUser;
          });
          renderUsers();
        }, err => { console.error('users_db: snapshot error', err); });
    } else {
      unsubscribe = db.collection(USERS_COLLECTION)
        .where('email', '==', currentUser.email)
        .onSnapshot(snapshot => {
          const remoteData = snapshot.docs.map(doc => ({
            uid: doc.id,
            id: doc.data().employeeId || '',
            name: doc.data().name || '',
            email: doc.data().email || '',
            department: doc.data().department || '',
            employment: doc.data().employment || ''
          }));
          users = remoteData;
          renderUsers();
        }, err => { console.error('users_db: snapshot error', err); });
    }
  }

  window.toggleUser = (uid) => {
    expandedRows[uid] = !expandedRows[uid];
    renderUsers();
  };

  window.closeAndSave = async (uid) => {
    const idVal = document.getElementById(`id-${uid}`).value;
    const nameVal = document.getElementById(`name-${uid}`).value;
    const emailVal = document.getElementById(`email-${uid}`).value;
    const deptVal = document.getElementById(`dept-${uid}`).value;
    const empVal = document.getElementById(`emp-${uid}`).value;

    const userInArray = users.find(u => u.uid === uid) || {};

    expandedRows[uid] = false;
    renderUsers();

    const hasChanged = idVal !== (userInArray.id || '') ||
      nameVal !== (userInArray.name || '') ||
      emailVal !== (userInArray.email || '') ||
      deptVal !== (userInArray.department || '') ||
      empVal !== (userInArray.employment || '');

    if (hasChanged) {
      try {
        await db.collection(USERS_COLLECTION).doc(uid).update({
          employeeId: idVal,
          name: nameVal,
          email: emailVal,
          department: deptVal,
          employment: empVal
        });
        console.log('users_db: Changes saved to database.');
      } catch (err) {
        console.error('users_db: Save error:', err);
      }
    } else {
      console.log('users_db: No changes detected, just collapsed.');
    }
  };

  window.deleteUser = async (uid) => {
    if (!confirm('Delete this user?')) return;
    try {
      await db.collection(USERS_COLLECTION).doc(uid).delete();
      delete expandedRows[uid];
    } catch (err) {
      console.error('users_db: delete error', err);
    }
  };

  addUserBtn.addEventListener('click', async () => {
    try {
      const docRef = await db.collection(USERS_COLLECTION).add({
        name: 'New User', employeeId: '', email: '', department: '', employment: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      expandedRows[docRef.id] = true;
    } catch (err) {
      console.error('users_db: add user error', err);
    }
  });

  if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
    window.auth.onAuthStateChanged((user) => {
      if (!user) {
        users = [];
        renderUsers();
        addUserBtn.style.display = 'none';
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        return;
      }

      user.getIdToken(true)
        .then(() => user.getIdTokenResult())
        .then(idTokenResult => {
          const claims = idTokenResult && idTokenResult.claims ? idTokenResult.claims : {};
          const isAdmin = claims.admin === true || user.email === 'hello@gmail.com';
          addUserBtn.style.display = isAdmin ? '' : 'none';
          console.log('users_db: signed in as', user.email, 'admin?', isAdmin, 'claims=', claims);
          startSync(isAdmin, user);
        })
        .catch(err => {
          console.warn('users_db: Failed to refresh/get ID token result', err);
          const isAdminFallback = user.email === 'hello@gmail.com';
          addUserBtn.style.display = isAdminFallback ? '' : 'none';
          startSync(isAdminFallback, user);
        });
    });
  } else {
    console.warn('users_db: Auth not available; cannot load users.');
  }
  
  window.sortByName = function() {
    const sortIcon = document.getElementById('sortIcon');
    users.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return sortAscending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    sortAscending = !sortAscending;
    sortIcon.style.display = 'inline';
    sortIcon.textContent = sortAscending ? '↓' : '↑';
    renderUsers();
  };
});
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