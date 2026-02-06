document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("attendanceList")) {
    initializeAttendanceDisplay();
  }
});

async function initializeAttendanceDisplay() {
  UserShared.setupAuthListener();
  UserShared.loadUserProfile();
  await loadUserAttendance();
}

async function loadUserAttendance() {
  const attendanceList = document.getElementById("attendanceList");
  if (!attendanceList) return;
  
  attendanceList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading your attendance...</p>';

  const user = await UserShared.getCurrentUser();
  if (!user) {
    attendanceList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Please log in to view your attendance.</p>';
    return;
  }

  const userData = await UserShared.loadEmployeeData(user.email);
  if (!userData) {
    attendanceList.innerHTML = '<p style="text-align: center; color: #9ca3af;">User not found.</p>';
    return;
  }

  const supabase = await UserShared.waitForSupabase();
  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('*')
    .eq('employeeId', userData.employeeId)
    .order('timeIn', { ascending: false });

  if (!attendanceData || attendanceData.length === 0) {
    attendanceList.innerHTML = '<p style="text-align: center; color: #9ca3af;">No attendance records found.</p>';
    return;
  }

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
}
