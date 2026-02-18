const urlParams = new URLSearchParams(window.location.search);
const sectId = urlParams.get('sectId');
const sectionName = urlParams.get('sectionName');

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let allEmployees = [];
let selectedDay = 'All';
let selectedSchedules = new Set();
let editingScheduleId = null;

// Initialize pagination
Paginate.init({
  containerId: 'section_schedule_detail',
  itemsPerPage: 10,
  onPageChange: () => renderSchedulePage()
});

// Get current day of the week
function getCurrentDay() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  return days[today.getDay()];
}

// Set the day selector to current day on load
function setCurrentDay() {
  const currentDay = getCurrentDay();
  const daySelector = document.getElementById('daySelector');
  if (daySelector) {
    daySelector.value = currentDay;
    selectedDay = currentDay;
  }
}

async function updateSchedule(scheduleId) {
  const employeeId = document.getElementById('addEmployee').value;
  const weekday = document.getElementById('addWeekday').value;
  const startTime = document.getElementById('addStartTime').value;
  const endTime = document.getElementById('addEndTime').value;
  const subject = document.getElementById('addSubject').value;

  if (!employeeId || !startTime || !endTime || !subject) {
    alert('Please fill in all fields');
    return;
  }

  const supabase = window.supabaseClient;
  const { error } = await supabase
    .from('schedule')
    .update({
      employeeId: employeeId,
      weekday: weekday,
      startTime: startTime,
      endTime: endTime,
      subject: subject
    })
    .eq('schedId', scheduleId);

  if (error) {
    console.error('Error updating schedule:', error);
    alert('Failed to update schedule');
    return;
  }

  // Reset form
  document.getElementById('addStartTime').value = '';
  document.getElementById('addEndTime').value = '';
  document.getElementById('addSubject').value = '';
  
  const saveBtn = document.querySelector('.export-btn');
  saveBtn.innerHTML = '<span class="material-symbols-outlined">add</span> Add';
  saveBtn.onclick = window.saveSchedule;
  
  loadSectionSchedule();
}

async function loadSectionSchedule() {
  if (!sectId) {
    alert('No section ID provided');
    window.location.href = 'section_schedules.html';
    return;
  }

  const supabase = window.supabaseClient;
  if (!supabase) {
    setTimeout(loadSectionSchedule, 500);
    return;
  }

  // Set current day before rendering
  const currentDay = getCurrentDay();
  const daySelector = document.getElementById('daySelector');
  if (daySelector) {
    daySelector.value = currentDay;
  }
  selectedDay = currentDay;

  document.getElementById('sectionName').textContent = `${sectionName || 'Section'} Schedule`;
  document.getElementById('sectionInfo').textContent = `Weekly schedule for ${sectionName || 'this section'}`;

  const { data: employees, error: empError } = await supabase
    .from('user_employee_data')
    .select('*')
    .order('name', { ascending: true });

  if (!empError && employees) {
    allEmployees = employees;
    const employeeSelect = document.getElementById('addEmployee');
    employeeSelect.innerHTML = employees.map(e => `<option value="${e.employeeId}">${e.name}</option>`).join('');
  }

  const { data: schedules, error } = await supabase
    .from('schedule')
    .select('*, user_employee_data(name, email)')
    .eq('sectId', sectId)
    .order('weekday', { ascending: true })
    .order('startTime', { ascending: true });

  if (error) {
    console.error('Error loading schedules:', error);
    return;
  }

  renderSchedule(schedules || []);
  updateActionButtons();
}

function renderSchedule(schedules) {
  window.currentSchedules = schedules;
  applyFilters(false);
}

function renderScheduleTable(pageData) {
  const container = document.getElementById('scheduleTableBody');
  container.innerHTML = '';

  if (!pageData || pageData.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="no-records">No schedules found for this section.</td></tr>';
    return;
  }

  pageData.forEach(schedule => {
    const row = document.createElement('tr');
    row.className = 'schedule-row';
    row.dataset.schedId = schedule.schedId;
    
    row.innerHTML = `
      <td class="checkbox-col">
        <input type="checkbox" class="row-checkbox" ${selectedSchedules.has(schedule.schedId) ? 'checked' : ''} onchange="toggleScheduleSelect('${schedule.schedId}', this.checked)">
      </td>
      <td class="time-cell">${schedule.startTime} - ${schedule.endTime}</td>
      <td>
        <div class="subject-cell">${schedule.subject || 'No Subject'}</div>
      </td>
      <td>
        <div class="teacher-cell">${schedule.user_employee_data?.name || 'No Teacher Assigned'}</div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon edit-btn" onclick="startEditRow('${schedule.schedId}')" title="Edit">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn-icon delete-btn" onclick="deleteSchedule('${schedule.schedId}')" title="Delete">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </td>
    `;
    
    container.appendChild(row);
  });
}

