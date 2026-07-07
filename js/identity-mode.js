document.addEventListener("DOMContentLoaded", async () => {
  window.SafetalkAuth.redirectIfNotLoggedIn();

  const selectedPsychologistSummary = document.getElementById("selected-psychologist-summary");
  const messageBox = document.getElementById("identity-message");
  const anonymousLabel = document.getElementById("anonymous-mode-label");
  const knownLabel = document.getElementById("known-mode-label");
  const anonymousButton = document.getElementById("anonymous-session-button");
  const knownButton = document.getElementById("known-session-button");
  const pageCopy = document.getElementById("identity-page-copy");

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.classList.remove("is-hidden", "is-error", "is-success");
    messageBox.classList.add(type === "success" ? "is-success" : "is-error");
  }

  function wait(delayMs) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, delayMs);
    });
  }

  async function findRoomForSession(session) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const rooms = await window.SafetalkApi.listChatRooms();
      const room = rooms.find((item) =>
        String(item.session.id) === String(session.id) ||
        String(item.session.session_id) === String(session.session_id)
      );

      if (room) {
        return room;
      }

      if (attempt < 3) {
        await wait(400);
      }
    }

    return null;
  }

  async function createSession(identityMode, button) {
    const selectedPsychologist = window.SafetalkAuth.getSelectedPsychologist();
    if (!selectedPsychologist) {
      showMessage("Choose a psychologist before selecting your identity mode.", "error");
      return;
    }

    console.log("[Safetalk][Identity] Selected psychologist id:", selectedPsychologist.id);
    console.log("[Safetalk][Identity] Identity mode:", identityMode);

    button.disabled = true;
    button.setAttribute("aria-busy", "true");

    try {
      // Backend call: create the counseling session with the chosen identity mode.
      const session = await window.SafetalkApi.createCounselingSession({
        psychologist_id: selectedPsychologist.id,
        identity_mode: identityMode,
      });
      console.log("[Safetalk][Identity] Created session response:", session);

      window.SafetalkAuth.setIdentityMode(identityMode);
      window.SafetalkAuth.setActiveSession(session);

      // Backend call: fetch chat rooms and open the room attached to the new session.
      const room = await findRoomForSession(session);

      if (!room) {
        throw new Error("Session created, but no chat room was found yet.");
      }

      console.log("[Safetalk][Identity] Selected chat room id:", room.id);
      window.SafetalkAuth.setActiveRoomId(room.id);
      showMessage("Session created. Opening your secure chat room.", "success");

      setTimeout(() => {
        window.location.href = `chat.html?room=${room.id}`;
      }, 700);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }

  try {
    const currentUser = window.SafetalkAuth.getCurrentUser() || await window.SafetalkApi.getMe();
    window.SafetalkAuth.setCurrentUser(currentUser);

    const selectedPsychologist = window.SafetalkAuth.getSelectedPsychologist();
    const previewAlias = window.SafetalkAuth.generatePreviewAlias();

    anonymousLabel.textContent = `Generated alias: ${previewAlias}`;
    knownLabel.textContent = `Visible name: ${currentUser.full_name || currentUser.username}`;
    pageCopy.textContent = "Safetalk keeps your account internally for safety. This choice controls what psychologists see inside counseling sessions after you pick a provider.";

    if (!selectedPsychologist) {
      selectedPsychologistSummary.textContent = "No psychologist selected yet. Choose a psychologist first to start a session.";
      anonymousButton.disabled = true;
      knownButton.disabled = true;
      return;
    }

    console.log("[Safetalk][Identity] Loaded selected psychologist from storage:", selectedPsychologist);
    selectedPsychologistSummary.textContent = `Selected psychologist: ${selectedPsychologist.full_name} - ${selectedPsychologist.specialization}`;

    anonymousButton.addEventListener("click", () => createSession("anonymous", anonymousButton));
    knownButton.addEventListener("click", () => createSession("known", knownButton));
  } catch (error) {
    showMessage(error.message, "error");
  }
});
