document.addEventListener('DOMContentLoaded', function () {
  const supabase = window.supabaseClient;
  const GRACE_TABLE = 'grace_period';
  let gracePeriodRecord = null;
  let gracePeriodActive = false;

  function decimalMinsToMMSS(decimalMins) {
    const totalSecs = Math.round(decimalMins * 60);
    const mm = Math.floor(totalSecs / 60);
    const ss = totalSecs % 60;
    return `${mm}:${String(ss).padStart(2, '0')}`;
  }

  function updateGracePeriodBtnLabel(data) {
    const label = document.getElementById('gracePeriodBtnLabel');
    if (!label) return;
    if (data && data.minutes_allowed != null) {
      label.textContent = `Grace Period · ${decimalMinsToMMSS(data.minutes_allowed)}`;
    } else {
      label.textContent = 'Grace Period';
    }
  }

  async function loadGracePeriodButtonLabel() {
    try {
      const { data } = await supabase
        .from(GRACE_TABLE)
        .select('minutes_allowed, is_active')
        .limit(1)
        .maybeSingle();
      updateGracePeriodBtnLabel(data);
    } catch (_) {}
  }

  window.openGracePeriodModal = async function () {
    const modal = document.getElementById('gracePeriodModal');
    modal.style.display = 'flex';

    try {
      const { data, error } = await supabase
        .from(GRACE_TABLE)
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      gracePeriodRecord = data;
      gracePeriodActive = data ? !!data.is_active : false;

      if (data && data.minutes_allowed != null) {
        const totalSecs = Math.round(data.minutes_allowed * 60);
        document.getElementById('graceMins').value = Math.floor(totalSecs / 60);
        document.getElementById('graceSecs').value = totalSecs % 60;
      } else {
        document.getElementById('graceMins').value = '';
        document.getElementById('graceSecs').value = '';
      }

      updateGracePeriodToggleUI();
    } catch (err) {
      console.error('Error loading grace period:', err);
    }
  };

  window.closeGracePeriodModal = function () {
    document.getElementById('gracePeriodModal').style.display = 'none';
  };

  window.toggleGracePeriodActive = function () {
    gracePeriodActive = !gracePeriodActive;
    updateGracePeriodToggleUI();
  };

  function updateGracePeriodToggleUI() {
    const toggle = document.getElementById('gracePeriodToggle');
    const knob = document.getElementById('gracePeriodToggleKnob');
    if (gracePeriodActive) {
      toggle.style.background = '#FF725E';
      knob.style.left = '27px';
    } else {
      toggle.style.background = '#d1d5db';
      knob.style.left = '3px';
    }
  }

  window.saveGracePeriod = async function () {
    const mm = parseInt(document.getElementById('graceMins').value || '0', 10);
    const ss = parseInt(document.getElementById('graceSecs').value || '0', 10);

    if (isNaN(mm) || mm < 0 || isNaN(ss) || ss < 0 || ss > 59) {
      alert('Please enter a valid time. Seconds must be between 0 and 59.');
      return;
    }

    const minutes = mm + ss / 60;
    const payload = { minutes_allowed: minutes, is_active: gracePeriodActive };

    try {
      let error;
      if (gracePeriodRecord) {
        ({ error } = await supabase
          .from(GRACE_TABLE)
          .update(payload)
          .eq('grace_period_id', gracePeriodRecord.grace_period_id));
      } else {
        ({ error } = await supabase
          .from(GRACE_TABLE)
          .insert({ grace_period_id: crypto.randomUUID(), ...payload }));
      }

      if (error) throw error;

      updateGracePeriodBtnLabel(payload);
      closeGracePeriodModal();
    } catch (err) {
      console.error('Error saving grace period:', err);
      alert('Failed to save grace period settings.\n\n' + (err?.message || JSON.stringify(err)));
    }
  };

  document.getElementById('gracePeriodModal').addEventListener('click', function (e) {
    if (e.target === this) closeGracePeriodModal();
  });

  document.getElementById('graceSecs').addEventListener('blur', function () {
    const v = parseInt(this.value, 10);
    if (!isNaN(v)) this.value = Math.min(59, Math.max(0, v));
  });

  loadGracePeriodButtonLabel();
});
