/*
 * Portal sessions. The password itself is checked and stored only by the
 * academy server. This file keeps the signed-in role for the open dashboard.
 */
(function () {
  var SESSION_KEY = "rw_central_session_v1";
  var LOCK_KEY = "rw_lock_v1";
  var MAX_FAILS = 5;
  var LOCK_MS = 30 * 1000;

  var storageError = "";
  var cachedUser = null;
  var directory = [];
  var readyPromise = null;

  function toPortalUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.portalRole,
      active: user.active !== false,
      createdAt: user.createdAt
    };
  }

  function passwordError(password) {
    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
      return "كلمة المرور يجب أن تكون من 8 إلى 72 حرفاً.";
    }
    if (!/[A-Za-z\u0600-\u06FF]/.test(password) || !/\d/.test(password)) {
      return "استخدم حروفاً وأرقاماً معاً في كلمة المرور.";
    }
    return "";
  }

  function readLock() {
    try {
      return JSON.parse(sessionStorage.getItem(LOCK_KEY) || "null") || { fails: 0, until: 0 };
    } catch (error) {
      return { fails: 0, until: 0 };
    }
  }

  function writeLock(lock) {
    sessionStorage.setItem(LOCK_KEY, JSON.stringify(lock));
  }

  function lockMessage(lock) {
    var seconds = Math.max(1, Math.ceil((lock.until - Date.now()) / 1000));
    return "تم إيقاف المحاولة مؤقتاً. انتظر " + seconds + " ثانية ثم أعد الدخول.";
  }

  function refreshDirectory() {
    if (!window.RoknAuth) return Promise.resolve();
    return RoknAuth.directory().then(function (data) {
      if (data && data.ok && Array.isArray(data.users)) directory = data.users;
    });
  }

  function currentUser() {
    if (cachedUser) return cachedUser;
    if (!window.RoknAuth) return null;
    cachedUser = toPortalUser(RoknAuth.current());
    return cachedUser;
  }

  function homeFor(role) {
    if (role === "admin") return "admin.html";
    if (role === "teacher") return "teacher.html";
    if (role === "parent") return "parent.html";
    if (role === "supervisor") return "../index.html#register";
    return "index.html";
  }

  function requireRole(role) {
    var user = currentUser();
    if (!user) {
      location.replace("index.html");
      return null;
    }
    if (user.role !== role) {
      location.replace(homeFor(user.role));
      return null;
    }
    return user;
  }

  function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = RoknAuth.prepare().then(function (prep) {
      if (prep && prep.offline) {
        storageError = prep.message || RoknAuth.offlineMessage();
        return null;
      }
      storageError = "";
      return RoknAuth.verify();
    }).then(function (data) {
      if (storageError) return;
      if (data && data.offline) {
        storageError = data.message || RoknAuth.offlineMessage();
        cachedUser = null;
        return;
      }
      cachedUser = data && data.ok ? toPortalUser(data.user) : null;
      if (!cachedUser) return;
      return refreshDirectory().then(function () {
        if (window.PortalData && PortalData.ready) return PortalData.ready();
      }).then(function (result) {
        if (result && result.ok === false) storageError = result.message;
      });
    }).catch(function () {
      storageError = RoknAuth.offlineMessage();
    });
    return readyPromise;
  }

  function login(identifier, password) {
    var lock = readLock();
    if (lock.until && lock.until > Date.now()) {
      return Promise.resolve({ ok: false, message: lockMessage(lock) });
    }
    return RoknAuth.login(identifier, password).then(function (data) {
      if (!data || data.offline) {
        return { ok: false, message: (data && data.message) || RoknAuth.offlineMessage() };
      }
      if (!data.ok) {
        lock.fails += 1;
        if (lock.fails >= MAX_FAILS) {
          lock.fails = 0;
          lock.until = Date.now() + LOCK_MS;
          writeLock(lock);
          return { ok: false, message: lockMessage(lock) };
        }
        writeLock(lock);
        return { ok: false, message: data.message || "اسم المستخدم أو كلمة المرور غير صحيحة." };
      }
      writeLock({ fails: 0, until: 0 });
      cachedUser = toPortalUser(data.user);
      return refreshDirectory().then(function () {
        return { ok: true, role: cachedUser.role };
      });
    });
  }

  function register(fields) {
    var name = String(fields.name || "").trim();
    var email = String(fields.email || "").trim().toLowerCase();
    var password = String(fields.password || "");
    var role = fields.role === "teacher" || fields.role === "parent" ? fields.role : "";
    if (name.length < 2 || name.length > 60 || /[<>]/.test(name)) {
      return Promise.resolve({ ok: false, message: "اكتب الاسم الكامل من حرفين إلى 60 حرفاً." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 80) {
      return Promise.resolve({ ok: false, message: "اكتب بريداً إلكترونياً صالحاً." });
    }
    var pwError = passwordError(password);
    if (pwError) return Promise.resolve({ ok: false, message: pwError });
    if (!role) {
      return Promise.resolve({ ok: false, message: "اختر دور المعلم أو ولي الأمر. حساب المدير لا يُنشأ من التسجيل." });
    }
    return RoknAuth.register({ name: name, email: email, password: password, role: role }).then(function (data) {
      if (!data || !data.ok) {
        return { ok: false, message: (data && data.message) || "تعذر إنشاء الحساب على الخادم. لم يُحفظ الحساب على هذا الجهاز فقط." };
      }
      return {
        ok: true,
        username: data.username,
        message: data.message || ("تم إنشاء الحساب. ادخل بالبريد أو باسم المستخدم: " + data.username)
      };
    });
  }

  function mustBeAdmin() {
    var user = currentUser();
    if (!user || user.role !== "admin") return null;
    return user;
  }

  function listDirectory() {
    if (!mustBeAdmin()) return [];
    return directory.slice();
  }

  function isActiveRole(username, role) {
    var actor = currentUser();
    if (!actor || (actor.role !== "admin" && actor.role !== "supervisor")) return false;
    var found = directory.find(function (item) { return item.username === username; });
    return !!(found && found.active && found.role === role);
  }

  function remoteResult(data, fallback) {
    if (!data || !data.ok) {
      return { ok: false, message: (data && data.message) || fallback };
    }
    return data;
  }

  function setUserActive(id, active) {
    var actor = mustBeAdmin();
    if (!actor) return Promise.resolve({ ok: false, message: "هذا الإجراء للمدير فقط." });
    return RoknAuth.setActive(id, active).then(function (data) {
      var result = remoteResult(data, "تعذر تحديث حالة الحساب على الخادم.");
      if (!result.ok) return result;
      return refreshDirectory().then(function () {
        return { ok: true, message: data.message };
      });
    });
  }

  function deleteUser(id) {
    var actor = mustBeAdmin();
    if (!actor) return Promise.resolve({ ok: false, message: "هذا الإجراء للمدير فقط." });
    var existing = directory.find(function (item) { return item.id === id; });
    return RoknAuth.removeUser(id).then(function (data) {
      var result = remoteResult(data, "تعذر حذف المستخدم من قاعدة الحسابات.");
      if (!result.ok) return result;
      var forgotten = existing && window.PortalData && window.PortalData.forgetUser
        ? PortalData.forgetUser(existing.username)
        : null;
      return Promise.resolve(forgotten).then(function () {
        return refreshDirectory();
      }).then(function () {
        return { ok: true, message: data.message || "تم حذف المستخدم." };
      });
    });
  }

  function resetUserPassword(id, password) {
    var actor = mustBeAdmin();
    if (!actor) return Promise.resolve({ ok: false, message: "هذا الإجراء للمدير فقط." });
    var pwError = passwordError(password);
    if (pwError) return Promise.resolve({ ok: false, message: pwError });
    return RoknAuth.resetPassword(id, password).then(function (data) {
      var result = remoteResult(data, "تعذر تحديث كلمة المرور على الخادم. لم يُحفظ التغيير.");
      if (!result.ok) return result;
      if (data.user && data.user.id === actor.id) cachedUser = toPortalUser(data.user);
      return refreshDirectory().then(function () {
        return { ok: true, message: data.message || "تم تحديث كلمة المرور." };
      });
    });
  }

  function logout() {
    cachedUser = null;
    directory = [];
    readyPromise = null;
    return RoknAuth.logout();
  }

  function bindThemeToggle() {
    var button = document.querySelector("[data-theme-toggle]");
    if (!button) return;
    function effective() {
      return document.documentElement.getAttribute("data-theme")
        || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
    function paint() {
      button.textContent = effective() === "dark" ? "مظهر فاتح" : "مظهر داكن";
    }
    button.addEventListener("click", function () {
      var next = effective() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("rw_theme", next); } catch (error) { /* ignore */ }
      paint();
    });
    paint();
  }

  function bindChrome() {
    bindThemeToggle();
    var user = currentUser();
    if (!user) return;
    var nameEl = document.querySelector("[data-user-name]");
    if (nameEl) nameEl.textContent = user.name;
    var roleEl = document.querySelector("[data-user-role]");
    if (roleEl) roleEl.textContent = window.PortalUi.roleLabel(user.role);
    var logoutBtn = document.querySelector("[data-logout]");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        logout().then(function () { location.replace("index.html"); });
      });
    }
    window.addEventListener("storage", function (event) {
      if (event.key !== SESSION_KEY) return;
      var pageRole = document.body.dataset.role;
      cachedUser = toPortalUser(window.RoknAuth.current());
      var next = currentUser();
      if (!next || next.role !== pageRole) location.replace(next ? homeFor(next.role) : "index.html");
    });
    window.setInterval(function () {
      RoknAuth.verify().then(function (data) {
        if (data && data.offline) return;
        if (!data || !data.ok) {
          cachedUser = null;
          location.replace("index.html");
        } else {
          cachedUser = toPortalUser(data.user);
        }
      });
    }, 20000);
  }

  window.PortalAuth = {
    ready: ready,
    storageProblem: function () { return storageError; },
    login: login,
    register: register,
    logout: logout,
    currentUser: currentUser,
    requireRole: requireRole,
    homeFor: homeFor,
    bindChrome: bindChrome,
    bindThemeToggle: bindThemeToggle,
    listDirectory: listDirectory,
    isActiveRole: isActiveRole,
    setUserActive: setUserActive,
    deleteUser: deleteUser,
    resetUserPassword: resetUserPassword
  };
})();
