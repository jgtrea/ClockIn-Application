document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("scheduleList")) {
    initializeScheduleDisplay();
  }
});

async function initializeScheduleDisplay() {
  UserShared.setupAuthListener();
  UserShared.loadUserProfile();
  await loadUserSchedule();
}

async function loadUserSchedule() {
  const scheduleList = document.getElementById('scheduleList');
  if (!scheduleList) return;
  
  scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading your schedule...</p>';

  const user = await UserShared.getCurrentUser();
  if (!user) {
    scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Please log in to view your schedule.</p>';
    return;
  }

  const userData = await UserShared.loadEmployeeData(user.email);
  if (!userData) {
    scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">User not found.</p>';
    return;
  }

  const supabase = await UserShared.waitForSupabase();
  const { data: schedulesData } = await supabase
    .from('schedule')
    .select('*')
    .eq('employeeId', userData.employeeId)
    .order('startTime', { ascending: true });

  if (!schedulesData || schedulesData.length === 0) {
    scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">No schedule found.</p>';
    return;
  }

  const schedulesByDay = {};
  schedulesData.forEach(schedule => {
    const day = schedule.weekday || 'Monday';
    if (!schedulesByDay[day]) schedulesByDay[day] = [];
    schedulesByDay[day].push(schedule);
  });

  Object.keys(schedulesByDay).forEach(day => {
    schedulesByDay[day].sort((a, b) => {
      const timeA = (a.startTime || '').split(':').map(Number);
      const timeB = (b.startTime || '').split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });
  });

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  let scheduleHTML = '';
  
  dayOrder.forEach(day => {
    const daySchedules = schedulesByDay[day] || [];
    const isToday = day === today;
    const dayStyle = isToday ? 'background: #e0f2fe; border: 1px solid #3b82f6;' : '';
    const dayLabel = isToday ? `${day} (Today)` : day;
    
    if (daySchedules.length > 0) {
      scheduleHTML += `
        <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px; ${dayStyle}">
          <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">${dayLabel}</h3>
          <div style="display: grid; grid-template-columns: 80px 1fr 1fr; gap: 10px; border-bottom: 1px solid #d1d5db; padding-bottom: 10px; margin-bottom: 20px; color: #9ca3af; font-size: 14px; font-weight: 600;">
            <span style="text-align: left;">Time</span>
            <span style="text-align: center;">Section</span>
            <span style="text-align: center;">Subject</span>
          </div>
          ${daySchedules.map(item => `
            <div style="display: grid; grid-template-columns: 80px 1fr 1fr; gap: 10px; padding: 12px 0; border-bottom: 1px solid #f9fafb; font-size: 14px; color: #374151; align-items: center;">
              <span style="text-align: left; font-weight: 600;">${formatTime(item.startTime)}</span>
              <span style="text-align: center;">${item.sectionName || '-'}</span>
              <span style="text-align: center;">${item.subject || '-'}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
  });

  scheduleList.innerHTML = scheduleHTML || '<p style="text-align: center; color: #9ca3af;">No schedule found.</p>';
}

function formatTime(time) {
  if (!time) return '';
  const parts = time.split(':');
  return `${parseInt(parts[0])}:${parts[1] || '00'}`;
}
