import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCookieConsent } from "../../contexts/CookieConsentContext";
import { DEFAULT_COOKIE_PREFERENCES } from "../../lib/cookieConsent";
import "./CookieConsentBanner.css";

export default function CookieConsentBanner() {
  const { isBannerOpen, saveConsent } = useCookieConsent();

  const acceptNecessary = () => {
    saveConsent({ ...DEFAULT_COOKIE_PREFERENCES });
  };

  if (!isBannerOpen) {
    return null;
  }

  return (
    <div className="cookie-wrap" role="dialog" aria-live="polite" aria-label="Thông báo cookie">
      <div className="cookie-card">
        <div className="cookie-head">
          <h3>Trung Tâm UAV Sử Dụng Cookie</h3>
          <p>
            Chúng tôi chỉ sử dụng cookie cần thiết để duy trì đăng nhập, bảo mật phiên và đảm bảo website hoạt động ổn định.
          </p>
        </div>

        <div className="cookie-tags">
          <span className="cookie-tag">Cần thiết</span>
        </div>

        <p className="cookie-policy-link-wrap">
          Xem chi tiết tại <Link to="/chinh-sach-cookie">Chính sách Cookie</Link>
        </p>

        <p className="cookie-summary">Nhấn “Đồng ý” để tiếp tục sử dụng website.</p>

        <div className="cookie-actions">
          <button type="button" className="cookie-btn primary cookie-btn-single" onClick={acceptNecessary}>
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
