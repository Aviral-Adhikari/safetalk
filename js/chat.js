document.addEventListener("DOMContentLoaded", async () => {
  window.SafetalkAuth.redirectIfNotLoggedIn();

  const conversationList = document.getElementById("conversation-list");
  const sidebarMessage = document.getElementById("chat-sidebar-message");
  const sidebarCopy = document.getElementById("identity-sidebar-copy");
  const searchInput = document.getElementById("conversation-search");
  const headerAvatar = document.getElementById("chat-header-avatar");
  const headerName = document.getElementById("chat-header-name");
  const headerStatus = document.getElementById("chat-header-status");
  const contextIdentity = document.getElementById("chat-context-identity");
  const sessionStatus = document.getElementById("chat-session-status");
  const messagesList = document.getElementById("messages-list");
  const chatForm = document.getElementById("chat-form");
  const messageInput = document.getElementById("message-input");
  const attachmentButton = chatForm.querySelector(".utility-button");
  const sendButton = chatForm.querySelector(".send-button");
  const profileAvatar = document.getElementById("profile-panel-avatar");
  const profileName = document.getElementById("profile-panel-name");
  const profileSpecialization = document.getElementById("profile-panel-specialization");
  const profileExperience = document.getElementById("profile-panel-experience");
  const profileBio = document.getElementById("profile-panel-bio");
  const markSessionActiveButton = document.getElementById("mark-session-active-button");
  const endSessionButton = document.getElementById("end-session-button");
  const currentUser = window.SafetalkAuth.getCurrentUser() || await window.SafetalkApi.getMe();

  window.SafetalkAuth.setCurrentUser(currentUser);

  let rooms = [];
  let currentMessages = [];
  let currentRoom = null;
  let activeRoomId = new URLSearchParams(window.location.search).get("room") || window.SafetalkAuth.getActiveRoomId();

  function initialsFromName(name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function formatTime(isoDate) {
    return new Date(isoDate).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
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

  function showSidebarMessage(text) {
    sidebarMessage.textContent = text;
    sidebarMessage.classList.remove("is-hidden");
    sidebarMessage.classList.add("is-error");
  }

  function clearSidebarMessage() {
    sidebarMessage.textContent = "";
    sidebarMessage.classList.add("is-hidden");
  }

  function setStatusControlsDisabled(disabled) {
    markSessionActiveButton.disabled = disabled;
    endSessionButton.disabled = disabled;
  }

  function updateComposerState(room) {
    const statusValue = room?.session?.status || "pending";
    const isEnded = statusValue === "ended";

    messageInput.disabled = isEnded;
    attachmentButton.disabled = isEnded;
    sendButton.disabled = isEnded;
    messageInput.required = !isEnded;

    if (isEnded) {
      messageInput.value = "";
      messageInput.placeholder = "This counseling session has ended.";
    }
  }

  function updateStatusUi(room) {
    const statusValue = room.session.status || "pending";
    const label = formatStatusLabel(statusValue);

    sessionStatus.className = `session-status-pill status-${statusValue}`;
    sessionStatus.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Session status: ${label}`;

    const isPsychologistViewer = currentUser.role === "psychologist";
    const showActivate = isPsychologistViewer && statusValue === "pending";
    const showEnd = statusValue !== "ended";

    markSessionActiveButton.classList.toggle("is-hidden", !showActivate);
    endSessionButton.classList.toggle("is-hidden", !showEnd);
    updateComposerState(room);
  }

  function renderConversationList(items) {
    conversationList.innerHTML = "";

    if (!items.length) {
      conversationList.innerHTML = `
        <div class="empty-state-card">
          <strong>No active counseling rooms</strong>
          <span>Choose a psychologist and create a counseling session to begin chatting.</span>
        </div>
      `;
      return;
    }

    items.forEach((room) => {
      const link = document.createElement("a");
      const isActive = String(room.id) === String(activeRoomId);
      link.className = `conversation${isActive ? " active" : ""}`;
      link.href = `chat.html?room=${room.id}`;
      link.innerHTML = `
        <span class="profile-avatar">${initialsFromName(room.session.psychologist.full_name)}</span>
        <span class="presence-dot${room.session.status === "ended" ? " offline" : ""}"></span>
        <div>
          <strong>${room.session.psychologist.full_name}</strong>
          <p>${room.session.psychologist.specialization} - ${formatStatusLabel(room.session.status)}</p>
        </div>
      `;
      conversationList.appendChild(link);
    });
  }

  function renderRoom(room) {
    const psychologist = room.session.psychologist;
    const clientIdentity = room.session.client_identity;

    currentRoom = room;
    headerAvatar.textContent = initialsFromName(psychologist.full_name);
    headerName.textContent = psychologist.full_name;
    headerStatus.textContent = `${psychologist.specialization} - ${formatStatusLabel(room.session.status)} session`;
    contextIdentity.innerHTML = `<i class="fa-solid fa-user-secret"></i> Psychologist sees: <strong>${clientIdentity.display_name || "Private User"}</strong>`;
    sidebarCopy.textContent = `${clientIdentity.identity_mode === "anonymous" ? "Anonymous Mode" : "Known Mode"}: ${clientIdentity.display_name || "Ready"}`;

    if (room.session.status === "ended") {
      messageInput.placeholder = "This counseling session has ended.";
    } else {
      messageInput.placeholder = `Message ${psychologist.full_name} as ${clientIdentity.display_name || "client"}`;
    }

    profileAvatar.textContent = initialsFromName(psychologist.full_name);
    profileName.textContent = psychologist.full_name;
    profileSpecialization.textContent = psychologist.specialization;
    profileExperience.textContent = `Session status: ${formatStatusLabel(room.session.status)}. Experience details will expand once richer psychologist profile APIs are added.`;
    profileBio.textContent = "This chat room is connected to your counseling session and remains protected by JWT-authenticated API access.";

    updateStatusUi(room);
  }

  function renderMessages(messages) {
    messagesList.innerHTML = "";

    if (!messages.length) {
      messagesList.innerHTML = `
        <div class="empty-state-card">
          <strong>No messages yet</strong>
          <span>Start the conversation whenever you feel ready.</span>
        </div>
      `;
      return;
    }

    const divider = document.createElement("div");
    divider.className = "day-divider";
    divider.textContent = "Conversation";
    messagesList.appendChild(divider);

    messages.forEach((message) => {
      const article = document.createElement("article");
      const isUserMessage = String(message.sender) === String(currentUser.id);
      article.className = `message-group ${isUserMessage ? "user-message" : "doctor-message"}`;
      article.innerHTML = `
        <span class="message-author">${message.sender_display_name}</span>
        <div class="message-bubble">${message.content}</div>
        <span class="timestamp">${formatTime(message.created_at)}</span>
      `;
      messagesList.appendChild(article);
    });

    messagesList.scrollTop = messagesList.scrollHeight;
  }

  async function loadMessages(roomId) {
    const messages = await window.SafetalkApi.getRoomMessages(roomId);
    currentMessages = messages;
    renderMessages(currentMessages);
  }

  function syncRoomInCollection(updatedRoom) {
    rooms = rooms.map((room) => (String(room.id) === String(updatedRoom.id) ? updatedRoom : room));
  }

  async function loadRoom(roomId) {
    window.SafetalkAuth.setActiveRoomId(roomId);
    activeRoomId = roomId;
    console.log("[Safetalk][Chat] Selected chat room id:", activeRoomId);

    const room = await window.SafetalkApi.getChatRoom(roomId);
    syncRoomInCollection(room);
    renderRoom(room);
    await loadMessages(roomId);
    renderConversationList(rooms);

    const activeSession = window.SafetalkAuth.getActiveSession();
    if (activeSession && String(activeSession.id) === String(room.session.id)) {
      window.SafetalkAuth.setActiveSession({
        ...activeSession,
        status: room.session.status,
      });
    }
  }

  async function handleStatusUpdate(nextStatus) {
    if (!currentRoom) {
      showSidebarMessage("Select a room before updating session status.");
      return;
    }

    clearSidebarMessage();
    setStatusControlsDisabled(true);

    try {
      const updatedSession = await window.SafetalkApi.updateCounselingSessionStatus(currentRoom.session.id, {
        status: nextStatus,
      });

      currentRoom = {
        ...currentRoom,
        session: {
          ...currentRoom.session,
          status: updatedSession.status,
        },
      };

      syncRoomInCollection(currentRoom);
      renderRoom(currentRoom);
      renderConversationList(rooms);

      const activeSession = window.SafetalkAuth.getActiveSession();
      if (activeSession && String(activeSession.id) === String(updatedSession.id)) {
        window.SafetalkAuth.setActiveSession({
          ...activeSession,
          status: updatedSession.status,
          updated_at: updatedSession.updated_at,
        });
      }

      if (nextStatus === "ended") {
        showSidebarMessage("This counseling session has been marked as ended.");
      }
    } catch (error) {
      showSidebarMessage(error.message);
    } finally {
      setStatusControlsDisabled(false);
    }
  }

  try {
    rooms = await window.SafetalkApi.listChatRooms();

    if (!rooms.length) {
      renderConversationList([]);
      return;
    }

    if (!activeRoomId) {
      activeRoomId = rooms[0].id;
    }

    renderConversationList(rooms);
    await loadRoom(activeRoomId);
  } catch (error) {
    showSidebarMessage(error.message);
  }

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    const filteredRooms = rooms.filter((room) =>
      room.session.psychologist.full_name.toLowerCase().includes(term)
    );
    renderConversationList(filteredRooms);
  });

  markSessionActiveButton.addEventListener("click", async () => {
    await handleStatusUpdate("active");
  });

  endSessionButton.addEventListener("click", async () => {
    await handleStatusUpdate("ended");
  });

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearSidebarMessage();

    if (!activeRoomId) {
      showSidebarMessage("Select a room before sending messages.");
      return;
    }

    if (currentRoom && currentRoom.session.status === "ended") {
      showSidebarMessage("This counseling session has ended. New messages are disabled.");
      return;
    }

    const content = messageInput.value.trim();
    if (!content) {
      return;
    }

    try {
      const createdMessage = await window.SafetalkApi.sendRoomMessage(activeRoomId, {
        content,
        message_type: "text",
      });
      console.log("[Safetalk][Chat] Send message response:", createdMessage);

      currentMessages = [...currentMessages, createdMessage];
      renderMessages(currentMessages);
      messageInput.value = "";

      try {
        await loadMessages(activeRoomId);
      } catch (refreshError) {
        console.warn("[Safetalk][Chat] Message refresh failed after send:", refreshError);
      }
    } catch (error) {
      showSidebarMessage(error.message);
    }
  });
});
