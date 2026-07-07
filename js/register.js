document.addEventListener("DOMContentLoaded", () => {
  window.SafetalkAuth.redirectIfLoggedIn();

  const form = document.getElementById("register-form");
  const messageBox = document.getElementById("register-message");
  const submitButton = form.querySelector('button[type="submit"]');

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
      // Backend call: create a new Safetalk client account.
      await window.SafetalkApi.register({
        username: document.getElementById("register-username").value.trim(),
        email: document.getElementById("register-email").value.trim(),
        password: document.getElementById("register-password").value,
        full_name: document.getElementById("full-name").value.trim(),
      });

      showMessage("Account created. Redirecting you to login.", "success");
      setTimeout(() => {
        window.location.href = "login.html?registered=1";
      }, 1000);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  });
});
