/*
 * Local accounts for the academy portal.
 *
 * Passwords are never stored as typed. Each account gets a random salt and a
 * stretched SHA-256 hash. Sessions expire and every dashboard asks for the
 * signed-in role again.
 *
 * This is still a browser demo: the person using the computer can edit saved
 * data. A live school system needs these same checks on a server.
 */
(function () {
  var USERS_KEY = "rw_users_v1";
  var SESSION_KEY = "rw_session_v1";
  var LOCK_KEY = "rw_lock_v1";
  var SESSION_MS = 8 * 60 * 60 * 1000;
  var MAX_FAILS = 5;
  var LOCK_MS = 30 * 1000;
  var HASH_ROUNDS = 600;
  var DUMMY_SALT = "a91c0e44b7d25f6180ab33c4e6571902";
  var dummyHash = "";
  var storageError = "";

  var DEFAULTS = [
    { username: "mohamed", password: "112233", name: "Dr. Mohamed Mohamed", email: "mohamed@rokn-wajd.example", role: "admin" },
    { username: "teacher", password: "teacher123", name: "أ. سارة المعلم", email: "teacher@rokn-wajd.example", role: "teacher" },
    { username: "parent", password: "parent123", name: "أحمد ولي الأمر", email: "parent@rokn-wajd.example", role: "parent" }
  ];

  function rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  /* SHA-256 over bytes. Used instead of crypto.subtle so login also works from a local file. */
  function sha256Bytes(bytes) {
    var K = new Uint32Array([
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ]);
    var H = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);
    var bitLen = bytes.length * 8;
    var padLen = (56 - ((bytes.length + 1) % 64) + 64) % 64;
    var total = bytes.length + 1 + padLen + 8;
    var buf = new Uint8Array(total);
    buf.set(bytes);
    buf[bytes.length] = 0x80;
    var view = new DataView(buf.buffer);
    view.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
    view.setUint32(total - 4, bitLen >>> 0);

    var w = new Uint32Array(64);
    for (var i = 0; i < buf.length; i += 64) {
      for (var t = 0; t < 16; t += 1) w[t] = view.getUint32(i + t * 4);
      for (t = 16; t < 64; t += 1) {
        var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t += 1) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = ((e & f) ^ ((~e >>> 0) & g)) >>> 0;
        var temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        var temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var hex = "";
    for (var hi = 0; hi < 8; hi += 1) hex += H[hi].toString(16).padStart(8, "0");
    return hex;
  }

  function sha256Text(value) {
    return sha256Bytes(new TextEncoder().encode(value));
  }

  function hashPassword(password, saltHex) {
    var round = sha256Text(saltHex + ":" + password);
    for (var i = 1; i < HASH_ROUNDS; i += 1) {
      round = sha256Text(round + ":" + saltHex);
    }
    return round;
  }

  function safeEqual(left, right) {
    var a = String(left || "");
    var b = String(right || "");
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function randomHex(bytes) {
    var data = new Uint8Array(bytes);
    crypto.getRandomValues(data);
    var hex = "";
    for (var i = 0; i < data.length; i += 1) hex += data[i].toString(16).padStart(2, "0");
    return hex;
  }

  function uid() {
    return randomHex(16);
  }

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (error) {
      return null;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readUsers() {
    var data = readJson(USERS_KEY);
    if (!data || data.version !== 1 || !Array.isArray(data.users)) return null;
    return data.users;
  }

  function writeUsers(users) {
    writeJson(USERS_KEY, { version: 1, users: users });
  }

  function publicUser(user) {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
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

  function ensureUsers() {
    var existingUsers = readUsers();
    if (existingUsers) {
      var adminUser = existingUsers.find(function (item) {
        return item.role === "admin" || String(item.username || "").toLowerCase() === "admin" || String(item.username || "").toLowerCase() === "mohamed";
      });
      if (!adminUser) {
        var salt = randomHex(16);
        existingUsers.unshift({
          id: uid(),
          username: "mohamed",
          name: "Dr. Mohamed Mohamed",
          email: "mohamed@rokn-wajd.example",
          role: "admin",
          salt: salt,
          passwordHash: hashPassword("112233", salt),
          active: true,
          createdAt: new Date().toISOString()
        });
        writeUsers(existingUsers);
        return;
      }
      var changed = false;
      if (String(adminUser.username || "").toLowerCase() === "admin") {
        adminUser.username = "mohamed";
        changed = true;
      }
      if (adminUser.name !== "Dr. Mohamed Mohamed") {
        adminUser.name = "Dr. Mohamed Mohamed";
        changed = true;
      }
      var legacyHashes = ["admin123", "Amal 1985"].map(function (value) { return hashPassword(value, adminUser.salt); });
      if (legacyHashes.indexOf(adminUser.passwordHash) !== -1 || !adminUser.passwordHash) {
        adminUser.passwordHash = hashPassword("112233", adminUser.salt);
        changed = true;
      }
      if (changed) writeUsers(existingUsers);
      return;
    }
    var users = DEFAULTS.map(function (item) {
      var salt = randomHex(16);
      return {
        id: uid(),
        username: item.username,
        name: item.name,
        email: item.email,
        role: item.role,
        salt: salt,
        passwordHash: hashPassword(item.password, salt),
        active: true,
        createdAt: new Date().toISOString()
      };
    });
    writeUsers(users);
  }

  function readSession() {
    var session = readJson(SESSION_KEY);
    if (!session || !session.userId || !session.role || !session.exp) return null;
    return session;
  }

  function currentUser() {
    var session = readSession();
    if (!session) return null;
    if (session.exp < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    var users = readUsers() || [];
    var user = users.find(function (item) { return item.id === session.userId; });
    if (!user || !user.active || user.role !== session.role) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return publicUser(user);
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

  function academyRoleToPortal(roleLabel) {
    var role = String(roleLabel || "");
    if (role.indexOf("مشرف") !== -1) return "supervisor";
    if (role.indexOf("مدير") !== -1) return "admin";
    if (role.indexOf("ولي") !== -1) return "parent";
    return "teacher";
  }

  function academyPortalName(username, roleLabel) {
    var role = String(roleLabel || "");
    var name = String(username || "");
    if (role.indexOf("مشرف") !== -1) return name + " (مشرف)";
    if (role.indexOf("مدير") !== -1 && name.toLowerCase() === "mohamed") return "Dr. Mohamed Mohamed";
    if (role.indexOf("مدير") !== -1) return name;
    if (role.indexOf("ولي") !== -1) return name + " (ولي أمر)";
    return "أ. " + name;
  }

  function directorAccount(key, password) {
    try {
      var list = JSON.parse(localStorage.getItem("academy_users") || "[]");
      if (!Array.isArray(list)) return null;
      var typed = String(password || "").trim();
      return list.find(function (item) {
        return String(item.username || "").trim().toLowerCase() === key && String(item.password || "") === typed;
      }) || null;
    } catch (error) {
      return null;
    }
  }

  function login(identifier, password) {
    var lock = readLock();
    if (lock.until && lock.until > Date.now()) return { ok: false, message: lockMessage(lock) };

    var key = String(identifier || "").trim().toLowerCase();
    var users = readUsers() || [];
    var user = users.find(function (item) {
      return String(item.username || "").toLowerCase() === key || String(item.email || "").toLowerCase() === key;
    });

    /* Always hash, including unknown accounts, so the two cases take similar time. */
    var hash = hashPassword(String(password || ""), user ? user.salt : DUMMY_SALT);
    var expected = user ? user.passwordHash : dummyHash;
    var matches = safeEqual(hash, expected);
    if (!matches) {
      var fromDirector = directorAccount(key, password);
      if (fromDirector) {
        var typedPassword = String(password || "").trim();
        var nextRole = academyRoleToPortal(fromDirector.role);
        var nextName = academyPortalName(fromDirector.username, fromDirector.role);
        if (!user) {
          var createdSalt = randomHex(16);
          user = {
            id: uid(),
            username: fromDirector.username,
            name: nextName,
            email: String(fromDirector.username || "").toLowerCase() + "@rokn-wajd.example",
            role: nextRole,
            salt: createdSalt,
            passwordHash: hashPassword(typedPassword, createdSalt),
            active: true,
            createdAt: new Date().toISOString()
          };
          users.push(user);
        } else {
          user.username = fromDirector.username;
          user.name = nextName;
          user.role = nextRole;
          user.active = true;
          user.salt = randomHex(16);
          user.passwordHash = hashPassword(typedPassword, user.salt);
        }
        writeUsers(users);
        matches = true;
      }
    }
    if (!matches && key === "mohamed" && String(password || "") === "112233") {
      if (!user) user = users.find(function (item) { return item.role === "admin"; });
      if (user) {
        user.username = "mohamed";
        user.name = "Dr. Mohamed Mohamed";
        user.role = "admin";
        user.active = true;
        user.salt = randomHex(16);
        user.passwordHash = hashPassword("112233", user.salt);
        writeUsers(users);
        matches = true;
      }
    }

    if (!user || !matches) {
      lock.fails += 1;
      if (lock.fails >= MAX_FAILS) {
        lock.fails = 0;
        lock.until = Date.now() + LOCK_MS;
        writeLock(lock);
        return { ok: false, message: lockMessage(lock) };
      }
      writeLock(lock);
      return { ok: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة." };
    }

    if (!user.active) {
      return { ok: false, message: "هذا الحساب موقوف. تواصل مع إدارة الأكاديمية." };
    }

    writeLock({ fails: 0, until: 0 });
    writeJson(SESSION_KEY, {
      userId: user.id,
      role: user.role,
      exp: Date.now() + SESSION_MS,
      token: randomHex(16)
    });
    return { ok: true, role: user.role };
  }

  function usernameFromEmail(email, users) {
    var base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (base.length < 3) base = "user";
    base = base.slice(0, 20);
    var name = base;
    var n = 2;
    while (users.some(function (item) { return item.username === name; })) {
      name = (base + n).slice(0, 24);
      n += 1;
    }
    return name;
  }

  function register(fields) {
    var name = String(fields.name || "").trim();
    var email = String(fields.email || "").trim().toLowerCase();
    var password = String(fields.password || "");
    var role = fields.role === "teacher" || fields.role === "parent" ? fields.role : "";

    if (name.length < 2 || name.length > 60 || /[<>]/.test(name)) {
      return { ok: false, message: "اكتب الاسم الكامل من حرفين إلى 60 حرفاً." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 80) {
      return { ok: false, message: "اكتب بريداً إلكترونياً صالحاً." };
    }
    var pwError = passwordError(password);
    if (pwError) return { ok: false, message: pwError };
    if (!role) return { ok: false, message: "اختر دور المعلم أو ولي الأمر. حساب المدير لا يُنشأ من التسجيل." };

    var users = readUsers() || [];
    if (users.some(function (item) { return item.email === email; })) {
      return { ok: false, message: "هذا البريد مسجّل بالفعل. جرّب تسجيل الدخول." };
    }

    var username = usernameFromEmail(email, users);
    var salt = randomHex(16);
    users.push({
      id: uid(),
      username: username,
      name: name,
      email: email,
      role: role,
      salt: salt,
      passwordHash: hashPassword(password, salt),
      active: true,
      createdAt: new Date().toISOString()
    });
    writeUsers(users);
    return {
      ok: true,
      username: username,
      message: "تم إنشاء الحساب. ادخل بالبريد أو باسم المستخدم: " + username
    };
  }

  function mustBeAdmin() {
    var user = currentUser();
    if (!user || user.role !== "admin") return null;
    return user;
  }

  function listDirectory() {
    if (!mustBeAdmin()) return [];
    return (readUsers() || []).map(publicUser);
  }

  function isActiveRole(username, role) {
    var actor = currentUser();
    if (!actor || (actor.role !== "admin" && actor.role !== "supervisor")) return false;
    var found = (readUsers() || []).find(function (item) { return item.username === username; });
    return !!(found && found.active && found.role === role);
  }

  function setUserActive(id, active) {
    var actor = mustBeAdmin();
    if (!actor) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    if (actor.id === id && !active) return { ok: false, message: "لا يمكن إيقاف حسابك الحالي." };
    var users = readUsers() || [];
    var user = users.find(function (item) { return item.id === id; });
    if (!user) return { ok: false, message: "المستخدم غير موجود." };
    if (user.role === "admin" && user.active && !active) {
      var otherAdmins = users.filter(function (item) {
        return item.role === "admin" && item.active && item.id !== id;
      });
      if (!otherAdmins.length) return { ok: false, message: "أبقِ مديراً نشطاً واحداً على الأقل." };
    }
    user.active = !!active;
    writeUsers(users);
    return { ok: true, message: active ? "تم تفعيل الحساب." : "تم إيقاف الحساب." };
  }

  function deleteUser(id) {
    var actor = mustBeAdmin();
    if (!actor) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    if (actor.id === id) return { ok: false, message: "لا يمكن حذف الحساب الذي تستخدمه الآن." };
    var users = readUsers() || [];
    var user = users.find(function (item) { return item.id === id; });
    if (!user) return { ok: false, message: "المستخدم غير موجود." };
    if (user.role === "admin") {
      var remaining = users.filter(function (item) {
        return item.role === "admin" && item.active && item.id !== id;
      });
      if (!remaining.length) return { ok: false, message: "لا يمكن حذف آخر مدير نشط." };
    }
    writeUsers(users.filter(function (item) { return item.id !== id; }));
    if (window.PortalData && window.PortalData.forgetUser) window.PortalData.forgetUser(user.username);
    return { ok: true, message: "تم حذف المستخدم." };
  }

  function resetUserPassword(id, password) {
    var actor = mustBeAdmin();
    if (!actor) return { ok: false, message: "هذا الإجراء للمدير فقط." };
    var pwError = passwordError(password);
    if (pwError) return { ok: false, message: pwError };
    var users = readUsers() || [];
    var user = users.find(function (item) { return item.id === id; });
    if (!user) return { ok: false, message: "المستخدم غير موجود." };
    user.salt = randomHex(16);
    user.passwordHash = hashPassword(password, user.salt);
    writeUsers(users);
    return { ok: true, message: "تم تحديث كلمة المرور." };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
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
        logout();
        location.replace("index.html");
      });
    }
    window.addEventListener("storage", function (event) {
      if (event.key !== SESSION_KEY) return;
      var pageRole = document.body.dataset.role;
      var next = currentUser();
      if (!next || next.role !== pageRole) location.replace(next ? homeFor(next.role) : "index.html");
    });
  }

  function ready() {
    try {
      ensureUsers();
      if (window.PortalData) window.PortalData.ensure();
      if (!dummyHash) dummyHash = hashPassword("portal-dummy", DUMMY_SALT);
    } catch (error) {
      storageError = "تعذر استخدام التخزين المحلي في هذا المتصفح. اسمح بحفظ بيانات الموقع ثم أعد فتح الصفحة.";
    }
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
    resetUserPassword: resetUserPassword,
    sha256Text: sha256Text
  };
})();
