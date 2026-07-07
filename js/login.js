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

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.classList.remove("is-hidden", "is-error", "is-success");
    messageBox.classList.add(type === "success" ? "is-success" : "is-error");
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
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");

    try {
      const tokens = await window.SafetalkApi.login({
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value,
      });

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

      window.location.href = "dashboard.html";
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  });
});
