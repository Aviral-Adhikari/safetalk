(function () {
  const API_BASE_URL = "https://safetalk-8sxp.onrender.com";
  const STORAGE_KEYS = {
    access: "safetalk_access_token",
    refresh: "safetalk_refresh_token",
    user: "safetalk_current_user",
    identityMode: "safetalk_identity_mode",
    selectedPsychologist: "safetalk_selected_psychologist",
    activeSession: "safetalk_active_session",
    activeRoomId: "safetalk_active_room_id",
  };

  function getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.access);
  }

  function getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.refresh);
  }

  function setTokens(access, refresh) {
    if (access) {
      localStorage.setItem(STORAGE_KEYS.access, access);
    }

    if (refresh) {
      localStorage.setItem(STORAGE_KEYS.refresh, refresh);
    }
  }

  function clearTokens() {
    localStorage.removeItem(STORAGE_KEYS.access);
    localStorage.removeItem(STORAGE_KEYS.refresh);
  }

  function getCurrentUser() {
    const rawValue = localStorage.getItem(STORAGE_KEYS.user);
    return rawValue ? JSON.parse(rawValue) : null;
  }

  function setCurrentUser(user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }

  function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.user);
  }

  function setIdentityMode(mode) {
    localStorage.setItem(STORAGE_KEYS.identityMode, mode);
  }

  function getIdentityMode() {
    return localStorage.getItem(STORAGE_KEYS.identityMode);
  }

  function setSelectedPsychologist(psychologist) {
    localStorage.setItem(STORAGE_KEYS.selectedPsychologist, JSON.stringify(psychologist));
  }

  function getSelectedPsychologist() {
    const rawValue = localStorage.getItem(STORAGE_KEYS.selectedPsychologist);
    return rawValue ? JSON.parse(rawValue) : null;
  }

  function clearSelectedPsychologist() {
    localStorage.removeItem(STORAGE_KEYS.selectedPsychologist);
  }

  function setActiveSession(session) {
    localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(session));
  }

  function getActiveSession() {
    const rawValue = localStorage.getItem(STORAGE_KEYS.activeSession);
    return rawValue ? JSON.parse(rawValue) : null;
  }

  function clearActiveSession() {
    localStorage.removeItem(STORAGE_KEYS.activeSession);
  }

  function setActiveRoomId(roomId) {
    localStorage.setItem(STORAGE_KEYS.activeRoomId, String(roomId));
  }

  function getActiveRoomId() {
    return localStorage.getItem(STORAGE_KEYS.activeRoomId);
  }

  function clearActiveRoomId() {
    localStorage.removeItem(STORAGE_KEYS.activeRoomId);
  }

  function getAuthHeaders(headers) {
    const authHeaders = { ...(headers || {}) };
    const accessToken = getAccessToken();

    if (accessToken) {
      authHeaders.Authorization = `Bearer ${accessToken}`;
    }

    return authHeaders;
  }

  async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      logout({ redirect: false });
      return false;
    }

    const data = await response.json();
    setTokens(data.access, data.refresh || refreshToken);
    return true;
  }

  function redirectIfNotLoggedIn(redirectTo) {
    if (!getAccessToken() && !getRefreshToken()) {
      window.location.href = redirectTo || "login.html";
    }
  }

  function redirectIfLoggedIn(redirectTo) {
    if (getAccessToken() || getRefreshToken()) {
      const currentUser = getCurrentUser();
      const role = String(currentUser?.role || "").trim().toLowerCase();

      if (!redirectTo && role === "psychologist" && currentUser?.is_psychologist_verified) {
        window.location.href = "psychologist-dashboard.html";
        return;
      }

      window.location.href = redirectTo || "dashboard.html";
    }
  }

  function clearSessionContext() {
    clearSelectedPsychologist();
    clearActiveSession();
    clearActiveRoomId();
    localStorage.removeItem(STORAGE_KEYS.identityMode);
  }

  function logout(options) {
    clearTokens();
    clearCurrentUser();
    clearSessionContext();

    if (!options || options.redirect !== false) {
      window.location.href = "login.html";
    }
  }

  function generatePreviewAlias() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let suffix = "";

    for (let index = 0; index < 6; index += 1) {
      suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    return `anon_${suffix}`;
  }

  window.SafetalkAuth = {
    API_BASE_URL,
    STORAGE_KEYS,
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    setIdentityMode,
    getIdentityMode,
    setSelectedPsychologist,
    getSelectedPsychologist,
    clearSelectedPsychologist,
    setActiveSession,
    getActiveSession,
    clearActiveSession,
    setActiveRoomId,
    getActiveRoomId,
    clearActiveRoomId,
    clearSessionContext,
    getAuthHeaders,
    refreshAccessToken,
    redirectIfNotLoggedIn,
    redirectIfLoggedIn,
    logout,
    generatePreviewAlias,
  };
})();
