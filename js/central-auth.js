/*
 * Shared login client. Passwords are checked and saved only on the academy
 * server (data/accounts.json). This browser keeps a session token, not the
 * password list.
 */
(function () {
  var SESSION_KEY = "rw_central_session_v1";
  var OFFLINE = "تعذر الاتصال بقاعدة البيانات المركزية. لم يُحفظ التغيير على هذا الجهاز. استخدم start-server.bat محلياً، أو افتح rokn-wagd.com بعد نشر التحديث على Netlify.";

  var memory = null;

  function readStored() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function current() {
    if (memory && memory.user && memory.exp > Date.now()) return memory.user;
    return null;
  }

  function token() {
    if (memory && memory.token && memory.exp > Date.now()) return memory.token;
    var stored = readStored();
    if (stored && stored.token && stored.exp > Date.now()) return stored.token;
    return "";
  }

  function clearLocalSecrets() {
    try {
      localStorage.removeItem("academy_users");
      localStorage.removeItem("rw_users_v1");
      localStorage.removeItem("rw_session_v1");
    } catch (e) { /* ignore */ }
  }

  function remember(data) {
    if (!data || !data.token || !data.user) return;
    memory = {
      token: data.token,
      exp: data.exp || (Date.now() + 8 * 60 * 60 * 1000),
      user: data.user
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(memory));
    try {
      sessionStorage.setItem("rw_gate_session", JSON.stringify({
        username: data.user.username,
        role: data.user.role,
        token: data.token
      }));
    } catch (e) { /* ignore */ }
    clearLocalSecrets();
  }

  function clearSession() {
    memory = null;
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem("rw_gate_session");
      sessionStorage.removeItem("rw_admin_gate");
      sessionStorage.removeItem("rw_manager_gate");
    } catch (e) { /* ignore */ }
    clearLocalSecrets();
  }

  function api(path, method, body, authMode) {
    var headers = { "Content-Type": "application/json" };
    var bearer = "";
    if (authMode === false) bearer = "";
    else if (typeof authMode === "string") bearer = authMode;
    else bearer = token();
    if (bearer) headers.Authorization = "Bearer " + bearer;
    var opts = { method: method || "GET", headers: headers };
    if (body) opts.body = JSON.stringify(body);
    return fetch("/api/auth" + path, opts).then(function (res) {
      return res.text().then(function (text) {
        try {
          var data = text ? JSON.parse(text) : null;
          if (data && typeof data === "object") {
            if (data.ok === false && !data.message && data.error) data.message = String(data.error);
            if (data.ok === false && !data.message) data.message = "HTTP " + res.status;
            return data;
          }
        } catch (error) { /* the body is not JSON */ }
        return { ok: false, message: "HTTP " + res.status + " " + String(text || "").slice(0, 500) };
      });
    }).catch(function (error) {
      return { ok: false, message: error && error.message ? String(error.message) : OFFLINE };
    });
  }

  function localAccounts() {
    try {
      var users = JSON.parse(localStorage.getItem("academy_users") || "null");
      return Array.isArray(users) ? users : [];
    } catch (e) {
      return [];
    }
  }

  function isFactoryList(users) {
    var expected = { mohamed: "112233", teacher: "teacher123", parent: "parent123" };
    if (!users || users.length !== 3) return false;
    var seen = {};
    for (var i = 0; i < users.length; i++) {
      var name = String(users[i].username || "").trim().toLowerCase();
      if (expected[name] == null || String(users[i].password || "") !== expected[name]) return false;
      seen[name] = true;
    }
    return !!(seen.mohamed && seen.teacher && seen.parent);
  }

  function prepare() {
    var users = localAccounts();
    if (!users.length || isFactoryList(users)) {
      return api("/status", "GET", null, false).then(function (status) {
        if (status && status.ok && status.pristine === false) clearLocalSecrets();
        return status || { ok: false, offline: true, message: OFFLINE };
      });
    }
    return api("/migrate", "POST", {
      users: users.map(function (item) {
        return { username: item.username, password: item.password, role: item.role };
      })
    }, false).then(function (result) {
      if (result && result.ok && (result.imported || result.pristine === false)) clearLocalSecrets();
      return result || { ok: false, offline: true, message: OFFLINE };
    });
  }

  function verify() {
    var stored = readStored();
    if (!stored || !stored.token || !stored.exp || stored.exp < Date.now()) {
      memory = null;
      return Promise.resolve({ ok: false });
    }
    memory = stored;
    return api("/verify", "POST", { token: stored.token }, stored.token).then(function (data) {
      if (data && data.offline) {
        memory = null;
        return data;
      }
      if (!data || !data.ok) {
        clearSession();
        return { ok: false, message: data && data.message };
      }
      remember({ token: stored.token, exp: data.exp || stored.exp, user: data.user });
      return { ok: true, user: data.user };
    });
  }

  function login(username, password) {
    return api("/login", "POST", { username: username, password: password }, false).then(function (data) {
      if (data && data.ok) remember(data);
      return data || { ok: false, offline: true, message: OFFLINE };
    });
  }

  function check(username, password) {
    return api("/check", "POST", { username: username, password: password }, false).then(function (data) {
      return data || { ok: false, offline: true, message: OFFLINE };
    });
  }

  function logout() {
    var currentToken = token();
    clearSession();
    if (!currentToken) return Promise.resolve({ ok: true });
    return api("/logout", "POST", { token: currentToken }, currentToken);
  }

  function absorb(data) {
    if (data && data.ok && data.token && data.user) remember(data);
    else if (data && data.ok && data.user && memory && data.user.id === memory.user.id) {
      memory.user = data.user;
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(memory)); } catch (e) { /* ignore */ }
    }
    if (data && data.ok) clearLocalSecrets();
    return data;
  }

  window.RoknAuth = {
    offlineMessage: function () { return OFFLINE; },
    prepare: prepare,
    verify: verify,
    login: login,
    check: check,
    logout: logout,
    current: current,
    listUsers: function () { return api("/users", "GET"); },
    createUser: function (fields) { return api("/users", "POST", fields).then(absorb); },
    updateUser: function (fields) { return api("/users/update", "POST", fields).then(absorb); },
    deleteUser: function (username) { return api("/users/delete", "POST", { username: username }).then(absorb); },
    resetPassword: function (id, password) { return api("/password", "POST", { id: id, password: password }).then(absorb); },
    register: function (fields) { return api("/register", "POST", fields, false); },
    setActive: function (id, active) { return api("/active", "POST", { id: id, active: !!active }); },
    removeUser: function (id) { return api("/users/delete", "POST", { id: id }).then(absorb); },
    directory: function () { return api("/directory", "GET"); },
    clearSession: clearSession
  };
})();
