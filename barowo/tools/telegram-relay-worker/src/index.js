const LEAD_PREFIX = "/lead";

function buildCorsHeaders(request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}

function withCors(response, request) {
  const headers = new Headers(response.headers);
  const corsHeaders = buildCorsHeaders(request);

  Object.keys(corsHeaders).forEach((key) => {
    headers.set(key, corsHeaders[key]);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function jsonResponse(body, init = {}, request = null) {
  const response = new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });

  return request ? withCors(response, request) : response;
}

function isSecretValid(request, env) {
  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    return true;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === env.TELEGRAM_WEBHOOK_SECRET;
}

function getAppsScriptBaseUrl(env) {
  if (!env.APPS_SCRIPT_WEBHOOK_URL) {
    throw new Error("Missing APPS_SCRIPT_WEBHOOK_URL");
  }

  return env.APPS_SCRIPT_WEBHOOK_URL;
}

function buildAppsScriptUrl(env, params) {
  const url = new URL(getAppsScriptBaseUrl(env));

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function callAppsScriptJson(url, init = {}) {
  const response = await fetch(url, {
    method: init.method || "GET",
    headers: init.headers || {},
    body: init.body,
    redirect: "follow"
  });

  const responseText = await response.text();
  let json;

  try {
    json = JSON.parse(responseText);
  } catch (error) {
    throw new Error("Apps Script returned non-JSON response");
  }

  return {
    status: response.status,
    json
  };
}

async function callAppsScriptText(url, init = {}) {
  const response = await fetch(url, {
    method: init.method || "GET",
    headers: init.headers || {},
    body: init.body,
    redirect: "follow"
  });

  return {
    status: response.status,
    text: await response.text()
  };
}

async function forwardTelegramUpdateToAppsScript(update, env) {
  const form = new URLSearchParams();
  form.set("telegram_payload", JSON.stringify(update));
  form.set("relay_token", env.APPS_SCRIPT_RELAY_SECRET || "");

  const response = await callAppsScriptJson(getAppsScriptBaseUrl(env), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: form.toString()
  });

  if (response.status !== 200) {
    throw new Error("Apps Script forward failed: " + response.status);
  }

  if (!response.json || response.json.ok !== true) {
    throw new Error("Apps Script handler rejected update");
  }
}

function buildLeadRelayHtml(message, backUrl) {
  return "<!doctype html>" +
    "<html lang=\"pl\"><head>" +
    "<meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
    "<title>BAROWO</title>" +
    "<style>body{font-family:Arial,sans-serif;padding:24px;background:#06061a;color:#fff}a{color:#fff}</style>" +
    "</head><body>" +
    "<h1>BAROWO</h1>" +
    "<p>" + message + "</p>" +
    "<p><a href=\"" + backUrl + "\">Wróć do formularza</a></p>" +
    "</body></html>";
}

async function handleLeadRequest(request, env, url, ctx) {
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }), request);
  }

  if (request.method === "GET") {
    let upstreamStatus = 0;
    let upstreamHealthy = false;

    try {
      const upstream = await callAppsScriptText(getAppsScriptBaseUrl(env), {
        method: "GET"
      });
      upstreamStatus = upstream.status;
      upstreamHealthy = upstream.status >= 200 &&
        upstream.status < 400 &&
        upstream.text.includes("barowo-crm-gas");
    } catch (error) {
      upstreamStatus = 0;
      upstreamHealthy = false;
    }

    return jsonResponse({
      ok: true,
      service: "barowo-lead-relay",
      upstreamConfigured: !!env.APPS_SCRIPT_WEBHOOK_URL,
      upstreamHealthy,
      upstreamStatus
    }, {}, request);
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method Not Allowed" }, { status: 405 }, request);
  }

  const formData = await request.formData();
  const params = new URLSearchParams();
  let returnUrl = "https://barowo.com/#contact";

  formData.forEach((value, key) => {
    if (typeof value === "string") {
      params.set(key, value);
      if (key === "return_url" && value) {
        returnUrl = value;
      }
    }
  });

  params.set("response", "json");

  const wantsJson = url.searchParams.get("format") === "json" ||
    (request.headers.get("accept") || "").includes("application/json");

  const requestBody = params.toString();

  const forwardPromise = callAppsScriptText(getAppsScriptBaseUrl(env), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: requestBody
  }).then((upstream) => {
    let payload = null;
    try {
      payload = JSON.parse(upstream.text);
    } catch (error) {
      payload = null;
    }

    if (!payload || payload.ok !== true) {
      throw new Error("lead_forward_failed");
    }
  }).catch((error) => {
    console.error("lead_forward_failed", {
      message: error.message,
      path: url.pathname
    });
    throw error;
  });

  ctx.waitUntil(forwardPromise);

  const responseBody = {
    ok: true,
    status: "accepted",
    redirect_url: returnUrl
  };

  if (wantsJson) {
    return jsonResponse(responseBody, {}, request);
  }

  return withCors(Response.redirect(responseBody.redirect_url, 302), request);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === LEAD_PREFIX) {
      try {
        return await handleLeadRequest(request, env, url, ctx);
      } catch (error) {
        console.error("lead_request_failed", {
          message: error.message,
          path: url.pathname
        });
        return jsonResponse({ ok: false, error: "Lead relay unavailable" }, { status: 502 }, request);
      }
    }

    if (request.method === "GET") {
      return jsonResponse({
        ok: true,
        service: "barowo-telegram-relay",
        path: url.pathname
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method Not Allowed" }, { status: 405 });
    }

    if (!isSecretValid(request, env)) {
      return jsonResponse({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch (error) {
      return jsonResponse({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    ctx.waitUntil(
      forwardTelegramUpdateToAppsScript(update, env).catch((error) => {
        console.error("forward_to_apps_script_failed", {
          message: error.message,
          updateId: update && typeof update.update_id === "number" ? update.update_id : null
        });
      })
    );

    return jsonResponse({ ok: true, accepted: true });
  }
};