function renderSchedulePage() {
  renderSchedule(window.currentSchedules || []);
}

window.filterByDay = function(day) {
  selectedDay = day;
  applyFilters();
};

// Pagination functions
window.changePage = function(direction) {
  Paginate.changePage(direction);
};

window.goToFirstPage = function() {
  Paginate.goToFirstPage();
};

window.goToLastPage = function() {
  Paginate.goToLastPage();
};

window.goToPage = function(pageNum) {
  Paginate.goToPage(parseInt(pageNum));
};

window.changeItemsPerPage = function(value) {
  Paginate.setItemsPerPage(parseInt(value));
};

// Search function
window.searchSchedule = function(query) {
  applyFilters();
};

// Filter functions
window.toggleFilterMenu = function() {
  const filterMenu = document.getElementById('filterMenu');
  const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
  const isOpen = filterMenu && filterMenu.style.display === 'block';
  
  if (filterMenu) filterMenu.style.display = isOpen ? 'none' : 'block';
  const sortMenu = document.getElementById('sortMenu');
  if (sortMenu) sortMenu.style.display = 'none';
  if (filterWrapper) filterWrapper.classList.toggle('active', !isOpen);
};

window.toggleSortMenu = function() {
  const sortMenu = document.getElementById('sortMenu');
  const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
  const isOpen = sortMenu && sortMenu.style.display === 'block';
  
  if (sortMenu) sortMenu.style.display = isOpen ? 'none' : 'block';
  const filterMenu = document.getElementById('filterMenu');
  if (filterMenu) filterMenu.style.display = 'none';
  if (sortWrapper) sortWrapper.classList.toggle('active', !isOpen);
};

window.addFilterRow = function() {
  const activeFilters = document.getElementById('activeFilters');
  const filterRow = document.createElement('div');
  filterRow.className = 'filter-row';
  filterRow.innerHTML = `
    <select class="filter-column-select">
      <option value="subject">Subject</option>
      <option value="teacher">Teacher</option>
    </select>
    <span>:</span>
    <input type="text" class="filter-value-input" placeholder="Enter value...">
    <button class="remove-filter-btn" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;
  activeFilters.appendChild(filterRow);
};

window.addSortRow = function() {
  const activeSorts = document.getElementById('activeSorts');
  const sortRow = document.createElement('div');
  sortRow.className = 'filter-row';
  sortRow.innerHTML = `
    <select class="filter-column-select">
      <option value="startTime">Time</option>
      <option value="subject">Subject</option>
      <option value="teacher">Teacher</option>
    </select>
    <span>:</span>
    <select class="filter-column-select">
      <option value="asc">Ascending</option>
      <option value="desc">Descending</option>
    </select>
    <button class="remove-filter-btn" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;
  activeSorts.appendChild(sortRow);
};

