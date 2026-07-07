document.addEventListener("DOMContentLoaded", async () => {
  window.SafetalkAuth.redirectIfNotLoggedIn();

  const logoutLink = document.getElementById("logout-link");
  const welcomeHeading = document.getElementById("dashboard-welcome");
  const subtitle = document.getElementById("dashboard-subtitle");
  const statusLabel = document.getElementById("identity-status-label");
  const statusTitle = document.getElementById("identity-status-title");
  const statusCopy = document.getElementById("identity-status-copy");
  const statusIcon = document.getElementById("identity-status-icon");
  const statusAction = document.getElementById("identity-status-action");
  const recentChatsList = document.getElementById("recent-chats-list");
  const recommendedList = document.getElementById("recommended-psychologists-list");
  const panelTwoContent = document.getElementById("panel-two-content");
  const panelOneTitle = document.getElementById("panel-one-title");
  const panelTwoTitle = document.getElementById("panel-two-title");
  const panelThreeTitle = document.getElementById("panel-three-title");
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

  function hideMessage(element) {
    element.textContent = "";
    element.classList.add("is-hidden");
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

  function formatStatusLabel(statusValue) {
    if (statusValue === "active") {
      return "Active";
    }
    if (statusValue === "ended") {
      return "Ended";
    }
    return "Pending";
  }

  function formatIdentityLabel(identityMode) {
    return identityMode === "known" ? "Known Mode" : "Anonymous Mode";
  }

  function formatCreatedDate(isoDate) {
    return new Date(isoDate).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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

  function renderClientDashboard(currentUser, rooms, psychologists) {
    welcomeHeading.textContent = `Welcome back, ${currentUser.full_name || currentUser.username}.`;
    subtitle.textContent = `Your account is active as ${currentUser.username}. Choose a psychologist, then decide how you want to appear in counseling sessions.`;

    const activeSession = window.SafetalkAuth.getActiveSession();
    const identityMode = (activeSession && activeSession.identity_mode) || window.SafetalkAuth.getIdentityMode();

    statusLabel.textContent = "Current identity mode";
    statusAction.href = "identity-mode.html";
    statusAction.textContent = "Change Mode";
    statusAction.classList.remove("is-hidden");

    if (identityMode === "anonymous" && activeSession) {
      statusTitle.textContent = "Anonymous Mode";
      statusCopy.innerHTML = `Generated account alias: <strong>${activeSession.anonymous_alias || activeSession.client_identity?.display_name || "Anonymous User"}</strong>. Psychologists see: <strong>Anonymous User</strong>.`;
      statusIcon.innerHTML = '<i class="fa-solid fa-mask"></i>';
    } else if (identityMode === "known" && currentUser.full_name) {
      statusTitle.textContent = "Known Mode";
      statusCopy.innerHTML = `Psychologists see your name as <strong>${currentUser.full_name}</strong>. Your email stays private.`;
      statusIcon.innerHTML = '<i class="fa-solid fa-user-check"></i>';
    } else {
      statusTitle.textContent = "Choose a mode";
      statusCopy.textContent = "Pick anonymous or known mode before starting a counseling session.";
      statusIcon.innerHTML = '<i class="fa-solid fa-mask"></i>';
    }

    panelOneTitle.textContent = "Recent chats";
    panelTwoTitle.textContent = "Quick actions";
    panelThreeTitle.textContent = "Recommended psychologists";

    panelTwoContent.innerHTML = `
      <a class="action-tile" href="identity-mode.html"><i class="fa-solid fa-id-card"></i><span>Choose identity mode</span></a>
      <a class="action-tile" href="psychologists.html"><i class="fa-solid fa-user-doctor"></i><span>Find psychologist</span></a>
      <a class="action-tile" href="chat.html"><i class="fa-solid fa-message"></i><span>Open secure chat</span></a>
    `;

    renderRooms(rooms);
    renderPsychologists(psychologists);
  }

  function findRoomForSession(sessionId, rooms) {
    return rooms.find((room) => String(room.session.id) === String(sessionId));
  }

  function createSessionCard(session, rooms) {
    const card = document.createElement("article");
    card.className = "session-card";

    const matchingRoom = findRoomForSession(session.id, rooms);
    const clientDisplayName = session.client_identity?.display_name || "Private User";
    const statusLabelText = formatStatusLabel(session.status);

    card.innerHTML = `
      <div class="session-card-top">
        <div>
          <strong>${clientDisplayName}</strong>
          <p>${formatIdentityLabel(session.identity_mode)}</p>
        </div>
        <span class="session-status-badge status-${session.status}">${statusLabelText}</span>
      </div>
      <div class="session-card-meta">
        <span>Session status: ${statusLabelText}</span>
        <span>Started: ${formatCreatedDate(session.created_at)}</span>
      </div>
      <div class="session-card-actions"></div>
    `;

    const actions = card.querySelector(".session-card-actions");

    if (!matchingRoom) {
      const mutedText = document.createElement("span");
      mutedText.textContent = "Chat room not available yet";
      mutedText.className = "session-card-meta";
      actions.appendChild(mutedText);
      return card;
    }

    const openChatButton = document.createElement("button");
    openChatButton.type = "button";
    openChatButton.className = "btn btn-secondary btn-small";
    openChatButton.textContent = "Open Chat";
    openChatButton.addEventListener("click", () => {
      window.SafetalkAuth.setActiveRoomId(matchingRoom.id);
      window.location.href = `chat.html?room=${matchingRoom.id}`;
    });
    actions.appendChild(openChatButton);

    return card;
  }

  function renderSessionGroup(container, sessions, rooms, emptyTitle, emptyText) {
    container.innerHTML = "";

    if (!sessions.length) {
      container.appendChild(createEmptyState(emptyTitle, emptyText));
      return;
    }

    const stack = document.createElement("div");
    stack.className = "session-stack";
    sessions.forEach((session) => {
      stack.appendChild(createSessionCard(session, rooms));
    });
    container.appendChild(stack);
  }

  function renderPsychologistDashboard(currentUser, sessions, rooms) {
    welcomeHeading.textContent = `Welcome back, Dr. ${currentUser.full_name || currentUser.username}.`;
    subtitle.textContent = "Review assigned counseling sessions, monitor current status, and open the matching secure chat room for each client.";

    statusLabel.textContent = "Therapist workspace";
    statusTitle.textContent = "Psychologist Dashboard";
    statusCopy.textContent = "You can review pending requests, continue active counseling sessions, and revisit ended sessions without exposing client email.";
    statusIcon.innerHTML = '<i class="fa-solid fa-user-doctor"></i>';
    statusAction.href = "chat.html";
    statusAction.textContent = "Open Chat";

    panelOneTitle.textContent = "Pending Sessions";
    panelTwoTitle.textContent = "Active Sessions";
    panelThreeTitle.textContent = "Ended Sessions";

    const pendingSessions = sessions.filter((session) => session.status === "pending");
    const activeSessions = sessions.filter((session) => session.status === "active");
    const endedSessions = sessions.filter((session) => session.status === "ended");

    renderSessionGroup(
      recentChatsList,
      pendingSessions,
      rooms,
      "No pending sessions",
      "New counseling requests assigned to you will appear here."
    );

    renderSessionGroup(
      panelTwoContent,
      activeSessions,
      rooms,
      "No active sessions",
      "Sessions become active once you accept and begin counseling."
    );

    renderSessionGroup(
      recommendedList,
      endedSessions,
      rooms,
      "No ended sessions",
      "Completed counseling sessions will remain listed here for reference."
    );
  }

  try {
    hideMessage(roomsMessage);
    hideMessage(psychologistsMessage);

    const currentUser = await window.SafetalkApi.getMe();
    window.SafetalkAuth.setCurrentUser(currentUser);

    if (currentUser.role === "psychologist") {
      const [sessions, rooms] = await Promise.all([
        window.SafetalkApi.listCounselingSessions(),
        window.SafetalkApi.listChatRooms(),
      ]);

      renderPsychologistDashboard(currentUser, sessions, rooms);
      return;
    }

    const [rooms, psychologists] = await Promise.all([
      window.SafetalkApi.listChatRooms(),
      window.SafetalkApi.getPsychologists(),
    ]);

    renderClientDashboard(currentUser, rooms, psychologists);
  } catch (error) {
    showMessage(roomsMessage, error.message);
    showMessage(psychologistsMessage, error.message);
  }
});
