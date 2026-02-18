function loadChart(callback) {
  requestAnimationFrame(callback);
}

let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
let recordsPerPage = 10;
let currentSearchTerm = '';
let currentDateFilter = '';
let currentEndDateFilter = '';
let currentStartTimeFilter = '';
let currentEndTimeFilter = '';

let sectionClockinsData = [];
let sectionCurrentPage = 1;
const sectionRecordsPerPage = 5;

function searchByName(term) {
  currentSearchTerm = term || '';
  applyRecentClockinsFilters();
}

function filterByDate(date) {
  currentDateFilter = date || '';
  applyRecentClockinsFilters();
}

function filterByDateRange() {
  const startDate = document.getElementById('startDateFilter')?.value || '';
  const endDate = document.getElementById('endDateFilter')?.value || '';
  const startTime = document.getElementById('startTimeFilter')?.value || '';
  const endTime = document.getElementById('endTimeFilter')?.value || '';
  
  currentDateFilter = startDate;
  currentEndDateFilter = endDate;
  currentStartTimeFilter = startTime;
  currentEndTimeFilter = endTime;
  
  applyDateRangeFilters();
}

function applyDateRangeFilters() {
  let filtered = [...allRecords];
  
  if (currentSearchTerm) {
    filtered = filtered.filter(record => {
      const name = (record.userName || '').toLowerCase();
      return name.includes(currentSearchTerm.toLowerCase());
    });
  }
  
  if (currentDateFilter || currentEndDateFilter || currentStartTimeFilter || currentEndTimeFilter) {
    filtered = filtered.filter(record => {
      const recordDateTime = record.date + ' ' + (record.timeIn || '');
      
      let startDateTime = currentDateFilter;
      let endDateTime = currentEndDateFilter;
      
      if (currentStartTimeFilter && currentDateFilter) {
        startDateTime = currentDateFilter + ' ' + currentStartTimeFilter;
      }
      if (currentEndTimeFilter && currentEndDateFilter) {
        endDateTime = currentEndDateFilter + ' ' + currentEndTimeFilter;
      }
      
      if (currentDateFilter && !currentStartTimeFilter) {
        startDateTime = currentDateFilter + ' 00:00';
      }
      if (currentEndDateFilter && !currentEndTimeFilter) {
        endDateTime = currentEndDateFilter + ' 23:59';
      }
      
      if (startDateTime && endDateTime) {
        return recordDateTime >= startDateTime && recordDateTime <= endDateTime;
      } else if (startDateTime) {
        return recordDateTime >= startDateTime;
      } else if (endDateTime) {
        return recordDateTime <= endDateTime;
      }
      return true;
    });
  }
  
  filteredRecords = filtered;
  currentPage = 1;
  renderPage();
}

function applyRecentClockinsFilters() {
  let filtered = [...allRecords];
  
  if (currentSearchTerm) {
    filtered = filtered.filter(record => {
      const name = (record.userName || '').toLowerCase();
      return name.includes(currentSearchTerm.toLowerCase());
    });
  }
  
  if (currentDateFilter) {
    filtered = filtered.filter(record => {
      return record.date === currentDateFilter;
    });
  }
  
  filteredRecords = filtered;
  currentPage = 1;
  renderPage();
}

function toggleFilterMenu() {
  const filterMenu = document.getElementById('filterMenu');
  if (filterMenu) {
    filterMenu.style.display = filterMenu.style.display === 'none' ? 'block' : 'none';
  }
}

