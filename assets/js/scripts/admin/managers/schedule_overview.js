class ScheduleOverview {
  constructor(supabaseClient, clockManager) {
    this.supabase = supabaseClient;
    this.clockManager = clockManager;
    this.sectionsContainer = document.getElementById('sectionsContainer');
  }

  parseDatabaseTimestamp(timestamp) {
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

  init() {
    this.loadSections();
    setInterval(() => this.refresh(), 30000);
  }

  async loadSections() {
    if (!this.supabase || !this.sectionsContainer) {
      setTimeout(() => this.loadSections(), 500);
      return;
    }

    const today = this.clockManager.getCurrentDay();

    try {
      const { data: sectionsData, error: sectionsError } = await this.supabase
        .from('sections')
        .select('*')
        .order('sectionName', { ascending: true });

      if (sectionsError) throw sectionsError;

      if (!sectionsData || sectionsData.length === 0) {
        this.sectionsContainer.innerHTML = '<p style="text-align: center; color: #9ca3af;">No sections found</p>';
        return;
      }

      const { data: schedulesData, error: schedulesError } = await this.supabase
        .from('schedule')
        .select('*')
        .eq('weekday', today);

      if (schedulesError) throw schedulesError;

      // Get employee (teacher) data for the schedule
      const teacherIds = schedulesData ? [...new Set(schedulesData.map(s => s.employeeId).filter(Boolean))] : [];
      let teacherMap = {};
      
      if (teacherIds.length > 0) {
        const { data: teachersData } = await this.supabase
          .from('user_employee_data')
          .select('employeeId, name')
          .in('employeeId', teacherIds);
        
        if (teachersData) {
          teachersData.forEach(teacher => {
            teacherMap[teacher.employeeId] = teacher.name;
          });
        }
      }

      // Get today's attendance records
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data: attendanceData, error: attendanceError } = await this.supabase
        .from('attendance')
        .select('*')
        .gte('timeIn', startOfDay.toISOString())
        .lte('timeIn', endOfDay.toISOString())
        .in('status', ['Present', 'Late']);

      if (attendanceError) console.error('Error loading attendance:', attendanceError);

      // Get employee names
      const employeeIds = attendanceData ? [...new Set(attendanceData.map(a => a.employeeId))] : [];
      let employeeMap = {};
      
      if (employeeIds.length > 0) {
        const { data: employeesData } = await this.supabase
          .from('user_employee_data')
          .select('employeeId, name')
          .in('employeeId', employeeIds);
        
        if (employeesData) {
          employeesData.forEach(emp => {
            employeeMap[emp.employeeId] = emp.name;
          });
        }
      }

      const sectionCards = sectionsData.map(section => 
        this.createSectionCard(section, schedulesData, attendanceData || [], employeeMap, teacherMap, today)
      );
      
      this.renderSections(sectionCards);

    } catch (err) {
      console.error('Error loading sections:', err);
      if (this.sectionsContainer) {
        this.sectionsContainer.innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading sections</p>';
      }
    }
  }

  createSectionCard(section, schedulesData, attendanceData, employeeMap, teacherMap, today) {
    const sectionSchedules = this.filterAndSortSchedules(section.sectId, schedulesData);
    const { currentSubject, timeRange, currentSchedule } = this.getCurrentClassInfo(sectionSchedules);
    
    let teacherStatus = '';
    if (currentSchedule) {
      // Fix: Check if the attendance timeIn is within the current class time range
      const currentStartMinutes = this.timeToMinutes(currentSchedule.startTime);
      const currentEndMinutes = this.timeToMinutes(currentSchedule.endTime);
      
      // Find attendance record where:
      // 1. The schedId matches the current schedule
      // 2. The timeIn is within the current class time range
      const attendance = attendanceData.find(a => {
        if (a.schedId !== currentSchedule.schedId) return false;
        if (!a.timeIn) return false;
        
        const attendanceTime = this.parseDatabaseTimestamp(a.timeIn);
        if (!attendanceTime || isNaN(attendanceTime.getTime())) return false;
        const attendanceMinutes = attendanceTime.getHours() * 60 + attendanceTime.getMinutes();
        
        // Check if attendance time is within the current class time range
        return attendanceMinutes >= currentStartMinutes && attendanceMinutes < currentEndMinutes;
      });
      
      if (attendance) {
        const teacherName = employeeMap[attendance.employeeId] || 'Teacher';
        teacherStatus = `<div style="font-size: 13px; color: #059669; margin-top: 4px; font-weight: 500;">👤 ${teacherName}</div>`;
      } else {
        teacherStatus = `<div style="font-size: 13px; color: #9ca3af; margin-top: 4px;">⏳ Waiting</div>`;
      }
    }

    return `
      <div class="section-card" style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; min-height: 300px;">
        <h2 onclick="scheduleOverview.showWeeklySchedule('${section.sectId}', '${section.sectionName.replace(/'/g, "\\'")}')" 
            style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px 0; text-align: center; cursor: pointer; text-decoration: underline;">
          ${section.sectionName}
        </h2>
        <div style="margin-bottom: 16px; text-align: center; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-size: 14px; color: #6b7280;">Current Class: ${currentSubject}</div>
          ${timeRange ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">${timeRange}</div>` : ''}
          ${teacherStatus}
        </div>
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 8px;">${today}'s Schedule:</div>
          <div id="schedule-${section.sectId}" style="font-size: 13px; color: #6b7280;">
            ${this.renderScheduleList(sectionSchedules, teacherMap)}
          </div>
        </div>
      </div>
    `;
  }

  filterAndSortSchedules(sectId, schedulesData) {
    return schedulesData
      .filter(s => s.sectId === sectId)
      .sort((a, b) => this.compareTimeStrings(a.startTime, b.startTime));
  }

  compareTimeStrings(timeA, timeB) {
    const minutesA = this.timeToMinutes(timeA);
    const minutesB = this.timeToMinutes(timeB);
    return minutesA - minutesB;
  }

  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  getCurrentClassInfo(sectionSchedules) {
    const currentMinutes = this.clockManager.getCurrentTimeInMinutes();
    let currentSubject = 'No class';
    let timeRange = '';
    let currentSchedule = null;

    for (const schedule of sectionSchedules) {
      const startMinutes = this.timeToMinutes(schedule.startTime);
      const endMinutes = this.timeToMinutes(schedule.endTime);

      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        currentSubject = schedule.subject || 'No Subject';
        timeRange = `${schedule.startTime} - ${schedule.endTime}`;
        currentSchedule = schedule;
        return { currentSubject, timeRange, currentSchedule };
      }
    }

    if (sectionSchedules.length > 0) {
      const firstSchedule = sectionSchedules[0];
      const firstStartMinutes = this.timeToMinutes(firstSchedule.startTime);
      if (currentMinutes < firstStartMinutes) {
        timeRange = `Next: ${firstSchedule.subject || 'No Subject'} at ${firstSchedule.startTime}`;
      }
    }

    return { currentSubject, timeRange, currentSchedule };
  }

  renderScheduleList(sectionSchedules, teacherMap) {
    if (sectionSchedules.length === 0) {
      return '<div style="color: #9ca3af; font-style: italic;">No classes scheduled</div>';
    }

    return sectionSchedules.map(s => {
      const teacherName = s.employeeId ? (teacherMap[s.employeeId] || 'Unassigned') : 'Unassigned';
      return `
        <div style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 500;">${s.subject || 'No Subject'}</span>
            <span style="color: #9ca3af; font-size: 12px;">${s.startTime} - ${s.endTime}</span>
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">👤 ${teacherName}</div>
        </div>
      `;
    }).join('');
  }

  renderSections(sectionCards) {
    this.sectionsContainer.innerHTML = 
      '<div id="sectionsGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 1200px; margin: 0 auto;">' + 
      sectionCards.join('') + '</div>';
  }

  async showWeeklySchedule(sectionId, sectionName) {
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    if (!modalTitle || !modalContent) return;
    
    modalTitle.textContent = `${sectionName} - Weekly Schedule`;
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayButtons = days.map(day => 
      `<button onclick="scheduleOverview.loadDaySchedule('${sectionId}', '${day}')" style="margin: 5px; padding: 8px 16px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; cursor: pointer;">${day}</button>`
    ).join('');
    
    modalContent.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Select a day to view schedule:</div>
        <div>${dayButtons}</div>
      </div>
      <div id="dayScheduleContent" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="text-align: center; color: #9ca3af;">Select a day to view its schedule</p>
      </div>
    `;
    
    this.openModal();
  }

  openModal() {
    const scheduleModal = document.getElementById('scheduleModal');
    if (scheduleModal) {
      scheduleModal.style.display = 'flex';
    }
  }

  async loadDaySchedule(sectionId, day) {
    const contentEl = document.getElementById('dayScheduleContent');
    if (!contentEl) return;
    
    contentEl.innerHTML = '<p style="text-align: center; color: #9ca3af;">Loading...</p>';
    
    if (!this.supabase) return;
    
    try {
      const { data: schedulesData, error: schedulesError } = await this.supabase
        .from('schedule')
        .select('*')
        .eq('sectId', sectionId)
        .eq('weekday', day);

      if (schedulesError) throw schedulesError;

      // Get teacher data
      const teacherIds = schedulesData ? [...new Set(schedulesData.map(s => s.employeeId).filter(Boolean))] : [];
      let teacherMap = {};
      
      if (teacherIds.length > 0) {
        const { data: teachersData } = await this.supabase
          .from('user_employee_data')
          .select('employeeId, name')
          .in('employeeId', teacherIds);
        
        if (teachersData) {
          teachersData.forEach(teacher => {
            teacherMap[teacher.employeeId] = teacher.name;
          });
        }
      }

      if (!schedulesData || schedulesData.length === 0) {
        contentEl.innerHTML = `<p style="text-align: center; color: #9ca3af;">No classes scheduled for ${day}</p>`;
      } else {
        schedulesData.sort((a, b) => this.compareTimeStrings(a.startTime, b.startTime));
        
        contentEl.innerHTML = `
          <h4 style="margin: 0 0 12px 0; color: #111827;">${day} Schedule</h4>
          ${schedulesData.map(s => {
            const teacherName = s.employeeId ? (teacherMap[s.employeeId] || 'Unassigned') : 'Unassigned';
            return `<div style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: #111827;">${s.subject || 'No Subject'}</span>
                <span style="color: #6b7280;">${s.startTime} - ${s.endTime}</span>
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">👤 ${teacherName}</div>
            </div>`;
          }).join('')}
        `;
      }
    } catch (e) {
      console.error('Error loading day schedule:', e);
      contentEl.innerHTML = `<p style="text-align: center; color: #ef4444;">Error loading ${day} schedule</p>`;
    }
  }

  closeModal() {
    const scheduleModal = document.getElementById('scheduleModal');
    if (scheduleModal) {
      scheduleModal.style.display = 'none';
    }
  }

  refresh() {
    this.loadSections();
  }
}

window.ScheduleOverview = ScheduleOverview;
