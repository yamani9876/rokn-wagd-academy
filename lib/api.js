"use strict";

const crypto = require("crypto");

const ROLE_ADMIN = "مدير";
const ROLE_SUPERVISOR = "مشرف";
const ROLE_PARENT = "ولي الأمر";
const ROLE_TEACHER = "المعلم";

const MSG_BAD_LOGIN = "اسم المستخدم أو كلمة المرور غير صحيحة.";
const MSG_INACTIVE = "هذا الحساب موقوف. تواصل مع إدارة الأكاديمية.";
const MSG_ADMIN_ONLY = "هذا الإجراء للمدير فقط.";
const MSG_OFFLINE = "تعذر حفظ البيانات في قاعدة البيانات المركزية. لم يُقبل التغيير.";
const MSG_NEED = "يرجى ملء جميع الحقول المطلوبة.";
const MSG_DUPLICATE = "اسم المستخدم موجود بالفعل، يرجى اختيار اسم آخر.";
const MSG_MISSING = "المستخدم غير موجود.";
const MSG_SAVED = "تم حفظ البيانات في قاعدة البيانات المركزية.";
const MSG_FORBIDDEN = "ليست لديك صلاحية تعديل هذه البيانات.";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowMs() {
  return Date.now();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return crypto.randomBytes(16).toString("hex");
}

function sameSecret(left, right) {
  const a = crypto.createHash("sha256").update(String(left), "utf8").digest();
  const b = crypto.createHash("sha256").update(String(right), "utf8").digest();
  return crypto.timingSafeEqual(a, b);
}

function normalizeRole(role) {
  const text = String(role || "");
  if (text.indexOf("المديرة") !== -1) return ROLE_ADMIN;
  return text;
}

function portalRole(label) {
  const text = normalizeRole(label);
  if (text.indexOf(ROLE_SUPERVISOR) !== -1) return "supervisor";
  if (text.indexOf("مدير") !== -1) return "admin";
  if (text.indexOf("ولي") !== -1) return "parent";
  return "teacher";
}

function roleLabel(portal) {
  if (portal === "admin") return ROLE_ADMIN;
  if (portal === "supervisor") return ROLE_SUPERVISOR;
  if (portal === "parent") return ROLE_PARENT;
  return ROLE_TEACHER;
}

function displayName(username, label) {
  const role = normalizeRole(label);
  const name = String(username || "");
  if (role.indexOf(ROLE_SUPERVISOR) !== -1) return name + " (مشرف)";
  if (role.indexOf("مدير") !== -1 && name.toLowerCase() === "mohamed") return "Dr. Mohamed Mohamed";
  if (role.indexOf("مدير") !== -1) return name;
  if (role.indexOf("ولي") !== -1) return name + " (ولي أمر)";
  return "أ. " + name;
}

function publicUser(user, withPassword) {
  const out = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    portalRole: user.portalRole,
    active: user.active !== false,
    createdAt: user.createdAt
  };
  if (withPassword) out.password = user.password;
  return out;
}

function portalUser(user) {
  const out = publicUser(user);
  out.role = user.portalRole;
  return out;
}

function makeAccount(username, password, role, name, email) {
  const cleanRole = normalizeRole(role) || ROLE_TEACHER;
  const cleanName = String(username || "").trim();
  return {
    id: uid(),
    username: cleanName,
    password: String(password),
    role: cleanRole,
    portalRole: portalRole(cleanRole),
    name: name || displayName(cleanName, cleanRole),
    email: String(email || (cleanName.toLowerCase() + "@rokn-wajd.example")).trim().toLowerCase(),
    active: true,
    credVersion: 1,
    createdAt: new Date().toISOString()
  };
}

function defaultAccounts() {
  return {
    version: 1,
    pristine: true,
    users: [
      makeAccount("mohamed", "112233", ROLE_ADMIN, "Dr. Mohamed Mohamed", "mohamed@rokn-wajd.example"),
      makeAccount("teacher", "teacher123", ROLE_TEACHER, "أ. سارة المعلم", "teacher@rokn-wajd.example"),
      makeAccount("parent", "parent123", ROLE_PARENT, "أحمد ولي الأمر", "parent@rokn-wajd.example")
    ],
    sessions: []
  };
}

