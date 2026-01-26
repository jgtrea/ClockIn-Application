let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
const recordsPerPage = 10;
let currentSearchTerm = '';
let dashboardStats = {
  totalUsers: 0,
  todayPresent: 0,
  todayTotal: 0,
  currentlyActive: 0,
  lateToday: 0
};

function updateDashboardStats() {
  const todayAttendanceEl = document.getElementById('todayAttendance');
  const totalUsersEl = document.getElementById('totalUsers');
  const currentlyActiveEl = document.getElementById('currentlyActive');
  const lateTodayEl = document.getElementById('lateToday');
  
  if (todayAttendanceEl) {
    const percentage = dashboardStats.todayTotal > 0 ? Math.round((dashboardStats.todayPresent / dashboardStats.todayTotal) * 100) : 0;
    todayAttendanceEl.textContent = `${dashboardStats.todayPresent}/${dashboardStats.todayTotal}`;
    todayAttendanceEl.nextElementSibling.nextElementSibling.textContent = `${percentage}% Present`;
  }
  
  if (totalUsersEl) totalUsersEl.textContent = dashboardStats.totalUsers;
  if (currentlyActiveEl) currentlyActiveEl.textContent = dashboardStats.currentlyActive;
  if (lateTodayEl) lateTodayEl.textContent = dashboardStats.lateToday;
}

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
      allRecords = [];
      
      dashboardStats.totalUsers = usersSnapshot.docs.length;
      dashboardStats.todayPresent = 0;
      dashboardStats.todayTotal = usersSnapshot.docs.length;
      dashboardStats.currentlyActive = 0;
      dashboardStats.lateToday = 0;
      
      const today = new Date().toISOString().split('T')[0];

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
          
          let userPresentToday = false;
          let userLateToday = false;
          let userActiveToday = false;

          attendanceSnap.docs.forEach(doc => {
            const data = doc.data();
            const recordDate = data.date;
            
            if (recordDate === today) {
              userPresentToday = true;
              
              const timeIn = data.timeIn || data.time_in;
              if (timeIn && timeIn > '09:00') {
                userLateToday = true;
              }
              
              const timeOut = data.timeOut || data.time_out;
              if (timeIn && (!timeOut || timeOut === '')) {
                userActiveToday = true;
              }
            }
            
            allRecords.push({
              userName: userName,
              timeIn: data.timeIn || data.time_in || 'N/A',
              date: data.date || 'N/A',
              room: data.room || 'N/A',
              timestamp: data.timestamp || null
            });
          });
          
          if (userPresentToday) dashboardStats.todayPresent++;
          if (userLateToday) dashboardStats.lateToday++;
          if (userActiveToday) dashboardStats.currentlyActive++;
          
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
      
      console.log('Dashboard Stats:', dashboardStats);
      updateDashboardStats();
      
      const weeklyData = await getWeeklyAttendanceData();
      updateChart(weeklyData, 'weekly');
      
      filteredRecords = [...allRecords];
      renderPage();
    })
    .catch(err => {
      console.error('Error loading activity:', err);
      activityFeed.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading activity</p>';
    });
}

function renderPage() {
  const activityFeed = document.getElementById('activityFeed');
  const pagination = document.getElementById('pagination');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (filteredRecords.length === 0) {
    activityFeed.innerHTML = '<p style="text-align: center; color: #9ca3af;">No recent clock-ins</p>';
    pagination.style.display = 'none';
    return;
  }
  
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const pageRecords = filteredRecords.slice(startIndex, endIndex);
  
  activityFeed.innerHTML = pageRecords.map(record => `
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
  
  if (totalPages > 1) {
    pagination.style.display = 'block';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
    nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
  } else {
    pagination.style.display = 'none';
  }
}

function changePage(direction) {
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const newPage = currentPage + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderPage();
  }
}

async function getWeeklyAttendanceData() {
  const weeklyData = [0, 0, 0, 0, 0, 0, 0];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (3 - i));
    const dateString = date.toISOString().split('T')[0];
    
    let dayCount = 0;
    for (const record of allRecords) {
      if (record.date === dateString) {
        dayCount++;
      }
    }
    weeklyData[i] = dayCount;
  }
  
  return weeklyData;
}

loadRecentActivity();

window.addEventListener('message', function(event) {
  if (event.data.type === 'search') {
    const searchTerm = event.data.term.toLowerCase();
    currentSearchTerm = searchTerm;
    
    if (!searchTerm) {
      filteredRecords = [...allRecords];
    } else {
      filteredRecords = allRecords.filter(record => {
        const text = `${record.userName} ${record.date} ${record.room}`.toLowerCase();
        return text.includes(searchTerm);
      });
    }
    
    currentPage = 1;
    renderPage();
  }
});

function performSearch() {
  const searchTerm = document.getElementById('globalSearch').value.toLowerCase();
  window.postMessage({ type: 'search', term: searchTerm }, '*');
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) {
    searchInput.addEventListener('keyup', performSearch);
  }
});