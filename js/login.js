document.addEventListener("DOMContentLoaded", () => {
  window.SafetalkAuth.redirectIfLoggedIn();

  const form = document.getElementById("login-form");
  const messageBox = document.getElementById("login-message");
  const submitButton = document.getElementById("login-submit-button");
  const title = document.getElementById("login-card-title");
  const copy = document.getElementById("login-card-copy");
  const modeButtons = Array.from(document.querySelectorAll("[data-login-mode]"));
  const params = new URLSearchParams(window.location.search);

  let selectedMode = params.get("mode") === "psychologist" ? "psychologist" : "client";
  let isSubmitting = false;
  let slowRequestTimer = null;

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.classList.remove("is-hidden", "is-error", "is-success");
    messageBox.classList.add(type === "success" ? "is-success" : "is-error");
  }

  function normalizeLoginError(error) {
    const message = String(error?.message || "").trim();
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("no active account") || lowerMessage.includes("credentials")) {
      return "Email/username or password is incorrect.";
    }

    if (lowerMessage.includes("starting up") || lowerMessage.includes("try again in")) {
      return "SafeTalk is starting up. This may take a moment. Please try again.";
    }

    if (lowerMessage.includes("unable to connect")) {
      return "Unable to connect to SafeTalk. Check your connection and try again.";
    }

    if (lowerMessage.includes("server error") || lowerMessage.includes("html")) {
      return "SafeTalk could not complete the login request.";
    }

    return message || "SafeTalk could not complete the login request.";
  }

  function setLoading(isLoading, label) {
    submitButton.disabled = isLoading;
    submitButton.toggleAttribute("aria-busy", isLoading);

    if (isLoading) {
      submitButton.dataset.originalText = submitButton.textContent;
      submitButton.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span>${label}</span>`;
      return;
    }

    submitButton.textContent = submitButton.dataset.originalText || submitButton.textContent;
    delete submitButton.dataset.originalText;
  }

  function setMode(mode) {
    selectedMode = mode;
    modeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.loginMode === mode);
    });

    if (mode === "psychologist") {
      title.textContent = "Psychologist login";
      copy.textContent = "Use your approved psychologist account to review sessions and continue counseling.";
      submitButton.textContent = "Login as Psychologist";
      return;
    }

    title.textContent = "Login to Safetalk";
    copy.textContent = "Your identity mode is selected after this step.";
    submitButton.textContent = "Login and Continue";
  }

  if (params.get("registered") === "1") {
    showMessage("Account created successfully. Please login to continue.", "success");
  } else if (params.get("pending") === "1") {
    showMessage("Your psychologist account is pending admin verification.", "error");
    selectedMode = "psychologist";
  } else if (params.get("psychologist_applied") === "1") {
    showMessage("Psychologist application submitted. You can login after admin verification.", "success");
    selectedMode = "psychologist";
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.loginMode);
    });
  });

  setMode(selectedMode);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    isSubmitting = true;
    setLoading(true, "Signing in...");
    showMessage("Signing you in...", "success");
    slowRequestTimer = window.setTimeout(() => {
      showMessage("SafeTalk is starting up. Please wait a moment...", "success");
    }, 6000);

    try {
      const tokens = await window.SafetalkApi.login({
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value,
      });

      if (!tokens?.access || !tokens?.refresh) {
        throw new Error("SafeTalk could not complete the login request.");
      }

      window.SafetalkAuth.clearSessionContext();
      window.SafetalkAuth.setTokens(tokens.access, tokens.refresh);

      const currentUser = await window.SafetalkApi.getMe();
      window.SafetalkAuth.setCurrentUser(currentUser);

      const normalizedRole = String(currentUser.role || "").trim().toLowerCase();

      if (selectedMode === "psychologist" && normalizedRole !== "psychologist") {
        window.SafetalkAuth.logout({ redirect: false });
        showMessage("This account is not registered as a psychologist. Please use Client Login instead.", "error");
        return;
      }

      if (selectedMode === "client" && normalizedRole === "psychologist") {
        setMode("psychologist");
      }

      if (normalizedRole === "psychologist" && !currentUser.is_psychologist_verified) {
        window.SafetalkAuth.logout({ redirect: false });
        showMessage("Your psychologist account is pending admin verification.", "error");
        return;
      }

      if (normalizedRole === "psychologist") {
        window.location.href = "psychologist-dashboard.html";
        return;
      }

      if (currentUser.is_staff || currentUser.is_superuser) {
        showMessage("Admin users should continue from the Django admin panel.", "success");
        return;
      }

      window.location.href = "dashboard.html";
    } catch (error) {
      window.SafetalkAuth.clearTokens();
      window.SafetalkAuth.clearCurrentUser();
      showMessage(normalizeLoginError(error), "error");
    } finally {
      if (slowRequestTimer) {
        window.clearTimeout(slowRequestTimer);
        slowRequestTimer = null;
      }

      isSubmitting = false;
      setLoading(false);
    }
  });
});