function defaultPlatform() {
  const day = todayISO();
  return {
    version: 1,
    pristine: true,
    revision: 1,
    academy: {
      students: [
        { id: "stu_seed_sara", n: "سارة أحمد", s: "G3", phone: "", startDate: "", endDate: "", renewalDate: "", fees: 0, paidAmount: 0, remainingAmount: 0 },
        { id: "stu_seed_omar", n: "Omar Ali", s: "KG2", phone: "", startDate: "", endDate: "", renewalDate: "", fees: 0, paidAmount: 0, remainingAmount: 0 }
      ],
      teachers: [
        { n: "أ. منى", s: "s_ar" },
        { n: "Mr. Adam", s: "s_en" }
      ],
      classes: [
        { n: "KG1 - A", s: "KG1" },
        { n: "Grade 5 - B", s: "G5" }
      ],
      zoomLink: ""
    },
    portal: {
      version: 1,
      settings: { academyName: "أكاديمية ركن وجد", welcomeNote: "تعلّم • انمُ • تألّق", zoomLink: "" },
      zoomLinks: { teacher: "" },
      classes: [
        { id: "cls-3a", name: "الصف الثالث أ", teacherUsername: "teacher" },
        { id: "cls-5b", name: "الصف الخامس ب", teacherUsername: "teacher" }
      ],
      students: [
        { id: "stu-layan", name: "ليان أحمد", classId: "cls-3a", parentUsername: "parent", phone: "", startDate: "", endDate: "", renewalDate: "", fees: 0, paidAmount: 0, remainingAmount: 0 },
        { id: "stu-youssef", name: "يوسف أحمد", classId: "cls-5b", parentUsername: "parent", phone: "", startDate: "", endDate: "", renewalDate: "", fees: 0, paidAmount: 0, remainingAmount: 0 },
        { id: "stu-mira", name: "ميرا خالد", classId: "cls-3a", parentUsername: "", phone: "", startDate: "", endDate: "", renewalDate: "", fees: 0, paidAmount: 0, remainingAmount: 0 },
        { id: "stu-adam", name: "آدم سامي", classId: "cls-5b", parentUsername: "", phone: "", startDate: "", endDate: "", renewalDate: "", fees: 0, paidAmount: 0, remainingAmount: 0 }
      ],
      grades: [
        { id: "grd-1", studentId: "stu-layan", subject: "اللغة العربية", score: 92, updatedAt: day },
        { id: "grd-2", studentId: "stu-layan", subject: "الرياضيات", score: 88, updatedAt: day },
        { id: "grd-3", studentId: "stu-youssef", subject: "اللغة الإنجليزية", score: 85, updatedAt: day },
        { id: "grd-4", studentId: "stu-youssef", subject: "العلوم", score: 90, updatedAt: day }
      ],
      attendance: [],
      announcements: [
        { id: "ann-1", title: "أهلاً بكم في البوابة", body: "يمكن للمعلم رصد الدرجات والحضور، ولولي الأمر متابعة التقارير من هنا.", audience: "all", date: day }
      ],
      schedule: [
        { id: "sch-1", classId: "cls-3a", time: "08:00", subject: "اللغة العربية" },
        { id: "sch-2", classId: "cls-5b", time: "09:00", subject: "الرياضيات" }
      ]
    }
  };
}

function findUser(accounts, predicate) {
  return (accounts.users || []).find(predicate) || null;
}

function byLogin(accounts, key) {
  const typed = String(key || "").trim().toLowerCase();
  return findUser(accounts, function (user) {
    return String(user.username || "").trim().toLowerCase() === typed || String(user.email || "").trim().toLowerCase() === typed;
  });
}

function byName(accounts, name) {
  const typed = String(name || "").trim().toLowerCase();
  return findUser(accounts, function (user) {
    return String(user.username || "").trim().toLowerCase() === typed;
  });
}

function otherAdmins(accounts, exceptId) {
  return (accounts.users || []).filter(function (user) {
    return user.id !== exceptId && user.portalRole === "admin" && user.active !== false;
  }).length;
}

function issueSession(accounts, user) {
  const session = {
    token: crypto.randomBytes(32).toString("hex"),
    userId: user.id,
    exp: nowMs() + 8 * 60 * 60 * 1000,
    credVersion: Number(user.credVersion) || 1
  };
  accounts.sessions.push(session);
  return session;
}

