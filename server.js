"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { handleRequest } = require("./lib/api");

const root = __dirname;
const dataDir = path.join(root, "data");
const port = Number(process.env.PORT) || 8080;
const files = {
  accounts: path.join(dataDir, "accounts.json"),
  platform: path.join(dataDir, "platform.json")
};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return null;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

let chain = Promise.resolve();
function locked(work) {
  const run = chain.then(work, work);
  chain = run.then(function () {}, function () {});
  return run;
}

const store = {
  read: function (key) {
    return locked(function () { return readJson(files[key]); });
  },
  write: function (key, value) {
    return locked(function () { writeJson(files[key], value); });
  }
};

function apiPath(urlPath) {
  const clean = decodeURIComponent(String(urlPath || "").split("?")[0]);
  const at = clean.indexOf("/api/");
  if (at >= 0) return clean.slice(at);
  return clean;
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on("data", function (chunk) {
      size += chunk.length;
      if (size > 2e6) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", function () {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (error) { reject(error); }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  const raw = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": raw.length
  });
  res.end(raw);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8"
};

function staticFile(urlPath) {
  let rel = decodeURIComponent(String(urlPath || "/").split("?")[0]);
  if (!rel || rel === "/") rel = "/index.html";
  rel = rel.replace(/^\/+/, "");
  if (rel.endsWith("/")) rel += "index.html";
  const full = path.resolve(root, rel);
  const rootFull = path.resolve(root);
  const dataFull = path.resolve(dataDir);
  if (!full.startsWith(rootFull)) return null;
  if (full.startsWith(dataFull)) return null;
  if (full.startsWith(path.resolve(root, "lib"))) return null;
  if (full.startsWith(path.resolve(root, "node_modules"))) return null;
  if (!fs.existsSync(full)) {
    const index = path.join(full, "index.html");
    if (fs.existsSync(index)) return index;
    return null;
  }
  if (fs.statSync(full).isDirectory()) {
    const index = path.join(full, "index.html");
    return fs.existsSync(index) ? index : null;
  }
  return full;
}

const server = http.createServer(async function (req, res) {
  try {
    const urlPath = req.url || "/";
    if (apiPath(urlPath).indexOf("/api/") === 0) {
      const body = req.method === "GET" || req.method === "HEAD" ? {} : await readBody(req);
      const result = await handleRequest({
        method: req.method,
        path: apiPath(urlPath),
        headers: req.headers,
        body: body
      }, store);
      sendJson(res, result.status, result.body);
      return;
    }
    const file = staticFile(urlPath);
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const bytes = fs.readFileSync(file);
    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Length": bytes.length
    });
    res.end(bytes);
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "تعذر حفظ البيانات في قاعدة البيانات المركزية. لم يُقبل التغيير." });
  }
});

if (process.argv.indexOf("--selftest") !== -1) {
  const { memoryStore } = require("./lib/api");
  const mem = memoryStore();
  (async function () {
    const login = await handleRequest({ method: "POST", path: "/api/auth/login", headers: {}, body: { username: "mohamed", password: "112233" } }, mem);
    if (!login.body.ok) throw new Error("login failed");
    const saved = await handleRequest({
      method: "PUT",
      path: "/api/data",
      headers: { authorization: "Bearer " + login.body.token },
      body: {
        academy: {
          students: [{ id: "s1", n: "طالب جديد", s: "G1", phone: "0500000000", startDate: "2026-01-01", endDate: "2026-06-01", renewalDate: "2026-06-01", fees: 100, paidAmount: 40, remainingAmount: 60 }],
          teachers: [],
          classes: [],
          zoomLink: "https://zoom.us/j/123"
        }
      }
    }, mem);
    if (!saved.body.ok) throw new Error("save failed");
    const login2 = await handleRequest({ method: "POST", path: "/api/auth/login", headers: {}, body: { username: "teacher", password: "teacher123" } }, mem);
    const seen = await handleRequest({ method: "GET", path: "/api/data", headers: { authorization: "Bearer " + login2.body.token }, body: {} }, mem);
    if (!seen.body.academy.students.some(function (student) { return student.n === "طالب جديد"; })) throw new Error("second client missed the student");
    const wiped = await handleRequest({
      method: "PUT",
      path: "/api/data",
      headers: { authorization: "Bearer " + login2.body.token },
      body: { academy: { students: [], teachers: [], classes: [], zoomLink: "" } }
    }, mem);
    if (wiped.body.ok) throw new Error("teacher was allowed to wipe students");
    const again = await handleRequest({ method: "GET", path: "/api/data", headers: { authorization: "Bearer " + login.body.token }, body: {} }, mem);
    if (!again.body.academy.students.length) throw new Error("student record was lost");
    console.log("selftest-ok");
  })().catch(function (error) {
    console.error(error);
    process.exit(1);
  });
} else {
  server.listen(port, "0.0.0.0", function () {
    console.log("");
    console.log("Rokn Wajd shared records: data/accounts.json and data/platform.json");
    console.log("Open http://localhost:" + port + "/");
    console.log("Phones on the same network can use this computer's address on port " + port + ".");
    console.log("The live site rokn-wagd.com uses the same API after a Netlify deploy.");
    console.log("");
  });
}
