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
                <th>Section</th>
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
          <td class="time-col" id="startTime-${schedule.schedId}">${schedule.startTime || '-'}</td>
          <td class="time-col" id="endTime-${schedule.schedId}">${schedule.endTime || '-'}</td>
          <td class="subject-col" id="subject-${schedule.schedId}">${schedule.subject || '-'}</td>
          <td class="section-col" id="section-${schedule.schedId}">${sectionsMap[schedule.sectId] || '-'}</td>
          <td class="actions-col">
            <div class="action-buttons" id="actions-${schedule.schedId}">
              <button class="btn-icon edit-btn" onclick="window.editSchedule('${schedule.schedId}')" title="Edit Schedule">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon delete-btn" onclick="window.deleteSchedule('${schedule.schedId}')" title="Delete Schedule">
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
  }

  window.toggleUserSelection = function(schedId) {
    updateSelectAllState();
  };

  function updateSelectAllState() {
    const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
    const selectionActionRow = document.getElementById('selectionActionRow');
    const selectedCount = document.getElementById('selectedCount');
    
    const hasSelection = checkedBoxes.length > 0;
    if (hasSelection) {
      if (selectionActionRow) {
        selectionActionRow.style.display = 'flex';
        if (selectedCount) {
          selectedCount.textContent = checkedBoxes.length;
        }
      }
      
      // Get selected IDs
      const selectedIds = [];
      checkedBoxes.forEach(cb => selectedIds.push(cb.value));
      
      // Change Add button to Update
      const saveBtn = document.querySelector('.add-user-btn');
      if (saveBtn && !saveBtn.classList.contains('update-mode')) {
        saveBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Update';
        saveBtn.onclick = function() { window.updateSelectedSchedules(); };
        saveBtn.classList.add('update-mode');
      }
      
      // Populate form with first selected schedule if single selection
      if (selectedIds.length === 1) {
        const schedule = window.currentSchedules.find(s => s.schedId === selectedIds[0]);
        if (schedule) {
          document.getElementById('addWeekday').value = schedule.weekday;
          document.getElementById('addStartTime').value = schedule.startTime;
          document.getElementById('addEndTime').value = schedule.endTime;
          document.getElementById('addSubject').value = schedule.subject || '';
          document.getElementById('addSection').value = schedule.sectId;
        }
      } else {
        // Multiple selection - clear form
        document.getElementById('addWeekday').value = 'Monday';
        document.getElementById('addStartTime').value = '';
        document.getElementById('addEndTime').value = '';
        document.getElementById('addSubject').value = '';
      }
    } else {
      if (selectionActionRow) {
        selectionActionRow.style.display = 'none';
      }
      // Change Update button back to Add
      const saveBtn = document.querySelector('.add-user-btn');
      if (saveBtn && saveBtn.classList.contains('update-mode')) {
        saveBtn.innerHTML = '<span class="material-symbols-outlined">add</span> Add';
        saveBtn.onclick = window.saveSchedule;
        saveBtn.classList.remove('update-mode');
      }
    }
  }

  window.toggleSelectAll = function() {
    // Only clear all selections (unselect all)
    clearSelection();
  };

  window.clearSelection = function() {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectAllState();
  };

  window.deleteSelectedSchedules = async function() {
    const selectedIds = [];
    document.querySelectorAll('.user-checkbox:checked').forEach(cb => {
      selectedIds.push(cb.value);
    });
    
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} schedule(s)?`)) return;
    
    try {
      for (const schedId of selectedIds) {
        const { error } = await supabase
          .from(SCHEDULE_TABLE)
          .delete()
          .eq('schedId', schedId);
        
        if (error) throw error;
      }
      
      clearSelection();
      loadScheduleDetails();
    } catch (err) {
      console.error('Error deleting schedules:', err);
      alert('Failed to delete schedules');
    }
  };

  window.editSelectedSchedules = function() {
    const selectedIds = [];
    document.querySelectorAll('.user-checkbox:checked').forEach(cb => {
      selectedIds.push(cb.value);
    });
    
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    // Store selected IDs for update
    window.selectedScheduleIds = selectedIds;
    
    if (selectedIds.length === 1) {
      // Single selection - populate form with that schedule's data
      const schedule = window.currentSchedules.find(s => s.schedId === selectedIds[0]);
      if (!schedule) return;
      
      document.getElementById('addWeekday').value = schedule.weekday;
      document.getElementById('addStartTime').value = schedule.startTime;
      document.getElementById('addEndTime').value = schedule.endTime;
      document.getElementById('addSubject').value = schedule.subject || '';
      document.getElementById('addSection').value = schedule.sectId;
      
      // Change button to Update
      const saveBtn = document.querySelector('.add-user-btn');
      saveBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Update';
      saveBtn.onclick = function() { window.updateSelectedSchedules(); };
    } else {
      // Multiple selection - clear form but allow setting new values
      document.getElementById('addWeekday').value = 'Monday';
      document.getElementById('addStartTime').value = '';
      document.getElementById('addEndTime').value = '';
      document.getElementById('addSubject').value = '';
      
      // Change button to Update Selected
      const saveBtn = document.querySelector('.add-user-btn');
      saveBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Update Selected';
      saveBtn.onclick = function() { window.updateSelectedSchedules(); };
      
      alert(`${selectedIds.length} schedules selected. Fill in the fields you want to update and click 'Update Selected'. Leave fields empty to keep existing values.`);
    }
    
    // Scroll to form
    document.querySelector('.add-schedule-form').scrollIntoView({ behavior: 'smooth' });
  };

  window.updateSelectedSchedules = async function() {
    const selectedIds = [];
    document.querySelectorAll('.user-checkbox:checked').forEach(cb => {
      selectedIds.push(cb.value);
    });
    
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    const weekday = document.getElementById('addWeekday').value;
    const startTime = document.getElementById('addStartTime').value;
    const endTime = document.getElementById('addEndTime').value;
    const subject = document.getElementById('addSubject').value;
    const sectId = document.getElementById('addSection').value;

    // Build update object - only include non-empty fields
    const updateData = {};
    if (weekday) updateData.weekday = weekday;
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (subject) updateData.subject = subject;
    if (sectId) updateData.sectId = sectId;

    if (Object.keys(updateData).length === 0) {
      alert('Please fill in at least one field to update');
      return;
    }

    try {
      for (const schedId of selectedIds) {
        const { error } = await supabase
          .from(SCHEDULE_TABLE)
          .update(updateData)
          .eq('schedId', schedId);
        
        if (error) throw error;
      }

      // Reset form
      document.getElementById('addStartTime').value = '';
      document.getElementById('addEndTime').value = '';
      document.getElementById('addSubject').value = '';
      
      // Clear selection and reset button to Add
      clearSelection();
      loadScheduleDetails();
    } catch (err) {
      console.error('Error updating schedules:', err);
      alert('Failed to update schedules');
    }
  };

  window.editSchedule = function(schedId) {
    const schedule = window.currentSchedules.find(s => s.schedId === schedId);
    if (!schedule) return;
    
    const row = document.getElementById(`row-${schedId}`);
    if (!row) return;
    
    // Store original values
    row.dataset.originalSubject = schedule.subject || '';
    row.dataset.originalStartTime = schedule.startTime || '';
    row.dataset.originalEndTime = schedule.endTime || '';
    row.dataset.originalSectId = schedule.sectId || '';
    
    // Create time inputs
    const startTimeCell = document.getElementById(`startTime-${schedId}`);
    startTimeCell.innerHTML = `
      <input type="time" class="edit-input" id="edit-startTime-${schedId}" value="${schedule.startTime || ''}">
    `;
    
    const endTimeCell = document.getElementById(`endTime-${schedId}`);
    endTimeCell.innerHTML = `
      <input type="time" class="edit-input" id="edit-endTime-${schedId}" value="${schedule.endTime || ''}">
    `;
    
    // Create subject input
    const subjectCell = document.getElementById(`subject-${schedId}`);
    subjectCell.innerHTML = `
      <input type="text" class="edit-input" id="edit-subject-${schedId}" value="${schedule.subject || ''}" placeholder="Subject">
    `;
    
    // Create section dropdown
    const sectionCell = document.getElementById(`section-${schedId}`);
    const sectionOptions = allSections.map(s => 
      `<option value="${s.sectId}" ${s.sectId === schedule.sectId ? 'selected' : ''}>${s.sectionName}</option>`
    ).join('');
    
    sectionCell.innerHTML = `
      <select class="edit-select" id="edit-sectId-${schedId}">
        ${sectionOptions}
      </select>
    `;
    
    // Hide edit buttons, show save/cancel
    document.getElementById(`actions-${schedId}`).style.display = 'none';
    document.getElementById(`edit-actions-${schedId}`).style.display = 'flex';
  };

  window.cancelEditSchedule = function(schedId) {
    const row = document.getElementById(`row-${schedId}`);
    if (!row) return;
    
    const schedule = window.currentSchedules.find(s => s.schedId === schedId);
    if (!schedule) return;
    
    const sectionsMap = {};
    allSections.forEach(section => {
      sectionsMap[section.sectId] = section.sectionName;
    });
    
    // Restore values
    const startTimeCell = document.getElementById(`startTime-${schedId}`);
    startTimeCell.textContent = schedule.startTime || '-';
    
    const endTimeCell = document.getElementById(`endTime-${schedId}`);
    endTimeCell.textContent = schedule.endTime || '-';
    
    const subjectCell = document.getElementById(`subject-${schedId}`);
    subjectCell.textContent = schedule.subject || '-';
    
    const sectionCell = document.getElementById(`section-${schedId}`);
    sectionCell.textContent = sectionsMap[schedule.sectId] || '-';
    
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
    const sectId = document.getElementById(`edit-sectId-${schedId}`).value;
    
    try {
      const { error } = await supabase
        .from(SCHEDULE_TABLE)
        .update({
          subject: subject,
          startTime: startTime,
          endTime: endTime,
          sectId: sectId
        })
        .eq('schedId', schedId);
      
      if (error) throw error;
      
      // Reload the schedule details
      loadScheduleDetails();
    } catch (err) {
      console.error('Error updating schedule:', err);
      alert('Failed to update schedule');
    }
  };

  window.deleteSchedule = async function(schedId) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      const { error } = await supabase
        .from(SCHEDULE_TABLE)
        .delete()
        .eq('schedId', schedId);
      
      if (error) throw error;
      
      loadScheduleDetails();
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert('Failed to delete schedule');
    }
  };

  window.deleteSelectedSchedules = async function() {
    const selectedIds = [];
    document.querySelectorAll('.user-checkbox:checked').forEach(cb => {
      selectedIds.push(cb.value);
    });
    
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} schedule(s)?`)) return;
    
    try {
      for (const schedId of selectedIds) {
        const { error } = await supabase
          .from(SCHEDULE_TABLE)
          .delete()
          .eq('schedId', schedId);
        
        if (error) throw error;
      }
      
      clearSelection();
      loadScheduleDetails();
    } catch (err) {
      console.error('Error deleting schedules:', err);
      alert('Failed to delete schedules');
    }
  };

  window.exportSelectedSchedulesCSV = function() {
    const selectedIds = [];
    document.querySelectorAll('.user-checkbox:checked').forEach(cb => {
      selectedIds.push(cb.value);
    });
    
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    const selectedData = window.currentSchedules.filter(s => selectedIds.includes(s.schedId));
    const headers = ['Weekday', 'Start Time', 'End Time', 'Subject', 'Section'];
    const rows = [headers.join(',')];
    
    const sectionsMap = {};
    allSections.forEach(section => {
      sectionsMap[section.sectId] = section.sectionName;
    });
    
    selectedData.forEach(schedule => {
      const weekday = schedule.weekday || '';
      const startTime = schedule.startTime || '';
      const endTime = schedule.endTime || '';
      const subject = String(schedule.subject || '').includes(',') ? `"${schedule.subject}"` : schedule.subject || '';
      const section = sectionsMap[schedule.sectId] || '';
      rows.push(`${weekday},${startTime},${endTime},${subject},${section}`);
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedules_selected_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.exportSelectedSchedulesJSON = function() {
    const selectedIds = [];
    document.querySelectorAll('.user-checkbox:checked').forEach(cb => {
      selectedIds.push(cb.value);
    });
    
    if (selectedIds.length === 0) {
      alert('No rows selected');
      return;
    }
    
    const selectedData = window.currentSchedules.filter(s => selectedIds.includes(s.schedId));
    const sectionsMap = {};
    allSections.forEach(section => {
      sectionsMap[section.sectId] = section.sectionName;
    });
    
    const exportData = selectedData.map(schedule => ({
      weekday: schedule.weekday || '',
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      subject: schedule.subject || '',
      section: sectionsMap[schedule.sectId] || ''
    }));
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedules_selected_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        console.error('schedule_detail: CSV import error', err);
        alert('Failed to import CSV');
      }
      fileInput.value = '';
    };
    
    fileInput.click();
  };

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
        console.error('schedule_detail: JSON import error', err);
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
    const employeeId = urlParams.get('employeeId');
    
    if (!employeeId) {
      alert('No employee ID found');
      return;
    }
    
    const firstRowLower = rows[0].map(h => String(h).toLowerCase().trim());
    const headerKeywords = ['weekday', 'start', 'end', 'time', 'subject', 'section'];
    const hasHeaders = firstRowLower.some(cell => headerKeywords.some(keyword => cell.includes(keyword)));
    
    let dataRows = rows;
    let headers = [];
    
    if (hasHeaders) {
      headers = rows[0];
      dataRows = rows.slice(1);
    } else {
      headers = ['weekday', 'startTime', 'endTime', 'subject', 'sectId'];
    }
    
    const schedulesToInsert = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (row.length < 3) continue;
      
      const schedule = {
        employeeId: employeeId,
        weekday: row[0] || 'Monday',
        startTime: row[1] || '',
        endTime: row[2] || '',
        subject: row[3] || '',
        sectId: row[4] || ''
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
      const { error } = await supabase
        .from(SCHEDULE_TABLE)
        .insert(schedulesToInsert);
      
      if (error) throw error;
      
      alert(`Successfully imported ${schedulesToInsert.length} schedule(s)`);
      loadScheduleDetails();
    } catch (err) {
      console.error('Error importing schedules:', err);
      alert('Failed to import schedules');
    }
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

    // Handle "All Weekdays" option
    const weekdays = weekday === 'AllWeekdays' 
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] 
      : [weekday];

    try {
      const schedulesToInsert = weekdays.map(day => ({
        employeeId: employeeId,
        weekday: day,
        startTime: startTime,
        endTime: endTime,
        subject: subject,
        sectId: sectId
      }));

      const { error } = await supabase
        .from(SCHEDULE_TABLE)
        .insert(schedulesToInsert);

      if (error) throw error;

      document.getElementById('addStartTime').value = '';
      document.getElementById('addEndTime').value = '';
      document.getElementById('addSubject').value = '';
      
      // Reset button to Add
      const saveBtn = document.querySelector('.add-user-btn');
      saveBtn.innerHTML = '<span class="material-symbols-outlined">add</span> Add';
      saveBtn.onclick = window.saveSchedule;
      
      loadScheduleDetails();
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert('Failed to save schedule');
    }
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

    try {
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

      if (error) throw error;

      // Reset form and button
      document.getElementById('addStartTime').value = '';
      document.getElementById('addEndTime').value = '';
      document.getElementById('addSubject').value = '';
      
      const saveBtn = document.querySelector('.add-user-btn');
      saveBtn.innerHTML = '<span class="material-symbols-outlined">add</span> Add';
      saveBtn.onclick = window.saveSchedule;
      
      loadScheduleDetails();
    } catch (err) {
      console.error('Error updating schedule:', err);
      alert('Failed to update schedule');
    }
  };

  window.toggleImportScheduleMenu = function() {
    const importMenu = document.getElementById('importScheduleMenu');
    const importBtn = document.getElementById('importScheduleBtn');
    if (importMenu) {
      importMenu.style.display = importMenu.style.display === 'none' ? 'block' : 'none';
    }
  };

  window.toggleExportMenu = function() {
    const exportMenu = document.getElementById('exportMenu');
    if (exportMenu) {
      exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
    }
  };

  window.exportAllSchedulesCSV = function() {
    if (!window.currentSchedules || window.currentSchedules.length === 0) {
      alert('No schedules to export');
      return;
    }
    
    const headers = ['Weekday', 'Start Time', 'End Time', 'Subject', 'Section'];
    const rows = [headers.join(',')];
    
    const sectionsMap = {};
    allSections.forEach(section => {
      sectionsMap[section.sectId] = section.sectionName;
    });
    
    window.currentSchedules.forEach(schedule => {
      const weekday = schedule.weekday || '';
      const startTime = schedule.startTime || '';
      const endTime = schedule.endTime || '';
      const subject = String(schedule.subject || '').includes(',') ? `"${schedule.subject}"` : schedule.subject || '';
      const section = sectionsMap[schedule.sectId] || '';
      rows.push(`${weekday},${startTime},${endTime},${subject},${section}`);
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedules_data_full.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toggleExportMenu();
  };

  window.exportAllSchedulesJSON = function() {
    if (!window.currentSchedules || window.currentSchedules.length === 0) {
      alert('No schedules to export');
      return;
    }
    
    const sectionsMap = {};
    allSections.forEach(section => {
      sectionsMap[section.sectId] = section.sectionName;
    });
    
    const exportData = window.currentSchedules.map(schedule => ({
      weekday: schedule.weekday || '',
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      subject: schedule.subject || '',
      section: sectionsMap[schedule.sectId] || ''
    }));
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedules_data_full.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toggleExportMenu();
  };

  // Close dropdown when clicking outside
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

  loadScheduleDetails();
});
