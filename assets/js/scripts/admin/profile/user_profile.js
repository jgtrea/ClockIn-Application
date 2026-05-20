document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    avatar: document.getElementById("avatar"),
    name: document.getElementById("name"),
    email: document.getElementById("email"),
    username: document.getElementById("username"),
    emailField: document.getElementById("emailField"),
    employmentField: document.getElementById("employmentField")
  };

  loadUserProfile();

  async function loadUserProfile() {
    const supabase = window.supabaseClient;
    if (!supabase) return setTimeout(loadUserProfile, 100);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return loadFromStorage();

    const user = session.user;
    const email = user.email;
    let displayName = user.user_metadata?.displayName || email.split("@")[0];
    
    const { data: adminData } = await supabase.from('user_admin_data').select('name').eq('email', email).maybeSingle();
    if (adminData?.name) {
      displayName = adminData.name;
    }
    
    elements.avatar.textContent = displayName.charAt(0).toUpperCase();
    elements.name.textContent = displayName;
    elements.email.textContent = email;
    elements.username.textContent = displayName;
    elements.emailField.textContent = email;

    await loadUserData(email);
    setupAuthListener();
  }

  async function loadUserData(email) {
    const supabase = window.supabaseClient;
    
    const { data: adminData, error: adminError } = await supabase.from('user_admin_data').select('*').eq('email', email).maybeSingle();
    if (adminData && !adminError) {
      elements.employmentField.textContent = adminData.employment || 'Administrator';
    } else {
      elements.employmentField.textContent = 'N/A';
    }
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