window.dashboardStats = {
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
  
  const totalTeachersPct = document.getElementById('totalTeachersPct');
  const onSchedulePct = document.getElementById('onSchedulePct');
  const lateTodayPct = document.getElementById('lateTodayPct');
  const absentTodayPct = document.getElementById('absentTodayPct');
  const excusedTodayPct = document.getElementById('excusedTodayPct');
  
  if (totalTeachersEl) totalTeachersEl.textContent = window.dashboardStats.totalTeachers;
  if (onScheduleEl) onScheduleEl.textContent = window.dashboardStats.onSchedule;
  if (lateTodayEl) lateTodayEl.textContent = window.dashboardStats.late;
  if (absentTodayEl) absentTodayEl.textContent = window.dashboardStats.absent;
  if (excusedTodayEl) excusedTodayEl.textContent = window.dashboardStats.excused;
  
  const total = window.dashboardStats.totalTeachers || 1;
  if (totalTeachersPct) totalTeachersPct.textContent = '100%';
  if (onSchedulePct) onSchedulePct.textContent = total > 0 ? Math.round((window.dashboardStats.onSchedule / total) * 100) + '%' : '0%';
  if (lateTodayPct) lateTodayPct.textContent = total > 0 ? Math.round((window.dashboardStats.late / total) * 100) + '%' : '0%';
  if (absentTodayPct) absentTodayPct.textContent = total > 0 ? Math.round((window.dashboardStats.absent / total) * 100) + '%' : '0%';
  if (excusedTodayPct) excusedTodayPct.textContent = total > 0 ? Math.round((window.dashboardStats.excused / total) * 100) + '%' : '0%';
}

async function loadRecentActivity() {
  const activityFeed = document.getElementById('activityFeed');
  const supabase = window.supabaseClient;
  
  if (!activityFeed || !supabase) {
    setTimeout(loadRecentActivity, 1000);
    return;
  }

  try {
    const { data: usersData, error: usersError } = await supabase
      .from('user_employee_data')
      .select('*')
      .order('createdAt', { ascending: false });

    if (usersError) throw usersError;

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*');

    if (attendanceError) throw attendanceError;

    window.dashboardStats.totalTeachers = usersData.length;
    window.dashboardStats.onSchedule = 0;
    window.dashboardStats.late = 0;
    window.dashboardStats.absent = 0;
    window.dashboardStats.excused = 0;
    
    const today = new Date().toISOString().split('T')[0];

    const todayRecordsByUser = {};

    usersData.forEach(user => {
      const userName = user.name || 'Unknown User';
      const userId = user.employeeId;

      const userAttendance = attendanceData.filter(a => a.employeeId === userId);

      userAttendance.forEach(record => {
        const recordDate = record.timeIn ? new Date(record.timeIn).toISOString().split('T')[0] : null;
        const status = record.status || 'Present';
        
        allRecords.push({
          userName: userName,
          timeIn: record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : 'N/A',
          date: recordDate || 'N/A',
          status: status,
          timestamp: record.timeIn || null
        });
        
        if (recordDate === today) {
          if (!todayRecordsByUser[userId]) {
            todayRecordsByUser[userId] = [];
          }
          todayRecordsByUser[userId].push(status);
        }
      });
    });

    usersData.forEach(user => {
      const userId = user.employeeId;
      const userStatuses = todayRecordsByUser[userId] || [];
      
      if (userStatuses.length === 0) {
        window.dashboardStats.absent++;
      } else {
        userStatuses.forEach(status => {
          if (status === 'Present') {
            window.dashboardStats.onSchedule++;
          } else if (status === 'Late') {
            window.dashboardStats.late++;
          } else if (status === 'Excused') {
            window.dashboardStats.excused++;
          } else if (status === 'Absent') {
            window.dashboardStats.absent++;
          }
        });
      }
    });

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
    
    
    updateDashboardStats();
    
    window.allRecords = allRecords;
    
    const weeklyData = await getWeeklyAttendanceData();
    
    loadChart(() => {
      updateChart(weeklyData, 'weekly');
    });
    
    const isDashboard = document.getElementById('totalTeachers') !== null;
    
    recordsPerPage = isDashboard ? 5 : 10;
    
    if (isDashboard) {
      filteredRecords = [...allRecords].sort((a, b) => {
        const dateTimeA = a.date + ' ' + (a.timeIn || '');
        const dateTimeB = b.date + ' ' + (b.timeIn || '');
        return dateTimeB.localeCompare(dateTimeA);
      });
    } else {
      filteredRecords = [...allRecords];
      
      const totalRecentClockinsEl = document.getElementById('totalRecentClockins');
      if (totalRecentClockinsEl) {
        totalRecentClockinsEl.textContent = filteredRecords.length;
      }
    }
    renderPage();
  } catch (err) {
    console.error('Error loading activity:', err);
    const activityFeed = document.getElementById('activityFeed');
    if (activityFeed) {
      activityFeed.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading activity: ' + err.message + '</p>';
    }
  }
}

