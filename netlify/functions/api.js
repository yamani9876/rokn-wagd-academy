"use strict";

const { getStore } = require("@netlify/blobs");
const { handleRequest } = require("../../lib/api");

function apiPath(event) {
  const raw = String((event && (event.path || event.rawUrl)) || "");
  const apiAt = raw.indexOf("/api/");
  if (apiAt >= 0) return raw.slice(apiAt).split("?")[0];
  const marker = "/.netlify/functions/api";
  const fnAt = raw.indexOf(marker);
  if (fnAt >= 0) return ("/api" + raw.slice(fnAt + marker.length)).split("?")[0];
  return raw.split("?")[0];
}

exports.handler = async function (event) {
  try {
    const blobs = getStore("rokn-wagd");
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
    return {
      statusCode: result.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(result.body)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: false, message: "تعذر الاتصال بقاعدة البيانات المركزية. لم يُحفظ التغيير على هذا الجهاز." })
    };
  }
};
