const urlParams = new URLSearchParams(window.location.search);
const sectId = urlParams.get('sectId');
const sectionName = urlParams.get('sectionName');

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let allEmployees = [];

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
          <div class="schedule-item">
            <div class="time-badge">
              <span class="material-symbols-outlined">schedule</span>
              ${schedule.startTime} - ${schedule.endTime}
            </div>
            <div class="schedule-details">
              <div class="subject-name">${schedule.subject || 'No Subject'}</div>
              <div class="section-name">
                <span class="material-symbols-outlined">person</span>
                ${schedule.user_employee_data?.name || 'Unknown'}
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
