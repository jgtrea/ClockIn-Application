let currentTrend = 'weekly';
let countType = 'total';
let statusType = 'present';
window.selectedDate = null;

document.addEventListener('DOMContentLoaded', function() {
});

function showDatePicker() {
  const dateInput = document.getElementById('chartDate');
  
  if (dateInput) {
    dateInput.showPicker();
  }
}

function toggleCountType() {
  countType = 'total';
  updateChartForTrend(currentTrend);
}

function toggleStatusType() {
  const select = document.getElementById('statusTypeSelect');
  if (select) {
    statusType = select.value;
    updateChartForTrend(currentTrend);
  }
}

function onTrendChange() {
  const select = document.getElementById('trendSelect');
  
  if (!select) {
    console.log('Elements not found');
    return;
  }
  
  window.selectedDate = null;
  switchTrend(select.value);
}

function onDateSelected() {
  const dateInput = document.getElementById('chartDate');
  const trendSelect = document.getElementById('trendSelect');
  const statsDateEl = document.getElementById('statsDate');
  
  window.selectedDate = dateInput.value;
  if (statsDateEl && window.selectedDate) {
    statsDateEl.value = window.selectedDate;
  }
  
  if (window.selectedDate) {
    if (trendSelect) {
      trendSelect.value = 'weekly';
    }
    currentTrend = 'weekly';
    updateChartForTrend('weekly');
    
    if (typeof calculateOverallStats === 'function') {
      calculateOverallStats();
    }
  }
}

let attendanceChart = null;

function updateChart(attendanceData, trend = 'weekly') {
  const chartContainer = document.getElementById('attendanceChart');
  
  if (!chartContainer) return;
  
  let referenceDate;
  if (window.selectedDate) {
    const parts = window.selectedDate.split('-');
    referenceDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    referenceDate = new Date();
  }
  
  const today = referenceDate;
  const labels = [];
  const isTodayFlags = [];
  
  if (trend === 'daily' && typeof attendanceData === 'object' && attendanceData.date) {
    const dateParts = attendanceData.date.split('-');
    const selectedDateView = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const dateLabel = selectedDateView.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    labels.push(dateLabel);
    isTodayFlags.push(selectedDateView.toDateString() === today.toDateString());
    attendanceData = [attendanceData.count];
  } else {
    const weekdays = [];
    
    let checkDate = new Date(referenceDate);
    while (weekdays.length < 7) {
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
        weekdays.unshift(new Date(checkDate));
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    for (let i = 0; i < 7; i++) {
      if (trend === 'weekly') {
        const date = weekdays[i];
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        isTodayFlags.push(date.toDateString() === today.toDateString());
      } else if (trend === 'monthly') {
        const date = new Date(today.getFullYear(), today.getMonth() - (6 - i), 1);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        isTodayFlags.push(date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear());
      } else if (trend === 'yearly') {
        const year = today.getFullYear() - (6 - i);
        labels.push(year.toString());
        isTodayFlags.push(year === today.getFullYear());
      }
    }
  }
  
  if (attendanceChart) {
    attendanceChart.destroy();
  }
  
  chartContainer.innerHTML = '<canvas id="chartCanvas"></canvas>';
  const ctx = document.getElementById('chartCanvas').getContext('2d');
  
  let totalUsers = window.dashboardStats?.totalInstances || 0;
  if (totalUsers === 0) {
    const maxValue = Math.max(...attendanceData);
    totalUsers = maxValue > 0 ? maxValue : 1;
  }
  
  attendanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: attendanceData,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500,
        easing: 'easeInOutQuart'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 6,
          displayColors: false,
          callbacks: {
            title: function(context) {
              return context[0].label;
            },
            label: function(context) {
              const value = context.raw;
              const percentage = totalUsers > 0 ? Math.round((value / totalUsers) * 100) : 0;
              const statusLabel = statusType.charAt(0).toUpperCase() + statusType.slice(1);
              return `${value} ${statusLabel.toLowerCase()} teacher${value !== 1 ? 's' : ''} (${percentage}%)`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 11
            },
            callback: function(value, index) {
              return isTodayFlags[index] ? this.getLabelForValue(value) : this.getLabelForValue(value);
            }
          },
          border: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#e5e7eb',
            drawBorder: false
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 11
            },
            stepSize: 1,
            padding: 8
          },
          border: {
            display: false
          }
        }
      }
    }
  });
}

function switchTrend(trend) {
  currentTrend = trend;
  updateChartForTrend(trend);
}

