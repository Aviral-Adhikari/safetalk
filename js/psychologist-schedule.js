document.addEventListener("DOMContentLoaded", async () => {
  window.SafetalkAuth.redirectIfNotLoggedIn();

  const logoutLink = document.getElementById("logout-link");
  const form = document.getElementById("slot-form");
  const messageBox = document.getElementById("schedule-message");
  const dateInput = document.getElementById("slot-date");
  const startInput = document.getElementById("slot-start-time");
  const endInput = document.getElementById("slot-end-time");
  const addButton = document.getElementById("add-slot-button");
  const slotsList = document.getElementById("slots-list");
  const slotCount = document.getElementById("slot-count");

  logoutLink.addEventListener("click", (event) => {
    event.preventDefault();
    window.SafetalkAuth.logout();
  });

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.classList.remove("is-hidden", "is-error", "is-success");
    messageBox.classList.add(type === "success" ? "is-success" : "is-error");
  }

  function clearMessage() {
    messageBox.textContent = "";
    messageBox.classList.add("is-hidden");
  }

  function formatDate(value) {
    return new Date(`${value}T00:00:00`).toLocaleDateString([], {
      weekday: "short",
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

  function validateSlot() {
    const today = new Date().toISOString().slice(0, 10);
    if (dateInput.value < today) {
      return "Date cannot be in the past.";
    }

    if (endInput.value <= startInput.value) {
      return "End time must be after start time.";
    }

    return "";
  }

  function renderSlots(slots) {
    slotsList.innerHTML = "";
    slotCount.textContent = `${slots.length} slot${slots.length === 1 ? "" : "s"}`;

    if (!slots.length) {
      slotsList.innerHTML = `
        <div class="empty-state-card">
          <strong>No upcoming slots</strong>
          <span>Add available time slots so clients can request appointments.</span>
        </div>
      `;
      return;
    }

    slots.forEach((slot) => {
      const row = document.createElement("article");
      row.className = `slot-row${slot.is_booked ? " is-booked" : ""}`;
      row.innerHTML = `
        <div class="slot-row-top">
          <div>
            <strong>${formatDate(slot.date)}</strong>
            <p>${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}</p>
          </div>
          <span class="slot-badge">${slot.is_booked ? "Booked" : "Available"}</span>
        </div>
        <p>${slot.is_booked ? `Booked by ${slot.booked_client_display || "Client"}` : "Open for new appointment requests."}</p>
        <div class="slot-row-actions"></div>
      `;

      const actions = row.querySelector(".slot-row-actions");
      if (!slot.is_booked) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-secondary btn-small";
        deleteButton.textContent = "Delete Slot";
        deleteButton.addEventListener("click", async () => {
          deleteButton.disabled = true;
          try {
            await window.SafetalkApi.deleteMyAppointmentSlot(slot.id);
            showMessage("Slot deleted.", "success");
            await loadSlots();
          } catch (error) {
            showMessage(error.message, "error");
          } finally {
            deleteButton.disabled = false;
          }
        });
        actions.appendChild(deleteButton);
      }

      slotsList.appendChild(row);
    });
  }

  async function loadSlots() {
    const slots = await window.SafetalkApi.listMyAppointmentSlots();
    renderSlots(slots);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const validationError = validateSlot();
    if (validationError) {
      showMessage(validationError, "error");
      return;
    }

    addButton.disabled = true;
    addButton.setAttribute("aria-busy", "true");

    try {
      await window.SafetalkApi.createMyAppointmentSlot({
        date: dateInput.value,
        start_time: startInput.value,
        end_time: endInput.value,
      });
      form.reset();
      showMessage("Availability slot added.", "success");
      await loadSlots();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      addButton.disabled = false;
      addButton.removeAttribute("aria-busy");
    }
  });

  try {
    const currentUser = await window.SafetalkApi.getMe();
    window.SafetalkAuth.setCurrentUser(currentUser);
    if (currentUser.role !== "psychologist" || !currentUser.is_psychologist_verified) {
      window.location.href = "login.html?mode=psychologist&pending=1";
      return;
    }

    dateInput.min = new Date().toISOString().slice(0, 10);
    await loadSlots();
  } catch (error) {
    showMessage(error.message, "error");
  }
});
