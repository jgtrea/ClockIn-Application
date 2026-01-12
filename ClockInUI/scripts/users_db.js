document.addEventListener('DOMContentLoaded', () => {
  const usersList = document.getElementById("usersList");
  const addUserBtn = document.getElementById("addUserBtn");

  let users = [];

  function renderUsers() {
    usersList.innerHTML = '';
    users.forEach((user, index) => {
      const row = document.createElement('div');
      row.className = 'user-row';
      const subtitle = `${user.id || 'ID'} | ${user.department || 'Dept'} | ${user.employment || 'Status'}`;
      row.innerHTML = `
        <div class="user-bar" onclick="toggleUser(${index})">
          <div class="user-info-brief">
            <div class="user-avatar-placeholder"></div>
            <div>
              <div class="user-name">${user.name || 'New User'}</div>
              <div class="user-subtitle">${subtitle}</div>
            </div>
          </div>
          <div class="user-actions">
            <button class="btn-outline" onclick="event.stopPropagation(); toggleUser(${index})">Edit</button>
            <button class="btn-outline" onclick="event.stopPropagation(); deleteUser(${index})">Delete</button>
          </div>
        </div>

        <div class="user-expanded-content">
          <div class="expanded-header">
            <div class="user-info-brief">
              <div class="user-avatar-placeholder"></div>
              <div>
                <div class="user-name">${user.name || 'New User'}</div>
                <div class="user-subtitle">${subtitle}</div>
              </div>
            </div>
            <div class="user-actions">
              <button class="btn-outline" onclick="toggleUser(${index})">Close</button>
              <button class="btn-outline" onclick="deleteUser(${index})">Delete</button>
            </div>
          </div>

          <div class="edit-grid">
            <div class="input-group">
              <label>ID</label>
              <input type="text" value="${user.id}" onchange="users[${index}].id=this.value">
            </div>
            <div class="input-group">
              <label>Password</label>
              <input type="password" value="${user.password}" onchange="users[${index}].password=this.value">
            </div>
            <div class="input-group">
              <label>Name</label>
              <input type="text" value="${user.name}" onchange="users[${index}].name=this.value">
            </div>
            <div class="input-group">
              <label>Email</label>
              <input type="email" value="${user.email}" onchange="users[${index}].email=this.value">
            </div>
            <div class="input-group">
              <label>Department</label>
              <input type="text" value="${user.department}" onchange="users[${index}].department=this.value">
            </div>
            <div class="input-group">
              <label>Employment</label>
              <input type="text" value="${user.employment}" onchange="users[${index}].employment=this.value">
            </div>
          </div>
        </div>
      `;
      usersList.appendChild(row);
    });
  }

  window.toggleUser = function(index) {
    const rows = document.querySelectorAll('.user-row');
    rows[index].classList.toggle('expanded');
  }

  function addUser() {
    users.push({
      id: '',
      name: '',
      email: '',
      password: '',
      department: '',
      employment: ''
    });
    renderUsers();
  }

  window.deleteUser = function(index) {
    users.splice(index, 1);
    renderUsers();
  }

  addUserBtn.addEventListener('click', addUser);
  renderUsers();
});
