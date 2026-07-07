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
  const messagesList = document.getElementById("messages-list");
  const chatForm = document.getElementById("chat-form");
  const messageInput = document.getElementById("message-input");
  const profileAvatar = document.getElementById("profile-panel-avatar");
  const profileName = document.getElementById("profile-panel-name");
  const profileSpecialization = document.getElementById("profile-panel-specialization");
  const profileExperience = document.getElementById("profile-panel-experience");
  const profileBio = document.getElementById("profile-panel-bio");
  const currentUser = window.SafetalkAuth.getCurrentUser() || await window.SafetalkApi.getMe();

  window.SafetalkAuth.setCurrentUser(currentUser);

  let rooms = [];
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

  function showSidebarMessage(text) {
    sidebarMessage.textContent = text;
    sidebarMessage.classList.remove("is-hidden");
    sidebarMessage.classList.add("is-error");
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
        <span class="presence-dot"></span>
        <div>
          <strong>${room.session.psychologist.full_name}</strong>
          <p>${room.session.psychologist.specialization}</p>
        </div>
      `;
      conversationList.appendChild(link);
    });
  }

  function renderRoom(room) {
    const psychologist = room.session.psychologist;
    const clientIdentity = room.session.client_identity;

    headerAvatar.textContent = initialsFromName(psychologist.full_name);
    headerName.textContent = psychologist.full_name;
    headerStatus.textContent = `${psychologist.specialization} • Private counseling room`;
    contextIdentity.innerHTML = `<i class="fa-solid fa-user-secret"></i> Psychologist sees: <strong>${clientIdentity.display_name || "Private User"}</strong>`;
    sidebarCopy.textContent = `${clientIdentity.identity_mode === "anonymous" ? "Anonymous Mode" : "Known Mode"}: ${clientIdentity.display_name || "Ready"}`;
    messageInput.placeholder = `Message ${psychologist.full_name} as ${clientIdentity.display_name || "client"}`;

    profileAvatar.textContent = initialsFromName(psychologist.full_name);
    profileName.textContent = psychologist.full_name;
    profileSpecialization.textContent = psychologist.specialization;
    profileExperience.textContent = "Experience details will be expanded once richer psychologist profile APIs are added.";
    profileBio.textContent = "This chat room is connected to your counseling session and remains protected by JWT-authenticated API access.";
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
      article.className = `message-group ${message.sender === currentUser.id ? "user-message" : "doctor-message"}`;
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
    // Backend call: load message history for the opened chat room.
    const messages = await window.SafetalkApi.getRoomMessages(roomId);
    renderMessages(messages);
  }

  async function loadRoom(roomId) {
    window.SafetalkAuth.setActiveRoomId(roomId);
    activeRoomId = roomId;

    // Backend call: load the selected room and its safe session metadata.
    const room = await window.SafetalkApi.getChatRoom(roomId);
    renderRoom(room);
    await loadMessages(roomId);
    renderConversationList(rooms);
  }

  try {
    // Backend call: load every room the logged-in user is allowed to access.
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

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!activeRoomId) {
      showSidebarMessage("Select a room before sending messages.");
      return;
    }

    const content = messageInput.value.trim();
    if (!content) {
      return;
    }

    try {
      // Backend call: send a message to the currently open room.
      await window.SafetalkApi.sendRoomMessage(activeRoomId, {
        content,
        message_type: "text",
      });

      messageInput.value = "";
      await loadMessages(activeRoomId);
    } catch (error) {
      showSidebarMessage(error.message);
    }
  });
});