window.applyFilters = function(showMenu = true) {
  const filterRows = document.querySelectorAll('#activeFilters .filter-row');
  const searchInput = document.getElementById('searchScheduleInput');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  const filters = [];
  filterRows.forEach(row => {
    const select = row.querySelector('select');
    const input = row.querySelector('input');
    if (select && input && input.value.trim()) {
      filters.push({ column: select.value, value: input.value.trim().toLowerCase() });
    }
  });
  
  let filteredSchedules = window.currentSchedules ? [...window.currentSchedules] : [];
  
  // Apply day filter
  if (selectedDay !== 'All') {
    filteredSchedules = filteredSchedules.filter(s => s.weekday === selectedDay);
  }
  
  // Apply search filter
  if (searchTerm) {
    filteredSchedules = filteredSchedules.filter(s => {
      const subject = (s.subject || '').toLowerCase();
      const teacher = (s.user_employee_data?.name || '').toLowerCase();
      return subject.includes(searchTerm) || teacher.includes(searchTerm);
    });
  }
  
  // Apply column filters
  if (filters.length > 0) {
    filteredSchedules = filteredSchedules.filter(schedule => {
      return filters.every(filter => {
        let cellValue;
        if (filter.column === 'teacher') {
          cellValue = schedule.user_employee_data?.name || '';
        } else {
          cellValue = schedule[filter.column] || '';
        }
        return String(cellValue).toLowerCase().includes(filter.value);
      });
    });
  }
  
  // Update filter status
  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) {
    const activeFilterCount = filters.length + (searchTerm ? 1 : 0) + (selectedDay !== 'All' ? 1 : 0);
    filterStatus.textContent = activeFilterCount > 0 ? `Filtered` : '';
  }
  
  if (showMenu) {
    toggleFilterMenu();
  }
  
  // Sort and render
  filteredSchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));
  Paginate.setTotalItems(filteredSchedules.length);
  renderScheduleTable(Paginate.getPageData(filteredSchedules));
};

window.applySort = function() {
  const sortRows = document.querySelectorAll('#activeSorts .filter-row');
  const sorts = [];
  
  sortRows.forEach(row => {
    const selects = row.querySelectorAll('select');
    if (selects.length >= 2) {
      sorts.push({ column: selects[0].value, ascending: selects[1].value === 'asc' });
    }
  });
  
  // Get current filtered schedules
  const searchInput = document.getElementById('searchScheduleInput');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  let filteredSchedules = window.currentSchedules ? [...window.currentSchedules] : [];
  
  // Apply day filter
  if (selectedDay !== 'All') {
    filteredSchedules = filteredSchedules.filter(s => s.weekday === selectedDay);
  }
  
  // Apply search
  if (searchTerm) {
    filteredSchedules = filteredSchedules.filter(s => {
      const subject = (s.subject || '').toLowerCase();
      const teacher = (s.user_employee_data?.name || '').toLowerCase();
      return subject.includes(searchTerm) || teacher.includes(searchTerm);
    });
  }
  
  // Apply sort
  if (sorts.length > 0) {
    filteredSchedules.sort((a, b) => {
      for (const sort of sorts) {
        let valueA, valueB;
        
        if (sort.column === 'teacher') {
          valueA = a.user_employee_data?.name || '';
          valueB = b.user_employee_data?.name || '';
        } else if (sort.column === 'startTime') {
          valueA = a.startTime || '';
          valueB = b.startTime || '';
        } else {
          valueA = a[sort.column] || '';
          valueB = b[sort.column] || '';
        }
        
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
        
        if (valueA !== valueB) {
          return sort.ascending ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
        }
      }
      return 0;
    });
  }
  
  toggleSortMenu();
  Paginate.setTotalItems(filteredSchedules.length);
  renderScheduleTable(Paginate.getPageData(filteredSchedules));
};

// Toggle select all checkboxes
window.toggleSelectAll = function() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const isChecked = selectAllCheckbox.checked;
  const checkboxes = document.querySelectorAll('.row-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
    const schedId = checkbox.getAttribute('onchange').match(/'([^']+)'/)[1];
    if (isChecked) {
      selectedSchedules.add(schedId);
    } else {
      selectedSchedules.delete(schedId);
    }
  });
  
  updateActionButtons();
};

// Toggle individual schedule selection
window.toggleScheduleSelect = function(schedId, checked) {
  if (checked) {
    selectedSchedules.add(schedId);
  } else {
    selectedSchedules.delete(schedId);
  }
  updateActionButtons();
};

// Update action buttons visibility
function updateActionButtons() {
  const count = selectedSchedules.size;
  const actionContainer = document.getElementById('actionButtonsContainer');
  const selectionCount = document.getElementById('selectionCount');
  
  if (count > 0) {
    actionContainer.style.display = 'flex';
    selectionCount.textContent = `${count} selected`;
  } else {
    actionContainer.style.display = 'none';
  }
}

