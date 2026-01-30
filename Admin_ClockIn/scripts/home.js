document.addEventListener('DOMContentLoaded', () => {
  const sectionsContainer = document.getElementById('sectionsContainer');
  const searchInput = document.getElementById('sectionSearch');
  
  // Profile function
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
  
  if (window.auth) {
    window.auth.onAuthStateChanged(user => {
      if (user) {
        const displayName = user.displayName || user.email.split('@')[0];
        const letter = displayName.charAt(0).toUpperCase();
        
        if (profileCircle) profileCircle.textContent = letter;
        if (profileCircleMenu) profileCircleMenu.textContent = letter;
        if (profileName) profileName.textContent = displayName;
        if (profileEmail) profileEmail.textContent = user.email;
      }
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await window.auth.signOut();
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
    document.getElementById('currentTime').textContent = `${hours}:${minutes}:${seconds}`;
  }
  
  updateTime();
  setInterval(updateTime, 1000);
  
  function loadSections() {
    if (!window.db) {
      setTimeout(loadSections, 500);
      return;
    }
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    
    // Load all sections and their schedules in parallel
    window.db.collection('Sections').get()
    .then(async (sectionsSnapshot) => {
      if (sectionsSnapshot.empty) {
        sectionsContainer.innerHTML = '<p style="text-align: center; color: #9ca3af;">No sections found</p>';
        return;
      }
      
      const sectionCards = [];
      
      // Process all sections in parallel
      const sectionPromises = sectionsSnapshot.docs.map(async (doc) => {
        const section = doc.data();
        const sectionName = section.SectionName || section.name || doc.id;
        let currentSubject = 'No class';
        let timeRange = '';
        let currentTeacher = ''; // Always start with empty teacher
        
        try {
          const dayDoc = await window.db
            .collection('Sections')
            .doc(doc.id)
            .collection(today)
            .get();
          
          if (!dayDoc.empty) {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            const subjects = dayDoc.docs.map(d => ({
              ...d.data(),
              startTime: d.id
            })).sort((a, b) => {
              const timeA = a.startTime.split(':').map(Number);
              const timeB = b.startTime.split(':').map(Number);
              return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
            });
            
            // Calculation for end times
            for (let i = 0; i < subjects.length; i++) {
              if (subjects[i + 1]) {
                subjects[i].endTime = subjects[i + 1].startTime;
              } else {
                const startParts = subjects[i].startTime.split(':');
                const startHour = parseInt(startParts[0]);
                const startMin = parseInt(startParts[1]);
                const endHour = startHour + 1;
                subjects[i].endTime = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
              }
            }
            
            let found = false;
            for (let i = 0; i < subjects.length; i++) {
              const subject = subjects[i];
              const subjectName = subject.Subject || 'Class';
              
              const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);
              const startMinutes = parseInt(subject.startTime.split(':')[0]) * 60 + parseInt(subject.startTime.split(':')[1]);
              const endMinutes = parseInt(subject.endTime.split(':')[0]) * 60 + parseInt(subject.endTime.split(':')[1]);
              
              if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                currentSubject = subjectName;
                timeRange = `${subject.startTime} - ${subject.endTime}`;
                // Only show teacher when there's an active class 
                currentTeacher = await getTeacherForSection(sectionName, subject.startTime, subject.endTime);
                found = true;
                break;
              }
            }
            
            if (!found && subjects.length > 0) {
              const firstSubject = subjects[0];
              const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);
              const firstStartMinutes = parseInt(firstSubject.startTime.split(':')[0]) * 60 + parseInt(firstSubject.startTime.split(':')[1]);
              
              if (currentMinutes < firstStartMinutes) {
                currentSubject = firstSubject.Subject || 'Class';
                timeRange = `${firstSubject.startTime} - ${firstSubject.endTime}`;
                currentTeacher = ''; 
              }
            }
            
            // Clear teacher if no class is currently active
            if (!found) {
              currentTeacher = '';
            }
            
            // Show teacher during active class time
            if (currentSubject === 'No class' || !found) {
              currentTeacher = '';
            }
          }
        } catch (e) {
          console.log('Error loading schedule for', sectionName, ':', e);
        }
        
        return {
          id: doc.id,
          name: sectionName,
          currentSubject,
          currentTeacher,
          timeRange,
          today
        };
      });
      
      const sectionData = await Promise.all(sectionPromises);
      
      sectionData.forEach(section => {
        sectionCards.push(`
          <div class="section-card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; min-height: 300px;">
            <h2 onclick="showWeeklySchedule('${section.id}', '${section.name.replace(/'/g, "\\'")}')" style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px 0; text-align: center; cursor: pointer; text-decoration: underline;">${section.name}</h2>
            <div style="margin-bottom: 16px; text-align: center; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-size: 14px; color: #6b7280;">Current Class: ${section.currentSubject}</div>
              <div style="font-size: 13px; color: #9ca3af; margin-top: 2px;">Teacher: ${section.currentTeacher}</div>
              ${section.timeRange ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">${section.timeRange}</div>` : ''}
            </div>
            <div style="flex: 1;">
              <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 8px;">${section.today}'s Schedule:</div>
              <div id="schedule-${section.id}" style="font-size: 13px; color: #6b7280;">Loading schedule...</div>
            </div>
          </div>
        `);
      });
      
      sectionsContainer.innerHTML = '<div id="sectionsGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 1200px; margin: 0 auto;">' + 
        sectionCards.join('') + '</div>';
        
      // Load detailed schedules for each section in parallel
      const schedulePromises = sectionData.map(section => 
        loadSectionSchedule(section.id, section.today)
      );
      await Promise.all(schedulePromises);
    })
      .catch(err => {
        console.error('Error loading sections:', err);
        sectionsContainer.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading sections</p>';
      });
  }
  
  loadSections();
});

async function loadSectionSchedule(sectionId, today) {
  try {
    const dayDoc = await window.db.collection('Sections').doc(sectionId).collection(today).get();
    const scheduleEl = document.getElementById(`schedule-${sectionId}`);
    
    if (!scheduleEl) return;
    
    if (dayDoc.empty) {
      scheduleEl.innerHTML = '<div style="color: #9ca3af; font-style: italic;">No classes scheduled</div>';
    } else {
      const subjects = dayDoc.docs.map(d => ({ ...d.data(), startTime: d.id })).sort((a, b) => {
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });
      
      for (let i = 0; i < subjects.length; i++) {
        subjects[i].endTime = subjects[i + 1] ? subjects[i + 1].startTime : 'End';
      }
      
      scheduleEl.innerHTML = subjects.map(s => 
        `<div style="padding: 6px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between;">
          <span style="font-weight: 500;">${s.Subject || 'Class'}</span>
          <span style="color: #9ca3af; font-size: 12px;">${s.startTime} - ${s.endTime}</span>
        </div>`
      ).join('');
    }
  } catch (e) {
    const scheduleEl = document.getElementById(`schedule-${sectionId}`);
    if (scheduleEl) {
      scheduleEl.innerHTML = '<div style="color: #ef4444;">Error loading schedule</div>';
    }
  }
}

async function showWeeklySchedule(sectionId, sectionName) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  document.getElementById('modalTitle').textContent = `${sectionName} - Weekly Schedule`;
  
  const dayButtons = days.map(day => 
    `<button onclick="loadDaySchedule('${sectionId}', '${day}')" style="margin: 5px; padding: 8px 16px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; cursor: pointer;">${day}</button>`
  ).join('');
  
  document.getElementById('modalContent').innerHTML = `
    <div style="margin-bottom: 16px;">
      <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Select a day to view schedule:</div>
      <div>${dayButtons}</div>
    </div>
    <div id="dayScheduleContent" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <p style="text-align: center; color: #9ca3af;">Select a day to view its schedule</p>
    </div>
  `;
  
  document.getElementById('scheduleModal').style.display = 'flex';
}

async function loadDaySchedule(sectionId, day) {
  const contentEl = document.getElementById('dayScheduleContent');
  contentEl.innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading...</p>';
  
  try {
    const dayDoc = await window.db.collection('Sections').doc(sectionId).collection(day).get();
    
    if (dayDoc.empty) {
      contentEl.innerHTML = `<p style="text-align: center; color: #9ca3af;">No classes scheduled for ${day}</p>`;
    } else {
      const subjects = dayDoc.docs.map(d => ({ ...d.data(), startTime: d.id })).sort((a, b) => {
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });
      
      for (let i = 0; i < subjects.length; i++) {
        subjects[i].endTime = subjects[i + 1] ? subjects[i + 1].startTime : 'End';
      }
      
      contentEl.innerHTML = `
        <h4 style="margin: 0 0 12px 0; color: #111827;">${day} Schedule</h4>
        ${subjects.map(s => 
          `<div style="padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
            <span style="font-weight: 600; color: #111827;">${s.Subject || 'Class'}</span>
            <span style="color: #6b7280;">${s.startTime} - ${s.endTime}</span>
          </div>`
        ).join('')}
      `;
    }
  } catch (e) {
    contentEl.innerHTML = `<p style="text-align: center; color: #ef4444;">Error loading ${day} schedule</p>`;
  }
}

function closeModal() {
  document.getElementById('scheduleModal').style.display = 'none';
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

async function getTeacherForSection(sectionName, startTime, endTime) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const usersSnapshot = await window.db.collection('user_employee_data').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userName = userData.name || 'Unknown';
      
      const attendanceSnap = await window.db
        .collection('user_employee_data')
        .doc(userDoc.id)
        .collection('user_attendance')
        .where('date', '==', today)
        .get();
      
      for (const attendanceDoc of attendanceSnap.docs) {
        const attendance = attendanceDoc.data();
        const room = attendance.room;
        const timeIn = attendance.timeIn || attendance.time_in;
        const timeOut = attendance.timeOut || attendance.time_out;
        
        // Check if teacher is clocked in to this room and hasn't clocked out
        if (timeIn && !timeOut && room && 
            (room.toLowerCase() === sectionName.toLowerCase() || 
             room.toLowerCase().includes(sectionName.toLowerCase()) ||
             sectionName.toLowerCase().includes(room.toLowerCase()))) {
          
          // Show if they clocked in during or before the class time
          const clockInTime = timeIn.split(':');
          const classStartTime = startTime.split(':');
          const clockInMinutes = parseInt(clockInTime[0]) * 60 + parseInt(clockInTime[1]);
          const classStartMinutes = parseInt(classStartTime[0]) * 60 + parseInt(classStartTime[1]);
          
          if (clockInMinutes <= classStartMinutes + 30) { // Allow 30 min buffer
            return userName;
          }
        }
      }
    }
    return '';
  } catch (error) {
    console.error('Error getting teacher for section:', error);
    return '';
  }
}

async function loadAllTeachers() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const teachersMap = {};
    
    const usersSnapshot = await window.db.collection('user_employee_data').get();
    
    const teacherPromises = usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const userName = userData.name || 'Unknown';
      
      const attendanceSnap = await window.db
        .collection('user_employee_data')
        .doc(userDoc.id)
        .collection('user_attendance')
        .where('date', '==', today)
        .get();
      
      attendanceSnap.docs.forEach(attendanceDoc => {
        const attendance = attendanceDoc.data();
        const room = attendance.room;
        const timeIn = attendance.timeIn || attendance.time_in;
        const timeOut = attendance.timeOut || attendance.time_out;
        
        if (timeIn && !timeOut && room) {
          // Map room to potential section names
          const roomLower = room.toLowerCase();
          if (!teachersMap[room]) {
            teachersMap[room] = userName;
          }
          // Also try to match partial room names
          Object.keys(teachersMap).forEach(key => {
            if (key.toLowerCase().includes(roomLower) || roomLower.includes(key.toLowerCase())) {
              teachersMap[key] = userName;
            }
          });
        }
      });
    });
    
    await Promise.all(teacherPromises);
    return teachersMap;
  } catch (error) {
    console.error('Error loading teachers:', error);
    return {};
  }
}