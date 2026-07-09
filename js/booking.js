document.addEventListener("DOMContentLoaded", async () => {
  window.SafetalkAuth.redirectIfNotLoggedIn();

  const logoutLink = document.getElementById("logout-link");
  const avatar = document.getElementById("booking-avatar");
  const nameElement = document.getElementById("booking-psychologist-name");
  const specializationElement = document.getElementById("booking-specialization");
  const experienceElement = document.getElementById("booking-experience");
  const languagesElement = document.getElementById("booking-languages");
  const copyElement = document.getElementById("booking-copy");
  const form = document.getElementById("booking-form");
  const slotsList = document.getElementById("slot-choice-list");
  const messageBox = document.getElementById("booking-message");
  const identityModeInput = document.getElementById("booking-identity-mode");
  const notesInput = document.getElementById("booking-notes");
  const confirmButton = document.getElementById("confirm-booking-button");

  let selectedPsychologist = null;

  logoutLink.addEventListener("click", (event) => {
    event.preventDefault();
    window.SafetalkAuth.logout();
  });

  function initialsFromName(name) {
    return String(name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function formatDate(value) {
    return new Date(`${value}T00:00:00`).toLocaleDateString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(value) {
    const [hour, minute] = value.split(":");
    return new Date(2026, 0, 1, Number(hour), Number(minute)).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.classList.remove("is-hidden", "is-error", "is-success");
    messageBox.classList.add(type === "success" ? "is-success" : "is-error");
  }

  function renderPsychologist(psychologist) {
    avatar.innerHTML = psychologist.profile_photo
      ? `<img src="${psychologist.profile_photo}" alt="${psychologist.full_name} profile photo">`
      : initialsFromName(psychologist.full_name);
    nameElement.textContent = psychologist.full_name;
    specializationElement.textContent = psychologist.specialization;
    experienceElement.textContent = `${psychologist.years_of_experience} years experience`;
    languagesElement.textContent = psychologist.languages;
    copyElement.innerHTML = `You are booking with <strong>${psychologist.full_name}</strong>. Your request stays pending until confirmed.`;
  }

  function renderSlots(slots) {
    slotsList.innerHTML = "";

    if (!slots.length) {
      slotsList.innerHTML = `
        <div class="empty-state-card">
          <strong>No appointment slots available</strong>
          <span>This psychologist has not published open appointment times yet.</span>
        </div>
      `;
      confirmButton.disabled = true;
      return;
    }

    confirmButton.disabled = false;
    slots.forEach((slot, index) => {
      const label = document.createElement("label");
      label.className = "slot-choice";
      label.innerHTML = `
        <input type="radio" name="slot" value="${slot.id}" ${index === 0 ? "checked" : ""}>
        <span>
          <strong>${formatDate(slot.date)}</strong>
          <span>${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}</span>
        </span>
      `;
      slotsList.appendChild(label);
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const selectedSlot = form.querySelector('input[name="slot"]:checked');
    if (!selectedSlot) {
      showMessage("Choose an appointment time first.", "error");
      return;
    }

    confirmButton.disabled = true;
    confirmButton.setAttribute("aria-busy", "true");

    try {
      await window.SafetalkApi.bookAppointment({
        availability_slot_id: Number(selectedSlot.value),
        identity_mode: identityModeInput.value,
        notes: notesInput.value.trim(),
      });
      showMessage("Appointment request sent. You will see it on your dashboard.", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1200);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      confirmButton.disabled = false;
      confirmButton.removeAttribute("aria-busy");
    }
  });

  try {
    const currentUser = await window.SafetalkApi.getMe();
    window.SafetalkAuth.setCurrentUser(currentUser);
    if (currentUser.role !== "client") {
      window.location.href = "psychologist-dashboard.html";
      return;
    }

    selectedPsychologist = window.SafetalkAuth.getSelectedPsychologist();
    if (!selectedPsychologist) {
      window.location.href = "psychologists.html";
      return;
    }

    renderPsychologist(selectedPsychologist);
    slotsList.innerHTML = `
      <div class="empty-state-card">
        <strong>Loading available times</strong>
        <span>Please wait while Safetalk checks this psychologist's schedule.</span>
      </div>
    `;
    const slots = await window.SafetalkApi.listPsychologistSlots(selectedPsychologist.id);
    renderSlots(slots);
  } catch (error) {
    showMessage(error.message, "error");
  }
});
