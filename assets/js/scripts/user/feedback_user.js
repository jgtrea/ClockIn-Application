async function loadMyFeedback() {
  const supabase = await UserShared.waitForSupabase();
  if (!supabase) return;

  const user = await UserShared.getCurrentUser();
  if (!user) return;

  const { data: empData } = await supabase
    .from('user_employee_data')
    .select('employeeId')
    .ilike('email', user.email)
    .maybeSingle();

  if (!empData) return;

  const { data: feedback, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('employeeId', empData.employeeId)
    .order('dateCreated', { ascending: false });

  const feedbackList = document.getElementById('feedbackList');

  if (error || !feedback || feedback.length === 0) {
    feedbackList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">No feedback submissions yet.</p>';
    return;
  }

  feedbackList.innerHTML = feedback.map(f => `
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${f.title || 'No Title'}</h3>
        <span style="font-size: 12px; color: #9ca3af;">${formatDate(f.dateCreated)}</span>
      </div>
      <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">${f.message || 'No message'}</p>
    </div>
  `).join('');
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

function openFeedbackModal() {
  document.getElementById('feedbackModal').style.display = 'flex';
}

function closeFeedbackModal() {
  document.getElementById('feedbackModal').style.display = 'none';
  document.getElementById('feedbackTitle').value = '';
  document.getElementById('feedbackMessage').value = '';
  document.getElementById('anonymousCheckbox').checked = false;
}

async function submitFeedback() {
  const title = document.getElementById('feedbackTitle').value.trim();
  const message = document.getElementById('feedbackMessage').value.trim();
  const isAnonymous = document.getElementById('anonymousCheckbox').checked;

  if (!title || !message) {
    alert('Please fill in both title and message');
    return;
  }

  const supabase = await UserShared.waitForSupabase();
  const user = await UserShared.getCurrentUser();
  if (!user) return;

  const { data: empData } = await supabase
    .from('user_employee_data')
    .select('employeeId')
    .ilike('email', user.email)
    .maybeSingle();

  if (!empData) return;

  const { error } = await supabase.from('feedback').insert({
    title: title,
    message: message,
    employeeId: isAnonymous ? null : empData.employeeId
  });

  if (error) {
    alert('Failed to submit feedback');
    return;
  }

  closeFeedbackModal();
  alert('Thank you for your feedback!');
  loadMyFeedback();
}

document.addEventListener('DOMContentLoaded', () => {
  UserShared.setupAuthListener();
  UserShared.loadUserProfile();
  loadMyFeedback();
});
