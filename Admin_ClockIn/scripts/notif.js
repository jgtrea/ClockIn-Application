(function() {
  const USERS_TABLE = 'user_employee_data';
  const NOTIFS_TABLE = 'notification';

  function $(id) { return document.getElementById(id); }

  const input = $('pn-recipient-input');
  const sugg = $('pn-suggestions');
  const chips = $('pn-chips');
  const headerEl = $('pn-header');
  const messageEl = $('pn-message');
  const sendPrimary = $('pn-send-primary');

  let selected = [];
  let cache = [];
  let supabaseReady = false;

  function renderChips() {
    chips.innerHTML = '';
    selected.forEach((u, idx) => {
      const el = document.createElement('div');
      el.className = 'chip';
      el.innerHTML = `${u.name || u.email} <span class="sub"> • ${u.email || 'all users'}</span>`;
      el.title = u.uid === '*everyone*' ? 'Everyone' : (u.email || '');
      el.style.cursor = 'default';
      el.addEventListener('click', () => {
        selected.splice(idx, 1);
        renderChips();
      });
      chips.appendChild(el);
    });
  }

  function renderSuggestions(list) {
    sugg.innerHTML = '';
    if (!list || list.length === 0) {
      sugg.style.display = 'none';
      return;
    }
    sugg.style.display = 'grid';
    list.forEach(u => {
      const row = document.createElement('div');
      row.className = 'suggestion';
      row.innerHTML = `<div><div class="name">${u.name || u.email || 'Unknown'}</div><div class="email">${u.email || ''}</div></div>`;
      row.addEventListener('click', () => {
        if (!selected.some(s => s.uid === u.uid)) {
          selected.push(u);
          renderChips();
        }
        sugg.style.display = 'none';
        input.value = '';
      });
      sugg.appendChild(row);
    });
  }

  function filterLocal(term) {
    const t = term.trim().toLowerCase();
    if (!t) { renderSuggestions([]); return; }

    const base = cache.filter(u => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(t) || email.includes(t);
    });

    const includeEveryone = 'everyone'.includes(t) || t === 'all';
    const list = [...base];
    if (includeEveryone) {
      list.unshift({ uid: '*everyone*', name: 'Everyone', email: '' });
    }
    renderSuggestions(list.slice(0, 10));
  }

  function ensureData() {
    if (!window.supabaseClient) {
      setTimeout(ensureData, 500);
      return;
    }
    if (cache.length > 0) return;
    
    supabaseReady = true;
    window.supabaseClient
      .from(USERS_TABLE)
      .select('employeeId, name, email')
      .limit(2000)
      .then(({ data, error }) => {
        if (error) {
          console.error('push_notification: failed to load users', error);
          return;
        }
        cache = data.map(d => ({ 
          uid: d.employeeId, 
          name: d.name || '', 
          email: d.email || '' 
        }));
      });
  }

  function deriveEndNotif() {
    if (selected.some(s => s.uid === '*everyone*')) return 'everyone';
    if (selected.length === 1) return selected[0].email || selected[0].name || 'specific';
    if (selected.length > 1) return selected.map(s => s.email || s.name).filter(Boolean).join(',');
    return '';
  }

  async function sendNotification() {
    if (!window.supabaseClient) {
      alert('Database is still loading. Please wait a moment and try again.');
      return;
    }
    
    const message = (messageEl.value || '').trim();
    const header = (headerEl.value || '').trim();
    if (!message) { alert('Message is required'); return; }

    const t = input.value.trim().toLowerCase();
    if ((t === 'everyone' || t === 'all') && !selected.some(s => s.uid === '*everyone*')) {
      selected = [{ uid: '*everyone*', name: 'Everyone', email: '' }];
    }

    const endNotif = deriveEndNotif();
    if (!endNotif) { alert('Please choose at least one recipient (type a name/email or everyone)'); return; }

    const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');

    const payload = {
      header: header || '',
      message: message,
      dataCreated: new Date().toISOString()
    };

    if (selected.length === 1 && selected[0].uid !== '*everyone*') {
      payload.employeeId = selected[0].uid;
    }

    try {
      const { data, error } = await window.supabaseClient.from(NOTIFS_TABLE).insert(payload).select();
      if (error) throw error;
      
      headerEl.value = '';
      messageEl.value = '';
      input.value = '';
      sugg.style.display = 'none';
      selected = [];
      renderChips();
      closeNotificationModal();
      loadNotificationHistory();
      alert('Notification sent successfully!');
    } catch (err) {
      console.error('push_notification: failed to send', err);
      alert('Failed to save notification: ' + err.message);
    }
  }

  input.addEventListener('focus', ensureData);
  input.addEventListener('input', (e) => filterLocal(e.target.value));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.recipient-input-row') && !e.target.closest('#pn-suggestions')) {
      sugg.style.display = 'none';
    }
  });
  sendPrimary.addEventListener('click', sendNotification);

  window.__pn_getSelection = () => selected.slice();
  window.__pn_send = sendNotification;

  let notifications = [];
  let currentPage = 1;
  const notificationsPerPage = 10;

  function loadNotificationHistory() {
    if (!window.supabaseClient) {
      setTimeout(loadNotificationHistory, 500);
      return;
    }

    window.supabaseClient
      .from(NOTIFS_TABLE)
      .select('*')
      .order('dataCreated', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading notification history:', error);
          document.getElementById('notificationsList').innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading notifications.</p>';
          return;
        }
        console.log('Loaded notifications:', data);
        notifications = data || [];
        renderNotificationHistory();
      })
      .catch(err => {
        console.error('Error loading notification history:', err);
        document.getElementById('notificationsList').innerHTML = '<p style="text-align: center; color: #ef4444;">Error loading notifications.</p>';
      });
  }

  async function renderNotificationHistory() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    if (notifications.length === 0) {
      notificationsList.innerHTML = '<p style="text-align: center; color: #9ca3af;">No notifications sent yet.</p>';
      return;
    }

    const totalPages = Math.ceil(notifications.length / notificationsPerPage);
    const startIndex = (currentPage - 1) * notificationsPerPage;
    const endIndex = startIndex + notificationsPerPage;
    const pageNotifications = notifications.slice(startIndex, endIndex);

    // Get employee emails for notifications with employeeId
    const employeeIds = pageNotifications.filter(n => n.employeeId).map(n => n.employeeId);
    let employeeEmails = {};
    
    if (employeeIds.length > 0) {
      try {
        const { data } = await window.supabaseClient
          .from(USERS_TABLE)
          .select('employeeId, email')
          .in('employeeId', employeeIds);
        
        if (data) {
          employeeEmails = data.reduce((acc, emp) => {
            acc[emp.employeeId] = emp.email;
            return acc;
          }, {});
        }
      } catch (error) {
        console.error('Error loading employee emails:', error);
      }
    }

    notificationsList.innerHTML = pageNotifications.map(notif => {
      const date = notif.dataCreated ? new Date(notif.dataCreated).toLocaleString() : 'Unknown';
      const recipient = notif.employeeId ? (employeeEmails[notif.employeeId] || `Employee ID: ${notif.employeeId}`) : 'All Users';
      return `
        <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 16px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${notif.header || 'Notification'}</h3>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">To: ${recipient}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 12px; color: #9ca3af;">${date}</span>
              <button onclick="deleteNotification('${notif.notifId}')" style="background: none; border: none; cursor: pointer; color: #ef4444; padding: 4px; display: flex; align-items: center;" title="Delete notification">
                <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
              </button>
            </div>
          </div>
          <p style="margin: 0; color: #374151; line-height: 1.5;">${notif.message}</p>
        </div>
      `;
    }).join('');

    updatePagination(totalPages);
  }

  function updatePagination(totalPages) {
    const pagination = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!pagination || !pageInfo || !prevBtn || !nextBtn) return;
    
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

  window.changePage = function(direction) {
    const totalPages = Math.ceil(notifications.length / notificationsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      renderNotificationHistory();
    }
  };

  window.deleteNotification = async function(notificationId) {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      const { error } = await window.supabaseClient.from(NOTIFS_TABLE).delete().eq('notifId', notificationId);
      if (error) throw error;
      loadNotificationHistory();
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Error deleting notification. Please try again.');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNotificationHistory);
  } else {
    loadNotificationHistory();
  }
})();
