document.addEventListener('DOMContentLoaded', async () => {
  const usersList = document.getElementById('usersList');
  const addUserBtn = document.getElementById('addUserBtn');

  const db = window.db;
  const USERS_COLLECTION = 'user_employee_data';

  let users = [];
  let allUsers = [];
  let currentPage = 1;
  const usersPerPage = 10;
  let expandedRows = {};
  let sortAscending = true;

  if (!db) {
    console.error('users_db: Firestore (window.db) is not initialized.');
    usersList.innerHTML = '<div class="error">Firestore not initialized.</div>';
    return;
  }

  function renderUsers() {
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const pageUsers = allUsers.slice(startIndex, endIndex);
    
    usersList.innerHTML = '';
    if (!pageUsers || pageUsers.length === 0) {
      usersList.innerHTML = '<div class="no-records">No user records found.</div>';
      document.getElementById('pagination').style.display = 'none';
      return;
    }

    pageUsers.forEach((user) => {
      const isExpanded = !!expandedRows[user.uid];
      const row = document.createElement('div');
      row.className = `user-row ${isExpanded ? 'expanded' : ''}`;

      const subtitle = `${user.id || 'ID'} | ${user.department || 'Dept'} | ${user.employment || 'Status'}`;

      row.innerHTML = `
        <div class="user-collapsed-content" onclick="window.toggleUser('${user.uid}')" style="${isExpanded ? 'display: none;' : ''}">
          <div class="user-text-details">
            <div class="user-name">${user.name || 'New User'}</div>
            <div class="user-subtitle">${subtitle}</div>
          </div>
          <div class="btn-group">
            <button class="btn-outline" onclick="event.stopPropagation(); window.toggleUser('${user.uid}')">Edit</button>
            <button class="btn-outline" onclick="event.stopPropagation(); window.deleteUser('${user.uid}')">Delete</button>
          </div>
        </div>

        <div class="user-expanded-content" style="${isExpanded ? '' : 'display: none;'}">
          <div class="attendance-main-section">
            <div class="user-text-details">
              <div class="user-name">${user.name || 'New User'}</div>
              <div class="user-subtitle">${subtitle}</div>
            </div>
            <div class="edit-grid">
              <label>ID</label><input type="text" id="id-${user.uid}" value="${user.id || ''}">
              <label>Name</label><input type="text" id="name-${user.uid}" value="${user.name || ''}">
              <label>Email</label><input type="text" id="email-${user.uid}" value="${user.email || ''}">
              <label>Password</label><input type="password" id="password-${user.uid}" value="${user.password || ''}">
              <label>Department</label><input type="text" id="dept-${user.uid}" value="${user.department || ''}">
              <label>Employment</label><input type="text" id="emp-${user.uid}" value="${user.employment || ''}">
            </div>
          </div>
          <div class="sidebar-actions">
            <div class="btn-group">
              <button class="btn-outline" onclick="window.closeAndSave('${user.uid}')">Close</button>
              <button class="btn-outline" onclick="window.deleteUser('${user.uid}')">Delete</button>
            </div>
          </div>
        </div>
      `;

      usersList.appendChild(row);
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
  
  window.changePage = function(direction) {
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      renderUsers();
    }
  };

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
            password: doc.data().password || '',
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
          allUsers = [...users];
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
            password: doc.data().password || '',
            department: doc.data().department || '',
            employment: doc.data().employment || ''
          }));
          users = remoteData;
          allUsers = [...users];
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
    const passwordVal = document.getElementById(`password-${uid}`).value;
    const deptVal = document.getElementById(`dept-${uid}`).value;
    const empVal = document.getElementById(`emp-${uid}`).value;

    const userInArray = users.find(u => u.uid === uid) || {};

    expandedRows[uid] = false;
    renderUsers();

    const hasChanged = idVal !== (userInArray.id || '') ||
      nameVal !== (userInArray.name || '') ||
      emailVal !== (userInArray.email || '') ||
      passwordVal !== (userInArray.password || '') ||
      deptVal !== (userInArray.department || '') ||
      empVal !== (userInArray.employment || '');

    if (hasChanged) {
      try {
        await db.collection(USERS_COLLECTION).doc(uid).update({
          employeeId: idVal,
          name: nameVal,
          email: emailVal,
          password: passwordVal,
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
        name: 'New User', employeeId: '', email: '', password: '', department: '', employment: '',
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
    allUsers.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return sortAscending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    sortAscending = !sortAscending;
    sortIcon.style.display = 'inline';
    sortIcon.textContent = sortAscending ? '↓' : '↑';
    currentPage = 1;
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