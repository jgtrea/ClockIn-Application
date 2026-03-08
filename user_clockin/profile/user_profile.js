document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    avatar: document.getElementById("avatar"),
    name: document.getElementById("name"),
    email: document.getElementById("email"),
    username: document.getElementById("username"),
    emailField: document.getElementById("emailField"),
    employmentField: document.getElementById("employmentField"),
    backBtn: document.getElementById("backBtn")
  };

  if (elements.backBtn) {
    elements.backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const iframe = window.parent.document.getElementById('contentFrame');
      if (iframe) {
        iframe.src = 'home_user.html';
      }
    });
  }

  loadUserProfile();

  async function loadUserProfile() {
    const supabase = window.supabaseClient;
    if (!supabase) return setTimeout(loadUserProfile, 100);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return loadFromStorage();

    const user = session.user;
    const email = user.email;
    let displayName = user.user_metadata?.displayName || email.split("@")[0];
    
    const { data: empData } = await supabase.from('user_employee_data').select('name, employment').eq('email', email).maybeSingle();
    if (empData?.name) {
      displayName = empData.name;
    }
    
    elements.avatar.textContent = displayName.charAt(0).toUpperCase();
    elements.name.textContent = displayName;
    elements.email.textContent = email;
    elements.username.textContent = displayName;
    elements.emailField.textContent = email;

    if (empData?.employment) {
      elements.employmentField.textContent = empData.employment;
    } else {
      elements.employmentField.textContent = 'Employee';
    }

    setupAuthListener();
  }

  function loadFromStorage() {
    const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
    if (!userEmail) return;
    
    const displayName = userEmail.split("@")[0];
    elements.avatar.textContent = displayName.charAt(0).toUpperCase();
    elements.name.textContent = displayName;
    elements.email.textContent = userEmail;
    elements.username.textContent = displayName;
    elements.emailField.textContent = userEmail;
    elements.employmentField.textContent = "N/A";
  }

  function setupAuthListener() {
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
      if (!session) loadFromStorage();
      else if (event === 'SIGNED_IN') window.location.reload();
    });
  }
});
