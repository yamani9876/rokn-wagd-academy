"use strict";

function lowerHeaders(source) {
  const headers = {};
  Object.keys(source || {}).forEach(function (key) {
    const value = source[key];
    headers[String(key).toLowerCase()] = Array.isArray(value) ? value[0] : value;
  });
  return headers;
}

function decodeBlobs(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(Buffer.from(String(raw), "base64").toString("utf8"));
  } catch (error) {
    return null;
  }
}

function applyBlobsContext(lib, event) {
  const headers = lowerHeaders(event && event.headers);
  const raw = event && event.blobs;
  const decoded = decodeBlobs(raw);
  const siteID = headers["x-nf-site-id"] || process.env.SITE_ID || process.env.NETLIFY_SITE_ID || (decoded && decoded.siteID) || "";
  const token = (decoded && decoded.token) || "";
  const edgeURL = decoded && (decoded.url || decoded.edgeURL);
  const deployID = headers["x-nf-deploy-id"] || "";
  if (typeof raw === "string" && raw && lib.connectLambda) {
    try {
      lib.connectLambda({ blobs: raw, headers: headers });
    } catch (error) {
      /* setEnvironmentContext below still applies a decoded token. */
    }
  }
  if (siteID && token && lib.setEnvironmentContext) {
    const context = { siteID: siteID, token: token };
    if (edgeURL) context.edgeURL = edgeURL;
    if (deployID) context.deployID = deployID;
    lib.setEnvironmentContext(context);
  }
  return { siteID: siteID, token: token, blobs: raw ? "present" : "missing" };
}

function openStore(lib, event) {
  try {
    return lib.getStore("rokn-wagd");
  } catch (first) {
    let meta = { siteID: "", token: "", blobs: "missing" };
    try {
      meta = applyBlobsContext(lib, event);
      return lib.getStore("rokn-wagd");
    } catch (second) {
      const reason = (second && second.message) || (first && first.message) || "getStore failed";
      throw new Error(
        reason
        + " | siteID=" + (meta.siteID || "missing")
        + " | token=" + (meta.token ? "present" : "missing")
        + " | blobs=" + meta.blobs
        + " | env=" + (process.env.NETLIFY_BLOBS_CONTEXT ? "present" : "missing")
      );
    }
  }
}

function apiPath(event) {
  const raw = String((event && (event.path || event.rawUrl)) || "");
  const apiAt = raw.indexOf("/api/");
  if (apiAt >= 0) return raw.slice(apiAt).split("?")[0];
  const marker = "/.netlify/functions/api";
  const fnAt = raw.indexOf(marker);
  if (fnAt >= 0) return ("/api" + raw.slice(fnAt + marker.length)).split("?")[0];
  return raw.split("?")[0];
}

function jsonResult(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async function (event) {
  try {
    const lib = require("@netlify/blobs");
    const { handleRequest } = require("../../lib/api");
    const blobs = openStore(lib, event);
    const store = {
      read: async function (key) {
        return blobs.get(key, { type: "json" });
      },
      write: async function (key, value) {
        await blobs.setJSON(key, value);
      }
    };
    let body = {};
    if (event && event.body) {
      const text = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
      body = text ? JSON.parse(text) : {};
    }
    const result = await handleRequest({
      method: event && event.httpMethod,
      path: apiPath(event),
      headers: (event && event.headers) || {},
      body: body
    }, store);
    return jsonResult(result.status, result.body);
  } catch (error) {
    const detail = error && error.message ? String(error.message) : String(error);
    return jsonResult(500, { ok: false, message: detail, error: detail });
  }
};
