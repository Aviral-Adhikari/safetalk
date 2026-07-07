document.addEventListener("DOMContentLoaded", () => {
  window.SafetalkAuth.redirectIfLoggedIn();

  const form = document.getElementById("login-form");
  const messageBox = document.getElementById("login-message");
  const submitButton = form.querySelector('button[type="submit"]');
  const params = new URLSearchParams(window.location.search);

  if (params.get("registered") === "1") {
    messageBox.textContent = "Account created successfully. Please login to continue.";
    messageBox.classList.remove("is-hidden");
    messageBox.classList.add("is-success");
  } else if (params.get("psychologist_applied") === "1") {
    messageBox.textContent = "Psychologist application submitted. You can login after admin verification.";
    messageBox.classList.remove("is-hidden");
    messageBox.classList.add("is-success");
  }

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.classList.remove("is-hidden", "is-error", "is-success");
    messageBox.classList.add(type === "success" ? "is-success" : "is-error");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");

    try {
      // Backend call: exchange username/password for JWT tokens.
      const tokens = await window.SafetalkApi.login({
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value,
      });

      window.SafetalkAuth.clearSessionContext();
      window.SafetalkAuth.setTokens(tokens.access, tokens.refresh);

      // Backend call: hydrate the current user's safe profile.
      const currentUser = await window.SafetalkApi.getMe();
      window.SafetalkAuth.setCurrentUser(currentUser);

      window.location.href = "dashboard.html";
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  });
});
