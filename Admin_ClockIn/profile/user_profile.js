document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    avatar: document.getElementById("avatar"),
    name: document.getElementById("name"),
    email: document.getElementById("email"),
    username: document.getElementById("username"),
    emailField: document.getElementById("emailField"),
    employmentField: document.getElementById("employmentField"),
    editButtons: document.querySelectorAll(".edit")
  };

  const fields = ["username", "emailField", "employmentField"];

  loadUserProfile();

  async function loadUserProfile() {
    const supabase = window.supabaseClient;
    if (!supabase) return setTimeout(loadUserProfile, 100);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return loadFromStorage();

    const user = session.user;
    const displayName = user.user_metadata?.displayName || user.email.split("@")[0];
    
    elements.avatar.textContent = displayName.charAt(0).toUpperCase();
    elements.name.textContent = displayName;
    elements.email.textContent = user.email;
    elements.username.textContent = displayName;
    elements.emailField.textContent = user.email;

    await loadUserData(user.email);
    setupAuthListener();
  }

  async function loadUserData(email) {
    const supabase = window.supabaseClient;
    
    const { data: adminData, error: adminError } = await supabase.from('user_admin_data').select('*').eq('email', email).maybeSingle();
    if (adminData && !adminError) {
      elements.employmentField.textContent = adminData.employment || 'Administrator';
      return;
    }
    
    const { data: empData, error: empError } = await supabase.from('user_employee_data').select('*').eq('email', email).maybeSingle();
    if (empData && !empError) {
      elements.employmentField.textContent = empData.employment || 'Employee';
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
    window.supabaseClient.auth.onAuthStateChanged((event, session) => {
      if (!session) loadFromStorage();
      else if (event === 'SIGNED_IN') window.location.reload();
    });
  }

  async function handleEdit(field) {
    const supabase = window.supabaseClient;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('Please log in to edit profile');

    let currentValue;
    switch(field) {
      case "username": currentValue = elements.username.textContent; break;
      case "emailField": currentValue = elements.emailField.textContent; break;
      case "employmentField": currentValue = elements.employmentField.textContent; break;
    }

    const newValue = prompt(`Edit ${field}`, currentValue);
    if (!newValue) return;

    try {
      if (field === "username") {
        elements.username.textContent = newValue;
        elements.name.textContent = newValue;
        
        const { data: adminData } = await supabase.from('user_admin_data').select('adminId').eq('email', session.user.email).maybeSingle();
        if (adminData?.adminId) {
          await supabase.from('user_admin_data').update({ name: newValue }).eq('adminId', adminData.adminId);
        } else {
          const { data: empData } = await supabase.from('user_employee_data').select('employeeId').eq('email', session.user.email).maybeSingle();
          if (empData?.employeeId) {
            await supabase.from('user_employee_data').update({ name: newValue }).eq('employeeId', empData.employeeId);
          }
        }
      } else if (field === "emailField") {
        alert('Email cannot be changed. Please contact administrator.');
      } else if (field === "employmentField") {
        elements.employmentField.textContent = newValue;
        
        const { data: adminData } = await supabase.from('user_admin_data').select('adminId').eq('email', session.user.email).maybeSingle();
        if (adminData?.adminId) {
          await supabase.from('user_admin_data').update({ employment: newValue }).eq('adminId', adminData.adminId);
        } else {
          const { data: empData } = await supabase.from('user_employee_data').select('employeeId').eq('email', session.user.email).maybeSingle();
          if (empData?.employeeId) {
            await supabase.from('user_employee_data').update({ employment: newValue }).eq('employeeId', empData.employeeId);
          }
        }
        alert("Employment updated successfully!");
      }
    } catch (err) {
      alert(`Failed to update ${field}: ${err.message}`);
    }
  }

  elements.editButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => handleEdit(fields[index]));
  });
});
