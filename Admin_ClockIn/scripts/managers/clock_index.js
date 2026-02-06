class ClockManager {
  constructor() {
    this.timeEl = document.getElementById('currentTime');
    this.dateEl = document.getElementById('currentDate');
    this.days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  init() {
    this.updateTime();
    this.startAutoUpdate();
  }

  updateTime() {
    this.updateTimeDisplay();
    this.updateDateDisplay();
  }

  updateTimeDisplay() {
    if (!this.timeEl) return;
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    this.timeEl.textContent = `${hours}:${minutes}:${seconds}`;
  }

  updateDateDisplay() {
    if (!this.dateEl) return;
    
    const now = new Date();
    const dayName = this.days[now.getDay()];
    const month = this.months[now.getMonth()];
    const date = now.getDate();
    const year = now.getFullYear();
    
    this.dateEl.textContent = `${dayName}, ${month} ${date}, ${year}`;
  }

  startAutoUpdate() {
    setInterval(() => this.updateTime(), 1000);
  }

  getCurrentTimeInMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  getCurrentDay() {
    return this.days[new Date().getDay()];
  }

  getCurrentDateFormatted() {
    const now = new Date();
    const dayName = this.days[now.getDay()];
    const month = this.months[now.getMonth()];
    const date = now.getDate();
    const year = now.getFullYear();
    
    return `${dayName}, ${month} ${date}, ${year}`;
  }
}

window.ClockManager = ClockManager;
