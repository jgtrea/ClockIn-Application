document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabaseClient;
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get('employeeId');

  if (!employeeId) {
    alert('No employee ID provided');
    window.location.href = 'attendance_db.html';
    return;
  }

  function parseDatabaseTimestamp(timestamp) {
    if (!timestamp) return null;
    
    if (timestamp instanceof Date) return timestamp;
    
    const timestampStr = String(timestamp);
    
    const hasTimezone = /[+-]\d{2}:?\d{2}$/.test(timestampStr);
    
    if (hasTimezone) {
      const dateTimePart = timestampStr.replace(/[+-]\d{2}:?\d{2}$/, '');
      
      const localTimestamp = dateTimePart.replace('T', ' ');
      
      const [datePart, timePart] = localTimestamp.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = (timePart || '00:00:00').split(':').map(Number);
      
      return new Date(year, month - 1, day, hours, minutes, seconds);
    } else {
      return new Date(timestampStr.replace('T', ' '));
    }
  }

  function formatTimeFromDB(timestamp) {
    if (!timestamp) return '';
    
    const date = parseDatabaseTimestamp(timestamp);
    if (!date || isNaN(date.getTime())) return '';
    
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function getDateFromDB(timestamp) {
    if (!timestamp) return null;
    
    const date = parseDatabaseTimestamp(timestamp);
    if (!date || isNaN(date.getTime())) return null;
    
    return date.toISOString().split('T')[0];
  }

  const USERS_TABLE = 'user_employee_data';
  const SCHEDULE_TABLE = 'schedule';
  const ATTENDANCE_TABLE = 'attendance';
  const SECTIONS_TABLE = 'sections';

  let currentDate = new Date();
  let allAttendance = [];
  let scheduleMap = {};
  let sectionsMap = {};
  
  // Storage key for original statuses
  const STORAGE_KEY = `attendance_original_status_${employeeId}`;

  // Load original statuses from localStorage
  function getOriginalStatuses() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Error loading original statuses:', e);
      return {};
    }
  }

  // Save original statuses to localStorage
  function saveOriginalStatuses(statuses) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
    } catch (e) {
      console.error('Error saving original statuses:', e);
    }
  }

  async function loadData() {
    try {
      const { data: userData, error: userError } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('employeeId', employeeId)
        .single();

      if (userError) throw userError;

      document.getElementById('userName').textContent = `${userData.name || 'User'}'s Attendance Records`;
      document.getElementById('userEmail').textContent = userData.email || '';

      const { data: attendanceData, error: attendanceError } = await supabase
        .from(ATTENDANCE_TABLE)
        .select('*')
        .eq('employeeId', employeeId);

      if (attendanceError) throw attendanceError;
      allAttendance = attendanceData || [];
      
      // Get original statuses from localStorage
      const originalStatuses = getOriginalStatuses();
      
      // For each record, ensure originalStatus is set
      // This could come from localStorage or from the current status
      let hasChanges = false;
      allAttendance.forEach(record => {
        const storedOriginal = originalStatuses[record.attendId];
        if (storedOriginal) {
          // Use the stored original status
          record.originalStatus = storedOriginal;
        } else {
          // If no stored original, use current status as original and save it
          record.originalStatus = record.status;
          originalStatuses[record.attendId] = record.status;
          hasChanges = true;
        }
      });
      
      // Save updated original statuses to localStorage if needed
      if (hasChanges) {
        saveOriginalStatuses(originalStatuses);
      }

      const { data: scheduleData, error: scheduleError } = await supabase
        .from(SCHEDULE_TABLE)
        .select('*')
        .eq('employeeId', employeeId);

      if (scheduleError) throw scheduleError;
      scheduleData.forEach(sched => {
        scheduleMap[sched.schedId] = sched;
      });

      const { data: sectionsData, error: sectionsError } = await supabase
        .from(SECTIONS_TABLE)
        .select('*');

      if (sectionsError) throw sectionsError;
      sectionsData.forEach(section => {
        sectionsMap[section.sectId] = section.sectionName;
      });

      renderCalendar();
      showMonthRecords();
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('currentMonth').textContent = 
      currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';

    for (let i = 0; i < startDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty';
      calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';
      dayCell.innerHTML = `<div class="day-number">${day}</div>`;
      dayCell.onclick = () => showDayRecords(date);
      calendarGrid.appendChild(dayCell);
    }
  }

  function showMonthRecords() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthRecords = allAttendance.filter(record => {
      const recordDate = parseDatabaseTimestamp(record.timeIn);
      return recordDate && recordDate.getFullYear() === year && recordDate.getMonth() === month;
    });

    const formattedRecords = monthRecords.map(record => {
      const schedule = scheduleMap[record.schedId] || {};
      return {
        attendId: record.attendId,
        date: parseDatabaseTimestamp(record.timeIn),
        timeIn: parseDatabaseTimestamp(record.timeIn),
        timeOut: record.timeOut ? parseDatabaseTimestamp(record.timeOut) : null,
        subject: schedule.subject,
        section: sectionsMap[schedule.sectId],
        status: record.status,
        originalStatus: record.originalStatus
      };
    });

    formattedRecords.sort((a, b) => b.date - a.date);

    renderRecords(formattedRecords, `${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
  }

  function showDayRecords(date) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdays[date.getDay()];
    const dateStr = date.toISOString().split('T')[0];
    
    const daySchedules = Object.values(scheduleMap).filter(s => s.weekday === weekday);
    
    const dayAttendance = allAttendance.filter(record => {
      const recordDate = parseDatabaseTimestamp(record.timeIn);
      if (!recordDate) return false;
      const recordDateStr = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate()).toISOString().split('T')[0];
      return recordDateStr === dateStr;
    });

    const attendanceBySchedule = {};
    dayAttendance.forEach(att => {
      attendanceBySchedule[att.schedId] = att;
    });

    const combinedRecords = [];
    const processedScheduleIds = new Set();
    
    daySchedules.forEach(schedule => {
      const attendance = attendanceBySchedule[schedule.schedId];
      processedScheduleIds.add(schedule.schedId);
      
      if (attendance) {
        combinedRecords.push({
          attendId: attendance.attendId,
          date: parseDatabaseTimestamp(attendance.timeIn),
          timeIn: parseDatabaseTimestamp(attendance.timeIn),
          timeOut: attendance.timeOut ? parseDatabaseTimestamp(attendance.timeOut) : null,
          subject: schedule.subject,
          section: sectionsMap[schedule.sectId],
          status: attendance.status,
          originalStatus: attendance.originalStatus
        });
      } else {
        combinedRecords.push({
          attendId: null,
          date: date,
          timeIn: null,
          timeOut: null,
          subject: schedule.subject,
          section: sectionsMap[schedule.sectId],
          status: 'Unattended',
          originalStatus: 'Unattended'
        });
      }
    });

    dayAttendance.forEach(att => {
      if (!processedScheduleIds.has(att.schedId)) {
        const schedule = scheduleMap[att.schedId];
        combinedRecords.push({
          attendId: att.attendId,
          date: parseDatabaseTimestamp(att.timeIn),
          timeIn: parseDatabaseTimestamp(att.timeIn),
          timeOut: att.timeOut ? parseDatabaseTimestamp(att.timeOut) : null,
          subject: schedule ? schedule.subject : '-',
          section: schedule ? sectionsMap[schedule.sectId] : '-',
          status: att.status,
          originalStatus: att.originalStatus
        });
      }
    });

    combinedRecords.sort((a, b) => {
      if (a.timeIn && b.timeIn) return a.timeIn - b.timeIn;
      if (a.timeIn) return -1;
      if (b.timeIn) return 1;
      return 0;
    });

    renderRecords(combinedRecords, date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
  }

  function renderRecords(records, title) {
    document.getElementById('recordsTitle').textContent = title;
    
    const recordsList = document.getElementById('attendanceRecordsList');
    recordsList.innerHTML = '';

    if (!records || records.length === 0) {
      recordsList.innerHTML = '<tr><td colspan="6" class="no-records">No schedule or attendance records found.</td></tr>';
      return;
    }

    records.forEach((record, index) => {
      const row = document.createElement('tr');
      const originalStatus = record.originalStatus || record.status || 'Present';
      const currentStatus = record.status || originalStatus;
      const statusClass = currentStatus.toLowerCase();
      const attendId = record.attendId || '';
      
      row.innerHTML = `
        <td>${record.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td>${record.timeIn ? record.timeIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
        <td>${record.timeOut ? record.timeOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
        <td>${record.subject || '-'}</td>
        <td>${record.section || '-'}</td>
        <td>
          <div class="status-cell-wrapper">
            <span class="status-badge status-${statusClass} ${attendId ? 'clickable' : ''}" data-attend-id="${attendId}" data-original-status="${originalStatus}">${currentStatus}</span>
            <div class="status-dropdown" id="status-dropdown-${attendId}" style="display: none;">
              <button class="status-dropdown-item" data-attend-id="${attendId}" data-new-status="${originalStatus}">${originalStatus}</button>
              <button class="status-dropdown-item" data-attend-id="${attendId}" data-new-status="Excused">Excused</button>
            </div>
          </div>
        </td>
      `;
      recordsList.appendChild(row);
    });

    // Add event listeners for status badges
    document.querySelectorAll('.status-badge.clickable').forEach(badge => {
      badge.addEventListener('click', function(e) {
        e.stopPropagation();
        const attendId = this.getAttribute('data-attend-id');
        const originalStatus = this.getAttribute('data-original-status');
        toggleStatusDropdown(attendId, originalStatus, this, e);
      });
    });

    // Add event listeners for dropdown items
    document.querySelectorAll('.status-dropdown-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        const attendId = this.getAttribute('data-attend-id');
        const newStatus = this.getAttribute('data-new-status');
        updateStatus(attendId, newStatus, this, e);
      });
    });
  }

  window.toggleStatusDropdown = function(attendId, originalStatus, element, evt) {
    if (!attendId) return;
    if (evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    
    // Close all other dropdowns first
    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
      dropdown.style.display = 'none';
    });
    
    const dropdown = document.getElementById(`status-dropdown-${attendId}`);
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
  };

  window.updateStatus = async function(attendId, newStatus, element, evt) {
    if (!attendId) return;
    if (evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    
    // Close the dropdown
    const dropdown = document.getElementById(`status-dropdown-${attendId}`);
    if (dropdown) {
      dropdown.style.display = 'none';
    }

    // Find the record
    const record = allAttendance.find(r => r.attendId === attendId);
    if (!record) {
      console.error('Record not found:', attendId);
      return;
    }

    try {
      // Update the status in the database
      const { error } = await supabase
        .from(ATTENDANCE_TABLE)
        .update({ status: newStatus })
        .eq('attendId', attendId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Update the local data
      const recordIndex = allAttendance.findIndex(r => r.attendId === attendId);
      if (recordIndex !== -1) {
        allAttendance[recordIndex].status = newStatus;
        // originalStatus remains unchanged!
      }

      // Re-render to show updated status
      showMonthRecords();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  window.previousMonth = function() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
    showMonthRecords();
  };

  window.nextMonth = function() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
    showMonthRecords();
  };

  window.openDatePicker = function() {
    const modal = document.getElementById('datePickerModal');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    monthSelect.innerHTML = months.map((m, i) => `<option value="${i}" ${i === currentDate.getMonth() ? 'selected' : ''}>${m}</option>`).join('');

    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let y = currentYear - 10; y <= currentYear + 2; y++) {
      yearSelect.innerHTML += `<option value="${y}" ${y === currentDate.getFullYear() ? 'selected' : ''}>${y}</option>`;
    }

    modal.style.display = 'block';
  };

  window.closeDatePicker = function() {
    document.getElementById('datePickerModal').style.display = 'none';
  };

  window.applyDatePicker = function() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    currentDate = new Date(year, month, 1);
    renderCalendar();
    showMonthRecords();
    closeDatePicker();
  };

  window.toggleExportMenu = function() {
    const exportMenu = document.getElementById('exportMenu');
    if (exportMenu) {
      exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
    }
  };

  window.exportAttendanceDetailCSV = function() {
    toggleExportMenu();
    
    if (!allAttendance || allAttendance.length === 0) {
      alert('No attendance records to export');
      return;
    }
    
    const userName = document.getElementById('userName').textContent.replace("'s Attendance Records", '') || 'User';
    const headers = ['Date', 'Time In', 'Time Out', 'Status', 'Section'];
    const rows = [headers.join(',')];
    
    allAttendance.forEach(record => {
      const date = record.timeIn ? getDateFromDB(record.timeIn) : '';
      const timeIn = record.timeIn ? formatTimeFromDB(record.timeIn) : '';
      const timeOut = record.timeOut ? formatTimeFromDB(record.timeOut) : '';
      const status = String(record.status || '').includes(',') ? `"${record.status}"` : record.status || '';
      const section = scheduleMap[record.schedId] ? sectionsMap[scheduleMap[record.schedId].sectId] || '' : '';
      const sectionStr = String(section).includes(',') ? `"${section}"` : section;
      rows.push(`${date},${timeIn},${timeOut},${status},${sectionStr}`);
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_data_${userName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.exportAttendanceDetailJSON = function() {
    toggleExportMenu();
    
    if (!allAttendance || allAttendance.length === 0) {
      alert('No attendance records to export');
      return;
    }
    
    const userName = document.getElementById('userName').textContent.replace("'s Attendance Records", '') || 'User';
    
    const exportData = {
      user: userName,
      email: document.getElementById('userEmail').textContent || '',
      records: allAttendance.map(record => ({
        date: record.timeIn ? new Date(record.timeIn).toISOString().split('T')[0] : null,
        timeIn: record.timeIn ? new Date(record.timeIn).toISOString() : null,
        timeOut: record.timeOut ? new Date(record.timeOut).toISOString() : null,
        status: record.status || '',
        section: scheduleMap[record.schedId] ? sectionsMap[scheduleMap[record.schedId].sectId] || null : null
      }))
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_data_${userName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    // Close status dropdowns (only if not clicking on status-cell-wrapper or its children)
    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
      const wrapper = dropdown.parentElement;
      if (wrapper && !wrapper.contains(event.target)) {
        dropdown.style.display = 'none';
      }
    });
    
    // Close export menu
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');
    if (exportBtn && exportMenu && !exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
      exportMenu.style.display = 'none';
    }
  });

  loadData();
});