function actorFrom(accounts, token) {
  if (!token) return null;
  const session = (accounts.sessions || []).find(function (item) { return item.token === token; });
  if (!session || Number(session.exp) < nowMs()) return null;
  const user = findUser(accounts, function (item) { return item.id === session.userId; });
  if (!user || user.active === false) return null;
  if (Number(user.credVersion) !== Number(session.credVersion)) return null;
  return { user: user, session: session };
}

function dropSessions(accounts, userId) {
  accounts.sessions = (accounts.sessions || []).filter(function (item) { return item.userId !== userId; });
}

function bearer(headers, body) {
  const raw = headers.authorization || headers.Authorization || "";
  if (String(raw).indexOf("Bearer ") === 0) return String(raw).slice(7).trim();
  if (body && body.token) return String(body.token);
  return "";
}

function portalPasswordError(password) {
  const text = String(password || "");
  if (text.length < 8 || text.length > 72) return "كلمة المرور يجب أن تكون من 8 إلى 72 حرفاً.";
  if (!/[A-Za-z\u0600-\u06FF]/.test(text) || !/\d/.test(text)) return "استخدم حروفاً وأرقاماً معاً في كلمة المرور.";
  return "";
}

function applyPlatformPatch(actor, current, patch) {
  const next = clone(current);
  const role = actor.portalRole;
  if (role === "admin") {
    if (patch.academy) next.academy = patch.academy;
    if (patch.portal) next.portal = patch.portal;
  } else if (role === "supervisor") {
    if (patch.academy && Array.isArray(patch.academy.students)) {
      if (patch.academy.students.length < (current.academy.students || []).length) {
        return { error: "حذف الطلاب متاح للمدير فقط." };
      }
      next.academy = clone(current.academy);
      next.academy.students = patch.academy.students;
    }
    if (patch.portal && Array.isArray(patch.portal.students)) {
      if (patch.portal.students.length < (current.portal.students || []).length) {
        return { error: "حذف الطلاب متاح للمدير فقط." };
      }
      next.portal.students = patch.portal.students;
    }
  } else if (role === "teacher") {
    if (!patch.portal) return { error: MSG_FORBIDDEN };
    if (Array.isArray(patch.portal.grades)) next.portal.grades = patch.portal.grades;
    if (Array.isArray(patch.portal.attendance)) next.portal.attendance = patch.portal.attendance;
    const ownLink = patch.portal.zoomLinks && patch.portal.zoomLinks[actor.username];
    if (ownLink) {
      if (!next.portal.zoomLinks) next.portal.zoomLinks = {};
      next.portal.zoomLinks[actor.username] = String(ownLink);
      if (!next.portal.settings) next.portal.settings = {};
      next.portal.settings.zoomLink = String(ownLink);
      next.academy.zoomLink = String(ownLink);
    }
  } else {
    return { error: MSG_FORBIDDEN };
  }
  if (next.portal && next.portal.settings && next.portal.settings.zoomLink) {
    next.academy.zoomLink = next.portal.settings.zoomLink;
  }
  if (next.academy && next.academy.zoomLink && next.portal && next.portal.settings) {
    next.portal.settings.zoomLink = next.academy.zoomLink;
  }
  next.pristine = false;
  next.revision = Number(current.revision || 1) + 1;
  return { value: next };
}

function loginResult(accounts, body) {
  const found = byLogin(accounts, body.username);
  const expected = found ? String(found.password) : "portal-dummy-password";
  const typed = String(body.password || "").trim();
  const matches = sameSecret(typed, expected);
  if (!found || !matches) return { status: 401, body: { ok: false, message: MSG_BAD_LOGIN } };
  if (found.active === false) return { status: 401, body: { ok: false, message: MSG_INACTIVE } };
  return { status: 200, user: found };
}

