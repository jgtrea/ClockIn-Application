document.addEventListener('DOMContentLoaded', () => {
  const sectionsContainer = document.getElementById('sectionsContainer');
  const searchInput = document.getElementById('sectionSearch');
  
  const profileCircle = document.getElementById('profileCircle');
  const profileMenu = document.getElementById('profileMenu');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileCircleMenu = document.getElementById('profileCircleMenu');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (profileCircle && profileMenu) {
    profileCircle.addEventListener('click', () => {
      profileMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.profile-wrapper')) {
        profileMenu.classList.remove('show');
      }
    });
  }
  
  const supabase = window.supabaseClient;
  
  if (supabase) {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const user = session.user;
        const displayName = user.user_metadata?.displayName || user.email.split('@')[0];
        const letter = displayName.charAt(0).toUpperCase();
        
        if (profileCircle) profileCircle.textContent = letter;
        if (profileCircleMenu) profileCircleMenu.textContent = letter;
        if (profileName) profileName.textContent = displayName;
        if (profileEmail) profileEmail.textContent = user.email;
      } else if (event === 'SIGNED_OUT') {
        const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
        const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
        if (profileCircle) profileCircle.textContent = '?';
        if (profileCircleMenu) profileCircleMenu.textContent = '?';
        if (profileName) profileName.textContent = 'Guest';
        if (profileEmail) profileEmail.textContent = userEmail || '';
      }
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (supabase) {
        await supabase.auth.signOut();
      }
      sessionStorage.removeItem('userEmail');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('userType');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
      localStorage.removeItem('userType');
      window.top.location.href = '../Login_Path/login.html';
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('keyup', searchSections);
  }
  
  function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeEl = document.getElementById('currentTime');
    if (timeEl) timeEl.textContent = `${hours}:${minutes}:${seconds}`;
  }
  
  updateTime();
  setInterval(updateTime, 1000);
  
  async function loadSections() {
    const supabase = window.supabaseClient;
    if (!supabase || !sectionsContainer) {
      setTimeout(loadSections, 500);
      return;
    }
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .order('sectionName', { ascending: true });

      if (sectionsError) throw sectionsError;

      if (!sectionsData || sectionsData.length === 0) {
        sectionsContainer.innerHTML = '<p style="text-align: center; color: #9ca3af;">No sections found</p>';
        return;
      }
        
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedule')
        .select('*');

      if (schedulesError) throw schedulesError;

      const sectionCards = [];
      
      sectionsData.forEach(section => {
        const sectionName = section.sectionName;
        
        const sectionSchedules = schedulesData.filter(s => 
          s.sectionName === sectionName && 
          s.weekday === today
        ).sort((a, b) => {
          const timeA = (a.startTime || '').split(':').map(Number);
          const timeB = (b.startTime || '').split(':').map(Number);
          return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });

        let currentSubject = 'No class';
        let timeRange = '';
        
        for (let i = 0; i < sectionSchedules.length; i++) {
          if (sectionSchedules[i + 1]) {
            sectionSchedules[i].endTime = sectionSchedules[i + 1].startTime;
          } else {
            const startParts = (sectionSchedules[i].startTime || '').split(':');
            const startHour = parseInt(startParts[0]) || 0;
            const startMin = parseInt(startParts[1]) || 0;
            const endHour = startHour + 1;
            sectionSchedules[i].endTime = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
          }
        }
        
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);
        
        let found = false;
        for (let i = 0; i < sectionSchedules.length; i++) {
          const subject = sectionSchedules[i];
          const subjectName = subject.subject || 'Class';
          
          const startMinutes = parseInt((subject.startTime || '').split(':')[0]) * 60 + parseInt((subject.startTime || '').split(':')[1]);
          const endMinutes = parseInt((subject.endTime || '').split(':')[0]) * 60 + parseInt((subject.endTime || '').split(':')[1]);
          
          if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            currentSubject = subjectName;
            timeRange = `${subject.startTime} - ${subject.endTime}`;
            found = true;
            break;
          }
        }
        
        if (!found && sectionSchedules.length > 0) {
          const firstStartMinutes = parseInt((sectionSchedules[0].startTime || '').split(':')[0]) * 60 + parseInt((sectionSchedules[0].startTime || '').split(':')[1]);
          if (currentMinutes < firstStartMinutes) {
            currentSubject = sectionSchedules[0].subject || 'Class';
            timeRange = `${sectionSchedules[0].startTime} - ${sectionSchedules[0].endTime}`;
          }
        }

        sectionCards.push(`
          <div class="section-card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; min-height: 300px;">
            <h2 onclick="showWeeklySchedule('${section.sectId}', '${section.sectionName.replace(/'/g, "\\'")}')" style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px 0; text-align: center; cursor: pointer; text-decoration: underline;">${section.sectionName}</h2>
            <div style="margin-bottom: 16px; text-align: center; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-size: 14px; color: #6b7280;">Current Class: ${currentSubject}</div>
              ${timeRange ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">${timeRange}</div>` : ''}
            </div>
            <div style="flex: 1;">
              <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 8px;">${today}'s Schedule:</div>
              <div id="schedule-${section.sectId}" style="font-size: 13px; color: #6b7280;">
                ${sectionSchedules.length > 0 ? sectionSchedules.map(s => 
                  `<div style="padding: 6px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between;">
                    <span style="font-weight: 500;">${s.subject || 'Class'}</span>
                    <span style="color: #9ca3af; font-size: 12px;">${s.startTime} - ${s.endTime}</span>
                  </div>`
                ).join('') : '<div style="color: #9ca3af; font-style: italic;">No classes scheduled</div>'}
              </div>
            </div>
          </div>
        `);
      });
      
      sectionsContainer.innerHTML = '<div id="sectionsGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 1200px; margin: 0 auto;">' + 
        sectionCards.join('') + '</div>';
      
    } catch (err) {
      console.error('Error loading sections:', err);
      if (sectionsContainer) {
        sectionsContainer.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading sections</p>';
      }
    }
  }
  
  loadSections();
});

async function showWeeklySchedule(sectionId, sectionName) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  
  if (!modalTitle || !modalContent) return;
  
  modalTitle.textContent = `${sectionName} - Weekly Schedule`;
  
  const dayButtons = days.map(day => 
    `<button onclick="loadDaySchedule('${sectionId}', '${day}')" style="margin: 5px; padding: 8px 16px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; cursor: pointer;">${day}</button>`
  ).join('');
  
  modalContent.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Select a day to view schedule:</div>
      <div>${dayButtons}</div>
    </div>
    <div id="dayScheduleContent" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <p style="text-align: center; color: #9ca3af;">Select a day to view its schedule</p>
    </div>
  `;
  
  const scheduleModal = document.getElementById('scheduleModal');
  if (scheduleModal) {
    scheduleModal.style.display = 'flex';
  }
}

