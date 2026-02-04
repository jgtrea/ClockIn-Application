document.addEventListener("DOMContentLoaded", () => {
  const attendanceList = document.getElementById("attendanceList");

  if (attendanceList) {
    initializeAttendanceDisplay();
  }
});

async function initializeAttendanceDisplay() {
  const supabase = window.supabaseClient;
  const attendanceList = document.getElementById("attendanceList");
  
  if (!attendanceList) return;
  
  if (!supabase) {
    attendanceList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading...</p>';
    return;
  }

  supabase.auth.onAuthStateChanged(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await loadUserAttendance(session.user);
    } else if (event === 'SIGNED_OUT') {
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
      
      if (userEmail && userId) {
        const storedUser = { email: userEmail, employeeId: userId };
        await loadUserAttendance(storedUser);
        return;
      }
      
      attendanceList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Please log in to view your attendance.</p>';
    }
  });
}

async function loadUserAttendance(user) {
  const attendanceList = document.getElementById("attendanceList");
  if (!attendanceList) return;
  
  attendanceList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading your attendance...</p>';

  const supabase = window.supabaseClient;

  let userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
  
  if (user && user.email) {
    userEmail = user.email;
  }

  if (!userEmail) {
    attendanceList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Please log in to view your attendance.</p>';
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
      attendanceList.innerHTML = '<p style="text-align: center; color: #9ca3af;">User not found.</p>';
      return;
    }

    const userId = userData.employeeId;

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employeeId', userId)
      .order('timeIn', { ascending: false });

    if (attendanceError) throw attendanceError;

    if (!attendanceData || attendanceData.length === 0) {
      attendanceList.innerHTML = '<p style="text-align: center; color: #9ca3af;">No attendance records found.</p>';
      return;
    }

    attendanceData.sort((a, b) => {
      const dateA = new Date(a.timeIn || 0);
      const dateB = new Date(b.timeIn || 0);
      return dateB - dateA;
    });

    attendanceList.innerHTML = `
      <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; border-bottom: 1px solid #d1d5db; padding-bottom: 10px; margin-bottom: 20px; color: #9ca3af; font-size: 14px; font-weight: 600;">
          <span style="text-align: left;">Date</span>
          <span style="text-align: center;">Time In</span>
          <span style="text-align: center;">Time Out</span>
          <span style="text-align: center;">Status</span>
        </div>
        ${attendanceData.map(record => `
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; padding: 12px 0; border-bottom: 1px solid #f9fafb; font-size: 14px; color: #374151; align-items: center;">
            <span style="text-align: left;">${record.timeIn ? new Date(record.timeIn).toLocaleDateString() : '-'}</span>
            <span style="text-align: center;">${record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : '-'}</span>
            <span style="text-align: center;">${record.timeOut ? new Date(record.timeOut).toLocaleTimeString() : '-'}</span>
            <span style="text-align: center;">
              <span style="padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
                ${record.status === 'Present' ? 'background: #d1fae5; color: #065f46;' : 
                  record.status === 'Late' ? 'background: #fef3c7; color: #92400e;' :
                  record.status === 'Absent' ? 'background: #fee2e2; color: #991b1b;' :
                  'background: #f3f4f6; color: #374151;'}">
                ${record.status || '-'}
              </span>
            </span>
          </div>
        `).join('')}
      </div>
    `;

  } catch (error) {
    console.error('Error loading user attendance:', error);
    attendanceList.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading attendance.</p>';
  }
}