async function handleRequest(request, store) {
  const method = String(request.method || "GET").toUpperCase();
  const path = String(request.path || "");
  const body = request.body && typeof request.body === "object" ? request.body : {};
  const headers = request.headers || {};

  let accounts = await store.read("accounts");
  if (!accounts || !Array.isArray(accounts.users)) accounts = defaultAccounts();
  if (!Array.isArray(accounts.sessions)) accounts.sessions = [];

  let platform = await store.read("platform");
  if (!platform || !platform.academy || !platform.portal) platform = defaultPlatform();

  async function saveAccounts() {
    await store.write("accounts", accounts);
  }
  async function savePlatform(next) {
    platform = next;
    await store.write("platform", platform);
  }

  const token = bearer(headers, body);
  const session = actorFrom(accounts, token);
  const actor = session ? session.user : null;

  if (path === "/api/auth/status" && method === "GET") {
    return { status: 200, body: { ok: true, pristine: accounts.pristine === true } };
  }
  if (path === "/api/auth/migrate" && method === "POST") {
    if (accounts.pristine !== true) return { status: 200, body: { ok: true, imported: false, pristine: false } };
    const incoming = Array.isArray(body.users) ? body.users : [];
    const factory = incoming.length === 3 && incoming.every(function (item) {
      const name = String(item.username || "").toLowerCase();
      const expected = { mohamed: "112233", teacher: "teacher123", parent: "parent123" };
      return expected[name] && expected[name] === String(item.password || "");
    });
    if (!incoming.length || factory) return { status: 200, body: { ok: true, imported: false, pristine: true } };
    const fresh = [];
    const seen = {};
    incoming.forEach(function (item) {
      const name = String(item.username || "").trim();
      const pass = String(item.password || "").trim();
      const key = name.toLowerCase();
      if (!name || !pass || seen[key]) return;
      seen[key] = true;
      fresh.push(makeAccount(name, pass, item.role));
    });
    if (!fresh.length) return { status: 400, body: { ok: false, message: MSG_NEED } };
    accounts.users = fresh;
    accounts.sessions = [];
    accounts.pristine = false;
    await saveAccounts();
    return { status: 200, body: { ok: true, imported: true, pristine: false } };
  }
  if ((path === "/api/auth/check" || path === "/api/auth/login") && method === "POST") {
    const result = loginResult(accounts, body);
    if (!result.user) return result;
    if (path === "/api/auth/check") return { status: 200, body: { ok: true, user: publicUser(result.user) } };
    const created = issueSession(accounts, result.user);
    await saveAccounts();
    return { status: 200, body: { ok: true, token: created.token, exp: created.exp, user: publicUser(result.user) } };
  }
  if (path === "/api/auth/verify" && method === "POST") {
    if (!actor || !session) return { status: 401, body: { ok: false, message: MSG_BAD_LOGIN } };
    return { status: 200, body: { ok: true, exp: session.session.exp, user: publicUser(actor) } };
  }
  if (path === "/api/auth/logout" && method === "POST") {
    accounts.sessions = (accounts.sessions || []).filter(function (item) { return item.token !== token; });
    await saveAccounts();
    return { status: 200, body: { ok: true } };
  }
  if (path === "/api/auth/register" && method === "POST") {
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = body.role === "teacher" || body.role === "parent" ? body.role : "";
    if (name.length < 2 || name.length > 60 || /[<>]/.test(name)) {
      return { status: 400, body: { ok: false, message: "اكتب الاسم الكامل من حرفين إلى 60 حرفاً." } };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 80) {
      return { status: 400, body: { ok: false, message: "اكتب بريداً إلكترونياً صالحاً." } };
    }
    const pwError = portalPasswordError(password);
    if (pwError) return { status: 400, body: { ok: false, message: pwError } };
    if (!role) return { status: 400, body: { ok: false, message: "اختر دور المعلم أو ولي الأمر. حساب المدير لا يُنشأ من التسجيل." } };
    if (findUser(accounts, function (user) { return user.email === email; })) {
      return { status: 409, body: { ok: false, message: "هذا البريد مسجّل بالفعل. جرّب تسجيل الدخول." } };
    }
    let base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (base.length < 3) base = "user";
    base = base.slice(0, 20);
    let username = base;
    let n = 2;
    while (byName(accounts, username)) {
      username = (base + n).slice(0, 24);
      n += 1;
    }
    accounts.users.push(makeAccount(username, password, roleLabel(role), name, email));
    accounts.pristine = false;
    await saveAccounts();
    return { status: 200, body: { ok: true, username: username, message: "تم إنشاء الحساب. ادخل بالبريد أو باسم المستخدم: " + username } };
  }

  if (path === "/api/data/public" && method === "GET") {
    const link = (platform.academy && platform.academy.zoomLink) || (platform.portal.settings && platform.portal.settings.zoomLink) || "";
    return { status: 200, body: { ok: true, zoomLink: link, revision: platform.revision || 1 } };
  }
  if (path === "/api/data/revision" && method === "GET") {
    if (!actor) return { status: 401, body: { ok: false, message: MSG_BAD_LOGIN } };
    return { status: 200, body: { ok: true, revision: platform.revision || 1 } };
  }

  if (path.indexOf("/api/auth/") === 0 || path.indexOf("/api/data") === 0) {
    if (!actor) return { status: 401, body: { ok: false, message: MSG_BAD_LOGIN } };
  }

  if (path === "/api/data" && method === "GET") {
    return {
      status: 200,
      body: {
        ok: true,
        pristine: platform.pristine === true,
        revision: platform.revision || 1,
        academy: platform.academy,
        portal: platform.portal
      }
    };
  }
  if (path === "/api/data/migrate" && method === "POST") {
    if (actor.portalRole !== "admin") return { status: 403, body: { ok: false, message: MSG_ADMIN_ONLY } };
    if (platform.pristine !== true) return { status: 200, body: { ok: true, imported: false, pristine: false, revision: platform.revision } };
    const next = clone(platform);
    if (body.academy && Array.isArray(body.academy.students)) next.academy = body.academy;
    if (body.portal && Array.isArray(body.portal.students)) next.portal = body.portal;
    next.pristine = false;
    next.revision = Number(platform.revision || 1) + 1;
    await savePlatform(next);
    return { status: 200, body: { ok: true, imported: true, pristine: false, revision: next.revision, academy: next.academy, portal: next.portal } };
  }
  if (path === "/api/data" && (method === "PUT" || method === "POST")) {
    const applied = applyPlatformPatch(actor, platform, body);
    if (applied.error) return { status: 403, body: { ok: false, message: applied.error } };
    await savePlatform(applied.value);
    return { status: 200, body: { ok: true, message: MSG_SAVED, revision: applied.value.revision, academy: applied.value.academy, portal: applied.value.portal } };
  }

  if (actor.portalRole !== "admin") return { status: 403, body: { ok: false, message: MSG_ADMIN_ONLY } };

  if (path === "/api/auth/directory" && method === "GET") {
    return { status: 200, body: { ok: true, users: accounts.users.map(portalUser) } };
  }
  if (path === "/api/auth/users" && method === "GET") {
    return { status: 200, body: { ok: true, users: accounts.users.map(function (user) { return publicUser(user, true); }) } };
  }
  if (path === "/api/auth/users" && method === "POST") {
    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();
    const role = normalizeRole(body.role) || ROLE_TEACHER;
    if (!username || !password || password.length > 72) return { status: 400, body: { ok: false, message: MSG_NEED } };
    if (byName(accounts, username)) return { status: 409, body: { ok: false, message: MSG_DUPLICATE } };
    accounts.users.push(makeAccount(username, password, role));
    accounts.pristine = false;
    await saveAccounts();
    return { status: 200, body: { ok: true, message: "تمت إضافة المستخدم في قاعدة الحسابات." } };
  }
  if (path === "/api/auth/users/update" && method === "POST") {
    const target = byName(accounts, body.oldUsername);
    if (!target) return { status: 404, body: { ok: false, message: MSG_MISSING } };
    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();
    const role = normalizeRole(body.role) || ROLE_TEACHER;
    if (!username || !password) return { status: 400, body: { ok: false, message: MSG_NEED } };
    const other = byName(accounts, username);
    if (other && other.id !== target.id) return { status: 409, body: { ok: false, message: MSG_DUPLICATE } };
    const nextPortal = portalRole(role);
    if (target.portalRole === "admin" && nextPortal !== "admin" && otherAdmins(accounts, target.id) === 0) {
      return { status: 400, body: { ok: false, message: "أبقِ مديراً نشطاً واحداً على الأقل." } };
    }
    const passwordChanged = !sameSecret(String(target.password), password);
    target.username = username;
    target.password = password;
    target.role = role;
    target.portalRole = nextPortal;
    target.name = displayName(username, role);
    if (String(target.email || "").endsWith("@rokn-wajd.example")) target.email = username.toLowerCase() + "@rokn-wajd.example";
    const payload = { ok: true, message: "تم حفظ كلمة المرور في قاعدة الحسابات.", user: publicUser(target) };
    if (passwordChanged) {
      target.credVersion = Number(target.credVersion || 1) + 1;
      dropSessions(accounts, target.id);
      if (actor.id === target.id) {
        const created = issueSession(accounts, target);
        payload.token = created.token;
        payload.exp = created.exp;
        payload.user = publicUser(target);
      }
    }
    accounts.pristine = false;
    await saveAccounts();
    return { status: 200, body: payload };
  }
  if (path === "/api/auth/users/delete" && method === "POST") {
    const target = body.id ? findUser(accounts, function (user) { return user.id === body.id; }) : byName(accounts, body.username);
    if (!target) return { status: 404, body: { ok: false, message: MSG_MISSING } };
    if (String(target.username).toLowerCase() === "mohamed") return { status: 400, body: { ok: false, message: "لا يمكن حذف حساب المدير الأساسي." } };
    if (target.id === actor.id) return { status: 400, body: { ok: false, message: "لا يمكن حذف الحساب الذي تستخدمه الآن." } };
    if (target.portalRole === "admin" && otherAdmins(accounts, target.id) === 0) {
      return { status: 400, body: { ok: false, message: "لا يمكن حذف آخر مدير نشط." } };
    }
    dropSessions(accounts, target.id);
    accounts.users = accounts.users.filter(function (user) { return user.id !== target.id; });
    accounts.pristine = false;
    await saveAccounts();
    return { status: 200, body: { ok: true, message: "تم حذف المستخدم من قاعدة الحسابات.", username: target.username } };
  }
  if (path === "/api/auth/password" && method === "POST") {
    const target = findUser(accounts, function (user) { return user.id === body.id; });
    if (!target) return { status: 404, body: { ok: false, message: MSG_MISSING } };
    const pwError = portalPasswordError(body.password);
    if (pwError) return { status: 400, body: { ok: false, message: pwError } };
    target.password = String(body.password);
    target.credVersion = Number(target.credVersion || 1) + 1;
    dropSessions(accounts, target.id);
    const payload = { ok: true, message: "تم حفظ كلمة المرور في قاعدة الحسابات.", user: publicUser(target) };
    if (actor.id === target.id) {
      const created = issueSession(accounts, target);
      payload.token = created.token;
      payload.exp = created.exp;
      payload.user = publicUser(target);
    }
    accounts.pristine = false;
    await saveAccounts();
    return { status: 200, body: payload };
  }
  if (path === "/api/auth/active" && method === "POST") {
    const target = findUser(accounts, function (user) { return user.id === body.id; });
    if (!target) return { status: 404, body: { ok: false, message: MSG_MISSING } };
    const active = body.active === true;
    if (!active && target.id === actor.id) return { status: 400, body: { ok: false, message: "لا يمكن إيقاف حسابك الحالي." } };
    if (!active && target.portalRole === "admin" && otherAdmins(accounts, target.id) === 0) {
      return { status: 400, body: { ok: false, message: "أبقِ مديراً نشطاً واحداً على الأقل." } };
    }
    target.active = active;
    if (!active) dropSessions(accounts, target.id);
    await saveAccounts();
    return { status: 200, body: { ok: true, message: active ? "تم تفعيل الحساب." : "تم إيقاف الحساب." } };
  }

  return { status: 404, body: { ok: false, message: MSG_OFFLINE } };
}

function memoryStore() {
  const box = { accounts: null, platform: null };
  let chain = Promise.resolve();
  function locked(work) {
    const run = chain.then(work, work);
    chain = run.then(function () {}, function () {});
    return run;
  }
  return {
    read: function (key) { return locked(function () { return box[key]; }); },
    write: function (key, value) { return locked(function () { box[key] = value; }); }
  };
}

module.exports = {
  handleRequest: handleRequest,
  memoryStore: memoryStore,
  defaultAccounts: defaultAccounts,
  defaultPlatform: defaultPlatform
};
