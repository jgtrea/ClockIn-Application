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

  const supabase = await UserShared.waitForSupabase();
  
  const { data: empData } = await supabase
    .from('user_employee_data')
    .select('employeeId, name')
    .eq('email', user.email)
    .maybeSingle();
    
  if (!empData) {
    scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">User not found.</p>';
    return;
  }

  const { data: schedulesData } = await supabase
    .from('schedule')
    .select('*')
    .eq('employeeId', empData.employeeId)
    .order('weekday', { ascending: true })
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

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  let scheduleHTML = '';
  
  dayOrder.forEach(day => {
    const daySchedules = schedulesByDay[day] || [];
    const isToday = day === today;
    const dayStyle = isToday ? 'background: #fff5f0; border: 1px solid #FF725E;' : '';
    const dayLabel = isToday ? `${day} (Today)` : day;
    
    if (daySchedules.length > 0) {
      scheduleHTML += `
        <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px; ${dayStyle}">
          <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">${dayLabel}</h3>
          <div style="display: grid; grid-template-columns: 100px 1fr 1fr 100px; gap: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 16px; color: #6b7280; font-size: 13px; font-weight: 600;">
            <span style="text-align: left;">Time</span>
            <span style="text-align: center;">Section</span>
            <span style="text-align: center;">Subject</span>
            <span style="text-align: right;">Status</span>
          </div>
          ${daySchedules.map(item => `
            <div style="display: grid; grid-template-columns: 100px 1fr 1fr 100px; gap: 10px; padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; align-items: center;">
              <span style="text-align: left; font-weight: 600;">${formatTime(item.startTime)} - ${formatTime(item.endTime)}</span>
              <span style="text-align: center;">${item.sectionName || '-'}</span>
              <span style="text-align: center;">${item.subject || '-'}</span>
              <span style="text-align: right;">${getScheduleStatus(item)}</span>
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
  const h = parseInt(parts[0]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${parts[1] || '00'} ${ampm}`;
}

function getScheduleStatus(item) {
  const now = new Date();
  const currentTime = now.toTimeString().substring(0, 5);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = days[now.getDay()];
  
  if (item.weekday !== currentDay) {
    return '<span style="color: #9ca3af;">-</span>';
  }
  
  if (item.startTime <= currentTime && item.endTime >= currentTime) {
    return '<span style="color: #16a34a; font-weight: 600;">In Session</span>';
  }
  
  if (item.startTime > currentTime) {
    return '<span style="color: #2563eb;">Upcoming</span>';
  }
  
  return '<span style="color: #9ca3af;">Ended</span>';
}
