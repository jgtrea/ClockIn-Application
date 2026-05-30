document.addEventListener('DOMContentLoaded', async () => {
  const homeManager = new HomeManager();
  homeManager.init();
});

class HomeManager {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.currentClass = null;
  }

  async init() {
    this.supabase = await UserShared.waitForSupabase();
    if (!this.supabase) {
      console.error('Supabase not initialized');
      return;
    }

    await this.loadGreeting();
    this.setupEventListeners();
    await Promise.all([
      this.loadCurrentClass(),
      this.loadWeeklyStats(),
      this.loadAnnouncements()
    ]);
  }

  async loadGreeting() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) return;
      
      const email = session.user.email;
      const { data: empData } = await this.supabase
        .from('user_employee_data')
        .select('name')
        .ilike('email', email)
        .maybeSingle();
      
      const displayName = empData?.name || email.split('@')[0];
      
      const welcomeEl = document.getElementById('welcomeMessage');
      if (welcomeEl) {
        const hour = new Date().getHours();
        let greeting = 'Welcome';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';
        else greeting = 'Good evening';
        
        welcomeEl.textContent = `${greeting}, ${displayName}`;
      }
    } catch (err) {
      console.error('Error loading greeting:', err);
    }
  }

  setupEventListeners() {
    const expandBtn = document.getElementById('expandAnnouncements');
    const announcementsModal = document.getElementById('announcementsModal');
    const closeModal = document.getElementById('closeAnnouncementsModal');

    if (expandBtn && announcementsModal) {
      expandBtn.addEventListener('click', () => {
        announcementsModal.style.display = 'flex';
      });
    }

    if (closeModal && announcementsModal) {
      closeModal.addEventListener('click', () => {
        announcementsModal.style.display = 'none';
      });
    }

    if (announcementsModal) {
      announcementsModal.addEventListener('click', (e) => {
        if (e.target === announcementsModal) {
          announcementsModal.style.display = 'none';
        }
      });
    }
  }

  async loadCurrentClass() {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.toTimeString().substring(0, 5);

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = days[dayOfWeek];

      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) return;
      
      const email = session.user.email;
      const { data: empData } = await this.supabase
        .from('user_employee_data')
        .select('employeeId')
        .ilike('email', email)
        .maybeSingle();
      
      if (!empData?.employeeId) {
        this.updateClassDisplay(null, 'No class assigned');
        return;
      }

      const { data: scheduleData } = await this.supabase
        .from('schedule')
        .select('*')
        .eq('employeeId', empData.employeeId)
        .eq('weekday', currentDay)
        .order('startTime', { ascending: true });

      if (!scheduleData?.length) {
        this.updateClassDisplay(null, 'No classes today');
        return;
      }

      let currentClass = null;
      for (const classItem of scheduleData) {
        if (classItem.startTime <= currentTime && classItem.endTime >= currentTime) {
          currentClass = classItem;
          break;
        }
      }

      if (!currentClass) {
        const upcomingClasses = scheduleData.filter(c => c.startTime > currentTime);
        if (upcomingClasses.length > 0) {
          currentClass = upcomingClasses[0];
        }
      }

      this.currentClass = currentClass;
      this.updateClassDisplay(currentClass, null);

    } catch (err) {
      console.error('Error loading current class:', err);
      this.updateClassDisplay(null, 'Error loading class');
    }
  }

  updateClassDisplay(classData, fallbackMessage) {
    const classNameEl = document.getElementById('currentClassName');
    const classTimeEl = document.getElementById('classTime');
    const statusEl = document.getElementById('classStatus');

    if (classData) {
      const className = classData.sectionName || classData.subject || 'Class';
      if (classNameEl) classNameEl.textContent = className;
      
      if (classTimeEl) {
        classTimeEl.textContent = `${this.formatTime(classData.startTime)} - ${this.formatTime(classData.endTime)}`;
      }
      
      const now = new Date();
      const currentTime = now.toTimeString().substring(0, 5);
      const isInClass = classData.startTime <= currentTime && classData.endTime >= currentTime;
      
      if (statusEl) {
        statusEl.textContent = isInClass ? 'In Session' : 'Upcoming';
      }
    } else {
      if (classNameEl) classNameEl.textContent = fallbackMessage || 'No current class';
      if (classTimeEl) classTimeEl.textContent = '';
      if (statusEl) statusEl.textContent = 'Free';
    }
  }

  formatTime(time) {
    if (!time) return '';
    const parts = time.split(':');
    const h = parseInt(parts[0]);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${parts[1] || '00'} ${ampm}`;
  }

  async loadWeeklyStats() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) return;
      
      const email = session.user.email;
      const { data: empData } = await this.supabase
        .from('user_employee_data')
        .select('employeeId')
        .ilike('email', email)
        .maybeSingle();
      
      if (!empData?.employeeId) return;

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const { data: attendanceData } = await this.supabase
        .from('attendance')
        .select('status')
        .eq('employeeId', empData.employeeId)
        .gte('timeIn', startOfWeek.toISOString())
        .lt('timeIn', endOfWeek.toISOString());

      const records = attendanceData || [];
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const total = records.length;

      document.getElementById('presentCount').textContent = present;
      document.getElementById('absentCount').textContent = absent;
      document.getElementById('lateCount').textContent = late;
      document.getElementById('totalClasses').textContent = total;

    } catch (err) {
      console.error('Error loading weekly stats:', err);
    }
  }

  async loadAnnouncements() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) return;
      
      const email = session.user.email;
      const { data: empData } = await this.supabase
        .from('user_employee_data')
        .select('employeeId')
        .ilike('email', email)
        .maybeSingle();
      
      if (!empData?.employeeId) {
        this.updateAnnouncementsDisplay([]);
        return;
      }

      const { data: notificationsData } = await this.supabase
        .from('notification')
        .select('*')
        .eq('employeeId', empData.employeeId)
        .order('dataCreated', { ascending: false })
        .limit(10);

      const notifications = notificationsData || [];
      this.updateAnnouncementsDisplay(notifications);

    } catch (err) {
      console.error('Error loading announcements:', err);
      this.updateAnnouncementsDisplay([]);
    }
  }

  updateAnnouncementsDisplay(notifications) {
    const previewEl = document.getElementById('latestAnnouncement');
    const listEl = document.getElementById('announcementsList');
    
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (previewEl) {
        previewEl.textContent = latest.header || 'New notification';
      }
      
      if (listEl) {
        listEl.innerHTML = notifications.map(n => `
          <div class="announcement-item">
            <h3>${n.header || 'Notification'}</h3>
            <p>${n.message || ''}</p>
            <span class="announcement-date">${this.formatDate(n.dataCreated)}</span>
          </div>
        `).join('');
      }
    } else {
      if (previewEl) previewEl.textContent = 'No notifications';
      if (listEl) listEl.innerHTML = '<p class="no-announcements">No notifications</p>';
    }
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

window.HomeManager = HomeManager;
