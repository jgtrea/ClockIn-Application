let currentTrend = 'weekly';

function updateChart(attendanceData, trend = 'weekly') {
  const maxValue = Math.max(...attendanceData);
  const [step, topValue, lineCount] = ((m)=>{let r=m/5,p=10**Math.floor(Math.log10(r)),s=[1,2,5,10].find(x=>r<=x*p)*p,t=Math.ceil(m/s)*s;return[s,t,t/s]})(maxValue || 1);
  const chart = document.getElementById('attendanceChart');
  chart.innerHTML = '';
  
  for (let i = 0; i <= lineCount; i++) {
    const value = topValue - (i * step);
    const chartHeight = 160;
    const spacing = chartHeight / lineCount;
    
    let labelPosition, linePosition;
    
    const topPos = 20 + (i * spacing);
    labelPosition = `top: ${topPos - 3}px`;
    linePosition = `top: ${topPos + 6}px`;
    
    const label = document.createElement('div');
    label.className = 'y-label';
    label.style.cssText = `position: absolute; left: 10px; ${labelPosition}; font-size: 12px; color: #6b7280;`;
    label.textContent = value;
    chart.appendChild(label);
    
    const line = document.createElement('div');
    line.className = 'grid-line';
    line.style.cssText = `position: absolute; ${linePosition}; left: 25px; right: 15px; height: 1px; background: #e5e7eb; z-index: 1;`;
    chart.appendChild(line);
  }
  
  const today = new Date();
  const chartHeight = 160;
  const spacing = chartHeight / lineCount;
  const zeroLineTop = 20 + (lineCount * spacing) + 6;
  
  attendanceData.forEach((value, index) => {
    const height = Math.max((value / topValue) * chartHeight, 3);
    let date, isToday = false;
    
    if (trend === 'weekly') {
      date = new Date(today);
      date.setDate(today.getDate() - (3 - index));
      isToday = date.toDateString() === today.toDateString();
    } else if (trend === 'monthly') {
      const date = new Date(today.getFullYear(), today.getMonth() - (3 - index), 1);
      isToday = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    } else if (trend === 'yearly') {
      const year = today.getFullYear() - (3 - index);
      isToday = year === today.getFullYear();
    }
    
    const chartWidth = chart.offsetWidth - 50;
    const barWidth = Math.min(40, chartWidth / 7 - 10);
    const barSpacing = chartWidth / 7;
    const barLeft = 25 + (index * barSpacing) + (barSpacing - barWidth) / 2;
    
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.cssText = `position: absolute; top: ${zeroLineTop - height}px; height: ${height}px; width: ${barWidth}px; left: ${barLeft}px; z-index: 2; background: ${isToday ? '#3b82f6' : '#d1d5db'}; border-radius: 4px 4px 0 0;`;
    
    chart.appendChild(bar);
  });
  
  const weekLabelsContainer = document.createElement('div');
  weekLabelsContainer.style.cssText = 'position: absolute; bottom: -50px; left: 25px; right: 25px; display: flex;';
  
  attendanceData.forEach((value, index) => {
    let labelText = '';
    let isToday = false;
    
    const chartWidth = chart.offsetWidth - 50;
    const barSpacing = chartWidth / 7;
    
    const dayContainer = document.createElement('div');
    dayContainer.style.cssText = `display: flex; flex-direction: column; align-items: center; width: ${barSpacing}px;`;
    
    if (trend === 'weekly') {
      const date = new Date(today);
      date.setDate(today.getDate() - (3 - index));
      const dayNumber = date.getDate();
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      isToday = date.toDateString() === today.toDateString();
      
      const dayNumberSpan = document.createElement('span');
      dayNumberSpan.style.cssText = `font-size: 12px; color: ${isToday ? '#000' : '#6b7280'}; font-weight: ${isToday ? 'bold' : '500'};`;
      dayNumberSpan.textContent = dayNumber;
      
      const dayNameSpan = document.createElement('span');
      dayNameSpan.style.cssText = `font-size: 12px; color: ${isToday ? '#000' : '#6b7280'}; font-weight: ${isToday ? 'bold' : '500'};`;
      dayNameSpan.textContent = dayName;
      
      dayContainer.appendChild(dayNumberSpan);
      dayContainer.appendChild(dayNameSpan);
    } else if (trend === 'monthly') {
      const date = new Date(today.getFullYear(), today.getMonth() - (3 - index), 1);
      const isCurrentMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      isToday = isCurrentMonth;
      labelText = date.toLocaleDateString('en-US', { month: 'short' });
      
      const label = document.createElement('span');
      label.style.cssText = `font-size: 12px; color: ${isToday ? '#000' : '#6b7280'}; font-weight: ${isToday ? 'bold' : '500'};`;
      label.textContent = labelText;
      dayContainer.appendChild(label);
    } else if (trend === 'yearly') {
      const year = today.getFullYear() - (3 - index);
      const isCurrentYear = year === today.getFullYear();
      isToday = isCurrentYear;
      labelText = year.toString();
      
      const label = document.createElement('span');
      label.style.cssText = `font-size: 12px; color: ${isToday ? '#000' : '#6b7280'}; font-weight: ${isToday ? 'bold' : '500'};`;
      label.textContent = labelText;
      dayContainer.appendChild(label);
    }
    
    weekLabelsContainer.appendChild(dayContainer);
  });
  
  chart.appendChild(weekLabelsContainer);
}

function switchTrend(trend) {
  currentTrend = trend;
  
  document.querySelectorAll('[id$="Btn"]').forEach(btn => {
    btn.style.background = 'white';
    btn.style.color = '#6b7280';
    btn.style.border = '1px solid #d1d5db';
  });
  
  const activeBtn = document.getElementById(trend + 'Btn');
  activeBtn.style.background = '#FF725E';
  activeBtn.style.color = 'white';
  activeBtn.style.border = '1px solid #FF725E';
  
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
  }
  updateChart(data, trend);
}

async function getWeeklyAttendanceData() {
  const weeklyData = [0, 0, 0, 0, 0, 0, 0];
  const today = new Date();
  
  console.log('Getting weekly data for dates:');
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (3 - i));
    const dateString = date.toISOString().split('T')[0];
    console.log(`Day ${i}: ${dateString}`);
    
    let dayCount = 0;
    for (const record of allRecords) {
      if (record.date === dateString) {
        dayCount++;
      }
    }
    console.log(`Count for ${dateString}: ${dayCount}`);
    weeklyData[i] = dayCount;
  }
  
  console.log('Weekly data:', weeklyData);
  return weeklyData;
}

async function getMonthlyAttendanceData() {
  const monthlyData = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - (3 - i), 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    let monthCount = 0;
    for (const record of allRecords) {
      if (record.date && record.date.startsWith(`${year}-${month}`)) {
        monthCount++;
      }
    }
    monthlyData.push(monthCount);
  }
  
  return monthlyData;
}

async function getYearlyAttendanceData() {
  const yearlyData = [];
  const currentYear = new Date().getFullYear();
  
  for (let i = 0; i < 7; i++) {
    const year = currentYear - (3 - i);
    
    let yearCount = 0;
    for (const record of allRecords) {
      if (record.date && record.date.startsWith(year.toString())) {
        yearCount++;
      }
    }
    yearlyData.push(yearCount);
  }
  
  return yearlyData;
}