document.addEventListener("DOMContentLoaded", () => {
  const scheduleList = document.getElementById("scheduleList");

  if (scheduleList) {
    initializeScheduleDisplay();
  }
});

function initializeScheduleDisplay() {
  if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
    window.auth.onAuthStateChanged((user) => {
      if (user) {
        loadUserSchedule(user.uid);
      } else {
        document.getElementById('scheduleList').innerHTML = '<p style="text-align: center; color: #9ca3af;">Please log in to view your schedule.</p>';
      }
    });
  }
}

async function loadUserSchedule(userId) {
  const scheduleList = document.getElementById('scheduleList');
  scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading your schedule...</p>';

  try {
    // First, try to find the user by their auth UID
    let userDocId = userId;
    let scheduleSnapshot = await window.db
      .collection('user_employee_data')
      .doc(userDocId)
      .collection('Schedule')
      .get();

    // If no schedule found with auth UID, try to find user by email
    if (scheduleSnapshot.empty) {
      const currentUser = window.auth.currentUser;
      if (currentUser && currentUser.email) {
        console.log('Trying to find user by email:', currentUser.email);
        
        const userQuery = await window.db
          .collection('user_employee_data')
          .where('email', '==', currentUser.email)
          .get();
        
        if (!userQuery.empty) {
          userDocId = userQuery.docs[0].id;
          console.log('Found user document ID:', userDocId);
          
          scheduleSnapshot = await window.db
            .collection('user_employee_data')
            .doc(userDocId)
            .collection('Schedule')
            .get();
        }
      }
    }

    console.log('Schedule snapshot empty?', scheduleSnapshot.empty);
    console.log('Number of schedule documents:', scheduleSnapshot.docs.length);

    if (scheduleSnapshot.empty) {
      scheduleList.innerHTML = '<p style="text-align: center; color: #9ca3af;">No schedule found.</p>';
      return;
    }

    let userSchedule = [];
    scheduleSnapshot.docs.forEach(timeDoc => {
      const timeData = timeDoc.data();
      console.log('Schedule document:', timeDoc.id, timeData);
      
      userSchedule.push({
        time: timeDoc.id,
        section: timeData.section || timeData.Section || 'N/A',
        subject: timeData.subject || timeData.Subject || 'N/A'
      });
    });

    // Sort by time
    userSchedule.sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    // Display schedule
    scheduleList.innerHTML = `
      <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 80px 1fr 1fr; gap: 10px; border-bottom: 1px solid #d1d5db; padding-bottom: 10px; margin-bottom: 20px; color: #9ca3af; font-size: 14px; font-weight: 600;">
          <span style="text-align: left;">Time</span>
          <span style="text-align: center;">Section</span>
          <span style="text-align: center;">Subject</span>
        </div>
        ${userSchedule.map(item => `
          <div style="display: grid; grid-template-columns: 80px 1fr 1fr; gap: 10px; padding: 12px 0; border-bottom: 1px solid #f9fafb; font-size: 14px; color: #374151; align-items: center;">
            <span style="text-align: left; font-weight: 600;">${formatTime(item.time)}</span>
            <span style="text-align: center;">${item.section}</span>
            <span style="text-align: center;">${item.subject}</span>
          </div>
        `).join('')}
      </div>
    `;

  } catch (error) {
    console.error('Error loading user schedule:', error);
    scheduleList.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading schedule.</p>';
  }
}

function formatTime(time) {
  return time.replace(/^0/, ''); // Remove leading zero
}
