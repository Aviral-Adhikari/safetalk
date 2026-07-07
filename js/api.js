(function () {
  function readErrorMessage(payload) {
    if (!payload) {
      return "Something went wrong. Please try again.";
    }

    if (typeof payload === "string") {
      return payload;
    }

    if (payload.detail) {
      return payload.detail;
    }

    const firstKey = Object.keys(payload)[0];
    const firstValue = payload[firstKey];

    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return firstValue[0];
    }

    if (typeof firstValue === "string") {
      return firstValue;
    }

    return "Something went wrong. Please try again.";
  }

  async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  }

  // All frontend -> backend calls flow through this helper so auth refresh,
  // error handling, and JSON serialization stay consistent.
  async function request(path, options) {
    const requestOptions = options || {};
    const requiresAuth = requestOptions.requiresAuth !== false;
    const headers = {
      ...(requestOptions.headers || {}),
    };

    if (!(requestOptions.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const makeFetch = async () => {
      const finalHeaders = requiresAuth
        ? window.SafetalkAuth.getAuthHeaders(headers)
        : headers;

      return fetch(`${window.SafetalkAuth.API_BASE_URL}${path}`, {
        method: requestOptions.method || "GET",
        headers: finalHeaders,
        body: requestOptions.body instanceof FormData
          ? requestOptions.body
          : requestOptions.body
            ? JSON.stringify(requestOptions.body)
            : undefined,
      });
    };

    let response = await makeFetch();

    if (response.status === 401 && requiresAuth) {
      const refreshed = await window.SafetalkAuth.refreshAccessToken();
      if (refreshed) {
        response = await makeFetch();
      } else {
        throw new Error("Your session has expired. Please login again.");
      }
    }

    const payload = await parseResponse(response);

    if (!response.ok) {
      throw new Error(readErrorMessage(payload));
    }

    return payload;
  }

  // Backend auth endpoints
  async function register(payload) {
    return request("/api/auth/register/", {
      method: "POST",
      requiresAuth: false,
      body: payload,
    });
  }

  async function psychologistApply(payload) {
    return request("/api/auth/psychologist-apply/", {
      method: "POST",
      requiresAuth: false,
      body: payload,
    });
  }

  async function login(payload) {
    return request("/api/auth/login/", {
      method: "POST",
      requiresAuth: false,
      body: payload,
    });
  }

  async function refresh(payload) {
    return request("/api/auth/refresh/", {
      method: "POST",
      requiresAuth: false,
      body: payload,
    });
  }

  async function getMe() {
    return request("/api/auth/me/");
  }

  // Backend psychologist/session/chat endpoints
  async function getPsychologists() {
    return request("/api/psychologists/");
  }

  async function createCounselingSession(payload) {
    return request("/api/anonymous-sessions/", {
      method: "POST",
      body: payload,
    });
  }

  async function listCounselingSessions() {
    return request("/api/anonymous-sessions/");
  }

  async function updateCounselingSessionStatus(sessionId, payload) {
    return request(`/api/anonymous-sessions/${sessionId}/status/`, {
      method: "PATCH",
      body: payload,
    });
  }

  async function listChatRooms() {
    return request("/api/chat/rooms/");
  }

  async function getChatRoom(roomId) {
    return request(`/api/chat/rooms/${roomId}/`);
  }

  async function getRoomMessages(roomId) {
    return request(`/api/chat/rooms/${roomId}/messages/`);
  }

  async function sendRoomMessage(roomId, payload) {
    return request(`/api/chat/rooms/${roomId}/messages/`, {
      method: "POST",
      body: payload,
    });
  }

  window.SafetalkApi = {
    request,
    register,
    psychologistApply,
    login,
    refresh,
    getMe,
    getPsychologists,
    createCounselingSession,
    listCounselingSessions,
    updateCounselingSessionStatus,
    listChatRooms,
    getChatRoom,
    getRoomMessages,
    sendRoomMessage,
  };
})();
