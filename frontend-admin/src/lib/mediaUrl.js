import { MEDIA_BASE_URL } from "../constants/api";

const LOCAL_HOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i;

const trimTrailingSlash = (value) => (value || "").replace(/\/+$/, "");

export const normalizeMediaUrl = (value, mediaBase = MEDIA_BASE_URL) => {
  if (typeof value !== "string" || !value) return value;
  if (value.startsWith("data:") || value.startsWith("blob:")) return value;

  const base = trimTrailingSlash(mediaBase);
  if (!base) return value;

  if (LOCAL_HOST_RE.test(value)) {
    try {
      const parsed = new URL(value);
      let pathname = parsed.pathname || "";
      if (pathname.startsWith("/api/uploads/")) {
        pathname = pathname.replace(/^\/api/, "");
      }
      return `${base}${pathname}${parsed.search || ""}`;
    } catch (_) {
      return value;
    }
  }

  if (value.startsWith("/api/uploads/")) {
    return `${base}${value.replace(/^\/api/, "")}`;
  }
  if (value.startsWith("/uploads/")) {
    return `${base}${value}`;
  }
  if (value.startsWith("uploads/")) {
    return `${base}/${value}`;
  }

  return value;
};

export const toMediaRelativePath = (value) => {
  if (typeof value !== "string" || !value) return value;

  if (value.startsWith("/api/uploads/")) return value.replace(/^\/api/, "");
  if (value.startsWith("/uploads/")) return value;
  if (value.startsWith("uploads/")) return `/${value}`;

  try {
    const parsed = new URL(value);
    let pathname = parsed.pathname || "";
    if (pathname.startsWith("/api/uploads/")) pathname = pathname.replace(/^\/api/, "");
    if (pathname.startsWith("/uploads/")) return pathname;
  } catch (_) {
    return value;
  }

  return value;
};

export const normalizeApiData = (input) => {
  if (Array.isArray(input)) return input.map(normalizeApiData);

  if (input && typeof input === "object") {
    const output = {};
    for (const [key, value] of Object.entries(input)) {
      output[key] = normalizeApiData(value);
    }
    return output;
  }

  if (typeof input === "string") {
    const shouldNormalize =
      LOCAL_HOST_RE.test(input) ||
      input.startsWith("/uploads/") ||
      input.startsWith("uploads/") ||
      input.startsWith("/api/uploads/");
    return shouldNormalize ? normalizeMediaUrl(input) : input;
  }

  return input;
};
