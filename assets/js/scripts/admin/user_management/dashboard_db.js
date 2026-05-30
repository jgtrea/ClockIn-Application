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

function getLocalDateString(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateFromDB(timestamp) {
  if (!timestamp) return null;

  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return null;

  return getLocalDateString(date);
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
  window.searchUsername(term);
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

let rcSortCol = 'date';
let rcSortAsc = false;

function applyCurrentSort() {
  filteredRecords = [...filteredRecords].sort((a, b) => {
    const va = String(a[rcSortCol] || '').toLowerCase();
    const vb = String(b[rcSortCol] || '').toLowerCase();
    if (va === vb) return 0;
    return (va > vb ? 1 : -1) * (rcSortAsc ? 1 : -1);
  });
}

function updateSortHeaders() {
  document.querySelectorAll('th.sortable-header').forEach(th => th.classList.remove('asc', 'desc'));
  const active = document.querySelector(`th.sortable-header[onclick="sortTable('${rcSortCol}')"]`);
  if (active) active.classList.add(rcSortAsc ? 'asc' : 'desc');
}

window.sortTable = function(col) {
  rcSortAsc = rcSortCol === col ? !rcSortAsc : true;
  rcSortCol = col;
  applyCurrentSort();
  updateSortHeaders();
  currentPage = 1;
  renderPage();
};

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
    <button class="remove-filter-btn" onclick="event.stopPropagation(); this.parentElement.remove()">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;
  
  activeFilters.appendChild(filterRow);
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

  applyCurrentSort();
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
  
  applyCurrentSort();
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
  totalEmployees: 0,
  totalInstances: 0,
  onSchedule: 0,
  late: 0,
  absent: 0,
  excused: 0,
  incomplete: 0
};

function updateDashboardStats() {
  const totalEmployeesEl = document.getElementById('totalEmployees');
  const totalInstancesEl = document.getElementById('totalInstances');
  const onScheduleEl = document.getElementById('onSchedule');
  const lateTodayEl = document.getElementById('lateToday');
  const absentTodayEl = document.getElementById('absentToday');
  const excusedTodayEl = document.getElementById('excusedToday');
  const incompleteTodayEl = document.getElementById('incompleteToday');
  
  const onSchedulePct = document.getElementById('onSchedulePct');
  const lateTodayPct = document.getElementById('lateTodayPct');
  const absentTodayPct = document.getElementById('absentTodayPct');
  const excusedTodayPct = document.getElementById('excusedTodayPct');
  const incompleteTodayPct = document.getElementById('incompleteTodayPct');
  
  if (totalEmployeesEl) totalEmployeesEl.textContent = window.dashboardStats.totalEmployees;
  if (totalInstancesEl) totalInstancesEl.textContent = window.dashboardStats.totalInstances;
  if (onScheduleEl) onScheduleEl.textContent = window.dashboardStats.onSchedule;
  if (lateTodayEl) lateTodayEl.textContent = window.dashboardStats.late;
  if (absentTodayEl) absentTodayEl.textContent = window.dashboardStats.absent;
  if (excusedTodayEl) excusedTodayEl.textContent = window.dashboardStats.excused;
  if (incompleteTodayEl) incompleteTodayEl.textContent = window.dashboardStats.incomplete;
  
  // Calculate percentages based on total instances (onSchedule + late + absent + excused + incomplete)
  const total = window.dashboardStats.totalInstances || 1;
  if (onSchedulePct) onSchedulePct.textContent = total > 0 ? Math.round((window.dashboardStats.onSchedule / total) * 100) + '%' : '0%';
  if (lateTodayPct) lateTodayPct.textContent = total > 0 ? Math.round((window.dashboardStats.late / total) * 100) + '%' : '0%';
  if (absentTodayPct) absentTodayPct.textContent = total > 0 ? Math.round((window.dashboardStats.absent / total) * 100) + '%' : '0%';
  if (excusedTodayPct) excusedTodayPct.textContent = total > 0 ? Math.round((window.dashboardStats.excused / total) * 100) + '%' : '0%';
  if (incompleteTodayPct) incompleteTodayPct.textContent = total > 0 ? Math.round((window.dashboardStats.incomplete / total) * 100) + '%' : '0%';
}

window.calculateOverallStats = function() {
  const records = window.allRecords || [];
  
  // Get selected date from statsDate input, or default to today
  const statsDateEl = document.getElementById('statsDate');
  let selectedDate = statsDateEl?.value;
  
  // If no date is selected, default to today and set the input
  if (!selectedDate) {
    selectedDate = getLocalDateString();
    if (statsDateEl) {
      statsDateEl.value = selectedDate;
    }
    // Also sync the chart date
    const chartDateEl = document.getElementById('chartDate');
    if (chartDateEl) {
      chartDateEl.value = selectedDate;
    }
  }

  // Get total employees from usersData if available, otherwise from records
  if (window.allUsers && Array.isArray(window.allUsers)) {
    window.dashboardStats.totalEmployees = window.allUsers.length;
  } else {
    const uniqueUsers = new Set(records.map(r => r.userName));
    window.dashboardStats.totalEmployees = uniqueUsers.size;
  }
  
  // Filter records by selected date
  const filteredRecords = records.filter(r => r.date === selectedDate);
  
  window.dashboardStats.totalInstances = filteredRecords.length;
  window.dashboardStats.onSchedule = filteredRecords.filter(r => r.status === 'Present').length;
  window.dashboardStats.late = filteredRecords.filter(r => r.status === 'Late').length;
  window.dashboardStats.absent = filteredRecords.filter(r => r.status === 'Absent').length;
  window.dashboardStats.excused = filteredRecords.filter(r => r.status === 'Excused').length;
  window.dashboardStats.incomplete = filteredRecords.filter(r => r.status === 'Incomplete').length;
  
  updateDashboardStats();
}

// Handle stats date change
window.onStatsDateChanged = function() {
  const statsDateEl = document.getElementById('statsDate');
  const chartDateEl = document.getElementById('chartDate');
  const searchInput = document.getElementById('searchUsernameInput');
  const selectedUser = searchInput?.value;
  
  if (statsDateEl && statsDateEl.value) {
    // Sync the chart date picker
    if (chartDateEl) {
      chartDateEl.value = statsDateEl.value;
    }
    
    // Update the chart's selected date and refresh
    if (typeof updateChartForTrend === 'function') {
      if (typeof window.selectedDate !== 'undefined') {
        window.selectedDate = statsDateEl.value;
      }
      updateChartForTrend('weekly');
    }
    
    // If a user is selected, recalculate their stats for the new date
    if (selectedUser) {
      window.onUserSelected(selectedUser);
    } else {
      // Otherwise calculate overall stats for the selected date
      window.calculateOverallStats();
      initStatsPagination();
    }
  } else {
    // No date selected - default to today
    const today = getLocalDateString();
    statsDateEl.value = today;

    // Sync the chart date picker
    if (chartDateEl) {
      chartDateEl.value = today;
    }
    
    // Update the chart
    if (typeof updateChartForTrend === 'function') {
      if (typeof window.selectedDate !== 'undefined') {
        window.selectedDate = today;
      }
      updateChartForTrend('weekly');
    }
    
    // Show today's overall stats
    if (selectedUser) {
      window.onUserSelected(selectedUser);
    } else {
      window.calculateOverallStats();
      initStatsPagination();
    }
  }
};

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
    
    const today = getLocalDateString();

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
      });
    });
    
    window.allRecords = allRecords;
    window.allUsers = usersData;
    
    // Populate user datalist with all employees
    populateUserList();
    
    // Calculate stats using instance-based calculation
    calculateOverallStats();
    
    // Initialize stats pagination
    initStatsPagination();
    
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
    
    // Use updateChartForTrend from attendance_trend_db.js
    if (typeof updateChartForTrend === 'function') {
      updateChartForTrend('weekly');
    } else {
      loadChart(() => {
        if (typeof updateChart === 'function') {
          updateChart(weeklyData, 'weekly');
        }
      });
    }
    
    const isDashboard = document.getElementById('totalInstances') !== null;
    
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
      applyCurrentSort();
      updateSortHeaders();

      const totalRecentClockinsEl = document.getElementById('totalRecentClockins');
      if (totalRecentClockinsEl) {
        totalRecentClockinsEl.textContent = filteredRecords.length;
      }

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
  
  const isRecentPage = document.body.dataset.page === 'recent_clockin';

  activityFeed.innerHTML = pageRecords.map(record => {
    const status = record.status || 'Present';
    const statusLower = status.toLowerCase();
    const statusClass = statusLower === 'incomplete' ? 'unattended' : statusLower;

    if (isRecentPage) {
      return `
      <tr class="user-table-row">
        <td>
          <div style="font-weight: 600; font-size: 14px; color: #111827;">${record.userName}</div>
          <div style="font-size: 12px; color: #9ca3af;">${record.date}</div>
        </td>
        <td>
          <div style="font-size: 13px; color: #374151;">${record.section || 'N/A'}</div>
          <div style="font-size: 12px; color: #9ca3af;">${record.subject || 'N/A'}</div>
        </td>
        <td>
          <div style="font-weight: 600; color: #10B981; font-size: 13px;">${record.timeIn}</div>
          <div style="font-weight: 600; color: #FF725E; font-size: 13px;">${record.timeOut}</div>
        </td>
        <td><span class="status-badge status-${statusClass}">${status}</span></td>
      </tr>`;
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
    </div>`;
  }).join('');
  
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

window.changePage = function(direction) {
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const newPage = currentPage + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderPage();
  }
};

window.goToFirstPage = function() {
  currentPage = 1;
  renderPage();
};

window.goToLastPage = function() {
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  currentPage = totalPages;
  renderPage();
};

window.goToPage = function(pageNum) {
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const page = parseInt(pageNum);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderPage();
  }
};

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

// Stats pagination with scroll animation
let statsScrollPosition = 0;
let statsCardWidth = 0;
const statsVisibleCards = 5;

function initStatsPagination() {
  statsScrollPosition = 0;
  const container = document.getElementById('statsScrollContainer');
  const firstCard = container?.querySelector('.stat-card');
  if (firstCard) {
    statsCardWidth = firstCard.offsetWidth + 12; // card width + gap
  }
  
  if (container) {
    container.scrollLeft = 0;
    container.addEventListener('scroll', function() {
      statsScrollPosition = container.scrollLeft;
      updateStatsScrollButtons();
    });
  }
  updateStatsScrollButtons();
}

window.changeStatsPage = function(direction) {
  const container = document.getElementById('statsScrollContainer');
  if (!container || statsCardWidth === 0) return;
  
  const maxScroll = container.scrollWidth - container.clientWidth;
  const scrollAmount = statsCardWidth * statsVisibleCards;
  
  if (direction === 1) {
    const newPosition = Math.min(statsScrollPosition + scrollAmount, maxScroll);
    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    statsScrollPosition = newPosition;
  } else {
    const newPosition = Math.max(statsScrollPosition - scrollAmount, 0);
    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    statsScrollPosition = newPosition;
  }
  
  updateStatsScrollButtons();
};

function updateStatsScrollButtons() {
  const container = document.getElementById('statsScrollContainer');
  const statsPrevBtn = document.getElementById('statsPrevBtn');
  const statsNextBtn = document.getElementById('statsNextBtn');
  
  if (!container) return;
  
  const maxScroll = container.scrollWidth - container.clientWidth;
  
  if (statsPrevBtn) {
    statsPrevBtn.style.opacity = statsScrollPosition <= 0 ? '0.5' : '1';
    statsPrevBtn.style.pointerEvents = statsScrollPosition <= 0 ? 'none' : 'auto';
  }
  
  if (statsNextBtn) {
    statsNextBtn.style.opacity = statsScrollPosition >= maxScroll ? '0.5' : '1';
    statsNextBtn.style.pointerEvents = statsScrollPosition >= maxScroll ? 'none' : 'auto';
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

window.searchUsername = function(term) {
  currentSearchTerm = term || '';
  
  // Check if term matches exactly a username (for dropdown selection)
  const userList = document.getElementById('userList');
  const matchingOption = userList?.querySelector(`option[value="${term}"]`);
  
  if (matchingOption) {
    // User selected from dropdown - show individual stats
    window.onUserSelected(term);
  } else if (!term) {
    // Clear user filter, show all
    window.clearUserFilter();
    window.applyFilters();
  } else {
    // Typing search - just filter the table
    window.applyFilters();
  }
}

// Handle user selection from datalist
window.onUserSelected = function(userName) {
  if (!userName) {
    window.clearUserFilter();
    window.calculateOverallStats();
    return;
  }
  
  // Get selected date - default to today if not set
  const statsDateEl = document.getElementById('statsDate');
  let selectedDate = statsDateEl?.value;
  
  // If no date is selected, default to today
  if (!selectedDate) {
    selectedDate = getLocalDateString();
    if (statsDateEl) {
      statsDateEl.value = selectedDate;
    }

    // Also sync the chart date
    const chartDateEl = document.getElementById('chartDate');
    if (chartDateEl) {
      chartDateEl.value = selectedDate;
    }
  }

  // Filter records for selected user AND date
  let userRecords = allRecords.filter(record => record.userName === userName);
  
  if (selectedDate) {
    userRecords = userRecords.filter(record => record.date === selectedDate);
  }
  
  // Update dashboard stats for the selected user
  window.dashboardStats = {
    totalEmployees: 1,
    totalInstances: userRecords.length,
    onSchedule: userRecords.filter(r => r.status === 'Present').length,
    late: userRecords.filter(r => r.status === 'Late').length,
    absent: userRecords.filter(r => r.status === 'Absent').length,
    excused: userRecords.filter(r => r.status === 'Excused').length,
    incomplete: userRecords.filter(r => r.status === 'Incomplete').length
  };
  
  // Calculate percentages
  const total = window.dashboardStats.totalInstances || 1;
  window.dashboardStats.onSchedulePct = Math.round((window.dashboardStats.onSchedule / total) * 100);
  window.dashboardStats.latePct = Math.round((window.dashboardStats.late / total) * 100);
  window.dashboardStats.absentPct = Math.round((window.dashboardStats.absent / total) * 100);
  window.dashboardStats.incompletePct = Math.round((window.dashboardStats.incomplete / total) * 100);
  window.dashboardStats.excusedPct = Math.round((window.dashboardStats.excused / total) * 100);
  
  window.updateDashboardStats();
};

// Clear user filter and show overall stats
window.clearUserFilter = function() {
  const searchInput = document.getElementById('searchUsernameInput');
  if (searchInput) {
    searchInput.value = '';
  }
  currentSearchTerm = '';
  window.calculateOverallStats();
};

// Populate user datalist
function populateUserList() {
  const userList = document.getElementById('userList');
  if (!userList) return;
  
  // Get unique usernames from records
  const usernames = new Set();
  allRecords.forEach(record => {
    if (record.userName) {
      usernames.add(record.userName);
    }
  });
  
  // Also add from allUsers if available
  if (window.allUsers && Array.isArray(window.allUsers)) {
    window.allUsers.forEach(user => {
      if (user.name) {
        usernames.add(user.name);
      }
    });
  }
  
  // Clear and populate
  userList.innerHTML = '';
  usernames.forEach(username => {
    const option = document.createElement('option');
    option.value = username;
    userList.appendChild(option);
  });
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
  
  dateInput.value = getLocalDateString();
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
      // Use updateChartForTrend from attendance_trend_db.js
      if (typeof updateChartForTrend === 'function') {
        updateChartForTrend('weekly');
      } else if (typeof updateChart === 'function') {
        const weeklyData = await getWeeklyAttendanceData();
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
