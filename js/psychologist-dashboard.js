document.addEventListener("DOMContentLoaded", async () => {
  window.SafetalkAuth.redirectIfNotLoggedIn();

  const logoutLink = document.getElementById("logout-link");
  const welcomeHeading = document.getElementById("dashboard-welcome");
  const subtitle = document.getElementById("dashboard-subtitle");
  const statusTitle = document.getElementById("identity-status-title");
  const statusCopy = document.getElementById("identity-status-copy");
  const sessionsMessage = document.getElementById("dashboard-sessions-message");
  const pendingList = document.getElementById("pending-sessions-list");
  const activeList = document.getElementById("active-sessions-list");
  const endedList = document.getElementById("ended-sessions-list");
  const pendingCount = document.getElementById("pending-sessions-count");
  const activeCount = document.getElementById("active-sessions-count");
  const endedCount = document.getElementById("ended-sessions-count");
  const availabilityStatus = document.getElementById("availability-status");

  let currentSessions = [];
  let currentRooms = [];

  logoutLink.addEventListener("click", (event) => {
    event.preventDefault();
    window.SafetalkAuth.logout();
  });

  function showMessage(text, type) {
    sessionsMessage.textContent = text;
    sessionsMessage.classList.remove("is-hidden", "is-error", "is-success");
    sessionsMessage.classList.add(type === "success" ? "is-success" : "is-error");
  }

  function clearMessage() {
    sessionsMessage.textContent = "";
    sessionsMessage.classList.add("is-hidden");
  }

  function createEmptyState(title, text) {
    const wrapper = document.createElement("div");
    wrapper.className = "empty-state-card";
    wrapper.innerHTML = `<strong>${title}</strong><span>${text}</span>`;
    return wrapper;
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
    return identityMode === "known" ? "Known" : "Anonymous";
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

  function findRoomForSession(sessionId) {
    return currentRooms.find((room) => String(room.session.id) === String(sessionId));
  }

  function getClientDisplayName(session) {
    if (session.identity_mode === "anonymous") {
      return session.anonymous_alias || session.client_identity?.display_name || "Anonymous User";
    }

    return session.client_identity?.display_name || "Known Client";
  }

  async function reloadDashboard() {
    const [sessions, rooms] = await Promise.all([
      window.SafetalkApi.listCounselingSessions(),
      window.SafetalkApi.listChatRooms(),
    ]);

    currentSessions = sessions;
    currentRooms = rooms;
    renderDashboard();
  }

  async function updateSessionStatus(sessionId, status) {
    await window.SafetalkApi.updateCounselingSessionStatus(sessionId, { status });
    await reloadDashboard();
  }

  function openChat(session) {
    const room = findRoomForSession(session.id);

    if (!room) {
      showMessage("Chat room is not available for this session yet.", "error");
      return;
    }

    window.SafetalkAuth.setActiveSession(session);
    window.SafetalkAuth.setActiveRoomId(room.id);
    window.location.href = `chat.html?room=${room.id}`;
  }

  function createSessionCard(session) {
    const card = document.createElement("article");
    card.className = `session-card psychologist-session-card status-${session.status}`;

    const clientDisplayName = getClientDisplayName(session);
    const statusLabel = formatStatusLabel(session.status);

    card.innerHTML = `
      <div class="session-card-top">
        <div>
          <strong>${clientDisplayName}</strong>
          <p>Client Request - ${formatIdentityLabel(session.identity_mode)} identity</p>
        </div>
        <span class="session-status-badge status-${session.status}">${statusLabel}</span>
      </div>
      <div class="session-card-meta">
        <span>Client display: ${clientDisplayName}</span>
        <span>Identity mode: ${formatIdentityLabel(session.identity_mode)}</span>
        <span>Counseling session: ${statusLabel}</span>
        <span>Created: ${formatCreatedDate(session.created_at)}</span>
        <span>Last updated: ${session.updated_at ? formatCreatedDate(session.updated_at) : "Not updated yet"}</span>
      </div>
      <div class="session-card-actions"></div>
    `;

    const actions = card.querySelector(".session-card-actions");

    if (session.status === "pending") {
      const acceptButton = document.createElement("button");
      acceptButton.type = "button";
      acceptButton.className = "btn btn-primary btn-small";
      acceptButton.textContent = "Accept Request";
      acceptButton.addEventListener("click", async () => {
        acceptButton.disabled = true;
        try {
          await updateSessionStatus(session.id, "active");
          showMessage("Client request accepted.", "success");
        } catch (error) {
          showMessage(error.message, "error");
        } finally {
          acceptButton.disabled = false;
        }
      });
      actions.appendChild(acceptButton);
    }

    const openChatButton = document.createElement("button");
    openChatButton.type = "button";
    openChatButton.className = session.status === "ended" ? "btn btn-secondary btn-small" : "btn btn-secondary btn-small";
    openChatButton.textContent = session.status === "ended" ? "View Chat" : "Open Chat";
    openChatButton.addEventListener("click", () => openChat(session));
    actions.appendChild(openChatButton);

    if (session.status === "pending" || session.status === "active") {
      const endButton = document.createElement("button");
      endButton.type = "button";
      endButton.className = "btn btn-secondary btn-small";
      endButton.textContent = "End Session";
      endButton.addEventListener("click", async () => {
        endButton.disabled = true;
        try {
          await updateSessionStatus(session.id, "ended");
          showMessage("Counseling session ended.", "success");
        } catch (error) {
          showMessage(error.message, "error");
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
    sessions.forEach((session) => stack.appendChild(createSessionCard(session)));
    container.appendChild(stack);
  }

  function renderDashboard() {
    const pendingSessions = currentSessions.filter((session) => session.status === "pending");
    const activeSessions = currentSessions.filter((session) => session.status === "active");
    const endedSessions = currentSessions.filter((session) => session.status === "ended");

    pendingCount.textContent = pendingSessions.length;
    activeCount.textContent = activeSessions.length;
    endedCount.textContent = endedSessions.length;
    availabilityStatus.textContent = "Available";

    statusTitle.textContent = `${pendingSessions.length} client request${pendingSessions.length === 1 ? "" : "s"} waiting`;
    statusCopy.textContent = "Only client requests and counseling sessions assigned to your psychologist profile are shown here.";

    renderSessionGroup(
      pendingList,
      pendingSessions,
      "No pending requests",
      "New client requests assigned to you will appear here."
    );
    renderSessionGroup(
      activeList,
      activeSessions,
      "No active counseling sessions",
      "Accepted counseling sessions will appear here."
    );
    renderSessionGroup(
      endedList,
      endedSessions,
      "No completed sessions",
      "Completed counseling sessions remain available for review."
    );
  }

  try {
    clearMessage();

    const currentUser = await window.SafetalkApi.getMe();
    window.SafetalkAuth.setCurrentUser(currentUser);

    const role = String(currentUser.role || "").trim().toLowerCase();
    if (role !== "psychologist") {
      window.location.href = "dashboard.html";
      return;
    }

    if (!currentUser.is_psychologist_verified) {
      window.SafetalkAuth.logout({ redirect: false });
      window.location.href = "login.html?mode=psychologist&pending=1";
      return;
    }

    welcomeHeading.textContent = `Welcome back, ${currentUser.full_name || currentUser.username}.`;
    subtitle.textContent = "Manage client requests, active counseling sessions, and completed conversations from one focused therapist workspace.";

    await reloadDashboard();
  } catch (error) {
    showMessage(error.message, "error");
  }
});