function renderPage() {
  const activityFeed = document.getElementById('activityFeed');
  const pagination = document.getElementById('pagination');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (!activityFeed) return;
  
  if (filteredRecords.length === 0) {
    activityFeed.innerHTML = '<p style="text-align: center; color: #9ca3af;">No recent clock-ins</p>';
    return;
  }
  
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const pageRecords = filteredRecords.slice(startIndex, endIndex);
  
  activityFeed.innerHTML = pageRecords.map(record => `
    <div class="user-table-row" style="background: #fff; border-bottom: 1px solid #e5e7eb; padding: 16px; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#fff'">
      <div>
        <div style="font-weight: 700; font-size: 16px; color: #111827;">${record.userName}</div>
        <div style="font-size: 13px; color: #9ca3af; margin-top: 2px;">${record.date}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 600; color: #FF725E;">${record.timeIn}</div>
        <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">${record.status}</div>
      </div>
    </div>
  `).join('');
  
  if (pagination && pageInfo && prevBtn && nextBtn) {
    if (totalPages > 1) {
      pagination.style.display = 'flex';
      pageInfo.textContent = currentPage;
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
      prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
      nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
    } else {
      pagination.style.display = 'flex';
      pageInfo.textContent = currentPage;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      prevBtn.style.opacity = '0.5';
      nextBtn.style.opacity = '0.5';
    }
  }
  
  const pageNumberInput = document.getElementById('pageNumberInput');
  if (pageNumberInput) {
    pageNumberInput.value = currentPage;
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

function goToFirstPage() {
  currentPage = 1;
  renderPage();
}

function goToLastPage() {
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  currentPage = totalPages;
  renderPage();
}

function goToPage(pageNum) {
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const page = parseInt(pageNum);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderPage();
  }
}

window.changeItemsPerPage = function(value) {
  try {
    const newValue = parseInt(value);
    if (newValue && newValue > 0) {
      recordsPerPage = newValue;
    } else if (value && value.length > 0) {
      recordsPerPage = parseInt(value) || 10;
    }
    currentPage = 1;
    renderPage();
    
    const itemsPerPageInput = document.getElementById('itemsPerPageInput');
    if (itemsPerPageInput) {
      itemsPerPageInput.value = recordsPerPage;
    }
  } catch (e) {
    console.error('Error in changeItemsPerPage:', e);
  }
}

loadRecentActivity();

async function loadSectionClockins() {
  const sectionClockinsFeed = document.getElementById('sectionClockinsFeed');
  const supabase = window.supabaseClient;
  
  if (!sectionClockinsFeed || !supabase) return;

  try {
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('sections')
      .select('*')
      .order('sectionName', { ascending: true });

    if (sectionsError) throw sectionsError;

    const { data: schedulesData, error: schedulesError } = await supabase
      .from('schedule')
      .select('*');

    if (schedulesError) throw schedulesError;

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*');

    if (attendanceError) throw attendanceError;

    const today = new Date().toISOString().split('T')[0];
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    sectionClockinsData = sectionsData.map(section => {
      const sectionSchedules = schedulesData.filter(s => s.sectId === section.sectId);
      const todaySchedules = sectionSchedules.filter(s => s.weekday === currentDay);
      
      let currentClass = 'No class';
      for (const schedule of todaySchedules) {
        const startMinutes = parseInt(schedule.startTime.split(':')[0]) * 60 + parseInt(schedule.startTime.split(':')[1]);
        const endMinutes = parseInt(schedule.endTime.split(':')[0]) * 60 + parseInt(schedule.endTime.split(':')[1]);
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          currentClass = schedule.subject || 'No Subject';
          break;
        }
      }

      const uniqueTodaySchedules = todaySchedules.filter(s => s.schedId && s.employeeId);
      const totalInSection = uniqueTodaySchedules.length;
      
      let clockedIn = 0;
      uniqueTodaySchedules.forEach(schedule => {
        const schedAttendance = attendanceData.filter(a => 
          a.schedId === schedule.schedId && 
          a.timeIn && 
          new Date(a.timeIn).toISOString().split('T')[0] === today
        );
        if (schedAttendance.length > 0) {
          clockedIn++;
        }
      });

      const percentage = totalInSection > 0 ? Math.round((clockedIn / totalInSection) * 100) : 0;

      return {
        sectionName: section.sectionName,
        currentClass: currentClass,
        percentage: percentage,
        clockedIn: clockedIn,
        total: totalInSection
      };
    });

    renderSectionPage();

  } catch (err) {
    console.error('Error loading section clock-ins:', err);
    sectionClockinsFeed.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading section clock-ins</p>';
  }
}

