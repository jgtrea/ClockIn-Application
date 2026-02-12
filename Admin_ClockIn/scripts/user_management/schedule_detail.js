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
    const scheduleContainer = document.getElementById('scheduleDetailContainer');
    scheduleContainer.innerHTML = '';

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
            <div class="schedule-item">
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
