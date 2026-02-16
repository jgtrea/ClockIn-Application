document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("todaySchedule")) {
    initializeCheckinInterface();
  }
});

async function initializeCheckinInterface() {
  const supabase = await UserShared.waitForSupabase();
  if (!supabase) return;

  UserShared.setupAuthListener();
  UserShared.loadUserProfile();

  await loadTodaySchedule();
}

async function loadTodaySchedule() {
  const scheduleContainer = document.getElementById('todaySchedule');
  if (!scheduleContainer) return;

  const user = await UserShared.getCurrentUser();
  if (!user) return;

  const supabase = await UserShared.waitForSupabase();
  const { data: empData } = await supabase
    .from('user_employee_data')
    .select('employeeId')
    .eq('email', user.email)
    .maybeSingle();

  if (!empData) return;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];

  const { data: schedules } = await supabase
    .from('schedule')
    .select('*')
    .eq('employeeId', empData.employeeId)
    .eq('weekday', today)
    .order('startTime', { ascending: true });

  const { data: sections } = await supabase.from('sections').select('*');
  const sectionsMap = {};
  if (sections) sections.forEach(s => sectionsMap[s.sectId] = s.sectionName);

  if (!schedules || schedules.length === 0) {
    scheduleContainer.innerHTML = '<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; color: #6b7280;">No classes scheduled for today</div>';
    return;
  }

  scheduleContainer.innerHTML = `
    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
      <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 600;">Today's Schedule (${today})</h3>
      <div style="display: grid; gap: 12px;">
        ${schedules.map((s, idx) => `
          <div style="display: grid; grid-template-columns: 140px 1fr 1fr auto; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; align-items: center;">
            <span style="font-weight: 600; color: #374151; white-space: nowrap;">${formatTime(s.startTime)} - ${formatTime(s.endTime)}</span>
            <span style="color: #6b7280;">${s.subject || '-'}</span>
            <span style="color: #6b7280;">${sectionsMap[s.sectId] || '-'}</span>
            <button onclick="uploadVideoForSchedule(${s.schedId})" style="padding: 8px 16px; background: #ff6b35; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span class="material-symbols-outlined" style="font-size: 18px;">videocam</span>
              Upload
            </button>
          </div>
          <input type="file" id="videoInput_${s.schedId}" accept="video/*" style="display: none;" onchange="handleVideoUploadForSchedule(event, ${s.schedId})">
          <div id="videoStatus_${s.schedId}" style="margin-top: -8px; margin-bottom: 8px; padding-left: 12px; color: #6b7280; font-size: 13px;"></div>
        `).join('')}
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
  document.getElementById(`videoInput_${schedId}`).click();
};

window.handleVideoUploadForSchedule = async function(event, schedId) {
  const file = event.target.files[0];
  if (!file) return;

  const videoStatus = document.getElementById(`videoStatus_${schedId}`);
  if (!file.type.startsWith('video/')) {
    videoStatus.innerHTML = '<span style="color: #dc2626;">Please select a valid video file</span>';
    return;
  }

  videoStatus.innerHTML = '<span style="color: #2563eb;">Uploading...</span>';

  const user = await UserShared.getCurrentUser();
  if (!user) {
    videoStatus.innerHTML = '<span style="color: #dc2626;">Please log in to upload videos</span>';
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
    return;
  }

  const timestamp = new Date().getTime();
  const fileName = `${empData.employeeId}_schedId${schedId}_${timestamp}_${file.name}`;

  const { error } = await supabase.storage
    .from('attendance-videos')
    .upload(fileName, file);

  if (error) {
    videoStatus.innerHTML = `<span style="color: #dc2626;">Failed: ${error.message}</span>`;
  } else {
    videoStatus.innerHTML = '<span style="color: #16a34a;">✓ Uploaded successfully</span>';
    setTimeout(() => {
      videoStatus.innerHTML = '';
      event.target.value = '';
    }, 3000);
  }
};

