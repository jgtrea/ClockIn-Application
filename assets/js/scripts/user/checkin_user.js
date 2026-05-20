// Check if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", () => {
    console.log('Checkin page loaded');
    if (document.getElementById("todaySchedule")) {
      initializeCheckinInterface();
    }
  });
} else {
  // DOM already loaded, run immediately
  console.log('Checkin page loaded (immediate)');
  if (document.getElementById("todaySchedule")) {
    initializeCheckinInterface();
  }
}

async function initializeCheckinInterface() {
  console.log('Initializing checkin interface...');
  try {
    const supabase = await UserShared.waitForSupabase();
    console.log('Supabase loaded:', !!supabase);
    if (!supabase) {
      console.error('Supabase not available');
      return;
    }

    UserShared.setupAuthListener();
    UserShared.loadUserProfile();

    await loadTodaySchedule();
    console.log('Schedule loaded');
  } catch (err) {
    console.error('Error initializing:', err);
  }
}

async function loadTodaySchedule() {
  const scheduleContainer = document.getElementById('todaySchedule');
  if (!scheduleContainer) return;

  scheduleContainer.innerHTML = '<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; color: #6b7280;">Loading schedule...</div>';

  const user = await UserShared.getCurrentUser();
  console.log('Current user:', user);
  if (!user) {
    scheduleContainer.innerHTML = '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center; color: #dc2626;">Please log in to view your schedule</div>';
    return;
  }

  const supabase = await UserShared.waitForSupabase();
  const { data: empData } = await supabase
    .from('user_employee_data')
    .select('employeeId')
    .eq('email', user.email)
    .maybeSingle();

  if (!empData) return;

  // Get existing attendance records for today
  const today = new Date().toISOString().split('T')[0];
  const todayStart = today + 'T00:00:00.000Z';
  const todayEnd = today + 'T23:59:59.999Z';
  console.log('Checking attendance for today:', today);
  
  const { data: existingAttendance, error: attError } = await supabase
    .from('attendance')
    .select('schedId, status, timeIn')
    .eq('employeeId', empData.employeeId)
    .eq('status', 'present')
    .gte('timeIn', todayStart)
    .lte('timeIn', todayEnd);
    
  console.log('Existing attendance for today:', existingAttendance);
  console.log('Attendance error:', attError);
  console.log('Employee ID:', empData.employeeId);

  const attendedSchedIds = new Set();
  if (existingAttendance) {
    existingAttendance.forEach(a => {
      if (a.status === 'present') attendedSchedIds.add(a.schedId);
    });
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()];

  const { data: schedules } = await supabase
    .from('schedule')
    .select('*')
    .eq('employeeId', empData.employeeId)
    .eq('weekday', todayName)
    .order('startTime', { ascending: true });

  console.log('Schedules for today:', schedules);
  console.log('Day:', todayName);

  const { data: sections } = await supabase.from('sections').select('*');
  const sectionsMap = {};
  if (sections) sections.forEach(s => sectionsMap[s.sectId] = s.sectionName);

  if (!schedules || schedules.length === 0) {
    scheduleContainer.innerHTML = '<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; color: #6b7280;">No classes scheduled for today</div>';
    return;
  }

  scheduleContainer.innerHTML = `
    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
      <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 600;">Today's Schedule (${todayName})</h3>
      <div style="display: grid; gap: 12px;">
        ${schedules.map((s, idx) => {
          const isAttended = attendedSchedIds.has(s.schedId);
          return `
            <div id="scheduleCard_${s.schedId}" style="display: grid; grid-template-columns: 140px 1fr 1fr auto; gap: 12px; padding: 12px; background: ${isAttended ? '#dcfce7' : '#f9fafb'}; border-radius: 8px; align-items: center; border: ${isAttended ? '1px solid #16a34a' : '1px solid transparent'};">
              <span style="font-weight: 600; color: #374151; white-space: nowrap;">${formatTime(s.startTime)} - ${formatTime(s.endTime)}</span>
              <span style="color: #6b7280;">${s.subject || '-'}</span>
              <span style="color: #6b7280;">${sectionsMap[s.sectId] || '-'}</span>
              ${isAttended ? 
                '<span style="color: #16a34a; font-weight: 600; display: flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size: 18px;">check_circle</span> Present</span>' :
                `<button onclick="uploadVideoForSchedule('${s.schedId}')" style="padding: 8px 16px; background: #ff6b35; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                  <span class="material-symbols-outlined" style="font-size: 18px;">videocam</span>
                  Upload
                </button>`
              }
            </div>
            <input type="file" id="videoInput_${s.schedId}" style="display: none;" onchange="handleVideoUploadForSchedule(event, '${s.schedId}')">
            <div id="videoStatus_${s.schedId}" style="margin-top: -8px; margin-bottom: 8px; padding-left: 12px; color: #6b7280; font-size: 13px;"></div>
            <div id="confirmSection_${s.schedId}" style="margin-top: -4px; margin-bottom: 8px; padding-left: 12px; display: none;">
              <button id="confirmBtn_${s.schedId}" onclick="confirmAttendance('${s.schedId}')" style="padding: 8px 20px; background: #16a34a; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 18px;">check</span>
                Confirm Attendance
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function formatTime(time) {
  if (!time) return '';
  const parts = time.split(':');
  const h = parseInt(parts[0]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${parts[1] || '00'} ${ampm}`;
}

window.uploadVideoForSchedule = function(schedId) {
  console.log('Upload clicked for schedId:', schedId);
  const input = document.getElementById(`videoInput_${schedId}`);
  console.log('Input element:', input);
  if (input) {
    input.click();
  } else {
    console.error('Input not found for schedId:', schedId);
  }
};

window.handleVideoUploadForSchedule = async function(event, schedId) {
  const file = event.target.files[0];
  if (!file) return;

  const videoStatus = document.getElementById(`videoStatus_${schedId}`);
  const confirmSection = document.getElementById(`confirmSection_${schedId}`);
  
  // Store file info for later use (without uploading)
  window.selectedFiles = window.selectedFiles || {};
  window.selectedFiles[schedId] = file;

  // Show file info
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  videoStatus.innerHTML = `<span style="color: #16a34a;">✓ File selected: ${file.name} (${fileSizeMB} MB)</span>`;
  
  // Show confirm button
  confirmSection.style.display = 'block';
  confirmSection.innerHTML = `
    <button id="confirmBtn_${schedId}" onclick="confirmAttendance('${schedId}')" style="padding: 8px 20px; background: #16a34a; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
      <span class="material-symbols-outlined" style="font-size: 18px;">check</span>
      Confirm Attendance
    </button>
  `;
};

window.confirmAttendance = async function(schedId) {
  const videoStatus = document.getElementById(`videoStatus_${schedId}`);
  const confirmSection = document.getElementById(`confirmSection_${schedId}`);
  const scheduleCard = document.getElementById(`scheduleCard_${schedId}`);
  const confirmBtn = document.getElementById(`confirmBtn_${schedId}`);

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = 'Confirming...';
  }

  const user = await UserShared.getCurrentUser();
  if (!user) {
    videoStatus.innerHTML = '<span style="color: #dc2626;">Please log in to confirm attendance</span>';
    if (confirmBtn) confirmBtn.disabled = false;
    return;
  }

  const supabase = await UserShared.waitForSupabase();
  const { data: empData } = await supabase
    .from('user_employee_data')
    .select('employeeId')
    .eq('email', user.email)
    .maybeSingle();

  if (!empData) {
    videoStatus.innerHTML = '<span style="color: #dc2626;">User not found</span>';
    if (confirmBtn) confirmBtn.disabled = false;
    return;
  }

  // Check if attendance already exists for this schedule
  const { data: existingAttendance } = await supabase
    .from('attendance')
    .select('attendId')
    .eq('employeeId', empData.employeeId)
    .eq('schedId', schedId)
    .eq('status', 'present')
    .maybeSingle();

  if (existingAttendance) {
    videoStatus.innerHTML = '<span style="color: #dc2626;">Attendance already recorded for this schedule today</span>';
    if (confirmBtn) confirmBtn.disabled = false;
    return;
  }

  // Insert attendance record
  console.log('Inserting attendance for schedId:', schedId, 'employeeId:', empData.employeeId);
  const now = new Date().toISOString();
  const { error: insertError } = await supabase
    .from('attendance')
    .insert({
      schedId: schedId,
      employeeId: empData.employeeId,
      timeIn: now,
      timeOut: now,
      status: 'present'
    });

  console.log('Insert result:', { insertError });

  if (insertError) {
    videoStatus.innerHTML = `<span style="color: #dc2626;">Failed to confirm attendance: ${insertError.message}</span>`;
    if (confirmBtn) confirmBtn.disabled = false;
    return;
  }

  // Update UI to show attended status
  videoStatus.innerHTML = '<span style="color: #16a34a;">✓ Marked as present!</span>';
  confirmSection.style.display = 'none';

  // Update the schedule card styling
  if (scheduleCard) {
    scheduleCard.style.background = '#dcfce7';
    scheduleCard.style.border = '1px solid #16a34a';

    // Find and replace the button with attended status
    const buttonCell = scheduleCard.querySelector('button');
    if (buttonCell) {
      buttonCell.outerHTML = '<span style="color: #16a34a; font-weight: 600; display: flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size: 18px;">check_circle</span> Present</span>';
    }
  }

  // Hide status after a few seconds
  setTimeout(() => {
    videoStatus.innerHTML = '';
  }, 3000);
};

