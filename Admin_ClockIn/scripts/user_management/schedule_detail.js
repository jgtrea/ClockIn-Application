document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabaseClient;
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get('employeeId');

  if (!employeeId) {
    alert('No employee ID provided');
    window.location.href = 'schedule_db.html';
    return;
  }

  const USERS_TABLE = 'user_employee_data';
  const SCHEDULE_TABLE = 'schedule';
  const SECTIONS_TABLE = 'sections';

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let allSections = [];
  let selectMode = false;
  let selectedSchedules = new Set();

  window.toggleSelectMode = function() {
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
    
    loadScheduleDetails();
  };

  window.handleScheduleSelect = function(schedId, checked) {
    if (checked) {
      selectedSchedules.add(schedId);
    } else {
      selectedSchedules.delete(schedId);
    }
    updateActionButtons();
  };

  function updateActionButtons() {
    const count = selectedSchedules.size;
    const selectionCount = document.getElementById('selectionCount');
    const btnEdit = document.getElementById('btnEdit');
    const btnDelete = document.getElementById('btnDelete');
    
    selectionCount.textContent = `${count} selected`;
    
    if (count === 1) {
      btnEdit.style.display = 'flex';
      btnDelete.style.display = 'flex';
    } else if (count > 1) {
      btnEdit.style.display = 'none';
      btnDelete.style.display = 'flex';
    } else {
      btnEdit.style.display = 'none';
      btnDelete.style.display = 'none';
    }
  }

  window.getSelectedScheduleIds = function() {
    return Array.from(selectedSchedules);
  };

  window.editSelectedSchedule = function() {
    const selectedIds = window.getSelectedScheduleIds();
    if (selectedIds.length !== 1) return;
    
    const scheduleId = selectedIds[0];
    const schedule = window.currentSchedules.find(s => s.schedId === scheduleId);
    if (!schedule) return;
    
    // Populate the form with schedule data
    document.getElementById('addWeekday').value = schedule.weekday;
    document.getElementById('addStartTime').value = schedule.startTime;
    document.getElementById('addEndTime').value = schedule.endTime;
    document.getElementById('addSubject').value = schedule.subject || '';
    document.getElementById('addSection').value = schedule.sectId;
    
    // Change the save button to update
    const saveBtn = document.querySelector('.export-btn');
    saveBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Update';
    saveBtn.onclick = function() { updateSchedule(scheduleId); };
    
    // Scroll to form
    document.querySelector('.add-schedule-form').scrollIntoView({ behavior: 'smooth' });
  };

  window.updateSchedule = async function(scheduleId) {
    const weekday = document.getElementById('addWeekday').value;
    const startTime = document.getElementById('addStartTime').value;
    const endTime = document.getElementById('addEndTime').value;
    const subject = document.getElementById('addSubject').value;
    const sectId = document.getElementById('addSection').value;

    if (!startTime || !endTime || !subject) {
      alert('Please fill in all fields');
      return;
    }

    const { error } = await supabase
      .from(SCHEDULE_TABLE)
      .update({
        weekday: weekday,
        startTime: startTime,
        endTime: endTime,
        subject: subject,
        sectId: sectId
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
    window.toggleSelectMode();
    loadScheduleDetails();
  };

  window.deleteSelectedSchedules = async function() {
    const selectedIds = window.getSelectedScheduleIds();
    if (selectedIds.length === 0) return;
    
    const confirmMsg = selectedIds.length === 1
      ? 'Are you sure you want to remove this schedule from the employee?'
      : `Are you sure you want to remove ${selectedIds.length} schedules from the employee? The schedule records will remain but the employee will be unassigned.`;
    
    if (!confirm(confirmMsg)) return;

    for (const scheduleId of selectedIds) {
      const { error } = await supabase
        .from(SCHEDULE_TABLE)
        .update({ employeeId: null })
        .eq('schedId', scheduleId);
      
      if (error) {
        console.error('Error removing schedule from employee:', error);
      }
    }
    
    // Exit select mode
    window.toggleSelectMode();
    loadScheduleDetails();
  };

  async function loadScheduleDetails() {
    try {
      const { data: userData, error: userError } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('employeeId', employeeId)
        .single();

      if (userError) throw userError;

      document.getElementById('userName').textContent = `${userData.name || 'User'}'s Schedule`;
      document.getElementById('userEmail').textContent = userData.email || '';

      const { data: scheduleData, error: scheduleError } = await supabase
        .from(SCHEDULE_TABLE)
        .select('*')
        .eq('employeeId', employeeId);

      if (scheduleError) throw scheduleError;

      const { data: sectionsData, error: sectionsError } = await supabase
        .from(SECTIONS_TABLE)
        .select('*');

      if (sectionsError) throw sectionsError;
      allSections = sectionsData;

      const sectionsMap = {};
      sectionsData.forEach(section => {
        sectionsMap[section.sectId] = section.sectionName;
      });

      const sectionSelect = document.getElementById('addSection');
      sectionSelect.innerHTML = allSections.map(s => `<option value="${s.sectId}">${s.sectionName}</option>`).join('');

      scheduleData.sort((a, b) => {
        const dayA = dayOrder.indexOf(a.weekday);
        const dayB = dayOrder.indexOf(b.weekday);
        if (dayA !== dayB) return dayA - dayB;
        return a.startTime.localeCompare(b.startTime);
      });

      renderSchedule(scheduleData, sectionsMap);
    } catch (err) {
      console.error('Error loading schedule details:', err);
    }
  }

  function renderSchedule(schedules, sectionsMap) {
    const scheduleContainer = document.getElementById('scheduleDetailContainer');
    scheduleContainer.innerHTML = '';
    window.currentSchedules = schedules;

    if (!schedules || schedules.length === 0) {
      scheduleContainer.innerHTML = '<div class="no-records">No schedule records found.</div>';
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
                <div class="subject-name">${schedule.subject || '-'}</div>
                <div class="section-name">
                  <span class="material-symbols-outlined">group</span>
                  ${sectionsMap[schedule.sectId] || '-'}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      
      scheduleContainer.appendChild(dayCard);
    });
  }

  window.saveSchedule = async function() {
    const weekday = document.getElementById('addWeekday').value;
    const startTime = document.getElementById('addStartTime').value;
    const endTime = document.getElementById('addEndTime').value;
    const subject = document.getElementById('addSubject').value;
    const sectId = document.getElementById('addSection').value;

    if (!startTime || !endTime || !subject) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from(SCHEDULE_TABLE)
        .insert([{
          employeeId: employeeId,
          weekday: weekday,
          startTime: startTime,
          endTime: endTime,
          subject: subject,
          sectId: sectId
        }]);

      if (error) throw error;

      document.getElementById('addStartTime').value = '';
      document.getElementById('addEndTime').value = '';
      document.getElementById('addSubject').value = '';
      loadScheduleDetails();
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert('Failed to save schedule');
    }
  };

  loadScheduleDetails();
});