async function updateChartForTrend(trend) {
  let data;
  switch(trend) {
    case 'weekly':
      data = await getWeeklyAttendanceData();
      break;
    case 'monthly':
      data = await getMonthlyAttendanceData();
      break;
    case 'yearly':
      data = await getYearlyAttendanceData();
      break;
    case 'daily':
      data = await getDailyAttendanceData(window.selectedDate);
      break;
  }
  updateChart(data, trend);
}

async function getDailyAttendanceData(dateString) {
  const records = window.allRecords || [];
  
  if (!dateString) {
    const now = new Date();
    dateString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  
  let count = 0;
  const uniqueUsers = new Set();
  const detailedRecords = [];
  
  const statusMap = {
    'present': 'Present',
    'late': 'Late',
    'absent': 'Absent',
    'incomplete': 'Incomplete',
    'excused': 'Excused'
  };
  const targetStatus = statusMap[statusType] || 'Present';
  
  for (const record of records) {
    if (record.date === dateString && record.status === targetStatus) {
      if (countType === 'total') {
        count++;
      }
      uniqueUsers.add(record.userName);
      detailedRecords.push(record);
    }
  }
  
  return {
    date: dateString,
    count: countType === 'total' ? count : uniqueUsers.size,
    detailedRecords: detailedRecords
  };
}

async function getWeeklyAttendanceData() {
  const weeklyData = [];
  
  let referenceDate;
  if (window.selectedDate) {
    const parts = window.selectedDate.split('-');
    referenceDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    referenceDate = new Date();
  }
  
  const records = window.allRecords || [];
  
  const statusMap = {
    'present': 'Present',
    'late': 'Late',
    'absent': 'Absent',
    'incomplete': 'Incomplete',
    'excused': 'Excused'
  };
  const targetStatus = statusMap[statusType] || 'Present';
  
  const weekdays = [];
  
  let checkDate = new Date(referenceDate);
  while (weekdays.length < 7) {
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
      weekdays.unshift(new Date(checkDate));
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  for (let i = 0; i < 7; i++) {
    const date = weekdays[i];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    if (countType === 'total') {
      let count = 0;
      for (const record of records) {
        if (record.date === dateString && record.status === targetStatus) {
          count++;
        }
      }
      weeklyData.push(count);
    } else {
      const uniqueUsers = new Set();
      for (const record of records) {
        if (record.date === dateString && record.status === targetStatus) {
          uniqueUsers.add(record.userName);
        }
      }
      weeklyData.push(uniqueUsers.size);
    }
  }
  
  return weeklyData;
}

async function getMonthlyAttendanceData() {
  const monthlyData = [];
  const today = new Date();
  const records = window.allRecords || [];
  
  const statusMap = {
    'present': 'Present',
    'late': 'Late',
    'absent': 'Absent',
    'incomplete': 'Incomplete',
    'excused': 'Excused'
  };
  const targetStatus = statusMap[statusType] || 'Present';
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - (6 - i), 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    if (countType === 'total') {
      let count = 0;
      for (const record of records) {
        if (record.date && record.date.startsWith(`${year}-${month}`) && record.status === targetStatus) {
          count++;
        }
      }
      monthlyData.push(count);
    } else {
      const uniqueUsers = new Set();
      for (const record of records) {
        if (record.date && record.date.startsWith(`${year}-${month}`) && record.status === targetStatus) {
          uniqueUsers.add(record.userName);
        }
      }
      monthlyData.push(uniqueUsers.size);
    }
  }
  
  return monthlyData;
}

async function getYearlyAttendanceData() {
  const yearlyData = [];
  const currentYear = new Date().getFullYear();
  const records = window.allRecords || [];
  
  const statusMap = {
    'present': 'Present',
    'late': 'Late',
    'absent': 'Absent',
    'incomplete': 'Incomplete',
    'excused': 'Excused'
  };
  const targetStatus = statusMap[statusType] || 'Present';
  
  for (let i = 0; i < 7; i++) {
    const year = currentYear - (6 - i);
    
    if (countType === 'total') {
      let count = 0;
      for (const record of records) {
        if (record.date && record.date.startsWith(year.toString()) && record.status === targetStatus) {
          count++;
        }
      }
      yearlyData.push(count);
    } else {
      const uniqueUsers = new Set();
      for (const record of records) {
        if (record.date && record.date.startsWith(year.toString()) && record.status === targetStatus) {
          uniqueUsers.add(record.userName);
        }
      }
      yearlyData.push(uniqueUsers.size);
    }
  }
  
  return yearlyData;
}