// Remove teacher from selected schedules
window.removeTeacherFromSelected = async function() {
  if (selectedSchedules.size === 0) return;
  
  const confirmMsg = selectedSchedules.size === 1 
    ? 'Are you sure you want to remove the teacher from this schedule?'
    : `Are you sure you want to remove the teacher from ${selectedSchedules.size} schedules?`;
  
  if (!confirm(confirmMsg)) return;

  const supabase = window.supabaseClient;
  
  for (const scheduleId of selectedSchedules) {
    const { error } = await supabase
      .from('schedule')
      .update({ employeeId: null })
      .eq('schedId', scheduleId);
    
    if (error) {
      console.error('Error removing teacher:', error);
    }
  }
  
  selectedSchedules.clear();
  loadSectionSchedule();
};

// Delete selected schedules
window.deleteSelectedSchedules = async function() {
  if (selectedSchedules.size === 0) return;
  
  const confirmMsg = selectedSchedules.size === 1
    ? 'Are you sure you want to delete this schedule?'
    : `Are you sure you want to delete ${selectedSchedules.size} schedules? This action cannot be undone.`;
  
  if (!confirm(confirmMsg)) return;

  const supabase = window.supabaseClient;
  
  for (const scheduleId of selectedSchedules) {
    const { error } = await supabase
      .from('schedule')
      .delete()
      .eq('schedId', scheduleId);
    
    if (error) {
      console.error('Error deleting schedule:', error);
    }
  }
  
  selectedSchedules.clear();
  loadSectionSchedule();
};

// Toggle select all checkboxes
window.toggleSelectAll = function() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const isChecked = selectAllCheckbox.checked;
  const checkboxes = document.querySelectorAll('.row-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
    const schedId = checkbox.getAttribute('onchange').match(/'([^']+)'/)[1];
    if (isChecked) {
      selectedSchedules.add(schedId);
    } else {
      selectedSchedules.delete(schedId);
    }
  });
  
  updateActionButtons();
};

// Toggle individual schedule selection
window.toggleScheduleSelect = function(schedId, checked) {
  if (checked) {
    selectedSchedules.add(schedId);
  } else {
    selectedSchedules.delete(schedId);
  }
  updateActionButtons();
};

// Update action buttons visibility
function updateActionButtons() {
  const count = selectedSchedules.size;
  const actionContainer = document.getElementById('actionButtonsContainer');
  const selectionCount = document.getElementById('selectionCount');
  
  if (count > 0) {
    actionContainer.style.display = 'flex';
    selectionCount.textContent = `${count} selected`;
  } else {
    actionContainer.style.display = 'none';
  }
}

// Remove teacher from selected schedules
window.removeTeacherFromSelected = async function() {
  if (selectedSchedules.size === 0) return;
  
  const confirmMsg = selectedSchedules.size === 1 
    ? 'Are you sure you want to remove the teacher from this schedule?'
    : `Are you sure you want to remove the teacher from ${selectedSchedules.size} schedules?`;
  
  if (!confirm(confirmMsg)) return;

  const supabase = window.supabaseClient;
  
  for (const scheduleId of selectedSchedules) {
    const { error } = await supabase
      .from('schedule')
      .update({ employeeId: null })
      .eq('schedId', scheduleId);
    
    if (error) {
      console.error('Error removing teacher:', error);
    }
  }
  
  selectedSchedules.clear();
  loadSectionSchedule();
};

// Delete selected schedules
window.deleteSelectedSchedules = async function() {
  if (selectedSchedules.size === 0) return;
  
  const confirmMsg = selectedSchedules.size === 1
    ? 'Are you sure you want to delete this schedule?'
    : `Are you sure you want to delete ${selectedSchedules.size} schedules? This action cannot be undone.`;
  
  if (!confirm(confirmMsg)) return;

  const supabase = window.supabaseClient;
  
  for (const scheduleId of selectedSchedules) {
    const { error } = await supabase
      .from('schedule')
      .delete()
      .eq('schedId', scheduleId);
    
    if (error) {
      console.error('Error deleting schedule:', error);
    }
  }
  
  selectedSchedules.clear();
  loadSectionSchedule();
};

