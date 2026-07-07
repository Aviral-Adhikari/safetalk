document.addEventListener("DOMContentLoaded", async () => {
  window.SafetalkAuth.redirectIfNotLoggedIn();

  const logoutLink = document.getElementById("logout-link");
  const welcomeHeading = document.getElementById("dashboard-welcome");
  const subtitle = document.getElementById("dashboard-subtitle");
  const statusTitle = document.getElementById("identity-status-title");
  const statusCopy = document.getElementById("identity-status-copy");
  const statusIcon = document.getElementById("identity-status-icon");
  const recentChatsList = document.getElementById("recent-chats-list");
  const recommendedList = document.getElementById("recommended-psychologists-list");
  const roomsMessage = document.getElementById("dashboard-rooms-message");
  const psychologistsMessage = document.getElementById("dashboard-psychologists-message");

  logoutLink.addEventListener("click", (event) => {
    event.preventDefault();
    window.SafetalkAuth.logout();
  });

  function showMessage(element, text) {
    element.textContent = text;
    element.classList.remove("is-hidden");
    element.classList.add("is-error");
  }

  function createEmptyState(title, text) {
    const wrapper = document.createElement("div");
    wrapper.className = "empty-state-card";
    wrapper.innerHTML = `<strong>${title}</strong><span>${text}</span>`;
    return wrapper;
  }

  function initialsFromName(name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function renderRooms(rooms) {
    recentChatsList.innerHTML = "";

    if (!rooms.length) {
      recentChatsList.appendChild(
        createEmptyState(
          "No counseling rooms yet",
          "Choose a psychologist and create your first counseling session to begin chatting."
        )
      );
      return;
    }

    rooms.forEach((room) => {
      const row = document.createElement("a");
      row.className = "chat-row";
      row.href = `chat.html?room=${room.id}`;
      row.innerHTML = `
        <span class="profile-avatar">${initialsFromName(room.session.psychologist.full_name)}</span>
        <div>
          <strong>${room.session.psychologist.full_name}</strong>
          <p>${room.session.psychologist.specialization}. ${room.session.client_identity.display_name || "Private room"}.</p>
        </div>
      `;
      recentChatsList.appendChild(row);
    });
  }

  function renderPsychologists(psychologists) {
    recommendedList.innerHTML = "";

    const topMatches = psychologists.slice(0, 2);
    if (!topMatches.length) {
      recommendedList.appendChild(
        createEmptyState(
          "No verified psychologists yet",
          "Psychologist recommendations will appear here once profiles are available."
        )
      );
      return;
    }

    topMatches.forEach((psychologist) => {
      const card = document.createElement("div");
      card.className = "mini-card";
      card.innerHTML = `
        <span class="profile-avatar">${initialsFromName(psychologist.full_name)}</span>
        <div>
          <strong>${psychologist.full_name}</strong>
          <p>${psychologist.specialization}</p>
        </div>
        <a href="psychologists.html">Choose</a>
      `;
      recommendedList.appendChild(card);
    });
  }

  try {
    // Backend calls: load the current user, active chat rooms, and verified psychologists.
    const [currentUser, rooms, psychologists] = await Promise.all([
      window.SafetalkApi.getMe(),
      window.SafetalkApi.listChatRooms(),
      window.SafetalkApi.getPsychologists(),
    ]);

    window.SafetalkAuth.setCurrentUser(currentUser);
    welcomeHeading.textContent = `Welcome back, ${currentUser.full_name || currentUser.username}.`;
    subtitle.textContent = `Your account is active as ${currentUser.username}. Choose a psychologist, then decide how you want to appear in counseling sessions.`;

    const activeSession = window.SafetalkAuth.getActiveSession();
    const identityMode = (activeSession && activeSession.identity_mode) || window.SafetalkAuth.getIdentityMode();

    if (identityMode === "anonymous" && activeSession) {
      statusTitle.textContent = "Anonymous Mode";
      statusCopy.innerHTML = `Generated account alias: <strong>${activeSession.anonymous_alias || activeSession.client_identity?.display_name || "Anonymous User"}</strong>. Psychologists see: <strong>Anonymous User</strong>.`;
      statusIcon.innerHTML = '<i class="fa-solid fa-mask"></i>';
    } else if (identityMode === "known" && currentUser.full_name) {
      statusTitle.textContent = "Known Mode";
      statusCopy.innerHTML = `Psychologists see your name as <strong>${currentUser.full_name}</strong>. Your email stays private.`;
      statusIcon.innerHTML = '<i class="fa-solid fa-user-check"></i>';
    }

    renderRooms(rooms);
    renderPsychologists(psychologists);
  } catch (error) {
    showMessage(roomsMessage, error.message);
    showMessage(psychologistsMessage, error.message);
  }
});
