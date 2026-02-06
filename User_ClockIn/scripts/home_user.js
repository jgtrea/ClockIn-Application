document.addEventListener("DOMContentLoaded", async () => {
  UserShared.setupProfileMenu();
  UserShared.setupAuthListener();
  await UserShared.loadUserProfile();
});
