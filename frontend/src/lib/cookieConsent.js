export const COOKIE_CONSENT_KEY = "uav_cookie_consent_v1";

export const DEFAULT_COOKIE_PREFERENCES = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const normalizeCookiePreferences = (input) => ({
  necessary: true,
  analytics: !!input?.analytics,
  marketing: !!input?.marketing,
});

export const readCookieConsent = () => {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      ...normalizeCookiePreferences(parsed),
      acceptedAt: parsed.acceptedAt || null,
    };
  } catch (_) {
    return null;
  }
};

export const writeCookieConsent = (preferences) => {
  const normalized = normalizeCookiePreferences(preferences);
  const payload = {
    ...normalized,
    acceptedAt: new Date().toISOString(),
  };

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
  return payload;
};
