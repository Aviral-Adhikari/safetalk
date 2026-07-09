document.addEventListener("DOMContentLoaded", async () => {
  window.SafetalkAuth.redirectIfNotLoggedIn();

  const logoutLink = document.getElementById("logout-link");
  const photoPreview = document.getElementById("profile-photo-preview");
  const photoInitials = document.getElementById("profile-photo-initials");
  const previewName = document.getElementById("preview-name");
  const previewSpecialization = document.getElementById("preview-specialization");
  const previewAvailability = document.getElementById("preview-availability");
  const readonlyEmail = document.getElementById("readonly-email");
  const readonlyRole = document.getElementById("readonly-role");
  const readonlyVerification = document.getElementById("readonly-verification");
  const readonlyJoined = document.getElementById("readonly-joined");
  const form = document.getElementById("psychologist-profile-form");
  const messageBox = document.getElementById("profile-message");
  const saveButton = document.getElementById("save-profile-button");
  const profilePhotoInput = document.getElementById("profile-photo");
  const specializationInput = document.getElementById("specialization");
  const experienceInput = document.getElementById("years-of-experience");
  const languagesInput = document.getElementById("languages");
  const bioInput = document.getElementById("bio");
  const bioCount = document.getElementById("bio-count");
  const availableInput = document.getElementById("is-available");

  let selectedPhoto = null;

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
      .toUpperCase() || "ST";
  }

  function formatDate(isoDate) {
    if (!isoDate) {
      return "--";
    }

    return new Date(isoDate).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.classList.remove("is-hidden", "is-error", "is-success");
    messageBox.classList.add(type === "success" ? "is-success" : "is-error");
  }

  function clearMessage() {
    messageBox.textContent = "";
    messageBox.classList.add("is-hidden");
  }

  function renderPhoto(profile) {
    photoPreview.innerHTML = "";

    if (profile.profile_photo) {
      const image = document.createElement("img");
      image.src = profile.profile_photo;
      image.alt = `${profile.full_name} profile photo`;
      photoPreview.appendChild(image);
      return;
    }

    const initials = document.createElement("span");
    initials.id = "profile-photo-initials";
    initials.textContent = initialsFromName(profile.full_name);
    photoPreview.appendChild(initials);
  }

  function renderProfile(profile) {
    previewName.textContent = profile.full_name || "Psychologist";
    previewSpecialization.textContent = profile.specialization || "Specialization";
    readonlyEmail.textContent = profile.email || "--";
    readonlyRole.textContent = profile.role || "--";
    readonlyVerification.textContent = profile.is_psychologist_verified ? "Verified" : "Pending";
    readonlyJoined.textContent = formatDate(profile.joined_date);

    previewAvailability.classList.toggle("is-unavailable", !profile.is_available);
    previewAvailability.innerHTML = profile.is_available
      ? '<i class="fa-solid fa-circle"></i> Available'
      : '<i class="fa-solid fa-circle"></i> Unavailable';

    specializationInput.value = profile.specialization || "";
    experienceInput.value = profile.years_of_experience ?? 0;
    languagesInput.value = profile.languages || "";
    bioInput.value = profile.bio || "";
    bioCount.textContent = String(bioInput.value.length);
    availableInput.checked = Boolean(profile.is_available);

    renderPhoto(profile);
  }

  function validateForm() {
    const years = Number(experienceInput.value);
    const languages = languagesInput.value.split(",").map((item) => item.trim()).filter(Boolean);

    if (Number.isNaN(years) || years < 0) {
      return "Years of experience must be 0 or greater.";
    }

    if (bioInput.value.length > 1000) {
      return "Bio must be 1000 characters or fewer.";
    }

    if (!languages.length) {
      return "Enter at least one language.";
    }

    if (selectedPhoto && !["image/jpeg", "image/png", "image/webp"].includes(selectedPhoto.type)) {
      return "Upload a JPG, PNG, or WEBP image.";
    }

    return "";
  }

  async function loadProfile() {
    const currentUser = await window.SafetalkApi.getMe();
    window.SafetalkAuth.setCurrentUser(currentUser);

    if (currentUser.role !== "psychologist" || !currentUser.is_psychologist_verified) {
      window.location.href = "login.html?mode=psychologist&pending=1";
      return;
    }

    const profile = await window.SafetalkApi.getPsychologistMe();
    renderProfile(profile);
  }

  profilePhotoInput.addEventListener("change", () => {
    const file = profilePhotoInput.files[0];
    selectedPhoto = file || null;

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showMessage("Upload a JPG, PNG, or WEBP image.", "error");
      profilePhotoInput.value = "";
      selectedPhoto = null;
      return;
    }

    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.alt = "Selected profile preview";
    photoPreview.innerHTML = "";
    photoPreview.appendChild(image);
    clearMessage();
  });

  bioInput.addEventListener("input", () => {
    bioCount.textContent = String(bioInput.value.length);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const validationError = validateForm();
    if (validationError) {
      showMessage(validationError, "error");
      return;
    }

    const payload = new FormData();
    payload.append("specialization", specializationInput.value.trim());
    payload.append("bio", bioInput.value.trim());
    payload.append("years_of_experience", experienceInput.value);
    payload.append("languages", languagesInput.value.trim());
    payload.append("is_available", availableInput.checked ? "true" : "false");

    if (selectedPhoto) {
      payload.append("profile_photo", selectedPhoto);
    }

    saveButton.disabled = true;
    saveButton.setAttribute("aria-busy", "true");

    try {
      const updatedProfile = await window.SafetalkApi.updatePsychologistMe(payload);
      selectedPhoto = null;
      profilePhotoInput.value = "";
      renderProfile(updatedProfile);
      showMessage("Profile updated successfully.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      saveButton.disabled = false;
      saveButton.removeAttribute("aria-busy");
    }
  });

  try {
    await loadProfile();
  } catch (error) {
    showMessage(error.message, "error");
  }
});
