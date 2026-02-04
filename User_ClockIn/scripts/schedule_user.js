document.addEventListener("DOMContentLoaded", () => {
  const scheduleList = document.getElementById("scheduleList");

  if (scheduleList) {
    initializeScheduleDisplay();
  }
});

function initializeScheduleDisplay() {
  const supabase = window.supabaseClient;
  
  if (!supabase) {
    document.getElementById('scheduleList').innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading...</p>';
    return;
  }

  supabase.auth.onAuthStateChanged(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await loadUserSchedule(session.user);
    } else if (event === 'SIGNED_OUT') {
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
      
      if (userEmail && userId) {
        const storedUser = { email: userEmail, employeeId: userId };
        await loadUserSchedule(storedUser);
        return;
      }
      
      document.getElementById('scheduleList').innerHTML = '<p style="text-align: center; color: #9ca3af;">Please log in to view your schedule.</p>';
    }
  });
}

async function loadUserSchedule(user) {
  const scheduleList = document.getElementById('scheduleList');
  if (!scheduleList) return;
  
  scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading your schedule...</p>';

  const supabase = window.supabaseClient;

  let userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
  let userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
  
  if (user && user.email) {
    userEmail = user.email;
  }
  if (user && user.employeeId) {
    userId = user.employeeId;
  }

  if (!userEmail || !userId) {
    scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Please log in to view your schedule.</p>';
    return;
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from('user_employee_data')
      .select('employeeId')
      .eq('email', userEmail)
      .single();

    if (userError) throw userError;

    if (!userData) {
      scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">User not found.</p>';
      return;
    }

    const employeeId = userData.employeeId;

    const { data: schedulesData, error: scheduleError } = await supabase
      .from('schedule')
      .select('*')
      .eq('employeeId', employeeId)
      .order('startTime', { ascending: true });

    if (scheduleError) throw scheduleError;

    if (!schedulesData || schedulesData.length === 0) {
      scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">No schedule found.</p>';
      return;
    }

    const schedulesByDay = {};
    schedulesData.forEach(schedule => {
      const day = schedule.weekday || 'Monday';
      if (!schedulesByDay[day]) {
        schedulesByDay[day] = [];
      }
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

  } catch (error) {
    console.error('Error loading user schedule:', error);
    scheduleList.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading schedule.</p>';
  }
}

function formatTime(time) {
  if (!time) return '';
  const parts = time.split(':');
  return `${parseInt(parts[0])}:${parts[1] || '00'}`;
}
