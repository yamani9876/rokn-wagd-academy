(function () {
  var user;
  var tab = "users";
  var app;
  var editingStudentId = "";
  var scrollStudentForm = false;

  function feeNumber(value) {
    if (value == null || String(value).trim() === "") return 0;
    var amount = Number(value);
    if (!isFinite(amount) || amount < 0) return 0;
    return Math.round(amount * 100) / 100;
  }

  function remainingOf(fees, paid) {
    return Math.max(0, Math.round((feeNumber(fees) - feeNumber(paid)) * 100) / 100);
  }

  function esc(value) {
    return PortalUi.escapeHtml(value);
  }

  function resultToast(result) {
    PortalUi.toast(result.message);
    if (result.ok) render();
  }

  function renderUsers(directory) {
    var rows = directory.map(function (person) {
      var self = person.id === user.id;
      return (
        "<tr>" +
          "<td>" + esc(person.name) + "</td>" +
          "<td><code>" + esc(person.username) + "</code></td>" +
          "<td>" + esc(person.email) + "</td>" +
          "<td><span class=\"pill pill-" + esc(person.role) + "\">" + esc(PortalUi.roleLabel(person.role)) + "</span></td>" +
          "<td>" + (person.active ? "نشط" : "موقوف") + "</td>" +
          "<td class=\"actions\">" +
            "<button type=\"button\" class=\"btn ghost\" data-action=\"toggle-user\" data-id=\"" + esc(person.id) + "\" data-active=\"" + (person.active ? "1" : "0") + "\">" + (person.active ? "إيقاف" : "تفعيل") + "</button>" +
            (self ? "" : "<button type=\"button\" class=\"btn danger\" data-action=\"delete-user\" data-id=\"" + esc(person.id) + "\">حذف</button>") +
            "<details><summary>كلمة المرور</summary><div class=\"inline-form\"><input type=\"password\" maxlength=\"72\" autocomplete=\"new-password\" placeholder=\"كلمة مرور جديدة\" data-reset-for=\"" + esc(person.id) + "\" aria-label=\"كلمة مرور جديدة لـ " + esc(person.name) + "\"><button type=\"button\" class=\"btn\" data-action=\"reset-user\" data-id=\"" + esc(person.id) + "\">حفظ</button></div></details>" +
          "</td>" +
        "</tr>"
      );
    }).join("");
    return (
      "<section class=\"panel\">" +
        "<h2>المستخدمون</h2>" +
        "<p class=\"muted\">حساب المدير محمي من الحذف والإيقاف. التسجيل العام ينشئ معلماً أو ولي أمر فقط.</p>" +
        "<div class=\"table-wrap\"><table><thead><tr><th>الاسم</th><th>المستخدم</th><th>البريد</th><th>الدور</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>" +
        rows +
        "</tbody></table></div></section>"
    );
  }

  function peopleOptions(role, selected, emptyLabel) {
    var options = "<option value=\"\">" + esc(emptyLabel) + "</option>";
    PortalAuth.listDirectory().forEach(function (person) {
      if (person.role !== role || !person.active) return;
      options += "<option value=\"" + esc(person.username) + "\"" + (person.username === selected ? " selected" : "") + ">" + esc(person.name) + "</option>";
    });
    return options;
  }

  function renderSchool(view) {
    var classes = view.classes.map(function (item) {
      var students = view.students.filter(function (student) { return student.classId === item.id; });
      var studentRows = students.map(function (student) {
        var end = student.endDate || student.renewalDate || "—";
        var fees = feeNumber(student.fees);
        var paid = feeNumber(student.paidAmount);
        var rem = remainingOf(fees, paid);
        var feeText = "الرسوم: " + fees + " | المبلغ المدفوع: " + paid + " | المتبقي: " + rem;
        var canDelete = user && user.role === "admin";
        return (
          "<li class=\"split\">" +
            "<span><strong>" + esc(student.name) + "</strong><br><span class=\"muted\">" + esc(student.phone || "—") + "<br>" + esc(item.name) + " · من " + esc(student.startDate || "—") + " إلى " + esc(end) + "<br>" + esc(feeText) + "</span></span>" +
            "<span class=\"inline-form\">" +
              "<select data-parent-for=\"" + esc(student.id) + "\" aria-label=\"ولي أمر " + esc(student.name) + "\">" +
                peopleOptions("parent", student.parentUsername, "دون ربط") +
              "</select>" +
              "<button type=\"button\" class=\"btn ghost\" data-action=\"link-parent\" data-id=\"" + esc(student.id) + "\">حفظ الربط</button>" +
              "<button type=\"button\" class=\"btn\" data-action=\"edit-student\" data-id=\"" + esc(student.id) + "\">تعديل</button>" +
              (canDelete ? "<button type=\"button\" class=\"btn danger\" data-action=\"delete-student\" data-id=\"" + esc(student.id) + "\">حذف</button>" : "") +
            "</span>" +
          "</li>"
        );
      }).join("");
      return (
        "<article class=\"card\">" +
          "<div class=\"split\">" +
            "<h3>" + esc(item.name) + "</h3>" +
            "<button type=\"button\" class=\"btn danger\" data-action=\"delete-class\" data-id=\"" + esc(item.id) + "\">حذف الفصل</button>" +
          "</div>" +
          "<label>المعلم<select data-class-teacher data-class-id=\"" + esc(item.id) + "\">" + peopleOptions("teacher", item.teacherUsername, "اختر معلماً") + "</select></label>" +
          "<ul class=\"plain\">" + (studentRows || "<li class=\"muted\">لا يوجد طلاب في هذا الفصل.</li>") + "</ul>" +
        "</article>"
      );
    }).join("");

    var editing = editingStudentId ? view.students.find(function (student) { return student.id === editingStudentId; }) : null;
    if (editingStudentId && !editing) editingStudentId = "";
    var classOptions = view.classes.map(function (item) {
      var selected = editing && item.id === editing.classId ? " selected" : "";
      return "<option value=\"" + esc(item.id) + "\"" + selected + ">" + esc(item.name) + "</option>";
    }).join("");

    var grades = view.grades.map(function (grade) {
      var student = view.students.find(function (item) { return item.id === grade.studentId; });
      return "<tr><td>" + esc(student ? student.name : "—") + "</td><td>" + esc(grade.subject) + "</td><td>" + esc(grade.score) + "</td><td>" + esc(PortalUi.formatDate(grade.updatedAt)) + "</td></tr>";
    }).join("");

    return (
      "<div class=\"stack\">" +
        "<section class=\"panel\"><h2>فصل جديد</h2>" +
          "<form id=\"form-class\" class=\"form-grid\">" +
            "<label>اسم الفصل<input name=\"name\" required maxlength=\"40\" placeholder=\"مثال: الصف الرابع أ\"></label>" +
            "<label>المعلم<select name=\"teacher\" required>" + peopleOptions("teacher", "teacher", "اختر معلماً") + "</select></label>" +
            "<button class=\"btn\" type=\"submit\">إضافة الفصل</button>" +
          "</form></section>" +
        "<section class=\"panel\"><h2>" + (editing ? "تعديل الطالب" : "طالب جديد") + "</h2>" +
          "<form id=\"form-student\" class=\"form-grid\">" +
            "<label>اسم الطالب<input name=\"name\" required maxlength=\"60\" value=\"" + esc(editing ? editing.name : "") + "\"></label>" +
            "<label>رقم الهاتف<input name=\"phone\" required maxlength=\"30\" inputmode=\"tel\" value=\"" + esc(editing ? editing.phone || "" : "") + "\"></label>" +
            "<label>الفصل / المجموعة<select name=\"classId\" required>" + classOptions + "</select></label>" +
            "<label>تاريخ البدء<input name=\"startDate\" type=\"date\" required value=\"" + esc(editing ? editing.startDate || "" : "") + "\"></label>" +
            "<label>تاريخ الانتهاء / التجديد<input name=\"endDate\" type=\"date\" required value=\"" + esc(editing ? (editing.endDate || editing.renewalDate || "") : "") + "\"></label>" +
            "<label>الرسوم<input name=\"fees\" type=\"number\" min=\"0\" step=\"0.01\" value=\"" + esc(editing ? editing.fees : "") + "\"></label>" +
            "<label>المبلغ المدفوع<input name=\"paidAmount\" type=\"number\" min=\"0\" step=\"0.01\" value=\"" + esc(editing ? editing.paidAmount : "") + "\"></label>" +
            "<p class=\"muted\" data-remaining aria-live=\"polite\"></p>" +
            "<label>ولي الأمر<select name=\"parentUsername\">" + peopleOptions("parent", editing ? editing.parentUsername : "", "دون ربط") + "</select></label>" +
            "<button class=\"btn\" type=\"submit\">" + (editing ? "حفظ التعديلات" : "إضافة الطالب") + "</button>" +
            (editing ? "<button type=\"button\" class=\"btn ghost\" data-action=\"cancel-student-edit\">إلغاء</button>" : "") +
          "</form></section>" +
        classes +
        "<section class=\"panel\"><h2>سجل الدرجات</h2><div class=\"table-wrap\"><table><thead><tr><th>الطالب</th><th>المادة</th><th>الدرجة</th><th>آخر تحديث</th></tr></thead><tbody>" +
        (grades || "<tr><td colspan=\"4\">لا توجد درجات بعد.</td></tr>") +
        "</tbody></table></div></section></div>"
    );
  }

  function renderSystem(view) {
    var notes = view.announcements.map(function (item) {
      var audience = item.audience === "teachers" ? "المعلمون" : item.audience === "parents" ? "أولياء الأمور" : "الجميع";
      return (
        "<article class=\"card\">" +
          "<div class=\"split\"><h3>" + esc(item.title) + "</h3><button type=\"button\" class=\"btn danger\" data-action=\"delete-announcement\" data-id=\"" + esc(item.id) + "\">حذف</button></div>" +
          "<p>" + esc(item.body) + "</p>" +
          "<p class=\"muted\">" + esc(audience) + " · " + esc(PortalUi.formatDate(item.date)) + "</p>" +
        "</article>"
      );
    }).join("");
    return (
      "<div class=\"stack\">" +
        "<section class=\"panel\"><h2>إعدادات الأكاديمية</h2>" +
          "<form id=\"form-settings\" class=\"form-grid\">" +
            "<label>اسم الأكاديمية<input name=\"academyName\" required maxlength=\"40\" value=\"" + esc(view.settings.academyName) + "\"></label>" +
            "<label>عبارة الترحيب<input name=\"welcomeNote\" maxlength=\"80\" value=\"" + esc(view.settings.welcomeNote) + "\"></label>" +
            "<button class=\"btn\" type=\"submit\">حفظ الإعدادات</button>" +
          "</form></section>" +
        "<section class=\"panel\"><h2>إعلان جديد</h2>" +
          "<form id=\"form-announcement\" class=\"stack\">" +
            "<label>العنوان<input name=\"title\" required maxlength=\"80\"></label>" +
            "<label>النص<textarea name=\"body\" required maxlength=\"500\" rows=\"3\"></textarea></label>" +
            "<label>يظهر لـ<select name=\"audience\"><option value=\"all\">الجميع</option><option value=\"teachers\">المعلمين</option><option value=\"parents\">أولياء الأمور</option></select></label>" +
            "<button class=\"btn\" type=\"submit\">نشر الإعلان</button>" +
          "</form></section>" +
        notes +
      "</div>"
    );
  }

  function render() {
    var directory = PortalAuth.listDirectory();
    var view = PortalData.snapshotFor(user);
    var teachers = directory.filter(function (person) { return person.role === "teacher"; }).length;
    var parents = directory.filter(function (person) { return person.role === "parent"; }).length;
    var active = directory.filter(function (person) { return person.active; }).length;
    app.innerHTML =
      "<p class=\"lede\">" + esc(view.settings.welcomeNote) + "</p>" +
      "<section class=\"stats\">" +
        "<article class=\"stat\"><b>" + directory.length + "</b><span>كل المستخدمين</span></article>" +
        "<article class=\"stat\"><b>" + teachers + "</b><span>المعلمون</span></article>" +
        "<article class=\"stat\"><b>" + parents + "</b><span>أولياء الأمور</span></article>" +
        "<article class=\"stat\"><b>" + active + "</b><span>حسابات نشطة</span></article>" +
      "</section>" +
      "<div class=\"tabs\" role=\"tablist\">" +
        "<button type=\"button\" class=\"tab" + (tab === "users" ? " on" : "") + "\" data-action=\"tab\" data-tab=\"users\">المستخدمون</button>" +
        "<button type=\"button\" class=\"tab" + (tab === "school" ? " on" : "") + "\" data-action=\"tab\" data-tab=\"school\">الأقسام والطلاب</button>" +
        "<button type=\"button\" class=\"tab" + (tab === "system" ? " on" : "") + "\" data-action=\"tab\" data-tab=\"system\">الإعلانات والإعدادات</button>" +
      "</div>" +
      (tab === "users" ? renderUsers(directory) : tab === "school" ? renderSchool(view) : renderSystem(view));
    var academy = document.querySelector("[data-academy]");
    if (academy) academy.textContent = view.settings.academyName;
    bindStudentFeePreview();
  }

  function bindStudentFeePreview() {
    if (!app) return;
    var form = app.querySelector("#form-student");
    if (!form) return;
    var fees = form.querySelector("[name=fees]");
    var paid = form.querySelector("[name=paidAmount]");
    var out = form.querySelector("[data-remaining]");
    if (!fees || !paid || !out) return;
    function paint() {
      var rem = remainingOf(fees.value, paid.value);
      out.textContent = rem > 0 ? "باقي: " + rem : "المتبقي: 0";
    }
    fees.addEventListener("input", paint);
    paid.addEventListener("input", paint);
    paint();
    if (scrollStudentForm) {
      scrollStudentForm = false;
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      var name = form.querySelector("[name=name]");
      if (name) name.focus();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    PortalAuth.ready();
    if (PortalAuth.storageProblem()) {
      document.body.classList.remove("booting");
      document.getElementById("app").textContent = PortalAuth.storageProblem();
      return;
    }
    user = PortalAuth.currentUser();
    if (!user) {
      location.replace("index.html");
      return;
    }
    if (user.role === "supervisor") {
      document.body.classList.remove("booting");
      var usersLink = document.querySelector("a[href='../users.html']");
      if (usersLink) usersLink.hidden = true;
      document.getElementById("app").innerHTML = "<section class=\"panel\"><h2>غير مصرح</h2><p>دور المشرف مخصص لتسجيل الطلاب وتعديل بياناتهم فقط، ولا يمكنه فتح لوحة الإدارة أو حذف السجلات أو إدارة المستخدمين.</p><p><a class=\"btn\" href=\"../index.html#register\">الانتقال إلى تسجيل طالب</a></p></section>";
      PortalAuth.bindChrome();
      return;
    }
    user = PortalAuth.requireRole("admin");
    if (!user) return;
    PortalAuth.bindChrome();
    app = document.getElementById("app");
    document.body.classList.remove("booting");

    app.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action]");
      if (!button) return;
      var id = button.getAttribute("data-id");
      var action = button.getAttribute("data-action");
      if (action === "tab") {
        tab = button.getAttribute("data-tab");
        render();
        return;
      }
      if (action === "toggle-user") {
        resultToast(PortalAuth.setUserActive(id, button.getAttribute("data-active") !== "1"));
        return;
      }
      if (action === "delete-user") {
        if (window.confirm("حذف هذا المستخدم؟ لن يستطيع تسجيل الدخول بعد ذلك.")) {
          resultToast(PortalAuth.deleteUser(id));
        }
        return;
      }
      if (action === "reset-user") {
        var input = app.querySelector("[data-reset-for=\"" + id + "\"]");
        resultToast(PortalAuth.resetUserPassword(id, input ? input.value : ""));
        return;
      }
      if (action === "delete-class") {
        if (window.confirm("حذف هذا الفصل؟")) resultToast(PortalData.deleteClass(id));
        return;
      }
      if (action === "edit-student") {
        editingStudentId = id;
        scrollStudentForm = true;
        render();
        return;
      }
      if (action === "cancel-student-edit") {
        editingStudentId = "";
        render();
        return;
      }
      if (action === "delete-student") {
        if (user.role !== "admin") {
          PortalUi.toast("الحذف متاح للمدير فقط.");
          return;
        }
        if (window.confirm("حذف الطالب ودرجاته وحضوره؟")) {
          if (id === editingStudentId) editingStudentId = "";
          resultToast(PortalData.deleteStudent(id));
        }
        return;
      }
      if (action === "link-parent") {
        var select = app.querySelector("[data-parent-for=\"" + id + "\"]");
        resultToast(PortalData.linkParent(id, select ? select.value : ""));
        return;
      }
      if (action === "delete-announcement") resultToast(PortalData.deleteAnnouncement(id));
    });

    app.addEventListener("change", function (event) {
      var select = event.target.closest("[data-class-teacher]");
      if (!select) return;
      resultToast(PortalData.assignTeacher(select.getAttribute("data-class-id"), select.value));
    });

    app.addEventListener("submit", function (event) {
      var form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      event.preventDefault();
      var data = new FormData(form);
      var result = { ok: false, message: "تعذر حفظ النموذج." };
      if (form.id === "form-class") result = PortalData.addClass(data.get("name"), data.get("teacher"));
      if (form.id === "form-student") {
        var studentFields = {
          name: data.get("name"),
          phone: data.get("phone"),
          classId: data.get("classId"),
          parentUsername: data.get("parentUsername"),
          startDate: data.get("startDate"),
          endDate: data.get("endDate"),
          renewalDate: data.get("endDate"),
          fees: data.get("fees"),
          paidAmount: data.get("paidAmount")
        };
        if (editingStudentId) {
          result = PortalData.updateStudent(editingStudentId, studentFields);
          if (result.ok) editingStudentId = "";
        } else result = PortalData.addStudent(studentFields);
      }
      if (form.id === "form-settings") {
        result = PortalData.updateSettings({
          academyName: data.get("academyName"),
          welcomeNote: data.get("welcomeNote")
        });
      }
      if (form.id === "form-announcement") {
        result = PortalData.addAnnouncement({
          title: data.get("title"),
          body: data.get("body"),
          audience: data.get("audience")
        });
      }
      resultToast(result);
    });

    render();
  });
})();
