"use strict";

const { connectLambda, getStore } = require("@netlify/blobs");
const { handleRequest } = require("../../lib/api");

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

function blobPayload(raw) {
  const decoded = decodeBlobs(raw);
  if (!decoded || !decoded.token) return typeof raw === "string" ? raw : "";
  return Buffer.from(JSON.stringify({
    url: decoded.url || decoded.edgeURL || "",
    token: decoded.token
  })).toString("base64");
}

function openStore(event) {
  const headers = lowerHeaders(event && event.headers);
  const payload = blobPayload(event && event.blobs);
  const decoded = decodeBlobs(event && event.blobs);
  const siteID = headers["x-nf-site-id"] || process.env.SITE_ID || process.env.NETLIFY_SITE_ID || (decoded && decoded.siteID) || "";
  const token = (decoded && decoded.token) || "";
  if (payload) {
    try {
      connectLambda({ blobs: payload, headers: headers });
    } catch (error) {
      /* The explicit siteID and token below cover a malformed lambda payload. */
    }
  }
  try {
    return getStore("rokn-wagd");
  } catch (error) {
    if (siteID && token) {
      const options = { name: "rokn-wagd", siteID: siteID, token: token };
      const edgeURL = decoded && (decoded.url || decoded.edgeURL);
      if (edgeURL) options.edgeURL = edgeURL;
      return getStore(options);
    }
    const detail = (error && error.message ? error.message : "getStore failed")
      + " (siteID=" + (siteID || "missing")
      + ", blobs=" + (payload ? "present" : "missing") + ")";
    const wrapped = new Error(detail);
    wrapped.name = error && error.name ? error.name : "Error";
    throw wrapped;
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
    const blobs = openStore(event);
    const store = {
      read: async function (key) {
        return blobs.get(key, { type: "json" });
      },
      write: async function (key, value) {
        await blobs.setJSON(key, value);
      }
    };
    let body = {};
    if (event.body) {
      const text = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
      body = text ? JSON.parse(text) : {};
    }
    const result = await handleRequest({
      method: event.httpMethod,
      path: apiPath(event),
      headers: event.headers || {},
      body: body
    }, store);
    return jsonResult(result.status, result.body);
  } catch (error) {
    const detail = error && error.message ? String(error.message) : "تعذر الاتصال بقاعدة البيانات المركزية.";
    return jsonResult(500, { ok: false, message: detail, error: detail });
  }
};
