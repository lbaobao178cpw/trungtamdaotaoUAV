import { useEffect } from "react";
import { useCookieConsent } from "../../contexts/CookieConsentContext";

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

const ensureGtag = () => {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
};

const ensureAnalyticsScript = () => {
  const existing = document.querySelector('script[data-cookie-analytics="ga"]');
  if (existing) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  script.dataset.cookieAnalytics = "ga";
  document.head.appendChild(script);
};

export default function ConsentAnalyticsBridge() {
  const { preferences } = useCookieConsent();

  useEffect(() => {
    if (!GA_ID) return;

    ensureGtag();

    if (preferences.analytics) {
      ensureAnalyticsScript();
      window.gtag("consent", "update", {
        analytics_storage: "granted",
      });
      window.gtag("js", new Date());
      window.gtag("config", GA_ID, { anonymize_ip: true });
      return;
    }

    window.gtag("consent", "update", {
      analytics_storage: "denied",
    });
  }, [preferences.analytics]);

  return null;
}
