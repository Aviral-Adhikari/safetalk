(function () {
  function getPageName() {
    const path = window.location.pathname.split("/").pop();
    return path || "index.html";
  }

  function createActionLink(className, href, text, isButton, isLogout) {
    const element = document.createElement("a");
    element.className = className;
    element.href = href;
    element.textContent = text;

    if (isLogout) {
      element.setAttribute("data-logout", "true");
    }

    if (isButton) {
      element.classList.add("btn", "btn-primary", "btn-small");
    }

    return element;
  }

  function buildGuestActions(pageName) {
    if (pageName === "login.html") {
      return [
        createActionLink("login-link", "register.html", "Create Account", false, false),
        createActionLink("", "login.html", "Login First", true, false),
      ];
    }

    if (pageName === "register.html") {
      return [
        createActionLink("login-link", "login.html", "Login", false, false),
        createActionLink("", "register.html", "Create Account", true, false),
      ];
    }

    if (pageName === "anonymous-start.html") {
      return [
        createActionLink("login-link", "login.html", "Login", false, false),
        createActionLink("", "register.html", "Create Account", true, false),
      ];
    }

    return [
      createActionLink("login-link", "login.html", "Login", false, false),
      createActionLink("", "login.html", "Start Anonymously", true, false),
    ];
  }

  function buildUserActions(currentUser) {
    const label = currentUser?.full_name || currentUser?.username || "Dashboard";

    return [
      createActionLink("login-link", "dashboard.html", label, false, false),
      createActionLink("", "#", "Logout", true, true),
    ];
  }

  function wireLogoutHandlers(root) {
    root.querySelectorAll("[data-logout='true']").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        window.SafetalkAuth.logout();
      });
    });
  }

  function updatePrimaryNav() {
    const actions = document.querySelector(".site-header .nav-actions");
    if (!actions) {
      return;
    }

    const pageName = getPageName();
    const currentUser = window.SafetalkAuth.getCurrentUser();
    const isLoggedIn = Boolean(window.SafetalkAuth.getAccessToken() || window.SafetalkAuth.getRefreshToken());
    const nextActions = isLoggedIn ? buildUserActions(currentUser) : buildGuestActions(pageName);

    actions.innerHTML = "";
    nextActions.forEach((action) => actions.appendChild(action));
    wireLogoutHandlers(actions);
  }

  function updateWorkspaceNav() {
    const workspaceBrand = document.querySelector(".workspace-brand");
    if (!workspaceBrand) {
      return;
    }

    let actionLink = workspaceBrand.querySelector(".workspace-link");
    if (!actionLink) {
      actionLink = document.createElement("a");
      actionLink.className = "workspace-link";
      workspaceBrand.appendChild(actionLink);
    }

    const isLoggedIn = Boolean(window.SafetalkAuth.getAccessToken() || window.SafetalkAuth.getRefreshToken());
    if (isLoggedIn) {
      actionLink.href = "#";
      actionLink.textContent = "Logout";
      actionLink.setAttribute("data-logout", "true");
    } else {
      actionLink.href = "login.html";
      actionLink.textContent = "Login";
      actionLink.removeAttribute("data-logout");
    }

    wireLogoutHandlers(workspaceBrand);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.SafetalkAuth) {
      return;
    }

    updatePrimaryNav();
    updateWorkspaceNav();
  });
})();
