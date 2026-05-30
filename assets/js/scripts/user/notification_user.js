async function loadMyNotifications() {
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

  const { data: allNotifications, error } = await supabase
    .from('notification')
    .select('*')
    .order('dataCreated', { ascending: false });

  const notificationsList = document.getElementById('notificationsList');

  if (error) {
    console.error('Error loading notifications:', error);
    notificationsList.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 40px;">Error loading notifications.</p>';
    return;
  }

  console.log('All notifications:', allNotifications);
  console.log('User employeeId:', empData.employeeId);

  const notifications = allNotifications?.filter(n => {
    console.log('Checking notification employeeId:', n.employeeId, 'against', empData.employeeId);
    if (n.employeeId === null) return true;
    return String(n.employeeId) === String(empData.employeeId);
  }) || [];

  if (notifications.length === 0) {
    notificationsList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">No notifications yet.</p>';
    return;
  }

  notificationsList.innerHTML = notifications.map(n => {
    const isForEveryone = n.employeeId === null;
    return `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="material-symbols-outlined" style="color: #FF725E; font-size: 24px;">notifications</span>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${n.header || 'Notification'}</h3>
              ${isForEveryone ? '<span style="font-size: 12px; color: #6b7280;">Sent to everyone</span>' : ''}
            </div>
          </div>
          <span style="font-size: 12px; color: #9ca3af;">${formatDate(n.dataCreated)}</span>
        </div>
        <p style="margin: 0 0 0 36px; font-size: 14px; color: #374151; line-height: 1.5;">${n.message || 'No message'}</p>
      </div>
    `;
  }).join('');
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

document.addEventListener('DOMContentLoaded', () => {
  UserShared.setupAuthListener();
  UserShared.loadUserProfile();
  loadMyNotifications();
});
