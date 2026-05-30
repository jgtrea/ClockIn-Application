document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("attendanceRecordsList")) {
    initializeAttendanceDisplay();
  }
});

let currentDate = new Date();
let allAttendance = [];
let scheduleMap = {};
let sectionsMap = {};
let employeeId = null;

async function initializeAttendanceDisplay() {
  UserShared.setupAuthListener();
  UserShared.loadUserProfile();
  await loadData();
}

async function loadData() {
  const user = await UserShared.getCurrentUser();
  if (!user) return;

  const supabase = await UserShared.waitForSupabase();
  
  const { data: empData } = await supabase
    .from('user_employee_data')
    .select('*')
    .ilike('email', user.email)
    .maybeSingle();
    
  if (!empData) return;
  
  employeeId = empData.employeeId;

  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('*')
    .eq('employeeId', employeeId);

  allAttendance = attendanceData || [];

  const { data: scheduleData } = await supabase
    .from('schedule')
    .select('*')
    .eq('employeeId', employeeId);

  scheduleData.forEach(sched => {
    scheduleMap[sched.schedId] = sched;
  });

  const { data: sectionsData } = await supabase
    .from('sections')
    .select('*');

  sectionsData.forEach(section => {
    sectionsMap[section.sectId] = section.sectionName;
  });

  renderCalendar();
  showMonthRecords();
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
  
  const isWeekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(weekday);
  const daySchedules = Object.values(scheduleMap).filter(s => s.weekday === weekday || (s.weekday === 'AllWeekdays' && isWeekday));
  
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

function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
  showMonthRecords();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
  showMonthRecords();
}

function openDatePicker() {
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
}

function closeDatePicker() {
  document.getElementById('datePickerModal').style.display = 'none';
}

function applyDatePicker() {
  const month = parseInt(document.getElementById('monthSelect').value);
  const year = parseInt(document.getElementById('yearSelect').value);
  currentDate = new Date(year, month, 1);
  renderCalendar();
  showMonthRecords();
  closeDatePicker();
}
