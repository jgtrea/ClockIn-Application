const urlParams = new URLSearchParams(window.location.search);
const sectId = urlParams.get('sectId');
const sectionName = urlParams.get('sectionName');

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let allEmployees = [];
let selectMode = false;
let selectedSchedules = new Set();

function toggleSelectMode() {
  selectMode = !selectMode;
  const btn = document.getElementById('selectModeBtn');
  const actionContainer = document.getElementById('actionButtonsContainer');
  
  if (selectMode) {
    btn.innerHTML = '<span class="material-symbols-outlined">close</span> Cancel';
    btn.style.background = '#fee2e2';
    btn.style.borderColor = '#fecaca';
    btn.style.color = '#dc2626';
    actionContainer.style.display = 'flex';
  } else {
    btn.innerHTML = '<span class="material-symbols-outlined">checklist</span> Select Mode';
    btn.style.background = 'white';
    btn.style.borderColor = '#e2e8f0';
    btn.style.color = '#64748b';
    actionContainer.style.display = 'none';
    selectedSchedules.clear();
    
    // Reset the Add form button to original state
    const saveBtn = document.querySelector('.export-btn');
    if (saveBtn) {
      saveBtn.innerHTML = '<span class="material-symbols-outlined">add</span> Add';
      saveBtn.onclick = window.saveSchedule;
    }
    
    // Clear the form fields
    document.getElementById('addStartTime').value = '';
    document.getElementById('addEndTime').value = '';
    document.getElementById('addSubject').value = '';
  }
  
  renderSchedule(window.currentSchedules || []);
}

function handleScheduleSelect(schedId, checked) {
  if (checked) {
    selectedSchedules.add(schedId);
  } else {
    selectedSchedules.delete(schedId);
  }
  updateActionButtons();
}

function updateActionButtons() {
  const count = selectedSchedules.size;
  const selectionCount = document.getElementById('selectionCount');
  const btnEdit = document.getElementById('btnEdit');
  const btnRemoveTeacher = document.getElementById('btnRemoveTeacher');
  const btnDelete = document.getElementById('btnDelete');
  
  selectionCount.textContent = `${count} selected`;
  
  if (count === 1) {
    btnEdit.style.display = 'flex';
    btnRemoveTeacher.style.display = 'flex';
    btnDelete.style.display = 'flex';
  } else if (count > 1) {
    btnEdit.style.display = 'none';
    btnRemoveTeacher.style.display = 'flex';
    btnDelete.style.display = 'flex';
  } else {
    btnEdit.style.display = 'none';
    btnRemoveTeacher.style.display = 'none';
    btnDelete.style.display = 'none';
  }
}

function getSelectedScheduleIds() {
  return Array.from(selectedSchedules);
}

window.editSelectedSchedule = function() {
  const selectedIds = getSelectedScheduleIds();
  if (selectedIds.length !== 1) return;
  
  const scheduleId = selectedIds[0];
  const schedule = window.currentSchedules.find(s => s.schedId === scheduleId);
  if (!schedule) return;
  
  // Populate the form with schedule data
  document.getElementById('addEmployee').value = schedule.employeeId || '';
  document.getElementById('addWeekday').value = schedule.weekday;
  document.getElementById('addStartTime').value = schedule.startTime;
  document.getElementById('addEndTime').value = schedule.endTime;
  document.getElementById('addSubject').value = schedule.subject || '';
  
  // Change the save button to update
  const saveBtn = document.querySelector('.export-btn');
  saveBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Update';
  saveBtn.onclick = function() { updateSchedule(scheduleId); };
  
  // Scroll to form
  document.querySelector('.add-schedule-form').scrollIntoView({ behavior: 'smooth' });
};

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
  
  // Exit select mode
  toggleSelectMode();
  loadSectionSchedule();
}

window.removeTeacherFromSelected = async function() {
  const selectedIds = getSelectedScheduleIds();
  if (selectedIds.length === 0) return;
  
  const confirmMsg = selectedIds.length === 1 
    ? 'Are you sure you want to remove the teacher from this schedule?'
    : `Are you sure you want to remove the teacher from ${selectedIds.length} schedules?`;
  
  if (!confirm(confirmMsg)) return;

  const supabase = window.supabaseClient;
  
  for (const scheduleId of selectedIds) {
    const { error } = await supabase
      .from('schedule')
      .update({ employeeId: null })
      .eq('schedId', scheduleId);
    
    if (error) {
      console.error('Error removing teacher:', error);
    }
  }
  
  // Exit select mode
  toggleSelectMode();
  loadSectionSchedule();
};

window.deleteSelectedSchedules = async function() {
  const selectedIds = getSelectedScheduleIds();
  if (selectedIds.length === 0) return;
  
  const confirmMsg = selectedIds.length === 1
    ? 'Are you sure you want to delete this schedule?'
    : `Are you sure you want to delete ${selectedIds.length} schedules? This action cannot be undone.`;
  
  if (!confirm(confirmMsg)) return;

  const supabase = window.supabaseClient;
  
  for (const scheduleId of selectedIds) {
    const { error } = await supabase
      .from('schedule')
      .delete()
      .eq('schedId', scheduleId);
    
    if (error) {
      console.error('Error deleting schedule:', error);
    }
  }
  
  // Exit select mode
  toggleSelectMode();
  loadSectionSchedule();
};

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
}

function renderSchedule(schedules) {
  const container = document.getElementById('scheduleDetailContainer');
  container.innerHTML = '';
  window.currentSchedules = schedules;

  if (!schedules || schedules.length === 0) {
    container.innerHTML = '<div class="no-records">No schedules found for this section.</div>';
    return;
  }

  const groupedByDay = {};
  dayOrder.forEach(day => groupedByDay[day] = []);

  schedules.forEach(schedule => {
    if (groupedByDay[schedule.weekday]) {
      groupedByDay[schedule.weekday].push(schedule);
    }
  });

  dayOrder.forEach(day => {
    const daySchedules = groupedByDay[day];
    if (daySchedules.length === 0) return;

    const dayCard = document.createElement('div');
    dayCard.className = 'day-schedule-card';
    
    dayCard.innerHTML = `
      <div class="day-header">
        <h3>${day}</h3>
        <span class="schedule-count">${daySchedules.length} class${daySchedules.length > 1 ? 'es' : ''}</span>
      </div>
      <div class="schedule-items">
        ${daySchedules.map(schedule => `
          <div class="schedule-item ${selectMode ? 'select-mode' : ''}" data-sched-id="${schedule.schedId}">
            <div class="schedule-checkbox ${selectMode ? 'visible' : ''}">
              <input type="checkbox" 
                id="checkbox-${schedule.schedId}" 
                ${selectedSchedules.has(schedule.schedId) ? 'checked' : ''}
                onchange="handleScheduleSelect('${schedule.schedId}', this.checked)">
            </div>
            <div class="time-badge">
              <span class="material-symbols-outlined">schedule</span>
              ${schedule.startTime} - ${schedule.endTime}
            </div>
            <div class="schedule-details">
              <div class="subject-name">${schedule.subject || 'No Subject'}</div>
              <div class="section-name">
                <span class="material-symbols-outlined">person</span>
                ${schedule.user_employee_data?.name || 'No Teacher Assigned'}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    container.appendChild(dayCard);
  });
}

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
