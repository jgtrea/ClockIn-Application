function parseDatabaseTimestamp(timestamp) {
  if (!timestamp) return null;
  
  if (timestamp instanceof Date) return timestamp;
  
  const timestampStr = String(timestamp);
  
  const hasTimezone = /[+-]\d{2}:?\d{2}$/.test(timestampStr);
  
  if (hasTimezone) {
    const dateTimePart = timestampStr.replace(/[+-]\d{2}:?\d{2}$/, '');
    
    const localTimestamp = dateTimePart.replace('T', ' ');
    
    const [datePart, timePart] = localTimestamp.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = (timePart || '00:00:00').split(':').map(Number);
    
    return new Date(year, month - 1, day, hours, minutes, seconds);
  } else {
    return new Date(timestampStr.replace('T', ' '));
  }
}

function formatTimeFromDB(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return 'N/A';
  
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeFromDB24(timestamp) {
  if (!timestamp) return '';
  
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return '';
  
  return date.toLocaleTimeString('en-US', { hour12: false }).split(' ')[0];
}

function getDateFromDB(timestamp) {
  if (!timestamp) return null;
  
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return null;
  
  return date.toISOString().split('T')[0];
}

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
  applyFilters();
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

// Toggle Filter Dropdown
function toggleFilterMenu() {
  const filterMenu = document.getElementById('filterMenu');
  const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
  const isOpen = filterMenu && filterMenu.style.display === 'block';
  
  if (filterMenu) {
    filterMenu.style.display = isOpen ? 'none' : 'block';
  }
  const sortMenu = document.getElementById('sortMenu');
  if (sortMenu) {
    sortMenu.style.display = 'none';
  }
  
  if (filterWrapper) {
    filterWrapper.classList.toggle('active', !isOpen);
  }
}

// Toggle Sort Dropdown
function toggleSortMenu() {
  const sortMenu = document.getElementById('sortMenu');
  const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
  const isOpen = sortMenu && sortMenu.style.display === 'block';
  
  if (sortMenu) {
    sortMenu.style.display = isOpen ? 'none' : 'block';
  }
  const filterMenu = document.getElementById('filterMenu');
  if (filterMenu) {
    filterMenu.style.display = 'none';
  }
  
  if (sortWrapper) {
    sortWrapper.classList.toggle('active', !isOpen);
  }
}

// Column options for recent clockin filter
const recentClockinFilterColumns = [
  { value: 'userName', label: 'Name' },
  { value: 'date', label: 'Date' },
  { value: 'timeIn', label: 'Time In' },
  { value: 'timeOut', label: 'Time Out' },
  { value: 'status', label: 'Status' },
  { value: 'section', label: 'Section' },
  { value: 'subject', label: 'Subject' }
];

// Column options for recent clockin sort
const recentClockinSortColumns = [
  { value: 'userName', label: 'Name' },
  { value: 'date', label: 'Date' },
  { value: 'timeIn', label: 'Time In' },
  { value: 'timeOut', label: 'Time Out' },
  { value: 'status', label: 'Status' },
  { value: 'section', label: 'Section' },
  { value: 'subject', label: 'Subject' }
];

// Add Filter Row with column options for recent clockin
window.addFilterRow = function() {
  const activeFilters = document.getElementById('activeFilters');
  const filterRow = document.createElement('div');
  filterRow.className = 'filter-row';
  
  const optionsHtml = recentClockinFilterColumns.map(col => 
    `<option value="${col.value}">${col.label}</option>`
  ).join('');
  
  filterRow.innerHTML = `
    <select class="filter-column-select">
      ${optionsHtml}
    </select>
    <span>:</span>
    <input type="text" class="filter-value-input" placeholder="Enter value...">
    <button class="remove-filter-btn" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;
  
  activeFilters.appendChild(filterRow);
};

// Add Sort Row with column options for recent clockin
window.addSortRow = function() {
  const activeSorts = document.getElementById('activeSorts');
  const sortRow = document.createElement('div');
  sortRow.className = 'filter-row';
  
  const optionsHtml = recentClockinSortColumns.map(col => 
    `<option value="${col.value}">${col.label}</option>`
  ).join('');
  
  sortRow.innerHTML = `
    <select class="filter-column-select">
      ${optionsHtml}
    </select>
    <span>:</span>
    <select class="filter-column-select">
      <option value="asc">Ascending</option>
      <option value="desc">Descending</option>
    </select>
    <button class="remove-filter-btn" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;
  
  activeSorts.appendChild(sortRow);
};

window.applyFilters = function() {
  if (!allRecords || allRecords.length === 0) {
    console.warn('No records available for filtering');
    return;
  }
  
  const filterRows = document.querySelectorAll('#activeFilters .filter-row');
  const filters = [];
  
  filterRows.forEach(row => {
    const select = row.querySelector('select');
    const input = row.querySelector('input');
    if (select && input && input.value.trim()) {
      filters.push({
        column: select.value,
        value: input.value.trim().toLowerCase()
      });
    }
  });
  
  let sourceData = [...allRecords];
  
  // Apply name search if exists
  if (currentSearchTerm) {
    sourceData = sourceData.filter(record => {
      const name = (record.userName || '').toLowerCase();
      return name.includes(currentSearchTerm.toLowerCase());
    });
  }
  
  if (filters.length === 0) {
    filteredRecords = sourceData;
    document.getElementById('filterStatus').textContent = '';
  } else {
    filteredRecords = sourceData.filter(record => {
      return filters.every(filter => {
        const cellValue = record[filter.column] || '';
        return String(cellValue).toLowerCase().includes(filter.value);
      });
    });
    document.getElementById('filterStatus').textContent = `Filtered (${filters.length})`;
  }
  
  // Update total count
  const totalRecordsCount = document.getElementById('totalRecordsCount');
  if (totalRecordsCount) {
    totalRecordsCount.textContent = filteredRecords.length;
  }
  
  currentPage = 1;
  toggleFilterMenu();
  
  const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
  if (filterWrapper) filterWrapper.classList.remove('active');
  
  applySort();
  renderPage();
};

window.applySort = function() {
  if (!filteredRecords || filteredRecords.length === 0) {
    console.warn('No data available for sorting');
    return;
  }
  
  const sortRows = document.querySelectorAll('#activeSorts .filter-row');
  const sorts = [];
  
  sortRows.forEach(row => {
    const selects = row.querySelectorAll('select');
    if (selects.length >= 2) {
      const column = selects[0].value;
      const orderValue = selects[1].value;
      sorts.push({
        column: column,
        ascending: orderValue === 'asc'
      });
    }
  });
  
  if (sorts.length > 0) {
    const sortedData = [...filteredRecords].sort((a, b) => {
      for (const sort of sorts) {
        const { column, ascending } = sort;
        let valueA, valueB;
        
        if (column === 'date' || column === 'timeIn' || column === 'timeOut') {
          valueA = a[column] || '';
          valueB = b[column] || '';
        } else {
          valueA = (a[column] || '').toLowerCase();
          valueB = (b[column] || '').toLowerCase();
        }
        
        if (valueA !== valueB) {
          return ascending ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
        }
      }
      return 0;
    });
    filteredRecords = sortedData;
  }
  
  currentPage = 1;
  toggleSortMenu();
  
  const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
  if (sortWrapper) sortWrapper.classList.remove('active');
  
  renderPage();
};

window.clearFilters = function() {
  const activeFilters = document.getElementById('activeFilters');
  if (activeFilters) activeFilters.innerHTML = '';
  
  filteredRecords = [...allRecords];
  document.getElementById('filterStatus').textContent = '';
  
  // Update total count
  const totalRecordsCount = document.getElementById('totalRecordsCount');
  if (totalRecordsCount) {
    totalRecordsCount.textContent = filteredRecords.length;
  }
  
  applySort();
  renderPage();
};

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

    // Load schedules for section information
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('schedule')
      .select('*');

    if (schedulesError) throw schedulesError;

    // Load sections
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('sections')
      .select('*');

    if (sectionsError) throw sectionsError;

    // Create a map of schedId to sectionName and subject
    const schedToSection = {};
    const schedToSubject = {};
    if (schedulesData && sectionsData) {
      schedulesData.forEach(sched => {
        const section = sectionsData.find(s => s.sectId === sched.sectId);
        if (section) {
          schedToSection[sched.schedId] = section.sectionName;
          schedToSubject[sched.schedId] = sched.subject || '';
        }
      });
    }

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
        const recordDate = record.timeIn ? getDateFromDB(record.timeIn) : null;
        const status = record.status || 'Present';
        const sectionName = record.schedId ? (schedToSection[record.schedId] || '') : '';
        const subjectName = record.schedId ? (schedToSubject[record.schedId] || '') : '';
        
        allRecords.push({
          userName: userName,
          section: sectionName,
          subject: subjectName,
          timeIn: formatTimeFromDB(record.timeIn),
          timeInOriginal: formatTimeFromDB24(record.timeIn),
          timeOut: formatTimeFromDB(record.timeOut),
          timeOutOriginal: formatTimeFromDB24(record.timeOut),
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

    // Sort by timestamp descending (latest clock-in first)
    const bodyPage = document.body.getAttribute('data-page');
    const isRecentClockinPage = bodyPage === 'recent_clockin';
    
    if (isRecentClockinPage) {
      allRecords.sort((a, b) => {
        const aValid = a.timestamp && a.timestamp !== null;
        const bValid = b.timestamp && b.timestamp !== null;
        
        if (!aValid && !bValid) return 0;
        if (!aValid) return 1;
        if (!bValid) return -1;
        
        const timeA = parseDatabaseTimestamp(a.timestamp);
        const timeB = parseDatabaseTimestamp(b.timestamp);
        
        if (!timeA || !timeB) return 0;
        
        return timeB - timeA;
      });
    } else {
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
    }
    
    
    updateDashboardStats();
    
    window.allRecords = allRecords;
    
    // Populate section filter dropdown
    if (sectionsData) {
      const sectionFilter = document.getElementById('filterSection');
      if (sectionFilter) {
        sectionsData.forEach(section => {
          const option = document.createElement('option');
          option.value = section.sectionName;
          option.textContent = section.sectionName;
          sectionFilter.appendChild(option);
        });
      }
    }
    
    const weeklyData = await getWeeklyAttendanceData();
    
    loadChart(() => {
      updateChart(weeklyData, 'weekly');
    });
    
    const isDashboard = document.getElementById('totalTeachers') !== null;
    
    recordsPerPage = isDashboard ? 5 : 10;
    
    if (isDashboard) {
      filteredRecords = [...allRecords].sort((a, b) => {
        const aValid = a.timestamp && a.timestamp !== null;
        const bValid = b.timestamp && b.timestamp !== null;
        
        if (!aValid && !bValid) return 0;
        if (!aValid) return 1;
        if (!bValid) return -1;
        
        const timeA = parseDatabaseTimestamp(a.timestamp);
        const timeB = parseDatabaseTimestamp(b.timestamp);
        
        if (!timeA || !timeB) return 0;
        
        return timeB - timeA;
      });
    } else {
      filteredRecords = [...allRecords];
      
      const totalRecentClockinsEl = document.getElementById('totalRecentClockins');
      if (totalRecentClockinsEl) {
        totalRecentClockinsEl.textContent = filteredRecords.length;
      }
      
      // Set total records count for recent clockin page
      const totalRecordsCount = document.getElementById('totalRecordsCount');
      if (totalRecordsCount) {
        totalRecordsCount.textContent = filteredRecords.length;
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
  
  activityFeed.innerHTML = pageRecords.map(record => {
    const status = record.status || 'Present';
    const statusLower = status.toLowerCase();
    let statusClass = statusLower;
    if (statusLower === 'incomplete') {
      statusClass = 'unattended';
    }
    return `
    <div class="user-table-row" style="background: #fff; border-bottom: 1px solid #e5e7eb; padding: 12px 16px; display: table; width: 100%; table-layout: fixed;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#fff'">
      <div style="display: table-cell; vertical-align: middle; width: 25%; padding-right: 20px;">
        <div style="font-weight: 700; font-size: 14px; color: #111827;">${record.userName}</div>
        <div style="font-size: 12px; color: #9ca3af;">${record.date}</div>
      </div>
      <div style="display: table-cell; vertical-align: middle; width: 25%; padding-left: 20px; padding-right: 20px;">
        <div style="font-size: 13px; color: #6b7280;">${record.section || 'N/A'}</div>
        <div style="font-size: 13px; color: #6b7280;">${record.subject || 'N/A'}</div>
      </div>
      <div style="display: table-cell; vertical-align: middle; width: 25%; padding-left: 20px; padding-right: 20px;">
        <div style="font-weight: 600; color: #10B981; font-size: 13px;">${record.timeIn}</div>
        <div style="font-weight: 600; color: #FF725E; font-size: 13px;">${record.timeOut}</div>
      </div>
      <div style="display: table-cell; vertical-align: middle; width: 25%; padding-left: 20px;">
        <span class="status-badge status-${statusClass}" style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">${status}</span>
      </div>
    </div>
  `; }).join('');
  
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
          getDateFromDB(a.timeIn) === today
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
  
  const exportBtn = document.getElementById('exportBtn');
  const exportMenu = document.getElementById('exportMenu');
  if (exportBtn && exportMenu && !exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
    exportMenu.style.display = 'none';
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

window.toggleExportMenu = function() {
  const exportMenu = document.getElementById('exportMenu');
  if (exportMenu) {
    exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
  }
};

window.exportDashboardCSV = function() {
  toggleExportMenu();
  const records = window.allRecords || [];
  
  if (records.length === 0) {
    alert('No data to export');
    return;
  }
  
  const headers = ['Name', 'Date', 'Time In', 'Status'];
  const csvContent = [
    headers.join(','),
    ...records.map(record => {
      const name = record.userName || '';
      const date = record.date || '';
      const timeIn = record.timeIn || '';
      const status = record.status || '';
      return `"${name}","${date}","${timeIn}","${status}"`;
    })
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `dashboard_data_full_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.exportDashboardJSON = function() {
  toggleExportMenu();
  const records = window.allRecords || [];
  
  if (records.length === 0) {
    alert('No data to export');
    return;
  }
  
  const exportData = records.map(record => ({
    name: record.userName || '',
    date: record.date || '',
    timeIn: record.timeIn || '',
    status: record.status || ''
  }));
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `dashboard_data_full_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
