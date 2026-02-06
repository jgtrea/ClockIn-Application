document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("checkinContainer")) {
    initializeCheckinInterface();
  }
});

async function initializeCheckinInterface() {
  const supabase = await UserShared.waitForSupabase();
  if (!supabase) {
    document.getElementById("statusDisplay").innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading...</p>';
    return;
  }

  UserShared.setupAuthListener();
  UserShared.loadUserProfile();

  const clockInBtn = document.getElementById("clockInBtn");
  const clockOutBtn = document.getElementById("clockOutBtn");

  await updateCheckinStatus();

  if (clockInBtn) {
    clockInBtn.addEventListener("click", async () => {
      const user = await UserShared.getCurrentUser();
      if (user) await clockIn(user);
    });
  }

  if (clockOutBtn) {
    clockOutBtn.addEventListener("click", async () => {
      const user = await UserShared.getCurrentUser();
      if (user) await clockOut(user);
    });
  }
}

async function updateCheckinStatus() {
  const supabase = await UserShared.waitForSupabase();
  const statusDisplay = document.getElementById("statusDisplay");
  const clockInBtn = document.getElementById("clockInBtn");
  const clockOutBtn = document.getElementById("clockOutBtn");

  const user = await UserShared.getCurrentUser();
  if (!user) {
    if (statusDisplay) statusDisplay.innerHTML = '<p style="text-align: center; color: #9ca3af;">Please log in to check in/out.</p>';
    if (clockInBtn) clockInBtn.disabled = true;
    if (clockOutBtn) clockOutBtn.disabled = true;
    return;
  }

  const userEmail = user.email;
  const userData = await UserShared.loadEmployeeData(userEmail);
  if (!userData) return;

  const userId = userData.employeeId;
  const today = new Date().toISOString().split('T')[0];
  const todayStart = new Date(today + 'T00:00:00Z');
  const todayEnd = new Date(today + 'T23:59:59Z');

  const { data: todayAttendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('employeeId', userId)
    .gte('timeIn', todayStart.toISOString())
    .lte('timeIn', todayEnd.toISOString());

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
}

async function clockIn(user) {
  const supabase = await UserShared.waitForSupabase();
  const userData = await UserShared.loadEmployeeData(user.email);
  if (!userData) {
    alert('User not found');
    return;
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const todayStart = new Date(today + 'T00:00:00Z');
  const todayEnd = new Date(today + 'T23:59:59Z');

  const { data: existingData } = await supabase
    .from('attendance')
    .select('*')
    .eq('employeeId', userData.employeeId)
    .gte('timeIn', todayStart.toISOString())
    .lte('timeIn', todayEnd.toISOString());

  if (existingData && existingData.length > 0) {
    alert('You have already clocked in today!');
    return;
  }

  await supabase.from('attendance').insert({
    employeeId: userData.employeeId,
    timeIn: now.toISOString(),
    status: 'Present'
  });

  alert(`Clocked in successfully at ${now.toLocaleTimeString()}`);
  await updateCheckinStatus();
}

async function clockOut(user) {
  const supabase = await UserShared.waitForSupabase();
  const userData = await UserShared.loadEmployeeData(user.email);
  if (!userData) {
    alert('User not found');
    return;
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const todayStart = new Date(today + 'T00:00:00Z');
  const todayEnd = new Date(today + 'T23:59:59Z');

  const { data: todayAttendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('employeeId', userData.employeeId)
    .is('timeOut', null)
    .gte('timeIn', todayStart.toISOString())
    .lte('timeIn', todayEnd.toISOString());

  if (!todayAttendance || todayAttendance.length === 0) {
    alert('No active clock-in found!');
    return;
  }

  const attendId = todayAttendance[0].attendId;

  await supabase.from('attendance').update({ timeOut: now.toISOString() }).eq('attendId', attendId);

  alert(`Clocked out successfully at ${now.toLocaleTimeString()}`);
  await updateCheckinStatus();
}