async function loadDaySchedule(sectionId, day) {
  const contentEl = document.getElementById('dayScheduleContent');
  if (!contentEl) return;
  
  contentEl.innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading...</p>';
  
  const supabase = window.supabaseClient;
  if (!supabase) return;
  
  try {
    const { data: sectionData, error: sectionError } = await supabase
      .from('sections')
      .select('sectionName')
      .eq('sectId', sectionId)
      .single();

    if (sectionError) throw sectionError;

    const { data: schedulesData, error: schedulesError } = await supabase
      .from('schedule')
      .select('*')
      .eq('sectionName', sectionData.sectionName)
      .eq('weekday', day);

    if (schedulesError) throw schedulesError;

    if (!schedulesData || schedulesData.length === 0) {
      contentEl.innerHTML = `<p style="text-align: center; color: #9ca3af;">No classes scheduled for ${day}</p>`;
    } else {
      schedulesData.sort((a, b) => {
        const timeA = (a.startTime || '').split(':').map(Number);
        const timeB = (b.startTime || '').split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      for (let i = 0; i < schedulesData.length; i++) {
        if (schedulesData[i + 1]) {
          schedulesData[i].endTime = schedulesData[i + 1].startTime;
        } else {
          const startParts = (schedulesData[i].startTime || '').split(':');
          const startHour = parseInt(startParts[0]) || 0;
          const startMin = parseInt(startParts[1]) || 0;
          const endHour = startHour + 1;
          schedulesData[i].endTime = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
        }
      }
      
      contentEl.innerHTML = `
        <h4 style="margin: 0 0 12px 0; color: #111827;">${day} Schedule</h4>
        ${schedulesData.map(s => 
          `<div style="padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
            <span style="font-weight: 600; color: #111827;">${s.subject || 'Class'}</span>
            <span style="color: #6b7280;">${s.startTime} - ${s.endTime}</span>
          </div>`
        ).join('')}
      `;
    }
  } catch (e) {
    console.error('Error loading day schedule:', e);
    contentEl.innerHTML = `<p style="text-align: center; color: #ef4444;">Error loading ${day} schedule</p>`;
  }
}

function closeModal() {
  const scheduleModal = document.getElementById('scheduleModal');
  if (scheduleModal) {
    scheduleModal.style.display = 'none';
  }
}

function searchSections() {
  const searchTerm = document.getElementById('sectionSearch').value.toLowerCase();
  const cards = document.querySelectorAll('.section-card');
  
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    if (!searchTerm || text.includes(searchTerm)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}
