document.addEventListener("DOMContentLoaded", () => {
  const checkinContainer = document.getElementById("checkinContainer");

  if (checkinContainer) {
    initializeCheckinInterface();
  }
});

async function initializeCheckinInterface() {
  const supabase = window.supabaseClient;
  const clockInBtn = document.getElementById("clockInBtn");
  const clockOutBtn = document.getElementById("clockOutBtn");
  const statusDisplay = document.getElementById("statusDisplay");

  if (!supabase) {
    if (statusDisplay) {
      statusDisplay.innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading...</p>';
    }
    return;
  }

  supabase.auth.onAuthStateChanged(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await updateCheckinStatus(session.user);
    } else if (event === 'SIGNED_OUT') {
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
      
      if (userEmail && userId) {
        const storedUser = { email: userEmail, employeeId: userId };
        await updateCheckinStatus(storedUser);
        if (clockInBtn) clockInBtn.disabled = false;
        if (clockOutBtn) clockOutBtn.disabled = false;
        return;
      }
      
      if (statusDisplay) {
        statusDisplay.innerHTML = '<p style="text-align: center; color: #9ca3af;">Please log in to check in/out.</p>';
      }
      if (clockInBtn) clockInBtn.disabled = true;
      if (clockOutBtn) clockOutBtn.disabled = true;
    }
  });

  if (clockInBtn) {
    clockInBtn.addEventListener("click", async () => {
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
      
      if (userEmail && userId) {
        const storedUser = { email: userEmail, employeeId: userId };
        await clockIn(storedUser);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await clockIn(session.user);
        }
      }
    });
  }

  if (clockOutBtn) {
    clockOutBtn.addEventListener("click", async () => {
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
      
      if (userEmail && userId) {
        const storedUser = { email: userEmail, employeeId: userId };
        await clockOut(storedUser);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await clockOut(session.user);
        }
      }
    });
  }
}

async function updateCheckinStatus(user) {
  const supabase = window.supabaseClient;
  const statusDisplay = document.getElementById("statusDisplay");
  const clockInBtn = document.getElementById("clockInBtn");
  const clockOutBtn = document.getElementById("clockOutBtn");

  let userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
  let userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
  
  if (user && user.email) {
    userEmail = user.email;
  }
  if (user && user.employeeId) {
    userId = user.employeeId;
  }

  if (!userEmail || !userId) {
    if (statusDisplay) {
      statusDisplay.innerHTML = '<p style="text-align: center; color: #9ca3af;">Please log in to check in/out.</p>';
    }
    return;
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from('user_employee_data')
      .select('employeeId')
      .eq('email', userEmail)
      .single();

    if (userError) throw userError;

    if (!userData) return;

    const userId = userData.employeeId;
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00Z');
    const todayEnd = new Date(today + 'T23:59:59Z');

    const { data: todayAttendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employeeId', userId)
      .gte('timeIn', todayStart.toISOString())
      .lte('timeIn', todayEnd.toISOString());

    if (attendanceError) throw attendanceError;

    const hasClockedIn = todayAttendance && todayAttendance.length > 0;
    const hasClockedOut = hasClockedIn && todayAttendance.some(a => a.timeOut);

    if (statusDisplay) {
      if (!hasClockedIn) {
        statusDisplay.innerHTML = '<p style="text-align: center; color: #6b7280;">You have not clocked in today.</p>';
      } else if (!hasClockedOut) {
        const clockInTime = todayAttendance.find(a => a.timeIn)?.timeIn;
        statusDisplay.innerHTML = `<p style="text-align: center; color: #059669;">Clocked in at ${clockInTime}</p>`;
      } else {
        statusDisplay.innerHTML = '<p style="text-align: center; color: #6b7280;">You have completed your attendance for today.</p>';
      }
    }

    if (clockInBtn) clockInBtn.disabled = hasClockedIn;
    if (clockOutBtn) clockOutBtn.disabled = !hasClockedIn || hasClockedOut;

  } catch (error) {
    console.error('Error updating checkin status:', error);
  }
}

async function clockIn(user) {
  const supabase = window.supabaseClient;
  const statusDisplay = document.getElementById("statusDisplay");

  let userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
  if (user && user.email) {
    userEmail = user.email;
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from('user_employee_data')
      .select('employeeId, name')
      .eq('email', userEmail)
      .single();

    if (userError) throw userError;

    if (!userData) {
      alert('User not found');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00Z');
    const todayEnd = new Date(today + 'T23:59:59Z');

    const { data: existingData, error: existingError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employeeId', userData.employeeId)
      .gte('timeIn', todayStart.toISOString())
      .lte('timeIn', todayEnd.toISOString());

    if (existingError) throw existingError;

    if (existingData && existingData.length > 0) {
      alert('You have already clocked in today!');
      return;
    }

    const { error: insertError } = await supabase
      .from('attendance')
      .insert({
        employeeId: userData.employeeId,
        timeIn: now.toISOString(),
        status: 'Present'
      });

    if (insertError) throw insertError;

    alert(`Clocked in successfully at ${now.toLocaleTimeString()}`);
    await updateCheckinStatus(user);

  } catch (error) {
    console.error('Error clocking in:', error);
    alert('Error clocking in. Please try again.');
  }
}

async function clockOut(user) {
  const supabase = window.supabaseClient;
  const statusDisplay = document.getElementById("statusDisplay");

  let userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
  if (user && user.email) {
    userEmail = user.email;
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from('user_employee_data')
      .select('employeeId')
      .eq('email', userEmail)
      .single();

    if (userError) throw userError;

    if (!userData) {
      alert('User not found');
      return;
    }

    const userId = userData.employeeId;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00Z');
    const todayEnd = new Date(today + 'T23:59:59Z');

    const { data: todayAttendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employeeId', userId)
      .is('timeOut', null)
      .gte('timeIn', todayStart.toISOString())
      .lte('timeIn', todayEnd.toISOString());

    if (attendanceError) throw attendanceError;

    if (!todayAttendance || todayAttendance.length === 0) {
      alert('No active clock-in found!');
      return;
    }

    const attendId = todayAttendance[0].attendId;

    const { error: updateError } = await supabase
      .from('attendance')
      .update({ timeOut: now.toISOString() })
      .eq('attendId', attendId);

    if (updateError) throw updateError;

    alert(`Clocked out successfully at ${now.toLocaleTimeString()}`);
    await updateCheckinStatus(user);

  } catch (error) {
    console.error('Error clocking out:', error);
    alert('Error clocking out. Please try again.');
  }
}
