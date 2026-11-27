(function () {
  var user;
  var classId = "";
  var app;

  function esc(value) {
    return PortalUi.escapeHtml(value);
  }

  function render() {
    var view = PortalData.snapshotFor(user);
    if (!classId || !view.classes.some(function (item) { return item.id === classId; })) {
      classId = view.classes.length ? view.classes[0].id : "";
    }
    var tabs = view.classes.map(function (item) {
      return "<button type=\"button\" class=\"tab" + (item.id === classId ? " on" : "") + "\" data-action=\"class\" data-id=\"" + esc(item.id) + "\">" + esc(item.name) + "</button>";
    }).join("");
    var currentZoom = view.zoomLink || PortalData.getZoomLink(user.username) || "";
    var schedule = view.schedule.slice().sort(function (a, b) { return a.time.localeCompare(b.time); }).map(function (item) {
      var room = view.classes.find(function (entry) { return entry.id === item.classId; });
      return "<article class=\"card schedule\"><b>" + esc(item.time) + "</b><div><strong>" + esc(item.subject) + "</strong><span>" + esc(room ? room.name : "") + "</span></div>" +
        (currentZoom ? "<a href=\"" + esc(currentZoom) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"btn ghost\" style=\"margin-inline-start:auto;padding:6px 14px;font-size:0.85rem;\">دخول الحصة 📹</a>" : "") +
      "</article>";
    }).join("");
    var today = PortalUi.todayISO();
    var rows = view.students.filter(function (student) { return student.classId === classId; }).map(function (student) {
      var mark = view.attendance.find(function (item) { return item.studentId === student.id && item.date === today; });
      var grades = view.grades.filter(function (item) { return item.studentId === student.id; })
        .map(function (item) { return esc(item.subject) + " " + esc(item.score); })
        .join(" · ");
      var subjects = PortalUi.SUBJECTS.map(function (subject) {
        return "<option value=\"" + esc(subject) + "\">" + esc(subject) + "</option>";
      }).join("");
      function att(status, label) {
        var on = mark && mark.status === status ? " on" : "";
        return "<button type=\"button\" class=\"chip" + on + "\" data-action=\"attend\" data-id=\"" + esc(student.id) + "\" data-status=\"" + status + "\">" + label + "</button>";
      }
      return (
        "<tr>" +
          "<td><strong>" + esc(student.name) + "</strong><div class=\"muted\">" + (grades || "لا درجات بعد") + "</div></td>" +
          "<td><div class=\"chips\">" + att("present", "حاضر") + att("late", "متأخر") + att("absent", "غائب") + "</div></td>" +
          "<td><form class=\"inline-form\" data-grade-form data-id=\"" + esc(student.id) + "\">" +
            "<select name=\"subject\" aria-label=\"مادة " + esc(student.name) + "\">" + subjects + "</select>" +
            "<input name=\"score\" type=\"number\" min=\"0\" max=\"100\" step=\"1\" required placeholder=\"الدرجة\" aria-label=\"درجة " + esc(student.name) + "\">" +
            "<button class=\"btn\" type=\"submit\">حفظ</button></form></td>" +
        "</tr>"
      );
    }).join("");

    app.innerHTML =
      "<p class=\"lede\">" + esc(view.settings.welcomeNote) + "</p>" +
      "<section class=\"panel\">" +
        "<div class=\"split\">" +
          "<div>" +
            "<h2>رابط حصة زووم (Zoom Meeting)</h2>" +
            "<p class=\"muted\" style=\"margin-top:4px;\">أدخل أو حدّث رابط اجتماع Zoom الخاص بحصصك ليتمكن الطلاب من الانضمام المباشر بنقرة واحدة.</p>" +
          "</div>" +
          "<span class=\"pill pill-teacher\">بث مباشر</span>" +
        "</div>" +
        "<form class=\"stack\" data-zoom-form style=\"margin-top:14px;\">" +
          "<label for=\"teacher-zoom-link\">رابط اجتماع زووم (Zoom Link)" +
            "<div class=\"actions\" style=\"width:100%;\">" +
              "<input id=\"teacher-zoom-link\" name=\"zoomLink\" type=\"url\" required placeholder=\"https://us05web.zoom.us/j/...\" value=\"" + esc(currentZoom) + "\" dir=\"ltr\" style=\"flex:1;min-width:240px;text-align:left;\">" +
              "<button type=\"submit\" class=\"btn pink\" style=\"white-space:nowrap;\">حفظ الرابط</button>" +
              (currentZoom ? "<a href=\"" + esc(currentZoom) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"btn ghost\" style=\"white-space:nowrap;\">فتح الرابط للتجربة ↗</a>" : "") +
            "</div>" +
          "</label>" +
          (currentZoom
            ? "<p class=\"muted\" style=\"margin:0;font-size:0.9rem;\">الرابط المحفوظ حالياً للطلاب: <a href=\"" + esc(currentZoom) + "\" target=\"_blank\" rel=\"noopener noreferrer\" dir=\"ltr\" style=\"font-weight:bold;\">" + esc(currentZoom) + "</a></p>"
            : "<p class=\"muted\" style=\"margin:0;font-size:0.9rem;\">لم يتم حفظ رابط زووم بعد. يرجى إدخال الرابط ثم الضغط على \"حفظ الرابط\".</p>") +
        "</form>" +
      "</section>" +
      "<section class=\"panel\"><h2>جدول اليوم</h2>" +
        (schedule ? "<div class=\"schedule-list\">" + schedule + "</div>" : "<p class=\"muted\">لا توجد حصص مسندة إليك بعد. يطلب المدير ربطك بفصل.</p>") +
      "</section>" +
      "<section class=\"panel\"><div class=\"split\"><h2>الطلاب والدرجات</h2><span class=\"muted\">حضور " + esc(PortalUi.formatDate(today)) + "</span></div>" +
        (tabs ? "<div class=\"tabs\">" + tabs + "</div>" : "<p class=\"muted\">لم يُسند إليك فصل بعد.</p>") +
        (rows
          ? "<div class=\"table-wrap\"><table><thead><tr><th>الطالب</th><th>حضور اليوم</th><th>رصد درجة</th></tr></thead><tbody>" + rows + "</tbody></table></div>"
          : "") +
      "</section>" +
      "<section class=\"panel\"><h2>إعلانات المعلمين</h2>" +
        (view.announcements.map(function (item) {
          return "<article class=\"card\"><h3>" + esc(item.title) + "</h3><p>" + esc(item.body) + "</p><p class=\"muted\">" + esc(PortalUi.formatDate(item.date)) + "</p></article>";
        }).join("") || "<p class=\"muted\">لا توجد إعلانات.</p>") +
      "</section>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    PortalAuth.ready().then(function () {
    if (PortalAuth.storageProblem()) {
      document.body.classList.remove("booting");
      document.getElementById("app").textContent = PortalAuth.storageProblem();
      return;
    }
    user = PortalAuth.requireRole("teacher");
    if (!user) return;
    PortalAuth.bindChrome();
    app = document.getElementById("app");
    document.body.classList.remove("booting");
    var academy = document.querySelector("[data-academy]");
    if (academy) academy.textContent = PortalData.settings().academyName;

    app.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action]");
      if (!button) return;
      if (button.getAttribute("data-action") === "class") {
        classId = button.getAttribute("data-id");
        render();
        return;
      }
      if (button.getAttribute("data-action") === "attend") {
        Promise.resolve(PortalData.markAttendance(button.getAttribute("data-id"), button.getAttribute("data-status"))).then(function (result) {
          PortalUi.toast(result && result.message);
          if (result && result.ok) render();
        });
      }
    });

    app.addEventListener("submit", function (event) {
      var form = event.target;
      if (!form || !form.matches) return;
      if (form.matches("[data-zoom-form]")) {
        event.preventDefault();
        var dataZoom = new FormData(form);
        Promise.resolve(PortalData.saveZoomLink(dataZoom.get("zoomLink"), user.username)).then(function (saveRes) {
          PortalUi.toast(saveRes && saveRes.message);
          if (saveRes && saveRes.ok) render();
        });
        return;
      }
      if (form.matches("[data-grade-form]")) {
        event.preventDefault();
        var data = new FormData(form);
        Promise.resolve(PortalData.saveGrade(form.getAttribute("data-id"), data.get("subject"), data.get("score"))).then(function (result) {
          PortalUi.toast(result && result.message);
          if (result && result.ok) render();
        });
      }
    });

    if (window.PortalData && PortalData.onUpdate) PortalData.onUpdate(render);
    render();
    });
  });
})();
