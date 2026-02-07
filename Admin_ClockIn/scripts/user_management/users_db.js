document.addEventListener('DOMContentLoaded', async () => {
  const usersList = document.getElementById('usersList');
  const addUserBtn = document.getElementById('addUserBtn');

  const supabase = window.supabaseClient;
  const USERS_TABLE = 'user_employee_data';

  let filteredUsers = [];
  let searchTerm = '';

  function applySearch() {
    if (!searchTerm) {
      filteredUsers = [...users];
    } else {
      filteredUsers = users.filter(user => {
        const searchText = `${user.name || ''} ${user.email || ''} ${user.employment || ''}`.toLowerCase();
        return searchText.includes(searchTerm.toLowerCase());
      });
    }
    allUsers = [...filteredUsers];
    currentPage = 1;
    renderUsers();
  }

  window.performUserSearch = function(term) {
    searchTerm = term || '';
    applySearch();
  };

  let users = [];
  let allUsers = [];
  let currentPage = 1;
  const usersPerPage = 10;
  let expandedRows = {};
  let sortAscending = true;

  // Check if Supabase is initialized
  if (!supabase) {
    console.error('users_db: Supabase client is not initialized.');
    usersList.innerHTML = '<div class="error">Supabase not initialized.</div>';
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
      const isExpanded = !!expandedRows[user.employeeId];
      const row = document.createElement('div');
      row.className = `user-row ${isExpanded ? 'expanded' : ''}`;

      const subtitle = `${user.email || 'Email'} | ${user.employment || 'Status'}`;

      row.innerHTML = `
        <div class="user-collapsed-content" style="${isExpanded ? 'display: none;' : ''}">
          <div class="user-text-details">
            <div class="user-name">${user.name || 'New User'}</div>
            <div class="user-subtitle">${subtitle}</div>
          </div>
          <div class="btn-group">
            <button class="btn-outline" onclick="window.toggleUser('${user.employeeId}')">Edit</button>
            <button class="btn-outline" onclick="window.deleteUser('${user.employeeId}')">Delete</button>
          </div>
        </div>

        <div class="user-expanded-content" style="${isExpanded ? '' : 'display: none;'}">
          <div class="attendance-main-section">
            <div class="user-text-details">
              <div class="user-name">${user.name || 'New User'}</div>
              <div class="user-subtitle">${subtitle}</div>
            </div>
            <div class="edit-grid">
              <label>Name</label><input type="text" id="name-${user.employeeId}" value="${user.name || ''}">
              <label>Email</label><input type="text" id="email-${user.employeeId}" value="${user.email || ''}">
              <label>Employment</label><select id="emp-${user.employeeId}">
                <option value="Full-time" ${user.employment === 'Full-time' ? 'selected' : ''}>Full-time</option>
                <option value="Part-time" ${user.employment === 'Part-time' ? 'selected' : ''}>Part-time</option>
              </select>
            </div>
          </div>
          <div class="sidebar-actions">
            <div class="btn-group">
              <button class="btn-outline" onclick="window.saveUser('${user.employeeId}')">Save</button>
              <button class="btn-outline" onclick="window.closeNoSave('${user.employeeId}')">Close</button>
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
  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;

      users = data.map(user => ({
        employeeId: user.employeeId,
        name: user.name || '',
        email: user.email || '',
        employment: user.employment || '',
        createdAt: user.createdAt
      }));

      applySearch();
    } catch (err) {
      console.error('users_db: Error loading users:', err);
    }
  }

  window.toggleUser = (uid) => {
    // Close all other expanded rows first
    Object.keys(expandedRows).forEach(key => {
      if (key !== uid) {
        expandedRows[key] = false;
      }
    });
    // Toggle the clicked user
    expandedRows[uid] = !expandedRows[uid];
    renderUsers();
  };

  window.closeNoSave = (uid) => {
    expandedRows[uid] = false;
    renderUsers();
    console.log('users_db: Closed without saving.');
  };

  window.saveUser = async (uid) => {
    const nameVal = document.getElementById(`name-${uid}`).value;
    const emailVal = document.getElementById(`email-${uid}`).value;
    const empVal = document.getElementById(`emp-${uid}`).value;

    const userInArray = users.find(u => u.employeeId === uid) || {};

    const hasChanged = nameVal !== (userInArray.name || '') ||
      emailVal !== (userInArray.email || '') ||
      empVal !== (userInArray.employment || '');

    if (hasChanged) {
      try {
        const { error } = await supabase
          .from(USERS_TABLE)
          .update({
            name: nameVal,
            email: emailVal,
            employment: empVal
          })
          .eq('employeeId', uid);

        if (error) throw error;
        console.log('users_db: User data saved successfully.');
        
        // Update local data so card shows updated info
        const userIndex = users.findIndex(u => u.employeeId === uid);
        if (userIndex !== -1) {
          users[userIndex] = {
            ...users[userIndex],
            name: nameVal,
            email: emailVal,
            employment: empVal
          };
          applySearch();
        }
      } catch (err) {
        console.error('users_db: Save error:', err);
      }
    } else {
      console.log('users_db: No changes detected.');
    }
    
    // Close the expanded view after saving
    expandedRows[uid] = false;
    renderUsers();
  };

  window.deleteUser = async (uid) => {
    if (!confirm('Delete this user?')) return;
    try {
      const { error } = await supabase
        .from(USERS_TABLE)
        .delete()
        .eq('employeeId', uid);

      if (error) throw error;
      delete expandedRows[uid];
      loadUsers();
    } catch (err) {
      console.error('users_db: delete error', err);
    }
  };

  addUserBtn.addEventListener('click', async () => {
    try {
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .insert({
          name: 'New User',
          email: '',
          employment: 'Full-time'
        })
        .select()
        .single();

      if (error) throw error;
      expandedRows[data.employeeId] = true;
      loadUsers();
    } catch (err) {
      console.error('users_db: add user error', err);
    }
  });

  // Check for admin status
  async function checkAdminAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Check localStorage
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      if (!userEmail) {
        users = [];
        renderUsers();
        addUserBtn.style.display = 'none';
        return;
      }
    }

    const userEmail = session?.user?.email || sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
    if (userEmail) {
      const { data: adminData, error } = await supabase
        .from('user_admin_data')
        .select('*')
        .eq('email', userEmail);

      const isAdmin = !error && adminData && adminData.length > 0;
      addUserBtn.style.display = isAdmin ? '' : 'none';
      console.log('users_db: signed in as', userEmail, 'admin?', isAdmin);
    }
    loadUsers();
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      users = [];
      renderUsers();
      addUserBtn.style.display = 'none';
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      checkAdminAndLoad();
    }
  });

  // Initial load
  checkAdminAndLoad();
  
  window.sortUsers = function(field) {
    allUsers.sort((a, b) => {
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
    currentPage = 1;
    renderUsers();
  };
  
  window.addEventListener('message', function(event) {
    if (event.data.type === 'search') {
      window.performUserSearch(event.data.term);
    }
  });
});
