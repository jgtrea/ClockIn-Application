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

  const fields = ["username", "employmentField"];

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
      case "employmentField": currentValue = elements.employmentField.textContent; break;
    }

    const newValue = prompt(`Edit ${field}`, currentValue);
    if (!newValue) return;

    try {
      if (field === "username") {
        elements.username.textContent = newValue;
        elements.name.textContent = newValue;
        elements.avatar.textContent = newValue.charAt(0).toUpperCase();
        
        const { data: empData } = await supabase.from('user_employee_data').select('employeeId').eq('email', session.user.email).maybeSingle();
        if (empData?.employeeId) {
          await supabase.from('user_employee_data').update({ name: newValue }).eq('employeeId', empData.employeeId);
        }
        
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { name: newValue } }));
        
        alert("Name updated successfully!");
      } else if (field === "employmentField") {
        elements.employmentField.textContent = newValue;
        
        const { data: empData } = await supabase.from('user_employee_data').select('employeeId').eq('email', session.user.email).maybeSingle();
        if (empData?.employeeId) {
          await supabase.from('user_employee_data').update({ employment: newValue }).eq('employeeId', empData.employeeId);
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
