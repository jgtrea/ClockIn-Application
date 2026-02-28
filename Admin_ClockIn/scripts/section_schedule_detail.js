const urlParams = new URLSearchParams(window.location.search);
const sectId = urlParams.get('sectId');
const sectionName = urlParams.get('sectionName');

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let allEmployees = [];
let selectedSchedules = new Set();
let editingScheduleId = null;

// Get current day of the week
function getCurrentDay() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  return days[today.getDay()];
}

// Get employee ID from selected name
function getEmployeeIdByName(name) {
  const employee = allEmployees.find(e => e.name === name);
  return employee ? employee.employeeId : null;
}

async function updateSchedule(scheduleId) {
  const employeeName = document.getElementById('addEmployee').value;
  const employeeId = getEmployeeIdByName(employeeName);
  const weekday = document.getElementById('addWeekday').value;
  const startTime = document.getElementById('addStartTime').value;
  const endTime = document.getElementById('addEndTime').value;
  const subject = document.getElementById('addSubject').value;

  if (!employeeId || !startTime || !endTime) {
    alert('Please fill in all fields');
    return;
  }

  // Check if employeeId was found (in case user typed a name that doesn't exist)
  if (!employeeId) {
    alert('Please select a valid employee from the list');
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

  document.getElementById('sectionName').textContent = `${sectionName || 'Section'} Schedule`;
  document.getElementById('sectionInfo').textContent = `Weekly schedule for ${sectionName || 'this section'}`;

  const { data: employees, error: empError } = await supabase
    .from('user_employee_data')
    .select('*')
    .order('name', { ascending: true });

  if (!empError && employees) {
    allEmployees = employees;
    // Populate employee datalist
    const employeeDatalist = document.getElementById('employeeList');
    employeeDatalist.innerHTML = employees.map(e => `<option value="${e.name}" data-id="${e.employeeId}">`).join('');
  }

  // Fetch subjects from subjects table (like schedule_detail.js does)
  const { data: subjectsData } = await supabase
    .from('subjects')
    .select('subject_name')
    .order('subject_name', { ascending: true });

  if (subjectsData) {
    const uniqueSubjects = subjectsData.map(s => s.subject_name).filter(s => s);
    uniqueSubjects.sort();
    const subjectDatalist = document.getElementById('subjectList');
    subjectDatalist.innerHTML = uniqueSubjects.map(s => `<option value="${s}">`).join('');
  } else {
    // Fallback to schedule table if subjects table doesn't exist or is empty
    const { data: allSchedules } = await supabase
      .from('schedule')
      .select('subject')
      .not('subject', 'is', null);

    if (allSchedules) {
      const uniqueSubjects = [...new Set(allSchedules.map(s => s.subject).filter(s => s))];
      uniqueSubjects.sort();
      const subjectDatalist = document.getElementById('subjectList');
      subjectDatalist.innerHTML = uniqueSubjects.map(s => `<option value="${s}">`).join('');
    }
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
}

function renderSchedule(schedules) {
  const container = document.getElementById('schedulesByDayContainer');
  if (!container) return;
  
  container.innerHTML = '';
  window.currentSchedules = schedules;

  if (!schedules || schedules.length === 0) {
    container.innerHTML = '<div class="no-records">No schedule records found.</div>';
    return;
  }

  // Group by weekday
  const groupedByDay = {};
  dayOrder.forEach(day => groupedByDay[day] = []);

  schedules.forEach(schedule => {
    if (groupedByDay[schedule.weekday]) {
      groupedByDay[schedule.weekday].push(schedule);
    }
  });

  // Create a table for each day
  dayOrder.forEach(day => {
    const daySchedules = groupedByDay[day];
    if (daySchedules.length === 0) return;

    // Sort by start time
    daySchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const daySection = document.createElement('div');
    daySection.className = 'day-section';
    daySection.innerHTML = `
      <h3 class="day-header">${day}</h3>
      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th class="checkbox-col"></th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Subject</th>
              <th>Teacher</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="schedules-${day}">
          </tbody>
        </table>
      </div>
    `;
    
    const tbody = daySection.querySelector(`#schedules-${day}`);
    
    daySchedules.forEach(schedule => {
      const row = document.createElement('tr');
      row.className = 'user-table-row';
      row.id = `row-${schedule.schedId}`;
      
      row.innerHTML = `
        <td class="checkbox-col"><input type="checkbox" class="user-checkbox" value="${schedule.schedId}" onchange="toggleUserSelection('${schedule.schedId}')"></td>
        <td class="time-cell" id="startTime-${schedule.schedId}">${schedule.startTime || '-'}</td>
        <td class="time-cell" id="endTime-${schedule.schedId}">${schedule.endTime || '-'}</td>
        <td class="subject-cell" id="subject-${schedule.schedId}">${schedule.subject || '-'}</td>
        <td class="teacher-cell" id="teacher-${schedule.schedId}">${schedule.user_employee_data?.name || '-'}</td>
        <td class="actions-col">
          <div class="action-buttons" id="actions-${schedule.schedId}">
            <button class="btn-icon edit-btn" onclick="window.editSchedule('${schedule.schedId}')" title="Edit Schedule">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon delete-btn" onclick="deleteSchedule('${schedule.schedId}')" title="Delete Schedule">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
          <div class="action-buttons" id="edit-actions-${schedule.schedId}" style="display: none;">
            <button class="btn-icon save-btn" onclick="window.saveEditSchedule('${schedule.schedId}')" title="Save">
              <span class="material-symbols-outlined">check</span>
            </button>
            <button class="btn-icon cancel-btn" onclick="window.cancelEditSchedule('${schedule.schedId}')" title="Cancel">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </td>
      `;
      
      tbody.appendChild(row);
    });
    
    container.appendChild(daySection);
  });

  // Update total count
  const totalCount = document.getElementById('totalUsersCount');
  if (totalCount) {
    totalCount.textContent = schedules.length;
  }
}

// Toggle selection for a single schedule
window.toggleUserSelection = function(schedId) {
  const checkbox = document.querySelector(`.user-checkbox[value="${schedId}"]`);
  if (checkbox) {
    if (checkbox.checked) {
      selectedSchedules.add(schedId);
    } else {
      selectedSchedules.delete(schedId);
    }
  }
  updateSelectAllState();
};

function updateSelectAllState() {
  const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
  const selectedCount = document.getElementById('selectedCount');
  const selectAllBtn = document.getElementById('selectAllSchedules');
  const selectionActions = document.getElementById('selectionActions');
  
  const hasSelection = checkedBoxes.length > 0;
  
  if (hasSelection) {
    if (selectionActions) {
      selectionActions.style.display = 'flex';
    }
    if (selectedCount) {
      selectedCount.textContent = checkedBoxes.length;
    }
    
    if (selectAllBtn) {
      selectAllBtn.classList.add('has-selection');
    }
    
    const selectedIds = [];
    checkedBoxes.forEach(cb => selectedIds.push(cb.value));
    
    if (selectedIds.length === 1) {
      const schedule = window.currentSchedules.find(s => s.schedId === selectedIds[0]);
      if (schedule) {
        document.getElementById('addWeekday').value = schedule.weekday;
        document.getElementById('addStartTime').value = schedule.startTime;
        document.getElementById('addEndTime').value = schedule.endTime;
        document.getElementById('addSubject').value = schedule.subject || '';
        const employee = allEmployees.find(e => e.employeeId === schedule.employeeId);
        document.getElementById('addEmployee').value = employee ? employee.name : '';
      }
    }
  } else {
    if (selectionActions) {
      selectionActions.style.display = 'none';
    }
    
    if (selectAllBtn) {
      selectAllBtn.classList.remove('has-selection');
    }
  }
}

window.toggleSelectAll = function() {
  const selectAllBtn = document.getElementById('selectAllSchedules');
  const checkboxes = document.querySelectorAll('.user-checkbox');
  
  if (selectAllBtn.classList.contains('has-selection')) {
    checkboxes.forEach(cb => cb.checked = false);
    selectedSchedules.clear();
  } else {
    checkboxes.forEach(cb => cb.checked = true);
    checkboxes.forEach(cb => selectedSchedules.add(cb.value));
  }
  
  updateSelectAllState();
};

// Clear selection
window.clearSelection = function() {
  const checkboxes = document.querySelectorAll('.user-checkbox');
  checkboxes.forEach(cb => cb.checked = false);
  selectedSchedules.clear();
  updateSelectAllState();
};

// Update selected schedules
window.updateSelectedSchedules = async function() {
  const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
  if (checkedBoxes.length === 0) {
    alert('No schedules selected');
    return;
  }
  
  const employeeName = document.getElementById('addEmployee').value;
  const employeeId = getEmployeeIdByName(employeeName);
  const weekday = document.getElementById('addWeekday').value;
  const startTime = document.getElementById('addStartTime').value;
  const endTime = document.getElementById('addEndTime').value;
  const subject = document.getElementById('addSubject').value;
  
  if (!employeeName || !startTime || !endTime) {
    alert('Please fill in all fields');
    return;
  }
  
  if (!employeeId) {
    alert('Please select a valid employee from the list');
    return;
  }
  
  const supabase = window.supabaseClient;
  const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
  
  try {
    const { error } = await supabase
      .from('schedule')
      .update({
        employeeId: employeeId,
        weekday: weekday,
        startTime: startTime,
        endTime: endTime,
        subject: subject
      })
      .in('schedId', selectedIds);
    
    if (error) throw error;
    
    alert(`Updated ${selectedIds.length} schedule(s)`);
    clearSelection();
    loadSectionSchedule();
  } catch (err) {
    console.error('Error updating schedules:', err);
    alert('Failed to update schedules');
  }
};

// Delete selected schedules - show dialog instead of simple confirm
window.deleteSelectedSchedules = function() {
  const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
  if (checkedBoxes.length === 0) {
    alert('No schedules selected');
    return;
  }
  
  // Store selected IDs for the dialog
  const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
  window.pendingDeleteScheduleIds = selectedIds;
  
  // Show the delete confirmation dialog
  const dialog = document.getElementById('deleteConfirmDialog');
  if (dialog) {
    dialog.style.display = 'flex';
  }
};

// Show delete dialog
window.showDeleteDialog = function() {
  const dialog = document.getElementById('deleteConfirmDialog');
  if (dialog) {
    dialog.style.display = 'flex';
  }
};

// Close delete dialog
window.closeDeleteDialog = function() {
  window.pendingDeleteScheduleIds = null;
  const dialog = document.getElementById('deleteConfirmDialog');
  if (dialog) {
    dialog.style.display = 'none';
  }
};

// Confirm delete action
window.confirmDeleteSchedule = async function(deleteType) {
  const schedIds = window.pendingDeleteScheduleIds;
  
  if (!schedIds || schedIds.length === 0) {
    closeDeleteDialog();
    return;
  }

  const supabase = window.supabaseClient;
  
  try {
    if (deleteType === 'full') {
      // Delete entire schedule record
      const { error } = await supabase
        .from('schedule')
        .delete()
        .in('schedId', schedIds);
      
      if (error) throw error;
      
      alert(`Deleted ${schedIds.length} schedule(s)`);
    } else if (deleteType === 'teacher') {
      // Remove teacher only - keep the schedule but set employeeId to null
      for (const schedId of schedIds) {
        const { error } = await supabase
          .from('schedule')
          .update({ employeeId: null })
          .eq('schedId', schedId);
        
        if (error) throw error;
      }
      
      alert(`Removed teacher from ${schedIds.length} schedule(s)`);
    }
    
    closeDeleteDialog();
    clearSelection();
    loadSectionSchedule();
  } catch (err) {
    console.error('Error deleting schedules:', err);
    alert('Failed to delete schedules');
    closeDeleteDialog();
  }
};

// Start inline editing in the table
window.editSchedule = async function(schedId) {
  const schedule = window.currentSchedules.find(s => s.schedId === schedId);
  if (!schedule) return;
  
  const row = document.getElementById(`row-${schedId}`);
  if (!row) return;
  
  // Store original values
  row.dataset.originalSubject = schedule.subject || '';
  row.dataset.originalStartTime = schedule.startTime || '';
  row.dataset.originalEndTime = schedule.endTime || '';
  row.dataset.originalEmployeeId = schedule.employeeId || '';
  
  // Create subject input with datalist
  const subjectCell = document.getElementById(`subject-${schedId}`);
  const currentSubject = schedule.subject || '';
  
  subjectCell.innerHTML = `
    <input type="text" class="edit-input" id="edit-subject-${schedId}" value="${currentSubject}" placeholder="Subject" list="edit-subject-list-${schedId}">
    <datalist id="edit-subject-list-${schedId}"></datalist>
  `;
  
  // Create time inputs
  const startTimeCell = document.getElementById(`startTime-${schedId}`);
  const endTimeCell = document.getElementById(`endTime-${schedId}`);
  
  startTimeCell.innerHTML = `
    <input type="time" class="edit-input" id="edit-startTime-${schedId}" value="${schedule.startTime || ''}">
  `;
  
  endTimeCell.innerHTML = `
    <input type="time" class="edit-input" id="edit-endTime-${schedId}" value="${schedule.endTime || ''}">
  `;
  
  // Create employee input with datalist
  const teacherCell = document.getElementById(`teacher-${schedId}`);
  const currentEmployee = allEmployees.find(e => e.employeeId === schedule.employeeId);
  const currentEmployeeName = currentEmployee ? currentEmployee.name : '';
  
  teacherCell.innerHTML = `
    <input type="text" class="edit-input" id="edit-employee-${schedId}" value="${currentEmployeeName}" placeholder="Teacher" list="edit-employee-list-${schedId}">
    <datalist id="edit-employee-list-${schedId}"></datalist>
  `;
  
  // Populate employee datalist
  const employeeDatalist = document.getElementById(`edit-employee-list-${schedId}`);
  employeeDatalist.innerHTML = allEmployees.map(e => `<option value="${e.name}">`).join('');
  
  // Hide edit buttons, show save/cancel
  document.getElementById(`actions-${schedId}`).style.display = 'none';
  document.getElementById(`edit-actions-${schedId}`).style.display = 'flex';
  
  // Populate subject datalist asynchronously (after inputs are rendered)
  const subjectDatalist = document.getElementById(`edit-subject-list-${schedId}`);
  const supabase = window.supabaseClient;
  const { data: subjectsData } = await supabase
    .from('subjects')
    .select('subject_name')
    .order('subject_name', { ascending: true });
  
  if (subjectsData && subjectsData.length > 0) {
    const uniqueSubjects = subjectsData.map(s => s.subject_name).filter(s => s);
    subjectDatalist.innerHTML = uniqueSubjects.map(s => `<option value="${s}">`).join('');
  } else {
    // Fallback to schedule table
    const { data: allSchedulesForSubject } = await supabase
      .from('schedule')
      .select('subject')
      .not('subject', 'is', null);
    const uniqueSubjects = [...new Set(allSchedulesForSubject?.map(s => s.subject).filter(s => s) || [])];
    subjectDatalist.innerHTML = uniqueSubjects.map(s => `<option value="${s}">`).join('');
  }
};

window.cancelEditSchedule = function(schedId) {
  const row = document.getElementById(`row-${schedId}`);
  if (!row) return;
  
  const originalSubject = row.dataset.originalSubject;
  const originalStartTime = row.dataset.originalStartTime;
  const originalEndTime = row.dataset.originalEndTime;
  const originalEmployeeId = row.dataset.originalEmployeeId;
  
  // Restore subject
  const subjectCell = document.getElementById(`subject-${schedId}`);
  subjectCell.textContent = originalSubject || 'No Subject';
  
  // Restore time
  const startTimeCell = document.getElementById(`startTime-${schedId}`);
  const endTimeCell = document.getElementById(`endTime-${schedId}`);
  startTimeCell.textContent = originalStartTime || '-';
  endTimeCell.textContent = originalEndTime || '-';
  
  // Restore teacher - need to find the employee name
  const teacherCell = document.getElementById(`teacher-${schedId}`);
  const employee = allEmployees.find(e => e.employeeId === originalEmployeeId);
  teacherCell.textContent = employee ? employee.name : 'No Teacher Assigned';
  
  // Show edit buttons, hide save/cancel
  document.getElementById(`actions-${schedId}`).style.display = 'flex';
  document.getElementById(`edit-actions-${schedId}`).style.display = 'none';
};

window.saveEditSchedule = async function(schedId) {
  const row = document.getElementById(`row-${schedId}`);
  if (!row) return;
  
  const subject = document.getElementById(`edit-subject-${schedId}`).value;
  const startTime = document.getElementById(`edit-startTime-${schedId}`).value;
  const endTime = document.getElementById(`edit-endTime-${schedId}`).value;
  const employeeName = document.getElementById(`edit-employee-${schedId}`).value;
  // Look up employee ID by name
  const employee = allEmployees.find(e => e.name === employeeName);
  const employeeId = employee ? employee.employeeId : null;
  
  if (!startTime || !endTime) {
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
  
  // Reload the schedule data
  loadSectionSchedule();
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
  const employeeName = document.getElementById('addEmployee').value;
  const employeeId = employeeName ? getEmployeeIdByName(employeeName) : null;
  const weekday = document.getElementById('addWeekday').value;
  const startTime = document.getElementById('addStartTime').value;
  const endTime = document.getElementById('addEndTime').value;
  const subject = document.getElementById('addSubject').value;

  // All fields are required EXCEPT employee
  if (!weekday || !startTime || !endTime || !subject) {
    alert('Please fill in all fields (weekday, start time, end time, and subject)');
    return;
  }

  // Handle "All Weekdays" option - create records for Monday to Friday
  const weekdays = weekday === 'AllWeekdays' 
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] 
    : [weekday];

  const supabase = window.supabaseClient;
  const schedulesToInsert = weekdays.map(day => ({
    employeeId: employeeId, // Can be null if employee is not specified
    weekday: day,
    startTime: startTime,
    endTime: endTime,
    subject: subject,
    sectId: sectId
  }));

  const { error } = await supabase
    .from('schedule')
    .insert(schedulesToInsert);

  if (error) {
    console.error('Error saving schedule:', error);
    alert('Failed to save schedule');
    return;
  }

  // Add new subject to the datalist if it doesn't exist
  const subjectDatalist = document.getElementById('subjectList');
  const existingOptions = Array.from(subjectDatalist.options).map(opt => opt.value);
  if (!existingOptions.includes(subject)) {
    const newOption = document.createElement('option');
    newOption.value = subject;
    subjectDatalist.appendChild(newOption);
  }

  document.getElementById('addStartTime').value = '';
  document.getElementById('addEndTime').value = '';
  document.getElementById('addSubject').value = '';
  loadSectionSchedule();
};

// Toggle Export Menu
window.toggleExportMenu = function() {
  const exportMenu = document.getElementById('exportMenu');
  if (exportMenu) {
    exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
  }
};

// Toggle Import Menu
window.toggleImportScheduleMenu = function() {
  const importMenu = document.getElementById('importScheduleMenu');
  if (importMenu) {
    importMenu.style.display = importMenu.style.display === 'none' ? 'block' : 'none';
  }
};

// Export all schedules to CSV
window.exportAllSchedulesCSV = function() {
  if (!window.currentSchedules || window.currentSchedules.length === 0) {
    alert('No schedules to export');
    return;
  }
  
  const headers = ['Weekday', 'Start Time', 'End Time', 'Subject', 'Teacher'];
  const rows = [headers.join(',')];
  
  window.currentSchedules.forEach(schedule => {
    const weekday = schedule.weekday || '';
    const startTime = schedule.startTime || '';
    const endTime = schedule.endTime || '';
    const subject = String(schedule.subject || '').includes(',') ? `"${schedule.subject}"` : schedule.subject || '';
    const teacher = schedule.user_employee_data?.name || '-';
    rows.push(`${weekday},${startTime},${endTime},${subject},${teacher}`);
  });
  
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_data_full.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toggleExportMenu();
};

// Export all schedules to JSON
window.exportAllSchedulesJSON = function() {
  if (!window.currentSchedules || window.currentSchedules.length === 0) {
    alert('No schedules to export');
    return;
  }
  
  const exportData = window.currentSchedules.map(schedule => ({
    weekday: schedule.weekday || '',
    startTime: schedule.startTime || '',
    endTime: schedule.endTime || '',
    subject: schedule.subject || '',
    teacher: schedule.user_employee_data?.name || '-'
  }));
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_data_full.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toggleExportMenu();
};

// Export selected schedules to CSV
window.exportSelectedSchedulesCSV = function() {
  if (selectedSchedules.size === 0) {
    alert('No rows selected');
    return;
  }
  
  const selectedData = window.currentSchedules.filter(s => selectedSchedules.has(s.schedId));
  const headers = ['Weekday', 'Start Time', 'End Time', 'Subject', 'Teacher'];
  const rows = [headers.join(',')];
  
  selectedData.forEach(schedule => {
    const weekday = schedule.weekday || '';
    const startTime = schedule.startTime || '';
    const endTime = schedule.endTime || '';
    const subject = String(schedule.subject || '').includes(',') ? `"${schedule.subject}"` : schedule.subject || '';
    const teacher = schedule.user_employee_data?.name || '-';
    rows.push(`${weekday},${startTime},${endTime},${subject},${teacher}`);
  });
  
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_selected_data.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export selected schedules to JSON
window.exportSelectedSchedulesJSON = function() {
  if (selectedSchedules.size === 0) {
    alert('No rows selected');
    return;
  }
  
  const selectedData = window.currentSchedules.filter(s => selectedSchedules.has(s.schedId));
  const exportData = selectedData.map(schedule => ({
    weekday: schedule.weekday || '',
    startTime: schedule.startTime || '',
    endTime: schedule.endTime || '',
    subject: schedule.subject || '',
    teacher: schedule.user_employee_data?.name || '-'
  }));
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_selected_data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Import schedules from CSV
window.importSchedulesFromCSV = function() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  fileInput.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const csvContent = await file.text();
      const rows = parseCSV(csvContent);
      await importSchedulesFromData(rows, 'CSV');
    } catch (err) {
      console.error('CSV import error', err);
      alert('Failed to import CSV');
    }
    fileInput.value = '';
  };
  
  fileInput.click();
};

// Import schedules from JSON
window.importSchedulesFromJSON = function() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  fileInput.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const jsonContent = await file.text();
      const data = JSON.parse(jsonContent);
      const rows = Array.isArray(data) ? data : [data];
      await importSchedulesFromData(rows, 'JSON');
    } catch (err) {
      console.error('JSON import error', err);
      alert('Failed to import JSON');
    }
    fileInput.value = '';
  };
  
  fileInput.click();
};

