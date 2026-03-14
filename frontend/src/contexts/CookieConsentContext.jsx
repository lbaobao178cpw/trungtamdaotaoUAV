import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  DEFAULT_COOKIE_PREFERENCES,
  normalizeCookiePreferences,
  readCookieConsent,
  writeCookieConsent,
} from "../lib/cookieConsent";

const CookieConsentContext = createContext(null);

export function CookieConsentProvider({ children }) {
  const stored = readCookieConsent();

  const [consent, setConsent] = useState(stored);
  const [preferences, setPreferences] = useState(
    stored ? normalizeCookiePreferences(stored) : DEFAULT_COOKIE_PREFERENCES
  );
  const [isBannerOpen, setIsBannerOpen] = useState(!stored);

  const saveConsent = useCallback((nextPreferences) => {
    const saved = writeCookieConsent(nextPreferences);
    setConsent(saved);
    setPreferences(normalizeCookiePreferences(saved));
    setIsBannerOpen(false);
    return saved;
  }, []);

  const reopenBanner = useCallback(() => setIsBannerOpen(true), []);
  const closeBanner = useCallback(() => setIsBannerOpen(false), []);

  const value = useMemo(
    () => ({
      consent,
      preferences,
      isBannerOpen,
      setPreferences,
      saveConsent,
      reopenBanner,
      closeBanner,
    }),
    [consent, preferences, isBannerOpen, saveConsent, reopenBanner, closeBanner]
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used inside CookieConsentProvider");
  }
  return context;
}
