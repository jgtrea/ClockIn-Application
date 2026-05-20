// Home - Index Page

document.addEventListener('DOMContentLoaded', () => {
  const supabase = window.supabaseClient;

  const clockManager = new ClockManager();
  const profileManager = new ProfileManager();
  const scheduleOverview = new ScheduleOverview(supabase, clockManager);
  const searchBar = new SearchBar();

  window.scheduleOverview = scheduleOverview;

  clockManager.init();
  profileManager.init();
  scheduleOverview.init();
  searchBar.init();
});

function showWeeklySchedule(sectionId, sectionName) {
  if (window.scheduleOverview) {
    window.scheduleOverview.showWeeklySchedule(sectionId, sectionName);
  }
}

function loadDaySchedule(sectionId, day) {
  if (window.scheduleOverview) {
    window.scheduleOverview.loadDaySchedule(sectionId, day);
  }
}

function closeModal() {
  if (window.scheduleOverview) {
    window.scheduleOverview.closeModal();
  }
}

function searchSections() {
  if (window.searchBar) {
    window.searchBar.searchSections();
  }
}