function parseCSV(content) {
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

async function importSchedulesFromData(rows, sourceType) {
  if (!rows || rows.length === 0) {
    alert('No data found in file');
    return;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const sectId = urlParams.get('sectId');
  
  if (!sectId) {
    alert('No section ID found');
    return;
  }
  
  const firstRowLower = rows[0].map(h => String(h).toLowerCase().trim());
  const headerKeywords = ['weekday', 'start', 'end', 'time', 'subject', 'teacher', 'employee'];
  const hasHeaders = firstRowLower.some(cell => headerKeywords.some(keyword => cell.includes(keyword)));
  
  let dataRows = rows;
  
  if (hasHeaders) {
    dataRows = rows.slice(1);
  }
  
  const schedulesToInsert = [];
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length < 3) continue;
    
    const schedule = {
      sectId: sectId,
      weekday: row[0] || 'Monday',
      startTime: row[1] || '',
      endTime: row[2] || '',
      subject: row[3] || ''
    };
    
    if (schedule.startTime && schedule.endTime && schedule.subject) {
      schedulesToInsert.push(schedule);
    }
  }
  
  if (schedulesToInsert.length === 0) {
    alert('No valid schedules to import');
    return;
  }
  
  try {
    const supabase = window.supabaseClient;
    const { error } = await supabase
      .from('schedule')
      .insert(schedulesToInsert);
    
    if (error) throw error;
    
    alert(`Successfully imported ${schedulesToInsert.length} schedule(s)`);
    loadSectionSchedule();
  } catch (err) {
    console.error('Error importing schedules:', err);
    alert('Failed to import schedules');
  }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
  const importBtn = document.getElementById('importScheduleBtn');
  const importMenu = document.getElementById('importScheduleMenu');
  const exportBtn = document.getElementById('exportBtn');
  const exportMenu = document.getElementById('exportMenu');
  
  if (importBtn && importMenu && !importBtn.contains(event.target) && !importMenu.contains(event.target)) {
    importMenu.style.display = 'none';
  }
  if (exportBtn && exportMenu && !exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
    exportMenu.style.display = 'none';
  }
});

loadSectionSchedule();
