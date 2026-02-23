document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabaseClient;
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get('employeeId');

  if (!employeeId) {
    alert('No employee ID provided');
    window.location.href = 'attendance_db.html';
    return;
  }

  const USERS_TABLE = 'user_employee_data';
  const SCHEDULE_TABLE = 'schedule';
  const ATTENDANCE_TABLE = 'attendance';
  const SECTIONS_TABLE = 'sections';

  let currentDate = new Date();
  let allAttendance = [];
  let scheduleMap = {};
  let sectionsMap = {};

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
      const recordDate = new Date(record.timeIn);
      return recordDate.getFullYear() === year && recordDate.getMonth() === month;
    });

    const formattedRecords = monthRecords.map(record => {
      const schedule = scheduleMap[record.schedId] || {};
      return {
        date: new Date(record.timeIn),
        timeIn: new Date(record.timeIn),
        timeOut: record.timeOut ? new Date(record.timeOut) : null,
        subject: schedule.subject,
        section: sectionsMap[schedule.sectId],
        status: record.status
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
      const recordDate = new Date(record.timeIn);
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
          date: new Date(attendance.timeIn),
          timeIn: new Date(attendance.timeIn),
          timeOut: attendance.timeOut ? new Date(attendance.timeOut) : null,
          subject: schedule.subject,
          section: sectionsMap[schedule.sectId],
          status: attendance.status
        });
      } else {
        combinedRecords.push({
          date: date,
          timeIn: null,
          timeOut: null,
          subject: schedule.subject,
          section: sectionsMap[schedule.sectId],
          status: 'Unattended'
        });
      }
    });

    dayAttendance.forEach(att => {
      if (!processedScheduleIds.has(att.schedId)) {
        const schedule = scheduleMap[att.schedId];
        combinedRecords.push({
          date: new Date(att.timeIn),
          timeIn: new Date(att.timeIn),
          timeOut: att.timeOut ? new Date(att.timeOut) : null,
          subject: schedule ? schedule.subject : '-',
          section: schedule ? sectionsMap[schedule.sectId] : '-',
          status: att.status
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

    records.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td>${record.timeIn ? record.timeIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
        <td>${record.timeOut ? record.timeOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
        <td>${record.subject || '-'}</td>
        <td>${record.section || '-'}</td>
        <td><span class="status-badge status-${record.status.toLowerCase()}">${record.status}</span></td>
      `;
      recordsList.appendChild(row);
    });
  }

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
      const date = record.timeIn ? new Date(record.timeIn).toISOString().split('T')[0] : '';
      const timeIn = record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : '';
      const timeOut = record.timeOut ? new Date(record.timeOut).toLocaleTimeString() : '';
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
    a.download = `${userName}_data.csv`;
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
    a.download = `${userName}_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');
    if (exportBtn && exportMenu && !exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
      exportMenu.style.display = 'none';
    }
  });

  loadData();
});
