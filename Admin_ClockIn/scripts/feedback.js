const FEEDBACK_TABLE = 'feedback';
let feedbackData = [];
let currentPage = 1;
const itemsPerPage = 10;

async function loadFeedback() {
  const supabase = window.supabaseClient;
  if (!supabase) {
    setTimeout(loadFeedback, 500);
    return;
  }

  try {
    const { data, error } = await supabase
      .from(FEEDBACK_TABLE)
      .select('*')
      .order('dateCreated', { ascending: false });

    if (error) {
      console.error('Error loading feedback:', error);
      document.getElementById('feedbackList').innerHTML = '<p style="text-align: center; color: #ef4444; padding: 20px;">Error loading feedback.</p>';
      return;
    }

    feedbackData = data || [];
    
    // Get employee names
    if (feedbackData.length > 0) {
      const employeeIds = [...new Set(feedbackData.map(f => f.employeeId).filter(Boolean))];
      if (employeeIds.length > 0) {
        const { data: employees } = await supabase
          .from('user_employee_data')
          .select('employeeId, name, email')
          .in('employeeId', employeeIds);
        
        const employeeMap = {};
        if (employees) {
          employees.forEach(emp => {
            employeeMap[emp.employeeId] = emp;
          });
        }
        
        feedbackData.forEach(feedback => {
          const employee = employeeMap[feedback.employeeId];
          feedback.employeeName = employee?.name || 'Unknown';
          feedback.employeeEmail = employee?.email || '';
        });
      }
    }
    
    renderFeedback();
  } catch (error) {
    console.error('Error loading feedback:', error);
    document.getElementById('feedbackList').innerHTML = '<p style="text-align: center; color: #ef4444; padding: 20px;">Error loading feedback.</p>';
  }
}

function renderFeedback() {
  const feedbackList = document.getElementById('feedbackList');
  
  if (!feedbackData || feedbackData.length === 0) {
    feedbackList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">No feedback submissions found.</p>';
    document.getElementById('pagination').style.display = 'none';
    return;
  }

  const totalPages = Math.ceil(feedbackData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageData = feedbackData.slice(startIndex, endIndex);

  feedbackList.innerHTML = pageData.map(feedback => `
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #111827;">${feedback.title || 'No Title'}</h3>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">From: ${feedback.employeeName || 'Unknown'} ${feedback.employeeEmail ? `(${feedback.employeeEmail})` : ''}</p>
        </div>
        <span style="font-size: 12px; color: #9ca3af;">${formatDate(feedback.dateCreated)}</span>
      </div>
      <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">${feedback.message || 'No message provided'}</p>
    </div>
  `).join('');

  updatePagination(totalPages);
}

function updatePagination(totalPages) {
  const pagination = document.getElementById('pagination');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (totalPages > 1) {
    pagination.style.display = 'block';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
    nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
  } else {
    pagination.style.display = 'none';
  }
}

function changePage(direction) {
  const totalPages = Math.ceil(feedbackData.length / itemsPerPage);
  const newPage = currentPage + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderFeedback();
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Initialize
loadFeedback();