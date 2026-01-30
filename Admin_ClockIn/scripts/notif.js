(function() {
  const USERS_COLLECTION = 'user_employee_data';
  const NOTIFS_COLLECTION = 'notifications';

  function $(id) { return document.getElementById(id); }

  const input = $('pn-recipient-input');
  const sugg = $('pn-suggestions');
  const chips = $('pn-chips');
  const headerEl = $('pn-header');
  const messageEl = $('pn-message');
  const sendPrimary = $('pn-send-primary');

  let selected = []; // {uid, name, email}
  let cache = [];

  function renderChips() {
    chips.innerHTML = '';
    selected.forEach((u, idx) => {
      const el = document.createElement('div');
      el.className = 'chip';
      el.innerHTML = `${u.name || u.email} <span class="sub">· ${u.email || 'all users'}</span>`;
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
      row.innerHTML = `<div class="name">${u.name || u.email || 'Unknown'}</div><div class="email">${u.email || ''}</div>`;
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
    if (cache.length > 0 || !window.db) return;
    window.db.collection(USERS_COLLECTION).limit(2000).get()
      .then(snap => {
        cache = snap.docs.map(d => ({ uid: d.id, name: d.data().name || '', email: d.data().email || '' }));
      })
      .catch(err => console.error('push_notification: failed to load users', err));
  }

  function deriveEndNotif() {
    if (selected.some(s => s.uid === '*everyone*')) return 'everyone';
    if (selected.length === 1) return selected[0].email || selected[0].name || 'specific';
    if (selected.length > 1) return selected.map(s => s.email || s.name).filter(Boolean).join(',');
    return '';
  }

  async function getNextNotifId(db) {
    try {
      const snap = await db.collection(NOTIFS_COLLECTION)
        .orderBy('notifId', 'desc')
        .limit(1)
        .get();
      const currentMax = snap.empty ? 0 : (snap.docs[0].data().notifId || 0);
      return currentMax + 1;
    } catch (e) {
      console.warn('notif.js: failed to compute next notifId, defaulting to 1', e);
      return 1;
    }
  }

  async function sendNotification() {
    if (!window.db) { alert('Database not ready'); return; }
    const message = (messageEl.value || '').trim();
    const header = (headerEl.value || '').trim();
    if (!message) { alert('Message is required'); return; }

    const t = input.value.trim().toLowerCase();
    if ((t === 'everyone' || t === 'all') && !selected.some(s => s.uid === '*everyone*')) {
      selected = [{ uid: '*everyone*', name: 'Everyone', email: '' }];
    }

    const endNotif = deriveEndNotif();
    if (!endNotif) { alert('Please choose at least one recipient (type a name/email or everyone)'); return; }

    const payload = {
      header: header || '',
      message: message,
      endNotif: endNotif,
      dateCreated: firebase.firestore.FieldValue.serverTimestamp(),
      notifId: await getNextNotifId(window.db),
    };

    try {
      await window.db.collection(NOTIFS_COLLECTION).add(payload);
      headerEl.value = '';
      messageEl.value = '';
      input.value = '';
      sugg.style.display = 'none';
      selected = [];
      renderChips();
      alert('Notification saved');
    } catch (err) {
      console.error('push_notification: failed to send', err);
      alert('Failed to save notification');
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
})();
