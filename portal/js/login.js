(function () {
  var alertEl;
  var form;
  var submitBtn;

  function openModal() {
    var modal = document.getElementById("register-modal");
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    var first = document.getElementById("reg-name");
    if (first) first.focus();
  }

  function closeModal() {
    var modal = document.getElementById("register-modal");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    var opener = document.getElementById("open-register");
    if (opener) opener.focus();
  }

  function trapModal(event) {
    if (event.key === "Escape") {
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    var modal = document.getElementById("register-modal");
    var items = Array.prototype.slice.call(modal.querySelectorAll("input, select, button, textarea"))
      .filter(function (el) { return !el.disabled && el.tabIndex !== -1; });
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    PortalAuth.ready();
    if (PortalAuth.storageProblem()) {
      document.body.classList.remove("booting");
      PortalUi.setAlert(document.getElementById("login-alert"), PortalAuth.storageProblem());
      return;
    }
    PortalAuth.bindThemeToggle();
    var existing = PortalAuth.currentUser();
    if (existing) {
      location.replace(PortalAuth.homeFor(existing.role));
      return;
    }

    var academy = document.querySelector("[data-academy]");
    if (academy) academy.textContent = PortalData.settings().academyName;

    document.body.classList.remove("booting");
    alertEl = document.getElementById("login-alert");
    form = document.getElementById("login-form");
    submitBtn = document.getElementById("login-submit");

    document.getElementById("toggle-password").addEventListener("click", function () {
      var input = document.getElementById("password");
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      this.setAttribute("aria-pressed", show ? "true" : "false");
      this.textContent = show ? "إخفاء" : "إظهار";
    });

    document.getElementById("open-register").addEventListener("click", openModal);
    document.getElementById("close-register").addEventListener("click", closeModal);
    document.querySelector("[data-modal-backdrop]").addEventListener("click", closeModal);
    document.getElementById("register-modal").addEventListener("keydown", trapModal);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      PortalUi.setAlert(alertEl, "");
      submitBtn.disabled = true;
      submitBtn.textContent = "جارٍ التحقق…";
      var result = PortalAuth.login(
        document.getElementById("username").value,
        document.getElementById("password").value
      );
      if (!result.ok) {
        PortalUi.setAlert(alertEl, result.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "تسجيل الدخول";
        return;
      }
      location.replace(PortalAuth.homeFor(result.role));
    });

    document.getElementById("register-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var regAlert = document.getElementById("register-alert");
      var button = document.getElementById("register-submit");
      PortalUi.setAlert(regAlert, "");
      button.disabled = true;
      var result = PortalAuth.register({
        name: document.getElementById("reg-name").value,
        email: document.getElementById("reg-email").value,
        password: document.getElementById("reg-password").value,
        role: document.getElementById("reg-role").value
      });
      button.disabled = false;
      if (!result.ok) {
        PortalUi.setAlert(regAlert, result.message);
        return;
      }
      event.target.reset();
      closeModal();
      document.getElementById("username").value = result.username;
      document.getElementById("password").value = "";
      PortalUi.setAlert(alertEl, result.message, "ok");
      document.getElementById("password").focus();
    });
  });
})();
