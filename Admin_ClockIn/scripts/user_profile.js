document.addEventListener("DOMContentLoaded", async () => {
  const avatar = document.getElementById("avatar");
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const username = document.getElementById("username");
  const emailField = document.getElementById("emailField");
  const employmentField = document.getElementById("employmentField");

  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error('Supabase client not initialized');
    return;
  }

  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // Check localStorage for stored user info
    const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
    if (userEmail) {
      const displayName = userEmail.split("@")[0];
      avatar.textContent = displayName.charAt(0).toUpperCase();
      nameEl.textContent = displayName;
      emailEl.textContent = userEmail;
      username.textContent = displayName;
      emailField.textContent = userEmail;
      employmentField.textContent = "N/A";
    }
    return;
  }

  const user = session.user;
  const displayName = user.user_metadata?.displayName || user.email.split("@")[0];
  avatar.textContent = displayName.charAt(0).toUpperCase();
  nameEl.textContent = displayName;
  emailEl.textContent = user.email;
  username.textContent = displayName;
  emailField.textContent = user.email;

  // Get user data from user_admin_data or user_employee_data table
  try {
    const { data: adminData } = await supabase
      .from('user_admin_data')
      .select('*')
      .eq('email', user.email)
      .single();

    if (adminData) {
      employmentField.textContent = adminData.employment || 'Administrator';
    } else {
      const { data: empData } = await supabase
        .from('user_employee_data')
        .select('*')
        .eq('email', user.email)
        .single();

      if (empData) {
        employmentField.textContent = empData.employment || 'Employee';
      } else {
        employmentField.textContent = 'N/A';
      }
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    employmentField.textContent = 'N/A';
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChanged(async (event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      if (userEmail) {
        const displayName = userEmail.split("@")[0];
        avatar.textContent = displayName.charAt(0).toUpperCase();
        nameEl.textContent = displayName;
        emailEl.textContent = userEmail;
        username.textContent = displayName;
        emailField.textContent = userEmail;
        employmentField.textContent = "N/A";
      }
    } else if (event === 'SIGNED_IN' && session) {
      window.location.reload();
    }
  });

  const editButtons = document.querySelectorAll(".edit");
  const fields = ["username", "emailField", "employmentField"];

  async function handleEdit(field) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Please log in to edit profile');
      return;
    }

    let currentValue;
    switch(field) {
      case "username": currentValue = username.textContent; break;
      case "emailField": currentValue = emailField.textContent; break;
      case "employmentField": currentValue = employmentField.textContent; break;
    }

    const newValue = prompt(`Edit ${field}`, currentValue);
    if (!newValue) return;

    try {
      switch(field) {
        case "username":
          username.textContent = newValue;
          nameEl.textContent = newValue;
          
          // Update in user_admin_data or user_employee_data
          const { data: adminData } = await supabase
            .from('user_admin_data')
            .select('adminId')
            .eq('email', session.user.email)
            .single();

          if (adminData) {
            await supabase
              .from('user_admin_data')
              .update({ name: newValue })
              .eq('adminId', adminData.adminId);
          } else {
            const { data: empData } = await supabase
              .from('user_employee_data')
              .select('employeeId')
              .eq('email', session.user.email)
              .single();

            if (empData) {
              await supabase
                .from('user_employee_data')
                .update({ name: newValue })
                .eq('employeeId', empData.employeeId);
            }
          }
          break;

        case "emailField":
          alert('Email cannot be changed. Please contact administrator.');
          break;

        case "employmentField":
          // Update employment in user_admin_data or user_employee_data
          const { data: adminData2 } = await supabase
            .from('user_admin_data')
            .select('adminId')
            .eq('email', session.user.email)
            .single();

          if (adminData2) {
            await supabase
              .from('user_admin_data')
              .update({ employment: newValue })
              .eq('adminId', adminData2.adminId);
          } else {
            const { data: empData2 } = await supabase
              .from('user_employee_data')
              .select('employeeId')
              .eq('email', session.user.email)
              .single();

            if (empData2) {
              await supabase
                .from('user_employee_data')
                .update({ employment: newValue })
                .eq('employeeId', empData2.employeeId);
            }
          }
          employmentField.textContent = newValue;
          alert("Employment updated successfully!");
          break;
      }
    } catch (err) {
      alert(`Failed to update ${field}: ${err.message}`);
    }
  }

  editButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => handleEdit(fields[index]));
  });
});
