document.addEventListener("DOMContentLoaded", async () => {
  window.SafetalkAuth.redirectIfNotLoggedIn();

  const logoutLink = document.getElementById("logout-link");
  const primaryAction = document.getElementById("dashboard-primary-action");
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
  const appointmentsMessage = document.getElementById("dashboard-appointments-message");
  const appointmentsList = document.getElementById("client-appointments-list");

  let currentUser = null;
  let currentSessions = [];
  let currentRooms = [];
  let currentAppointments = [];

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

  function showAppointmentsMessage(text, type) {
    appointmentsMessage.textContent = text;
    appointmentsMessage.classList.remove("is-hidden", "is-error", "is-success");
    appointmentsMessage.classList.add(type === "success" ? "is-success" : "is-error");
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

  function normalizeRole(roleValue) {
    return String(roleValue || "").trim().toLowerCase();
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
          "No current session yet",
          "Find an available psychologist and start anonymous or known counseling when you are ready."
        )
      );
      return;
    }

    rooms.forEach((room) => {
      const row = document.createElement("a");
      row.className = "chat-row client-session-card";
      row.href = `chat.html?room=${room.id}`;
      row.innerHTML = `
        <span class="profile-avatar">${initialsFromName(room.session.psychologist.full_name)}</span>
        <div>
          <strong>${room.session.psychologist.full_name}</strong>
          <p>Your counseling session - ${formatStatusLabel(room.session.status)}.</p>
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
          "Available psychologists will appear here once profiles are verified."
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

  function renderAppointments(appointments) {
    appointmentsList.innerHTML = "";

    if (!appointments.length) {
      appointmentsList.appendChild(
        createEmptyState(
          "No appointments yet",
          "Book a counseling appointment with an available psychologist when you are ready."
        )
      );
      return;
    }

    const stack = document.createElement("div");
    stack.className = "session-stack";

    appointments.forEach((appointment) => {
      const card = document.createElement("article");
      card.className = `session-card client-session-card status-${appointment.status}`;
      card.innerHTML = `
        <div class="session-card-top">
          <div>
            <strong>${appointment.psychologist_name}</strong>
            <p>${appointment.psychologist_specialization}</p>
          </div>
          <span class="session-status-badge status-${appointment.status}">${appointment.status}</span>
        </div>
        <div class="session-card-meta">
          <span>Date: ${formatCreatedDate(`${appointment.appointment_date}T00:00:00`)}</span>
          <span>Time: ${appointment.start_time} - ${appointment.end_time}</span>
          <span>Identity mode: ${formatIdentityLabel(appointment.identity_mode)}</span>
        </div>
        <div class="session-card-actions"></div>
      `;

      const actions = card.querySelector(".session-card-actions");
      if (appointment.status === "confirmed" && appointment.chat_room_id) {
        const chatButton = document.createElement("button");
        chatButton.type = "button";
        chatButton.className = "btn btn-primary btn-small";
        chatButton.textContent = "Open Chat";
        chatButton.addEventListener("click", () => {
          window.SafetalkAuth.setActiveRoomId(appointment.chat_room_id);
          window.location.href = `chat.html?room=${appointment.chat_room_id}`;
        });
        actions.appendChild(chatButton);
      }

      if (appointment.status === "pending" || appointment.status === "confirmed") {
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "btn btn-secondary btn-small";
        cancelButton.textContent = "Cancel Appointment";
        cancelButton.addEventListener("click", async () => {
          try {
            await window.SafetalkApi.updateAppointmentStatus(appointment.id, { status: "cancelled" });
            currentAppointments = await window.SafetalkApi.listAppointments();
            renderAppointments(currentAppointments);
            showAppointmentsMessage("Appointment cancelled.", "success");
          } catch (error) {
            showAppointmentsMessage(error.message, "error");
          }
        });
        actions.appendChild(cancelButton);
      }

      stack.appendChild(card);
    });

    appointmentsList.appendChild(stack);
  }

  function renderClientDashboard(rooms, psychologists, appointments) {
    welcomeHeading.textContent = `Welcome back, ${currentUser.full_name || currentUser.username}.`;
    subtitle.textContent = `Your account is active as ${currentUser.username}. Find support, choose anonymous or known counseling, and return to your sessions anytime.`;

    const activeSession = window.SafetalkAuth.getActiveSession();
    const identityMode = (activeSession && activeSession.identity_mode) || window.SafetalkAuth.getIdentityMode();

    primaryAction.href = "psychologists.html";
    primaryAction.textContent = "Find Psychologist";

    statusLabel.textContent = "Your session identity";
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

    panelOneTitle.textContent = "My current session";
    panelTwoTitle.textContent = "Start counseling";
    panelThreeTitle.textContent = "Find available psychologists";

    panelTwoContent.innerHTML = `
      <a class="action-tile" href="identity-mode.html"><i class="fa-solid fa-id-card"></i><span>Choose identity mode</span></a>
      <a class="action-tile" href="psychologists.html"><i class="fa-solid fa-user-doctor"></i><span>Find psychologist</span></a>
      <a class="action-tile" href="chat.html"><i class="fa-solid fa-message"></i><span>My session history</span></a>
    `;

    renderRooms(rooms);
    renderPsychologists(psychologists);
    renderAppointments(appointments);
  }

  function findRoomForSession(sessionId) {
    return currentRooms.find((room) => String(room.session.id) === String(sessionId));
  }

  async function updateSessionStatus(sessionId, nextStatus) {
    const updatedSession = await window.SafetalkApi.updateCounselingSessionStatus(sessionId, {
      status: nextStatus,
    });

    currentSessions = currentSessions.map((session) =>
      String(session.id) === String(updatedSession.id)
        ? { ...session, status: updatedSession.status, updated_at: updatedSession.updated_at }
        : session
    );

    renderPsychologistDashboard();
  }

  function createSessionCard(session) {
    const card = document.createElement("article");
    card.className = "session-card";

    const matchingRoom = findRoomForSession(session.id);
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
        <span>Assigned client: ${clientDisplayName}</span>
        <span>Session status: ${statusLabelText}</span>
        <span>Started: ${formatCreatedDate(session.created_at)}</span>
      </div>
      <div class="session-card-actions"></div>
    `;

    const actions = card.querySelector(".session-card-actions");

    if (matchingRoom) {
      const openChatButton = document.createElement("button");
      openChatButton.type = "button";
      openChatButton.className = "btn btn-secondary btn-small";
      openChatButton.textContent = "Open Chat";
      openChatButton.addEventListener("click", () => {
        window.SafetalkAuth.setActiveRoomId(matchingRoom.id);
        window.location.href = `chat.html?room=${matchingRoom.id}`;
      });
      actions.appendChild(openChatButton);
    } else {
      const mutedText = document.createElement("span");
      mutedText.textContent = "Chat room not available yet";
      mutedText.className = "session-card-meta";
      actions.appendChild(mutedText);
    }

    if (session.status === "pending") {
      const acceptButton = document.createElement("button");
      acceptButton.type = "button";
      acceptButton.className = "btn btn-primary btn-small";
      acceptButton.textContent = "Accept Session";
      acceptButton.addEventListener("click", async () => {
        try {
          acceptButton.disabled = true;
          await updateSessionStatus(session.id, "active");
        } catch (error) {
          showMessage(roomsMessage, error.message);
        } finally {
          acceptButton.disabled = false;
        }
      });
      actions.appendChild(acceptButton);
    }

    if (session.status === "pending" || session.status === "active") {
      const endButton = document.createElement("button");
      endButton.type = "button";
      endButton.className = "btn btn-secondary btn-small";
      endButton.textContent = "End Session";
      endButton.addEventListener("click", async () => {
        try {
          endButton.disabled = true;
          await updateSessionStatus(session.id, "ended");
        } catch (error) {
          showMessage(psychologistsMessage, error.message);
        } finally {
          endButton.disabled = false;
        }
      });
      actions.appendChild(endButton);
    }

    return card;
  }

  function renderSessionGroup(container, sessions, emptyTitle, emptyText) {
    container.innerHTML = "";

    if (!sessions.length) {
      container.appendChild(createEmptyState(emptyTitle, emptyText));
      return;
    }

    const stack = document.createElement("div");
    stack.className = "session-stack";
    sessions.forEach((session) => {
      stack.appendChild(createSessionCard(session));
    });
    container.appendChild(stack);
  }

  function renderPsychologistDashboard() {
    welcomeHeading.textContent = `Welcome back, Dr. ${currentUser.full_name || currentUser.username}.`;
    subtitle.textContent = "Review assigned counseling sessions, monitor current status, and open the matching secure chat room for each client.";

    primaryAction.href = "chat.html";
    primaryAction.textContent = "Open Chat";

    statusLabel.textContent = "Therapist workspace";
    statusTitle.textContent = "Psychologist Dashboard";
    statusCopy.textContent = "Review assigned clients, accept pending sessions, end active sessions, and continue counseling from secure chat.";
    statusIcon.innerHTML = '<i class="fa-solid fa-user-doctor"></i>';
    statusAction.href = "chat.html";
    statusAction.textContent = "Open Chat";
    statusAction.classList.remove("is-hidden");

    panelOneTitle.textContent = "Pending Sessions";
    panelTwoTitle.textContent = "Active Sessions";
    panelThreeTitle.textContent = "Ended Sessions";

    const pendingSessions = currentSessions.filter((session) => session.status === "pending");
    const activeSessions = currentSessions.filter((session) => session.status === "active");
    const endedSessions = currentSessions.filter((session) => session.status === "ended");

    renderSessionGroup(
      recentChatsList,
      pendingSessions,
      "No pending sessions",
      "New counseling requests assigned to you will appear here."
    );

    renderSessionGroup(
      panelTwoContent,
      activeSessions,
      "No active sessions",
      "Accepted counseling sessions will appear here."
    );

    renderSessionGroup(
      recommendedList,
      endedSessions,
      "No ended sessions",
      "Completed counseling sessions will remain listed here for reference."
    );
  }

  try {
    hideMessage(roomsMessage);
    hideMessage(psychologistsMessage);

    currentUser = await window.SafetalkApi.getMe();
    window.SafetalkAuth.setCurrentUser(currentUser);

    const normalizedRole = normalizeRole(currentUser.role);

    if (normalizedRole === "psychologist") {
      window.location.href = "psychologist-dashboard.html";
      return;
    }

    const [rooms, psychologists, appointments] = await Promise.all([
      window.SafetalkApi.listChatRooms(),
      window.SafetalkApi.getPsychologists(),
      window.SafetalkApi.listAppointments(),
    ]);

    currentAppointments = appointments;
    renderClientDashboard(rooms, psychologists, appointments);
  } catch (error) {
    showMessage(roomsMessage, error.message);
    showMessage(psychologistsMessage, error.message);
  }
});
