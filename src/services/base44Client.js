import { config } from "../config.js";

function assertBase44Configured() {
  if (!config.base44.apiBaseUrl || !config.base44.appId || !config.base44.apiKey) {
    throw new Error("Missing Base44 configuration");
  }
}

async function requestBase44(path, options = {}) {
  assertBase44Configured();

  const response = await fetch(`${config.base44.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      api_key: config.base44.apiKey,
      ...options.headers
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload?.message || payload?.error || "Base44 request failed";
    throw new Error(detail);
  }

  return payload;
}

function buildQuery({ q, limit, skip, sortBy } = {}) {
  const params = new URLSearchParams();

  if (q) params.set("q", JSON.stringify(q));
  if (limit) params.set("limit", String(limit));
  if (skip) params.set("skip", String(skip));
  if (sortBy) params.set("sort_by", sortBy);

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listEntity(entityName, options) {
  return requestBase44(`/entities/${entityName}${buildQuery(options)}`);
}

export async function createEntity(entityName, data) {
  return requestBase44(`/entities/${entityName}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateEntity(entityName, recordId, data) {
  return requestBase44(`/entities/${entityName}/${recordId}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}
