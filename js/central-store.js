/*
 * Shared academy records. The browser keeps a session only.
 * Students, fees, classes, grades, and Zoom links are read and written
 * through /api/data on the central server.
 */
(function () {
  var SESSION_KEY = "rw_central_session_v1";
  var OFFLINE = "تعذر الاتصال بقاعدة البيانات المركزية. لم يُحفظ التغيير على هذا الجهاز. افتح الموقع من الخادم (start-server.bat أو rokn-wagd.com بعد نشر Netlify).";
  var revision = 0;
  var saving = 0;
  var watcher = 0;

  function bearer() {
    try {
      var saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (saved && saved.token && saved.exp > Date.now()) return saved.token;
    } catch (error) { /* ignore */ }
    return "";
  }

  function request(path, method, body, auth) {
    var headers = { "Content-Type": "application/json" };
    if (auth !== false) {
      var token = bearer();
      if (token) headers.Authorization = "Bearer " + token;
    }
    var opts = { method: method || "GET", headers: headers };
    if (body) opts.body = JSON.stringify(body);
    return fetch(path, opts).then(function (res) {
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

  function remember(result) {
    if (result && result.ok && result.revision) revision = result.revision;
    return result;
  }

  function localJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (error) {
      return null;
    }
  }

  function academyIsCustom(raw) {
    if (!raw || !Array.isArray(raw.students)) return false;
    if (raw.zoomLink) return true;
    if (raw.students.length !== 2) return true;
    return raw.students.some(function (student) {
      return student.phone || student.startDate || Number(student.fees) > 0 || Number(student.paidAmount) > 0;
    });
  }

  function portalIsCustom(raw) {
    if (!raw || !Array.isArray(raw.students)) return false;
    if (raw.students.length !== 4) return true;
    if (raw.students.some(function (student) { return student.phone || student.startDate || Number(student.fees) > 0; })) return true;
    if (!Array.isArray(raw.grades) || raw.grades.length !== 4) return true;
    var scores = raw.grades.map(function (item) { return Number(item.score); }).sort().join(",");
    return scores !== "85,88,90,92";
  }

  function clearLocalRecords() {
    try {
      localStorage.removeItem("rw_academy_db_v1");
      localStorage.removeItem("rw_data_v1");
      localStorage.removeItem("rw_zoom_link");
      var keys = [];
      for (var i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
      keys.forEach(function (key) {
        if (key && key.indexOf("rw_zoom_link_") === 0) localStorage.removeItem(key);
      });
    } catch (error) { /* ignore */ }
  }

  function adopt(result) {
    if (result && result.ok && result.pristine === false) clearLocalRecords();
    if (result && result.ok && result.imported) clearLocalRecords();
    return remember(result);
  }

  function load() {
    return request("/api/data", "GET").then(function (result) {
      if (!result || !result.ok) return result || { ok: false, offline: true, message: OFFLINE };
      revision = result.revision || revision;
      if (result.pristine === false) clearLocalRecords();
      var academy = localJson("rw_academy_db_v1");
      var zoom = "";
      try { zoom = localStorage.getItem("rw_zoom_link") || ""; } catch (error) { zoom = ""; }
      if (zoom && academy && typeof academy === "object") academy.zoomLink = zoom;
      var portal = localJson("rw_data_v1");
      var custom = academyIsCustom(academy) || portalIsCustom(portal) || !!zoom;
      if (result.pristine && custom) {
        var patch = {};
        if (academyIsCustom(academy) || zoom) {
          patch.academy = {
            students: academy && academy.students ? academy.students : result.academy.students,
            teachers: academy && academy.teachers ? academy.teachers : result.academy.teachers,
            classes: academy && academy.classes ? academy.classes : result.academy.classes,
            zoomLink: zoom || (academy && academy.zoomLink) || ""
          };
        }
        if (portalIsCustom(portal)) patch.portal = portal;
        return request("/api/data/migrate", "POST", patch).then(adopt);
      }
      return result;
    });
  }

  function save(patch) {
    saving += 1;
    return request("/api/data", "PUT", patch).then(function (result) {
      saving -= 1;
      if (!result || !result.ok) {
        return result || { ok: false, offline: true, message: OFFLINE };
      }
      clearLocalRecords();
      return remember(result);
    }).catch(function () {
      saving -= 1;
      return { ok: false, offline: true, message: OFFLINE };
    });
  }

  function watch(onChange) {
    if (watcher) return;
    watcher = window.setInterval(function () {
      if (saving || document.hidden || !bearer()) return;
      request("/api/data/revision", "GET").then(function (result) {
        if (!result || !result.ok || !result.revision || result.revision === revision) return;
        revision = result.revision;
        if (onChange) onChange();
      });
    }, 8000);
  }

  function publicZoom() {
    return request("/api/data/public", "GET", null, false);
  }

  window.RoknStore = {
    offlineMessage: function () { return OFFLINE; },
    load: load,
    save: save,
    watch: watch,
    publicZoom: publicZoom
  };
})();
