(function () {
  var user;
  var studentId = "";
  var app;

  function esc(value) {
    return PortalUi.escapeHtml(value);
  }

  function render() {
    var view = PortalData.snapshotFor(user);
    if (!studentId || !view.students.some(function (item) { return item.id === studentId; })) {
      studentId = view.students.length ? view.students[0].id : "";
    }
    var child = view.students.find(function (item) { return item.id === studentId; });
    var switcher = view.students.map(function (item) {
      return "<button type=\"button\" class=\"tab" + (item.id === studentId ? " on" : "") + "\" data-action=\"child\" data-id=\"" + esc(item.id) + "\">" + esc(item.name) + "</button>";
    }).join("");

    var body = "<section class=\"panel\"><h2>أبناؤك</h2><p class=\"muted\">لم يُربط أي طالب بهذا الحساب بعد. تستطيع الإدارة ربط الأبناء من لوحة المدير.</p></section>";
    if (child) {
      var room = view.classes.find(function (item) { return item.id === child.classId; });
      var marks = view.attendance.filter(function (item) { return item.studentId === child.id; });
      var present = marks.filter(function (item) { return item.status === "present" || item.status === "late"; }).length;
      var rate = marks.length ? Math.round((present / marks.length) * 100) : null;
      var grades = view.grades.filter(function (item) { return item.studentId === child.id; });
      var average = grades.length
        ? Math.round(grades.reduce(function (sum, item) { return sum + Number(item.score); }, 0) / grades.length)
        : 0;
      var gradeRows = grades.map(function (item) {
        return "<tr><td>" + esc(item.subject) + "</td><td>" + esc(item.score) + "</td><td>" + esc(PortalUi.formatDate(item.updatedAt)) + "</td></tr>";
      }).join("");
      var attendRows = marks.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (item) {
        return "<li class=\"split\"><span>" + esc(PortalUi.formatDate(item.date)) + "</span><span class=\"pill\">" + esc(PortalUi.statusLabel(item.status)) + "</span></li>";
      }).join("");
      body =
        "<section class=\"stats\">" +
          "<article class=\"stat\"><b>" + esc(child.name) + "</b><span>" + esc(room ? room.name : "فصل غير محدد") + "</span></article>" +
          "<article class=\"stat\"><b>" + (rate === null ? "—" : rate + "%") + "</b><span>نسبة الحضور</span></article>" +
          "<article class=\"stat\"><b>" + (grades.length ? average : "—") + "</b><span>متوسط الدرجات</span></article>" +
        "</section>" +
        "<section class=\"panel\"><h2>الدرجات</h2><div class=\"table-wrap\"><table><thead><tr><th>المادة</th><th>الدرجة</th><th>التاريخ</th></tr></thead><tbody>" +
          (gradeRows || "<tr><td colspan=\"3\">لا توجد درجات بعد.</td></tr>") +
        "</tbody></table></div></section>" +
        "<section class=\"panel\"><h2>الحضور</h2><ul class=\"plain\">" + (attendRows || "<li class=\"muted\">لا يوجد سجل حضور بعد.</li>") + "</ul></section>";
    }

    var notes = view.announcements.map(function (item) {
      return "<article class=\"card\"><h3>" + esc(item.title) + "</h3><p>" + esc(item.body) + "</p><p class=\"muted\">" + esc(PortalUi.formatDate(item.date)) + "</p></article>";
    }).join("");

    app.innerHTML =
      "<p class=\"lede\">" + esc(view.settings.welcomeNote) + "</p>" +
      (switcher ? "<div class=\"tabs\">" + switcher + "</div>" : "") +
      body +
      "<section class=\"panel\"><h2>إعلانات المدرسة</h2>" + (notes || "<p class=\"muted\">لا توجد إعلانات.</p>") + "</section>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    PortalAuth.ready().then(function () {
    if (PortalAuth.storageProblem()) {
      document.body.classList.remove("booting");
      document.getElementById("app").textContent = PortalAuth.storageProblem();
      return;
    }
    user = PortalAuth.requireRole("parent");
    if (!user) return;
    PortalAuth.bindChrome();
    app = document.getElementById("app");
    document.body.classList.remove("booting");
    var academy = document.querySelector("[data-academy]");
    if (academy) academy.textContent = PortalData.settings().academyName;
    app.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action=\"child\"]");
      if (!button) return;
      studentId = button.getAttribute("data-id");
      render();
    });
    if (window.PortalData && PortalData.onUpdate) PortalData.onUpdate(render);
    render();
    });
  });
})();