// Start inline editing in the table
window.startEditRow = function(schedId) {
  const schedule = window.currentSchedules.find(s => s.schedId === schedId);
  if (!schedule) return;
  
  const row = document.querySelector(`tr[data-sched-id="${schedId}"]`);
  if (!row) return;
  
  // Create text input for subject
  const subjectCell = row.querySelector('.subject-cell');
  const currentSubject = schedule.subject || '';
  
  subjectCell.innerHTML = `
    <input type="text" class="edit-input subject-input" value="${currentSubject}" placeholder="Subject">
  `;
  
  // Create time inputs
  const timeCell = row.querySelector('.time-cell');
  timeCell.innerHTML = `
    <input type="time" class="time-input" value="${schedule.startTime}">
    -
    <input type="time" class="time-input" value="${schedule.endTime}">
  `;
  
  // Create employee dropdown
  const teacherCell = row.querySelector('.teacher-cell');
  const currentEmployeeId = schedule.employeeId || '';
  const employeeOptions = allEmployees.map(e => 
    `<option value="${e.employeeId}" ${e.employeeId === currentEmployeeId ? 'selected' : ''}>${e.name}</option>`
  ).join('');
  
  teacherCell.innerHTML = `
    <select class="employee-select">
      <option value="">No Teacher</option>
      ${employeeOptions}
    </select>
  `;
  
  // Replace edit/delete buttons with confirm/cancel in actions column
  const actionsCell = row.querySelector('td:last-child');
  actionsCell.innerHTML = `
    <div class="action-buttons">
      <button class="btn-icon save-btn" onclick="saveEditRow('${schedId}')" title="Confirm">
        <span class="material-symbols-outlined">check</span>
      </button>
      <button class="btn-icon cancel-btn" onclick="cancelEditRow('${schedId}')" title="Cancel">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
  `;
};

// Save the inline edit
window.saveEditRow = async function(schedId) {
  const row = document.querySelector(`tr[data-sched-id="${schedId}"]`);
  if (!row) return;
  
  const subject = row.querySelector('.subject-input').value;
  const startTime = row.querySelector('.time-input:first-of-type').value;
  const endTime = row.querySelector('.time-input:last-of-type').value;
  const employeeId = row.querySelector('.employee-select').value;
  
  if (!subject || !startTime || !endTime) {
    alert('Please fill in all fields');
    return;
  }
  
  const supabase = window.supabaseClient;
  const { error } = await supabase
    .from('schedule')
    .update({
      subject: subject,
      startTime: startTime,
      endTime: endTime,
      employeeId: employeeId || null
    })
    .eq('schedId', schedId);
  
  if (error) {
    console.error('Error updating schedule:', error);
    alert('Failed to update schedule');
    return;
  }
  
  loadSectionSchedule();
};

// Cancel inline editing
window.cancelEditRow = function(schedId) {
  loadSectionSchedule();
};

// Edit schedule - populate the form (legacy, kept for compatibility)
window.editSchedule = function(schedId) {
  startEditRow(schedId);
};

// Delete single schedule
window.deleteSchedule = async function(schedId) {
  if (!confirm('Are you sure you want to delete this schedule?')) return;

  const supabase = window.supabaseClient;
  const { error } = await supabase
    .from('schedule')
    .delete()
    .eq('schedId', schedId);
  
  if (error) {
    console.error('Error deleting schedule:', error);
    alert('Failed to delete schedule');
    return;
  }
  
  loadSectionSchedule();
};

window.saveSchedule = async function() {
  const employeeId = document.getElementById('addEmployee').value;
  const weekday = document.getElementById('addWeekday').value;
  const startTime = document.getElementById('addStartTime').value;
  const endTime = document.getElementById('addEndTime').value;
  const subject = document.getElementById('addSubject').value;

  if (!employeeId || !startTime || !endTime || !subject) {
    alert('Please fill in all fields');
    return;
  }

  const supabase = window.supabaseClient;
  const { error } = await supabase
    .from('schedule')
    .insert([{
      employeeId: employeeId,
      weekday: weekday,
      startTime: startTime,
      endTime: endTime,
      subject: subject,
      sectId: sectId
    }]);

  if (error) {
    console.error('Error saving schedule:', error);
    alert('Failed to save schedule');
    return;
  }

  document.getElementById('addStartTime').value = '';
  document.getElementById('addEndTime').value = '';
  document.getElementById('addSubject').value = '';
  loadSectionSchedule();
};

loadSectionSchedule();
