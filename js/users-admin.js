/* Director user list. Every save goes to the central account server. */
(function () {
  var usersCache = [];
  var editingIndex = -1;

  function showAlert(message, isSuccess) {
    var box = document.getElementById("alertBox");
    if (!box) return;
    box.textContent = message;
    box.className = "alert " + (isSuccess ? "alert-success" : "alert-error");
    box.style.display = "block";
    clearTimeout(box.timer);
    box.timer = setTimeout(function () { box.style.display = "none"; }, 4500);
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text == null ? "" : text;
    return div.innerHTML;
  }

  function isDirectorAccount(user) {
    return String(user && user.role || "").indexOf("مدير") !== -1;
  }

  function isSupervisorRole(role) {
    return String(role || "").indexOf("مشرف") !== -1;
  }

  function isPrimaryDirector(user) {
    return String(user && user.username || "").trim().toLowerCase() === "mohamed";
  }

  function renderUsers() {
    var tbody = document.getElementById("usersTableBody");
    if (!tbody) return;
    if (!usersCache.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="color: #718096;">لا يوجد مستخدمون حالياً.</td></tr>';
      return;
    }
    tbody.innerHTML = usersCache.map(function (user, index) {
      var badgeClass = "badge-teacher";
      if (isSupervisorRole(user.role)) badgeClass = "badge-supervisor";
      else if (isDirectorAccount(user)) badgeClass = "badge-admin";
      else if (String(user.role || "").indexOf("ولي") !== -1) badgeClass = "badge-parent";
      var deleteBtn = isPrimaryDirector(user)
        ? ""
        : '<button type="button" class="btn-delete" onclick="deleteUser(' + index + ')">حذف</button>';
      return '<tr>' +
        '<td><strong>' + escapeHtml(user.username) + '</strong></td>' +
        '<td class="password-cell"><code>' + escapeHtml(user.password) + '</code></td>' +
        '<td><span class="badge ' + badgeClass + '">' + escapeHtml(user.role) + '</span></td>' +
        '<td><div class="row-actions"><button type="button" class="btn-edit" onclick="startEdit(' + index + ')">تعديل</button>' + deleteBtn + '</div></td>' +
        '</tr>';
    }).join("");
  }

  function refresh() {
    return RoknAuth.listUsers().then(function (data) {
      if (!data || !data.ok) {
        usersCache = [];
        renderUsers();
        showAlert((data && data.message) || RoknAuth.offlineMessage(), false);
        return data;
      }
      usersCache = Array.isArray(data.users) ? data.users : [];
      renderUsers();
      return data;
    });
  }

  function cancelEdit() {
    editingIndex = -1;
    var form = document.getElementById("addUserForm");
    if (form) form.reset();
    var password = document.getElementById("newPassword");
    if (password) password.type = "password";
    var title = document.getElementById("userFormTitle");
    if (title) title.textContent = "لوحة تحكم المدير - إضافة مستخدم جديد";
    var submit = document.getElementById("userSubmitBtn");
    if (submit) submit.textContent = "إضافة المستخدم وحفظه";
    var cancel = document.getElementById("cancelEditBtn");
    if (cancel) cancel.style.display = "none";
  }

  function startEdit(index) {
    var user = usersCache[index];
    if (!user) return;
    editingIndex = index;
    document.getElementById("newUsername").value = user.username;
    var passwordInput = document.getElementById("newPassword");
    passwordInput.type = "text";
    passwordInput.value = user.password || "";
    document.getElementById("newRole").value = user.role;
    document.getElementById("userFormTitle").textContent = "تعديل بيانات المستخدم";
    document.getElementById("userSubmitBtn").textContent = "حفظ التعديل";
    document.getElementById("cancelEditBtn").style.display = "inline-block";
    document.getElementById("addUserForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function addUser(event) {
    event.preventDefault();
    var usernameInput = document.getElementById("newUsername");
    var passwordInput = document.getElementById("newPassword");
    var roleSelect = document.getElementById("newRole");
    var submit = document.getElementById("userSubmitBtn");
    var username = usernameInput.value.trim();
    var password = passwordInput.value.trim();
    var role = roleSelect.value;
    if (!username || !password) {
      showAlert("يرجى ملء جميع الحقول المطلوبة.", false);
      return;
    }
    var current = editingIndex >= 0 ? usersCache[editingIndex] : null;
    var duplicate = usersCache.some(function (user, index) {
      return index !== editingIndex && String(user.username || "").toLowerCase() === username.toLowerCase();
    });
    if (duplicate) {
      showAlert("اسم المستخدم موجود بالفعل، يرجى اختيار اسم آخر.", false);
      return;
    }
    if (submit) submit.disabled = true;
    var request = current
      ? RoknAuth.updateUser({ oldUsername: current.username, username: username, password: password, role: role })
      : RoknAuth.createUser({ username: username, password: password, role: role });
    request.then(function (result) {
      if (submit) submit.disabled = false;
      if (!result || !result.ok) {
        showAlert((result && result.message) || "تعذر حفظ كلمة المرور على الخادم. لم يُقبل التغيير.", false);
        return;
      }
      var wasEdit = !!current;
      if (wasEdit) cancelEdit();
      else {
        usernameInput.value = "";
        passwordInput.value = "";
      }
      return refresh().then(function () {
        showAlert(result.message || (wasEdit ? "تم حفظ التعديل في قاعدة الحسابات ✓" : "تمت إضافة المستخدم في قاعدة الحسابات ✓"), true);
      });
    });
  }

  function deleteUser(index) {
    var user = usersCache[index];
    if (!user) return;
    if (isPrimaryDirector(user)) {
      showAlert("لا يمكن حذف حساب المدير الأساسي.", false);
      return;
    }
    if (!confirm('هل أنت متأكد من رغبتك في حذف المستخدم "' + user.username + '"؟')) return;
    RoknAuth.deleteUser(user.username).then(function (result) {
      if (!result || !result.ok) {
        showAlert((result && result.message) || "تعذر الحذف من قاعدة الحسابات.", false);
        return;
      }
      if (editingIndex === index) cancelEdit();
      refresh().then(function () {
        showAlert(result.message || ('تم حذف المستخدم "' + user.username + '" من قاعدة الحسابات.'), true);
      });
    });
  }

  function openIfAllowed(user) {
    var gate = document.getElementById("pageAdminGate");
    var form = document.getElementById("pageAdminGateForm");
    if (user && isSupervisorRole(user.role)) {
      if (gate) gate.style.background = "#f4f7f6";
      if (form) {
        var homeHref = /\/portal\//.test(location.pathname) ? "../index.html#register" : "index.html#register";
        form.innerHTML = '<h2 style="margin:0">غير مصرح</h2><p style="margin:0;color:#742a2a">دور المشرف مخصص لتسجيل الطلاب وتعديل بياناتهم فقط. لا يمكن فتح لوحة الإدارة أو إدارة المستخدمين.</p><p style="margin:0"><a href="' + homeHref + '">العودة لتسجيل طالب</a></p>';
      }
      return;
    }
    if (!user || !isDirectorAccount(user)) {
      var msg = document.getElementById("pageGateMsg");
      if (msg && user) msg.textContent = "هذه الصفحة متاحة لحسابات المدير فقط.";
      return;
    }
    try {
      sessionStorage.setItem("rw_admin_gate", "1");
      sessionStorage.setItem("rw_manager_gate", "1");
    } catch (e) { /* ignore */ }
    if (gate) gate.style.display = "none";
    refresh();
  }

  window.startEdit = startEdit;
  window.cancelEdit = cancelEdit;
  window.addUser = addUser;
  window.deleteUser = deleteUser;

  window.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("pageAdminGateForm");
    var msg = document.getElementById("pageGateMsg");
    RoknAuth.prepare().then(function () {
      return RoknAuth.verify();
    }).then(function (verified) {
      if (verified && verified.offline && msg) msg.textContent = verified.message || RoknAuth.offlineMessage();
      if (verified && verified.ok) openIfAllowed(verified.user);
      if (!form) return;
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var username = document.getElementById("pageGateUser").value.trim();
        var pass = document.getElementById("pageGatePass").value;
        if (msg) msg.textContent = "جارٍ التحقق من قاعدة الحسابات…";
        RoknAuth.check(username, pass).then(function (data) {
          if (!data || !data.ok) {
            if (msg) msg.textContent = (data && data.message) || "اسم المستخدم أو كلمة المرور غير صحيحة.";
            return;
          }
          if (isSupervisorRole(data.user.role) || !isDirectorAccount(data.user)) {
            if (msg) {
              msg.textContent = isSupervisorRole(data.user.role)
                ? "غير مصرح. دور المشرف مخصص لتسجيل الطلاب وتعديل بياناتهم فقط."
                : "هذه الصفحة متاحة لحسابات المدير فقط.";
            }
            return;
          }
          return RoknAuth.login(username, pass).then(function (session) {
            if (!session || !session.ok) {
              if (msg) msg.textContent = (session && session.message) || RoknAuth.offlineMessage();
              return;
            }
            if (msg) msg.textContent = "";
            openIfAllowed(session.user);
          });
        });
      });
    });
  });
})();
