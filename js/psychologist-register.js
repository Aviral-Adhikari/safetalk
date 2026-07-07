document.addEventListener("DOMContentLoaded", () => {
  window.SafetalkAuth.redirectIfLoggedIn();

  const form = document.getElementById("psychologist-application-form");
  const messageBox = document.getElementById("psychologist-application-message");
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
      await window.SafetalkApi.psychologistApply({
        username: document.getElementById("psychologist-username").value.trim(),
        email: document.getElementById("psychologist-email").value.trim(),
        password: document.getElementById("psychologist-password").value,
        full_name: document.getElementById("psychologist-full-name").value.trim(),
        specialization: document.getElementById("psychologist-specialization").value.trim(),
        bio: document.getElementById("psychologist-bio").value.trim(),
        years_of_experience: Number(document.getElementById("psychologist-experience").value),
        languages: document.getElementById("psychologist-languages").value.trim(),
      });

      showMessage("Application submitted. An admin will verify your psychologist account before it appears publicly.", "success");
      setTimeout(() => {
        window.location.href = "login.html?psychologist_applied=1";
      }, 1200);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  });
});
