import React from 'react';
import '../admin/Admin/Admin.css';
import './Pointpreview.css';

/**
 * PointPreview Component - Preview điểm 3D trước khi lưu
 * Hiển thị tất cả thông tin của point với styling đẹp mắt
 */
export default function PointPreview({ formData }) {
  const displayXYZ = (val) => typeof val === "number" ? val.toFixed(3) : val || "---";

  return (
    <div className="point-preview-container">

      {/* Header */}
      <div className="preview-header-wrapper">
        <h2 className="preview-title">
          <span className="preview-icon"></span>
          Xem Trước Kết Quả
        </h2>
        <p className="preview-subtitle">
          Kiểm tra thông tin trước khi lưu
        </p>
      </div>

      <div className="preview-card">

        {/* Header với Logo và Tiêu đề */}
        <div className="preview-header">
          {formData.logoSrc && (
            <div className="preview-logo-wrapper">
              <img src={formData.logoSrc} alt="Logo" className="preview-logo" />
            </div>
          )}
          <div className="preview-header-text">
            <h3 className="preview-point-title">
              {formData.title || "Chưa có tiêu đề"}
            </h3>
            <p className="preview-point-id">
              <span className="preview-id-label">ID:</span>
              <span className="preview-id-value">{formData.id || "---"}</span>
            </p>
          </div>
        </div>

        {/* Ảnh chính */}
        {formData.imageSrc && (
          <div className="preview-image-wrapper">
            <img
              src={formData.imageSrc}
              alt="Main"
              className="preview-main-image"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Lead text */}
        {formData.lead && (
          <div className="preview-section">
            <div className="preview-lead-wrapper">
              <span className="preview-quote-icon"></span>
              <p className="preview-lead">{formData.lead}</p>
            </div>
          </div>
        )}

        {/* Description */}
        {formData.description && (
          <div className="preview-section">
            <h4 className="preview-section-title">
              <span className="preview-title-icon"></span>
              Mô tả chi tiết
            </h4>
            <div
              className="preview-html-content"
              dangerouslySetInnerHTML={{ __html: formData.description }}
            />
          </div>
        )}

        {/* Website */}
        {formData.website && formData.website !== "https://" && (
          <div className="preview-section">
            <div className="preview-info-row">
              <span className="preview-label">
                <span className="preview-label-icon"></span>
                Website:
              </span>
              <a
                href={formData.website}
                target="_blank"
                rel="noopener noreferrer"
                className="preview-link"
              >
                {formData.website}
              </a>
            </div>
          </div>
        )}

        {/* Panorama status */}
        <div className="preview-section">
          <div className="preview-info-row">
            <span className="preview-label">
              <span className="preview-label-icon"></span>
              Panorama 360°:
            </span>
            {formData.panoramaUrl ? (
              <span className="preview-badge preview-badge-success">
                ✓ Có ảnh 360°
              </span>
            ) : (
              <span className="preview-badge preview-badge-warning">
                ⚠ Chưa có
              </span>
            )}
          </div>
        </div>

        {/* Vị trí */}
        <div className="preview-section">
          <h4 className="preview-section-title">
            <span className="preview-title-icon"></span>
            Tọa độ không gian 3D
          </h4>
          <div className="preview-coords">
            <div className="preview-coord-item">
              <span className="preview-coord-label">X</span>
              <span className="preview-coord-value">{displayXYZ(formData.posX)}</span>
            </div>
            <div className="preview-coord-item">
              <span className="preview-coord-label">Y</span>
              <span className="preview-coord-value">{displayXYZ(formData.posY)}</span>
            </div>
            <div className="preview-coord-item">
              <span className="preview-coord-label">Z</span>
              <span className="preview-coord-value">{displayXYZ(formData.posZ)}</span>
            </div>
          </div>
        </div>

        {/* === CẬP NHẬT MỚI: LỊCH LÀM VIỆC CÓ CHECK TOGGLE === */}
        {formData.schedule && (
          <div className="preview-section">
            <h4 className="preview-section-title">
              <span className="preview-title-icon"></span>
              Lịch làm việc
            </h4>

            {/* Nếu enableSchedule là false (đã tắt) -> Hiện thông báo ẩn */}
            {formData.enableSchedule === false ? (
              <div className="preview-hidden-notice">
                <span style={{ fontSize: '18px' }}>🚫</span>
                <span>Thông tin này đang <strong>BỊ ẨN</strong> với người dùng</span>
              </div>
            ) : (
              /* Nếu enableSchedule là true (hoặc undefined) -> Hiện bảng giờ */
              <div className="preview-schedule-grid">
                {Object.entries(formData.schedule).map(([day, time]) => (
                  <div key={day} className="preview-schedule-item">
                    <span className="preview-day">{day}</span>
                    <span className="preview-time">{time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Liên hệ */}
        {(formData.contact?.phone || formData.contact?.email) && (
          <div className="preview-section">
            <h4 className="preview-section-title">
              <span className="preview-title-icon"></span>
              Thông tin liên hệ
            </h4>
            {formData.contact.phone && (
              <div className="preview-info-row">
                <span className="preview-label">
                  <span className="preview-label-icon"></span>
                  Điện thoại:
                </span>
                <a href={`tel:${formData.contact.phone}`} className="preview-contact-value">
                  {formData.contact.phone}
                </a>
              </div>
            )}
            {formData.contact.email && (
              <div className="preview-info-row">
                <span className="preview-label">
                  <span className="preview-label-icon"></span>
                  Email:
                </span>
                <a href={`mailto:${formData.contact.email}`} className="preview-contact-value">
                  {formData.contact.email}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="preview-footer">
          <div className="preview-footer-icon"></div>
          <p className="preview-footer-text">
            Đây là preview. Nhấn "Lưu" để lưu thông tin vào cơ sở dữ liệu.
          </p>
        </div>

      </div>
    </div>
  );
}