function renderSectionPage() {
  const sectionClockinsFeed = document.getElementById('sectionClockinsFeed');
  const pagination = document.getElementById('sectionPagination');
  const pageInfo = document.getElementById('sectionPageInfo');
  const prevBtn = document.getElementById('sectionPrevBtn');
  const nextBtn = document.getElementById('sectionNextBtn');
  
  if (!sectionClockinsFeed) return;
  
  if (sectionClockinsData.length === 0) {
    sectionClockinsFeed.innerHTML = '<p style="text-align: center; color: #9ca3af;">No sections found</p>';
    return;
  }
  
  const totalPages = Math.ceil(sectionClockinsData.length / sectionRecordsPerPage);
  const startIndex = (sectionCurrentPage - 1) * sectionRecordsPerPage;
  const endIndex = startIndex + sectionRecordsPerPage;
  const pageRecords = sectionClockinsData.slice(startIndex, endIndex);
  
  sectionClockinsFeed.innerHTML = pageRecords.map(record => `
    <div class="user-table-row" style="background: #fff; border-bottom: 1px solid #e5e7eb; padding: 16px; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#fff'">
      <div>
        <div style="font-weight: 700; font-size: 16px; color: #111827;">${record.sectionName}</div>
        <div style="font-size: 13px; color: #9ca3af; margin-top: 2px;">${record.currentClass}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 600; color: ${record.percentage >= 50 ? '#059669' : '#f59e0b'};">${record.percentage}%</div>
        <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">${record.clockedIn}/${record.total}</div>
      </div>
    </div>
  `).join('');
  
  if (pagination && pageInfo && prevBtn && nextBtn) {
    if (totalPages > 1) {
      pagination.style.display = 'flex';
      pageInfo.textContent = sectionCurrentPage;
      prevBtn.disabled = sectionCurrentPage === 1;
      nextBtn.disabled = sectionCurrentPage === totalPages;
      prevBtn.style.opacity = sectionCurrentPage === 1 ? '0.5' : '1';
      nextBtn.style.opacity = sectionCurrentPage === totalPages ? '0.5' : '1';
    } else {
      pagination.style.display = 'flex';
      pageInfo.textContent = sectionCurrentPage;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      prevBtn.style.opacity = '0.5';
      nextBtn.style.opacity = '0.5';
    }
  }
}

function changeSectionPage(direction) {
  const totalPages = Math.ceil(sectionClockinsData.length / sectionRecordsPerPage);
  const newPage = sectionCurrentPage + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    sectionCurrentPage = newPage;
    renderSectionPage();
  }
}

loadSectionClockins();

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
        const text = `${record.userName} ${record.date}`.toLowerCase();
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
  
  if (dateFilterLabel) {
    dateFilterLabel.textContent = `Filtered: ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    dateFilterLabel.style.display = 'inline';
  }
  if (clearDateFilter) {
    clearDateFilter.style.display = 'inline';
  }
  
  renderPage();
}

function clearDateFilter() {
  currentDateFilter = null;
  
  filteredRecords = [...allRecords];
  currentPage = 1;
  
  const dateFilterLabel = document.getElementById('dateFilterLabel');
  const clearDateFilter = document.getElementById('clearDateFilter');
  
  if (dateFilterLabel) {
    dateFilterLabel.style.display = 'none';
  }
  if (clearDateFilter) {
    clearDateFilter.style.display = 'none';
  }
  
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
  
  if (statsContent) {
    statsContent.classList.toggle('expanded');
  }
  if (arrow) {
    arrow.classList.toggle('rotated');
  }
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
