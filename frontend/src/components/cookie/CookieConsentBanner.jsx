import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCookieConsent } from "../../contexts/CookieConsentContext";
import { DEFAULT_COOKIE_PREFERENCES } from "../../lib/cookieConsent";
import "./CookieConsentBanner.css";

export default function CookieConsentBanner() {
  const {
    preferences,
    isBannerOpen,
    setPreferences,
    saveConsent,
    reopenBanner,
  } = useCookieConsent();
  const [showCustomize, setShowCustomize] = useState(false);

  const summaryText = useMemo(() => {
    if (!preferences.analytics && !preferences.marketing) {
      return "Ban dang dung che do cookie toi thieu.";
    }

    if (preferences.analytics && preferences.marketing) {
      return "Ban da cho phep day du cookie phan tich va tiep thi.";
    }

    if (preferences.analytics) {
      return "Ban da bat cookie phan tich.";
    }

    return "Ban da bat cookie tiep thi.";
  }, [preferences]);

  const acceptAll = () => {
    const allAccepted = { necessary: true, analytics: true, marketing: true };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
    setVisible(false);
    setShowCustomize(false);
  };

  const acceptNecessaryOnly = () => {
    const onlyNecessary = { ...DEFAULT_COOKIE_PREFERENCES };
    setPreferences(onlyNecessary);
    saveConsent(onlyNecessary);
    setShowCustomize(false);
  };

  const saveCustom = () => {
    saveConsent(preferences);
    setShowCustomize(false);
  };

  if (!isBannerOpen) {
    return (
      <button
        type="button"
        className="cookie-pill"
        onClick={reopenBanner}
        aria-label="Mo cai dat cookie"
      >
        Cookie settings
      </button>
    );
  }

  return (
    <div className="cookie-wrap" role="dialog" aria-live="polite" aria-label="Thong bao cookie">
      <div className="cookie-card">
        <div className="cookie-head">
          <h3>Trung tam UAV su dung cookie</h3>
          <p>
            Cookie giup trang hoat dong on dinh, do luong hieu qua noi dung va cai thien trai nghiem hoc vien.
          </p>
        </div>

        <div className="cookie-tags">
          <span className="cookie-tag">Can thiet</span>
          <span className="cookie-tag">Phan tich</span>
          <span className="cookie-tag">Tiep thi</span>
        </div>

        <p className="cookie-policy-link-wrap">
          Xem them tai <Link to="/chinh-sach-cookie">Chinh sach Cookie</Link>
        </p>

        {!showCustomize ? (
          <p className="cookie-summary">Ban co the chon nhanh hoac tuy chinh theo nhu cau.</p>
        ) : (
          <div className="cookie-customize">
            <label className="cookie-row cookie-row-lock">
              <span>
                <strong>Cookie can thiet</strong>
                <small>Bat buoc de dang nhap, bao mat va tai du lieu.</small>
              </span>
              <input type="checkbox" checked disabled />
            </label>

            <label className="cookie-row">
              <span>
                <strong>Cookie phan tich</strong>
                <small>Do luong hieu qua chuc nang va toi uu toc do trang.</small>
              </span>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) =>
                  setPreferences((prev) => ({ ...prev, analytics: e.target.checked }))
                }
              />
            </label>

            <label className="cookie-row">
              <span>
                <strong>Cookie tiep thi</strong>
                <small>Hien thi noi dung goi y phu hop voi nhu cau cua ban.</small>
              </span>
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) =>
                  setPreferences((prev) => ({ ...prev, marketing: e.target.checked }))
                }
              />
            </label>

            <p className="cookie-summary">{summaryText}</p>
          </div>
        )}

        <div className="cookie-actions">
          <button type="button" className="cookie-btn ghost" onClick={acceptNecessaryOnly}>
            Chi can thiet
          </button>

          {!showCustomize ? (
            <button type="button" className="cookie-btn subtle" onClick={() => setShowCustomize(true)}>
              Tuy chinh
            </button>
          ) : (
            <button type="button" className="cookie-btn subtle" onClick={saveCustom}>
              Luu tuy chinh
            </button>
          )}

          <button type="button" className="cookie-btn primary" onClick={acceptAll}>
            Cho phep tat ca
          </button>
        </div>
      </div>
    </div>
  );
}
