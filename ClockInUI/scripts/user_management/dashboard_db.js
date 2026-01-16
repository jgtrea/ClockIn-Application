function loadRecentActivity() {
  const activityFeed = document.getElementById('activityFeed');
  if (!activityFeed || !window.db) {
    setTimeout(loadRecentActivity, 1000);
    return;
  }

  console.log('Loading recent activity...');

  window.db.collection('user_employee_data')
    .get()
    .then(async (usersSnapshot) => {
      console.log('Found users:', usersSnapshot.docs.length);
      let allRecords = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userName = userData.name || 'Unknown User';
        
        try {
          const attendanceSnap = await window.db
            .collection('user_employee_data')
            .doc(userDoc.id)
            .collection('user_attendance')
            .get();

          console.log(`${userName} has ${attendanceSnap.docs.length} attendance records`);

          attendanceSnap.docs.forEach(doc => {
            const data = doc.data();
            console.log('Record data:', data);
            allRecords.push({
              userName: userName,
              timeIn: data.timeIn || data.time_in || 'N/A',
              date: data.date || 'N/A',
              room: data.room || 'N/A',
              timestamp: data.timestamp || null
            });
          });
        } catch (e) {
          console.log('Error for', userName, ':', e);
        }
      }

      console.log('Total records:', allRecords.length);
      
      allRecords.forEach(r => console.log('Date:', r.date, 'Time:', r.timeIn));

      allRecords.sort((a, b) => {
        const aValid = a.date && a.date !== 'N/A';
        const bValid = b.date && b.date !== 'N/A';
        
        if (!aValid && !bValid) return 0;
        if (!aValid) return 1;
        if (!bValid) return -1;
        
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (dateB - dateA !== 0) {
          return dateB - dateA;
        }
        if (a.timeIn !== b.timeIn) {
          return b.timeIn.localeCompare(a.timeIn);
        }
        return 0;
      });
      
      console.log('After sorting:', allRecords.map(r => r.date + ' ' + r.timeIn));

      const recentRecords = allRecords.slice(0, 10);

      if (recentRecords.length === 0) {
        activityFeed.innerHTML = '<p style="text-align: center; color: #9ca3af;">No recent clock-ins</p>';
        return;
      }

      activityFeed.innerHTML = recentRecords.map(record => `
        <div class="user-row" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 16px; color: #111827;">${record.userName}</div>
            <div style="font-size: 13px; color: #9ca3af; margin-top: 2px;">${record.date} • Room ${record.room}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600; color: #059669;">${record.timeIn}</div>
            <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">Clocked in</div>
          </div>
        </div>
      `).join('');
    })
    .catch(err => {
      console.error('Error loading activity:', err);
      activityFeed.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading activity</p>';
    });
}

loadRecentActivity();

window.addEventListener('message', function(event) {
  if (event.data.type === 'search') {
    const searchTerm = event.data.term;
    const rows = document.querySelectorAll('.user-row');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (!searchTerm || text.includes(searchTerm)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }
});
