import { MEDIA_BASE_URL } from "../config/apiConfig";
import { API_BASE_URL } from "../config/apiConfig";

export const normalizeMediaUrl = (url) => {
  if (!url || typeof url !== "string") return url;

  const trimmed = url.trim();

  if (/^https?:\/\/(localhost|127\.0\.0\.1):5000/i.test(trimmed)) {
    return trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1):5000/i, MEDIA_BASE_URL);
  }

  if (trimmed.startsWith("/uploads/")) {
    return `${MEDIA_BASE_URL}${trimmed}`;
  }

  if (trimmed.startsWith("uploads/")) {
    return `${MEDIA_BASE_URL}/${trimmed}`;
  }

  return trimmed;
};

export const getModelPreviewUrl = (url) => {
  const normalized = normalizeMediaUrl(url);
  if (!normalized || typeof normalized !== "string") return normalized;

  const uploadsMarker = "/uploads/";
  const idx = normalized.indexOf(uploadsMarker);
  if (idx === -1) {
    return normalized;
  }

  const relativePath = normalized.slice(idx + uploadsMarker.length);
  return `${API_BASE_URL}/files/raw?path=${encodeURIComponent(relativePath)}`;
};
