document.addEventListener("DOMContentLoaded", () => {
  const avatar = document.getElementById("avatar");
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const username = document.getElementById("username");
  const emailField = document.getElementById("emailField");
  const organization = document.getElementById("organization");
  const department = document.getElementById("department");
  const passwordField = document.getElementById("passwordField");

  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = "login.html";

    const displayName = user.displayName || user.email.split("@")[0];
    avatar.textContent = displayName.charAt(0).toUpperCase();
    nameEl.textContent = displayName;
    emailEl.textContent = user.email;
    username.textContent = displayName;
    emailField.textContent = user.email;

    const docRef = db.collection("users").doc(user.uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      await docRef.set({
        organization: "",
        department: "",
        passwordLength: 12
      });
    }

    const data = (await docRef.get()).data();
    organization.textContent = data.organization || "Add organization";
    department.textContent = data.department || "Add department";
    passwordField.textContent = "*".repeat(data.passwordLength || 12);
  });

  const editButtons = document.querySelectorAll(".edit");
  const fields = ["username", "emailField", "password", "organization", "department"];

  async function handleEdit(field) {
    const user = auth.currentUser;
    if (!user) return;

    let currentValue;
    switch(field) {
      case "username": currentValue = username.textContent; break;
      case "emailField": currentValue = emailField.textContent; break;
      case "password": currentValue = ""; break;
      case "organization": currentValue = organization.textContent; break;
      case "department": currentValue = department.textContent; break;
    }

    const newValue = prompt(`Edit ${field}`, currentValue);
    if (!newValue) return;

    const docRef = db.collection("users").doc(user.uid);

    try {
      switch(field) {
        case "username":
          username.textContent = newValue;
          nameEl.textContent = newValue;
          await user.updateProfile({ displayName: newValue });
          break;

        case "emailField":
          emailField.textContent = newValue;
          emailEl.textContent = newValue;
          await user.updateEmail(newValue);
          break;

        case "password":
          await user.updatePassword(newValue);
          passwordField.textContent = "*".repeat(newValue.length);
          await docRef.set({ passwordLength: newValue.length }, { merge: true });
          alert("Password updated successfully!");
          break;

        case "organization":
          organization.textContent = newValue;
          await docRef.set({ organization: newValue }, { merge: true });
          break;

        case "department":
          department.textContent = newValue;
          await docRef.set({ department: newValue }, { merge: true });
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
