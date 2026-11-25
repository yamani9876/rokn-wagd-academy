/* Small shared helpers for text, dates, and status messages. */
(function () {
  var SUBJECTS = ["اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم"];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function roleLabel(role) {
    if (role === "admin") return "مدير";
    if (role === "supervisor") return "مشرف";
    if (role === "teacher") return "المعلم";
    if (role === "parent") return "ولي الأمر";
    return "مستخدم";
  }

  function statusLabel(status) {
    if (status === "present") return "حاضر";
    if (status === "absent") return "غائب";
    if (status === "late") return "متأخر";
    return "—";
  }

  function todayISO() {
    var date = new Date();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function shiftISO(daysAgo) {
    var date = new Date();
    date.setDate(date.getDate() - daysAgo);
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function formatDate(iso) {
    var parts = String(iso || "").split("-");
    if (parts.length !== 3) return "";
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ar", {
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(date);
  }

  function toast(message) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      el.classList.remove("show");
    }, 2600);
  }

  function setAlert(el, message, kind) {
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.classList.toggle("ok", kind === "ok");
  }

  window.PortalUi = {
    SUBJECTS: SUBJECTS,
    escapeHtml: escapeHtml,
    roleLabel: roleLabel,
    statusLabel: statusLabel,
    todayISO: todayISO,
    shiftISO: shiftISO,
    formatDate: formatDate,
    toast: toast,
    setAlert: setAlert
  };
})();
