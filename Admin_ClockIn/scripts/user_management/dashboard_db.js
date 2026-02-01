function loadChart(callback) {
  requestAnimationFrame(callback);
}

let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
const recordsPerPage = 10;
let currentSearchTerm = '';
let dashboardStats = {
  totalTeachers: 0,
  onSchedule: 0,
  late: 0,
  absent: 0,
  excused: 0
};

function updateDashboardStats() {
  const totalTeachersEl = document.getElementById('totalTeachers');
  const onScheduleEl = document.getElementById('onSchedule');
  const lateTodayEl = document.getElementById('lateToday');
  const absentTodayEl = document.getElementById('absentToday');
  const excusedTodayEl = document.getElementById('excusedToday');
  
  if (totalTeachersEl) totalTeachersEl.textContent = dashboardStats.totalTeachers;
  if (onScheduleEl) onScheduleEl.textContent = dashboardStats.onSchedule;
  if (lateTodayEl) lateTodayEl.textContent = dashboardStats.late;
  if (absentTodayEl) absentTodayEl.textContent = dashboardStats.absent;
  if (excusedTodayEl) excusedTodayEl.textContent = dashboardStats.excused;
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
      
      dashboardStats.totalTeachers = usersSnapshot.docs.length;
      dashboardStats.onSchedule = 0;
      dashboardStats.late = 0;
      dashboardStats.absent = 0;
      dashboardStats.excused = 0;
      
      const today = new Date().toISOString().split('T')[0];

      // Track today's records per user
      const todayRecordsByUser = {};

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userName = userData.name || 'Unknown User';
        
        try {
          // Attendance records for chart and recent activity
          const attendanceSnap = await window.db
            .collection('user_employee_data')
            .doc(userDoc.id)
            .collection('user_attendance')
            .get();

          console.log(`${userName} has ${attendanceSnap.docs.length} attendance records`);
          
          let userHasRecordToday = false;

          attendanceSnap.docs.forEach(doc => {
            const data = doc.data();
            const recordDate = data.date;
            const status = data.status || 'Present';
            
            allRecords.push({
              userName: userName,
              timeIn: data.timeIn || data.time_in || 'N/A',
              date: data.date || 'N/A',
              room: data.room || 'N/A',
              status: status,
              timestamp: data.timestamp || null
            });
            
            if (recordDate === today) {
              userHasRecordToday = true;
              if (!todayRecordsByUser[userDoc.id]) {
                todayRecordsByUser[userDoc.id] = [];
              }
              todayRecordsByUser[userDoc.id].push(status);
            }
          });
          
        } catch (e) {
          console.log('Error for', userName, ':', e);
        }
      }

      usersSnapshot.docs.forEach(userDoc => {
        const userStatuses = todayRecordsByUser[userDoc.id] || [];
        
        if (userStatuses.length === 0) {
          dashboardStats.absent++;
        } else {
          userStatuses.forEach(status => {
            if (status === 'Present') {
              dashboardStats.onSchedule++;
            } else if (status === 'Late') {
              dashboardStats.late++;
            } else if (status === 'Excused') {
              dashboardStats.excused++;
            } else if (status === 'Absent') {
              dashboardStats.absent++;
            }
          });
        }
      });

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
      loadChart(() => {
        updateChart(weeklyData, 'weekly');
      });
      
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
        <div style="font-weight: 600; color: #FF725E;">${record.timeIn}</div>
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
    
    const uniqueUsers = new Set();
    for (const record of allRecords) {
      if (record.date === dateString) {
        uniqueUsers.add(record.userName);
      }
    }
    weeklyData[i] = uniqueUsers.size;
  }
  
  return weeklyData;
}

loadRecentActivity();

window.addEventListener('message', function(event) {
  if (event.data.type === 'search') {
    const searchTerm = event.data.term.toLowerCase();
    currentSearchTerm = searchTerm;
    
    let baseRecords = currentDateFilter 
      ? allRecords.filter(record => record.date === currentDateFilter)
      : [...allRecords];
    
    if (!searchTerm) {
      filteredRecords = baseRecords;
    } else {
      filteredRecords = baseRecords.filter(record => {
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

let currentDateFilter = null;

function openDatePicker() {
  const modal = document.getElementById('datePickerModal');
  const dateInput = document.getElementById('selectedDate');
  
  dateInput.value = new Date().toISOString().split('T')[0];
  modal.style.display = 'block';
}

function closeDatePicker() {
  const modal = document.getElementById('datePickerModal');
  modal.style.display = 'none';
}

function filterByDate(selectedDate) {
  if (!selectedDate) {
    clearDateFilter();
    return;
  }
  
  currentDateFilter = selectedDate;
  
  filteredRecords = allRecords.filter(record => record.date === selectedDate);
  currentPage = 1;
  
  const dateFilterLabel = document.getElementById('dateFilterLabel');
  const clearDateFilter = document.getElementById('clearDateFilter');
  
  dateFilterLabel.textContent = `Filtered: ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  dateFilterLabel.style.display = 'inline';
  clearDateFilter.style.display = 'inline';
  
  renderPage();
}

function clearDateFilter() {
  currentDateFilter = null;
  
  filteredRecords = [...allRecords];
  currentPage = 1;
  
  const dateFilterLabel = document.getElementById('dateFilterLabel');
  const clearDateFilter = document.getElementById('clearDateFilter');
  
  dateFilterLabel.style.display = 'none';
  clearDateFilter.style.display = 'none';
  
  renderPage();
}

function showAttendanceByDate() {
  const dateInput = document.getElementById('selectedDate');
  const selectedDate = dateInput.value;
  
  if (!selectedDate) {
    alert('Please select a date');
    return;
  }
  
  closeDatePicker();
  filterByDate(selectedDate);
}

window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
};

let statsExpanded = false;
function toggleStats() {
  const statsContent = document.getElementById('statsToggleContent');
  const arrow = document.querySelector('.stats-toggle-btn .arrow');
  
  statsContent.classList.toggle('expanded');
  arrow.classList.toggle('rotated');
  statsExpanded = !statsExpanded;
  
  if (statsExpanded) {
    setTimeout(async () => {
      const weeklyData = await getWeeklyAttendanceData();
      if (typeof updateChart === 'function') {
        updateChart(weeklyData, 'weekly');
      }
    }, 100);
  }
}