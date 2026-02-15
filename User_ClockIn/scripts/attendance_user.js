document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("attendanceList")) {
    initializeAttendanceDisplay();
  }
});

let attendanceData = [];
let currentPage = 1;
let itemsPerPage = 10;
let totalItems = 0;

async function initializeAttendanceDisplay() {
  UserShared.setupAuthListener();
  UserShared.loadUserProfile();
  await loadUserAttendance();
}

async function loadUserAttendance() {
  const attendanceList = document.getElementById("attendanceList");
  if (!attendanceList) return;
  
  attendanceList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ca3af; padding: 40px;">Loading your attendance...</td></tr>';

  const user = await UserShared.getCurrentUser();
  if (!user) {
    attendanceList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ca3af; padding: 40px;">Please log in to view your attendance.</td></tr>';
    return;
  }

  const supabase = await UserShared.waitForSupabase();
  
  const { data: empData } = await supabase
    .from('user_employee_data')
    .select('employeeId')
    .eq('email', user.email)
    .maybeSingle();
    
  if (!empData) {
    attendanceList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ca3af; padding: 40px;">User not found.</td></tr>';
    return;
  }

  const { data: allData } = await supabase
    .from('user_attendance')
    .select('*')
    .eq('employeeId', empData.employeeId)
    .order('created_at', { ascending: false });

  attendanceData = allData || [];
  totalItems = attendanceData.length;

  renderAttendance();
  updatePagination();
}

function renderAttendance() {
  const attendanceList = document.getElementById("attendanceList");
  if (!attendanceList) return;

  if (attendanceData.length === 0) {
    attendanceList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ca3af; padding: 40px;">No attendance records found.</td></tr>';
    return;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageData = attendanceData.slice(startIndex, endIndex);

  attendanceList.innerHTML = pageData.map(record => `
    <tr>
      <td>${record.timeIn ? new Date(record.timeIn).toLocaleDateString() : '-'}</td>
      <td>${record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : '-'}</td>
      <td>${record.timeOut ? new Date(record.timeOut).toLocaleTimeString() : '-'}</td>
      <td>${record.status || '-'}</td>
      <td>${record.notes || '-'}</td>
    </tr>
  `).join('');
}

function updatePagination() {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  document.getElementById('totalAttendanceCount').textContent = totalItems;
  document.getElementById('pageNumberInput').value = currentPage;
  
  document.getElementById('firstBtn').disabled = currentPage === 1;
  document.getElementById('prevBtn').disabled = currentPage === 1;
  document.getElementById('nextBtn').disabled = currentPage === totalPages;
  document.getElementById('lastBtn').disabled = currentPage === totalPages;
}

function changePage(direction) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const newPage = currentPage + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderAttendance();
    updatePagination();
  }
}

function goToPage(page) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pageNum = parseInt(page);
  
  if (pageNum >= 1 && pageNum <= totalPages) {
    currentPage = pageNum;
    renderAttendance();
    updatePagination();
  }
}

function goToFirstPage() {
  currentPage = 1;
  renderAttendance();
  updatePagination();
}

function goToLastPage() {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  currentPage = totalPages;
  renderAttendance();
  updatePagination();
}

function changeItemsPerPage(value) {
  itemsPerPage = parseInt(value) || 10;
  currentPage = 1;
  renderAttendance();
  updatePagination();
}
