const BAROWO_MONITORING = Object.freeze({
  siteUrlDefault: "https://barowo.com/",
  formSelectorPattern: /<form[^>]+action="([^"]+)"[^>]*class="form"/i,
  leadHealthStateKey: "BAROWO_LEAD_FORM_HEALTH_STATE",
  leadHealthHashKey: "BAROWO_LEAD_FORM_HEALTH_HASH"
});

function getBarowoSiteUrl_() {
  return getScriptProperty_("BAROWO_PUBLIC_SITE_URL") || BAROWO_MONITORING.siteUrlDefault;
}

function runLeadFlowHealthCheckNow() {
  return monitorLeadFlowHealth_({ forceNotify: true });
}

function monitorLeadFlowHealth() {
  return monitorLeadFlowHealth_({ forceNotify: false });
}

function monitorLeadFlowHealth_(options) {
  const forceNotify = !!(options && options.forceNotify);
  const previousState = getScriptProperty_(BAROWO_MONITORING.leadHealthStateKey) || "unknown";
  const previousHash = getScriptProperty_(BAROWO_MONITORING.leadHealthHashKey) || "";
  const result = inspectLeadFlowHealth_();
  const props = PropertiesService.getScriptProperties();
  const currentHash = buildLeadHealthHash_(result);

  props.setProperty(BAROWO_MONITORING.leadHealthStateKey, result.ok ? "ok" : "error");
  props.setProperty(BAROWO_MONITORING.leadHealthHashKey, currentHash);

  appendLog_(
    result.ok ? "info" : "error",
    "lead_health",
    result.ok ? "lead flow healthy" : "lead flow unhealthy",
    result
  );

  if (!result.ok && (forceNotify || previousState !== "error" || previousHash !== currentHash)) {
    sendTelegramLeadHealthAlert_(result);
  }

  if (result.ok && previousState === "error") {
    sendTelegramLeadHealthRecovery_(result);
  }

  return result;
}

function inspectLeadFlowHealth_() {
  const siteUrl = getBarowoSiteUrl_();
  const config = getBarowoConfig_();
  const expectedAction = (config.leadPublicUrl || "").trim();

  if (!expectedAction) {
    return {
      ok: false,
      reason: "missing_public_lead_url",
      siteUrl: siteUrl,
      expectedAction: expectedAction
    };
  }

  const homepageResponse = UrlFetchApp.fetch(siteUrl, {
    method: "get",
    muteHttpExceptions: true,
    followRedirects: true
  });

  const homepageCode = homepageResponse.getResponseCode();
  const homepageHtml = homepageResponse.getContentText();
  const formAction = extractLeadFormAction_(homepageHtml);

  if (homepageCode < 200 || homepageCode >= 400) {
    return {
      ok: false,
      reason: "site_unreachable",
      siteUrl: siteUrl,
      homepageCode: homepageCode,
      expectedAction: expectedAction,
      actualAction: formAction
    };
  }

  if (!formAction) {
    return {
      ok: false,
      reason: "form_action_not_found",
      siteUrl: siteUrl,
      homepageCode: homepageCode,
      expectedAction: expectedAction
    };
  }

  if (normalizeUrlForCompare_(formAction) !== normalizeUrlForCompare_(expectedAction)) {
    return {
      ok: false,
      reason: "form_action_mismatch",
      siteUrl: siteUrl,
      homepageCode: homepageCode,
      expectedAction: expectedAction,
      actualAction: formAction
    };
  }

  const publicEndpointResponse = UrlFetchApp.fetch(formAction, {
    method: "get",
    muteHttpExceptions: true,
    followRedirects: true
  });
  const publicEndpointCode = publicEndpointResponse.getResponseCode();
  const publicEndpointBody = publicEndpointResponse.getContentText() || "";
  const publicEndpointPayload = tryParseJson_(publicEndpointBody);
  const publicEndpointHealthy = publicEndpointCode >= 200 &&
    publicEndpointCode < 400 &&
    publicEndpointPayload &&
    publicEndpointPayload.ok === true &&
    publicEndpointPayload.service === "barowo-lead-relay";

  if (!publicEndpointHealthy) {
    return {
      ok: false,
      reason: "public_endpoint_unhealthy",
      siteUrl: siteUrl,
      homepageCode: homepageCode,
      expectedAction: expectedAction,
      actualAction: formAction,
      publicEndpointCode: publicEndpointCode
    };
  }

  const endpointCode = Number(publicEndpointPayload.upstreamStatus || 0);
  const endpointHealthy = publicEndpointPayload.upstreamHealthy === true;

  if (!endpointHealthy) {
    return {
      ok: false,
      reason: "upstream_endpoint_unhealthy",
      siteUrl: siteUrl,
      homepageCode: homepageCode,
      expectedAction: expectedAction,
      actualAction: formAction,
      publicEndpointCode: publicEndpointCode,
      endpointCode: endpointCode
    };
  }

  return {
    ok: true,
    reason: "ok",
    siteUrl: siteUrl,
    homepageCode: homepageCode,
    expectedAction: expectedAction,
    actualAction: formAction,
    publicEndpointCode: publicEndpointCode,
    endpointCode: endpointCode
  };
}

function extractLeadFormAction_(html) {
  const match = (html || "").match(BAROWO_MONITORING.formSelectorPattern);
  return match ? match[1] : "";
}

function normalizeUrlForCompare_(value) {
  return (value || "")
    .toString()
    .trim()
    .replace(/\/+$/, "");
}

function tryParseJson_(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function buildLeadHealthHash_(result) {
  return [
    result.reason || "",
    result.siteUrl || "",
    result.expectedAction || "",
    result.actualAction || "",
    result.homepageCode || "",
    result.publicEndpointCode || "",
    result.endpointCode || ""
  ].join("|");
}

function sendTelegramLeadHealthAlert_(result) {
  const lines = [
    "🚨 <b>BAROWO lead form alert</b>",
    "",
    "CRM intake dla strony wygląda na uszkodzony.",
    "Powód: <b>" + escapeHtml_(result.reason || "unknown") + "</b>",
    "Site: " + escapeHtml_(result.siteUrl || ""),
    result.homepageCode ? "Homepage HTTP: <b>" + result.homepageCode + "</b>" : "",
    result.publicEndpointCode ? "Public lead URL HTTP: <b>" + result.publicEndpointCode + "</b>" : "",
    result.endpointCode ? "Endpoint HTTP: <b>" + result.endpointCode + "</b>" : "",
    result.expectedAction ? "Expected action:\n<code>" + escapeHtml_(result.expectedAction) + "</code>" : "",
    result.actualAction ? "Actual action:\n<code>" + escapeHtml_(result.actualAction) + "</code>" : ""
  ].filter(Boolean);

  send(CONFIG.GROUP_CHAT_ID, lines.join("\n"));
}

function sendTelegramLeadHealthRecovery_(result) {
  const lines = [
    "✅ <b>BAROWO lead form recovery</b>",
    "",
    "Monitoring potwierdził, że formularz znowu wskazuje na poprawny CRM endpoint.",
    "Site: " + escapeHtml_(result.siteUrl || ""),
    result.actualAction ? "Action:\n<code>" + escapeHtml_(result.actualAction) + "</code>" : ""
  ].filter(Boolean);

  send(CONFIG.GROUP_CHAT_ID, lines.join("\n"));
}
