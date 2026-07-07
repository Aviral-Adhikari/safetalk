document.addEventListener("DOMContentLoaded", async () => {
  window.SafetalkAuth.redirectIfNotLoggedIn();

  const listContainer = document.getElementById("psychologists-list");
  const messageBox = document.getElementById("psychologists-message");
  const modeCopy = document.getElementById("psychologists-mode-copy");

  function initialsFromName(name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function showMessage(text) {
    messageBox.textContent = text;
    messageBox.classList.remove("is-hidden");
    messageBox.classList.add("is-error");
  }

  function renderCard(psychologist) {
    const card = document.createElement("article");
    card.className = "directory-card";
    card.innerHTML = `
      <div class="profile-top">
        <span class="profile-avatar">${initialsFromName(psychologist.full_name)}</span>
        <span class="availability">${psychologist.is_available ? "Available" : "Unavailable"}</span>
      </div>
      <h3>${psychologist.full_name}</h3>
      <p class="specialization">${psychologist.specialization}</p>
      <p class="experience">${psychologist.years_of_experience} years experience</p>
      <div class="card-actions">
        <a class="btn btn-secondary" href="psychologist-profile.html">View Profile</a>
        <button class="btn btn-card" type="button">Choose Psychologist</button>
      </div>
    `;

    const selectButton = card.querySelector("button");
    selectButton.addEventListener("click", () => {
      window.SafetalkAuth.setSelectedPsychologist(psychologist);
      window.location.href = "identity-mode.html";
    });

    return card;
  }

  try {
    const currentUser = window.SafetalkAuth.getCurrentUser() || await window.SafetalkApi.getMe();
    window.SafetalkAuth.setCurrentUser(currentUser);

    const identityMode = window.SafetalkAuth.getIdentityMode();
    if (identityMode === "known" && currentUser.full_name) {
      modeCopy.innerHTML = `You are browsing as <strong>${currentUser.full_name}</strong>. You can still switch back to anonymous mode before starting a counseling session.`;
    } else {
      const activeSession = window.SafetalkAuth.getActiveSession();
      const alias = activeSession?.anonymous_alias || window.SafetalkAuth.generatePreviewAlias();
      modeCopy.innerHTML = `You are browsing while preparing for <strong>anonymous mode</strong>. Your psychologist would see <strong>${alias}</strong> after session creation.`;
    }

    // Backend call: load verified psychologists for the selection page.
    const psychologists = await window.SafetalkApi.getPsychologists();
    listContainer.innerHTML = "";

    if (!psychologists.length) {
      listContainer.innerHTML = `
        <div class="empty-state-card">
          <strong>No psychologists available</strong>
          <span>Verified psychologists will appear here once profiles are published.</span>
        </div>
      `;
      return;
    }

    psychologists.forEach((psychologist) => {
      listContainer.appendChild(renderCard(psychologist));
    });
  } catch (error) {
    showMessage(error.message);
  }
});
