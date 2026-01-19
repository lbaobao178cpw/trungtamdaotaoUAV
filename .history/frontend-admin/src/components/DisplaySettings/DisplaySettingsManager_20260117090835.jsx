import React, { useState, useEffect } from 'react';
import './DisplaySettingsManager.css'; // Thêm dòng import này

// URL API (Đảm bảo backend chạy ở port 5000)
const API_URL = "http://localhost:5000/api";

// --- STATE MẶC ĐỊNH ---
const initialFooterState = {
  companyName: "Công Ty TNHH Đào Tạo Robot Robotone",
  branch: "Chi Nhánh: Phòng Đào Tạo - UAV Lab",
  address: "572 Liên Phương, Long Thượng, Hồ Chí Minh",
  email: "khaodao@uavtrainingcenter.vn",
  workingHours: "8:00 - 17:00 | Thứ 2 - Thứ 6",
  copyright: "© 2025 Hệ thống Đào tạo và Cấp Chứng chỉ Điều khiển UAV Quốc gia.",
  legalDocuments: []
};

const initialNotiFormState = { id: null, title: "", date: "", description: "", link: "", isNew: true };

export default function DisplaySettingsManager() {
  const [activeTab, setActiveTab] = useState('footer');
  const [footerConfig, setFooterConfig] = useState(initialFooterState);
  const [notis, setNotis] = useState([]);

  // === THÊM STATE RIÊNG CHO CHÍNH SÁCH ===
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [termsOfService, setTermsOfService] = useState('');
  const [policyLoading, setPolicyLoading] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);

  // --- STATE CHO PHẦN VĂN BẢN PHÁP LÝ ---
  const [tempDoc, setTempDoc] = useState({ title: "", url: "" });
  const [editingDocIndex, setEditingDocIndex] = useState(null);

  // --- STATE NOTIFICATIONS ---
  const [notiForm, setNotiForm] = useState(initialNotiFormState);
  const [isEditingNoti, setIsEditingNoti] = useState(false);

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotis();
    fetchFooterConfig();
    fetchPolicies();
  }, []);

  // ... (giữ nguyên các hàm xử lý)

  return (
    <div className="split-layout">
      {/* SIDEBAR */}
      <aside className="panel">
        <div className="panel-header">Menu Cấu Hình</div>
        <div style={{ padding: '15px', borderBottom: '1px solid #eee', background: '#fff' }}>
          <button
            className={`ds-tab-button ${activeTab === 'footer' ? 'active' : ''}`}
            onClick={() => { setActiveTab('footer'); setMessage(null); }}
          >
            Cấu hình Footer
          </button>
          <button
            className={`ds-tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => { setActiveTab('notifications'); setMessage(null); }}
          >
            Quản lý Thông báo
          </button>
          <button
            className={`ds-tab-button ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => { setActiveTab('policies'); setMessage(null); }}
          >
            Chính sách & Điều khoản
          </button>
        </div>

        {activeTab === 'notifications' && (
          <div className="list-group" style={{ marginTop: '0', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            {notis.map(item => (
              <div
                key={item.id}
                className={`list-item ds-notification-item ${item.id === notiForm.id ? 'active' : ''}`}
                onClick={() => handleEditNoti(item)}
              >
                <div style={{ flex: 1 }}>
                  <div className="ds-notification-title">{item.title}</div>
                  <div className="ds-notification-date">{item.date}</div>
                </div>
                <button
                  className="ds-delete-noti-btn"
                  onClick={(e) => { e.stopPropagation(); handleDeleteNoti(item.id); }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="panel">
        {message && (
          <div className={`ds-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* TAB FOOTER */}
        {activeTab === 'footer' && (
          <>
            <div className="ds-header">
              <h2 className="ds-header-title">Chỉnh Sửa Nội Dung Footer</h2>
              <button
                onClick={handleSaveFooter}
                disabled={loading}
                className={`ds-header-button ${loading ? 'ds-loading-button' : ''}`}
                style={{ background: '#28a745' }}
              >
                {loading ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
            </div>
            <div className="form-section">
              <form onSubmit={handleSaveFooter}>

                {/* 1. THÔNG TIN LIÊN HỆ */}
                <h5 className="ds-section-header">1. Thông tin liên hệ</h5>

                <div className="ds-form-group">
                  <label className="ds-form-label">Tên Công Ty</label>
                  <input
                    type="text"
                    className="ds-form-control"
                    value={footerConfig.companyName}
                    onChange={e => setFooterConfig({ ...footerConfig, companyName: e.target.value })}
                  />
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">Chi nhánh</label>
                  <input
                    type="text"
                    className="ds-form-control"
                    value={footerConfig.branch}
                    onChange={e => setFooterConfig({ ...footerConfig, branch: e.target.value })}
                  />
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">Địa chỉ</label>
                  <input
                    type="text"
                    className="ds-form-control"
                    value={footerConfig.address}
                    onChange={e => setFooterConfig({ ...footerConfig, address: e.target.value })}
                  />
                </div>

                <div className="ds-grid-2col">
                  <div className="ds-form-group">
                    <label className="ds-form-label">Email</label>
                    <input
                      type="text"
                      className="ds-form-control"
                      value={footerConfig.email}
                      onChange={e => setFooterConfig({ ...footerConfig, email: e.target.value })}
                    />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Giờ làm việc</label>
                    <input
                      type="text"
                      className="ds-form-control"
                      value={footerConfig.workingHours}
                      onChange={e => setFooterConfig({ ...footerConfig, workingHours: e.target.value })}
                    />
                  </div>
                </div>

                {/* 2. VĂN BẢN PHÁP LÝ */}
                <h5 className="ds-subsection-header">
                  2. Văn bản pháp lý (Cột 3 Footer)
                </h5>

                <div className={`ds-legal-doc-editor ${editingDocIndex !== null ? 'editing' : ''}`}>
                  <div className={`ds-legal-doc-header ${editingDocIndex !== null ? 'editing' : ''}`}>
                    <span>{editingDocIndex !== null ? "Đang chỉnh sửa mục:" : "Thêm liên kết mới:"}</span>
                    {editingDocIndex !== null && (
                      <button
                        type="button"
                        className="ds-cancel-edit-btn"
                        onClick={handleCancelEditDoc}
                      >
                        Hủy sửa
                      </button>
                    )}
                  </div>
                  <div className="ds-legal-doc-inputs">
                    <input
                      type="text"
                      className="ds-form-control"
                      placeholder="Tiêu đề..."
                      value={tempDoc.title}
                      onChange={e => setTempDoc({ ...tempDoc, title: e.target.value })}
                      style={{ fontSize: '13px' }}
                    />
                    <input
                      type="text"
                      className="ds-form-control"
                      placeholder="Link (URL)..."
                      value={tempDoc.url}
                      onChange={e => setTempDoc({ ...tempDoc, url: e.target.value })}
                      style={{ fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      className={`ds-save-doc-btn ${editingDocIndex !== null ? 'editing' : ''}`}
                      onClick={handleSaveDoc}
                    >
                      {editingDocIndex !== null ? "✓ Lưu thay đổi" : "+ Thêm"}
                    </button>
                  </div>
                </div>

                <div className="ds-documents-list">
                  {footerConfig.legalDocuments.length === 0 && (
                    <div className="ds-empty-state">Chưa có văn bản nào.</div>
                  )}

                  {footerConfig.legalDocuments.map((doc, index) => (
                    <div
                      key={index}
                      className={`ds-document-item ${editingDocIndex === index ? 'editing' : ''}`}
                    >
                      <div className="ds-document-info">
                        <div className="ds-document-title">{doc.title}</div>
                        <div className="ds-document-url">{doc.url || '#'}</div>
                      </div>
                      <div className="ds-document-actions">
                        <button
                          type="button"
                          className="ds-edit-btn"
                          onClick={() => handleStartEditDoc(index)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="ds-delete-btn"
                          onClick={() => handleDeleteDoc(index)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. COPYRIGHT */}
                <h5 className="ds-subsection-header">3. Bản quyền</h5>
                <div className="ds-form-group">
                  <textarea
                    className="ds-form-control"
                    rows="2"
                    value={footerConfig.copyright}
                    onChange={e => setFooterConfig({ ...footerConfig, copyright: e.target.value })}
                  />
                </div>

                <div className="form-actions-footer" style={{ marginTop: '30px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary ds-full-width-btn"
                    disabled={loading}
                  >
                    {loading ? "Đang lưu cấu hình..." : "LƯU TOÀN BỘ CẤU HÌNH FOOTER"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* TAB NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <>
            <div className="ds-header">
              <h2 className="ds-header-title">
                {isEditingNoti ? "Chỉnh sửa Thông báo" : "Tạo Thông báo Mới"}
              </h2>
            </div>
            <div className="form-section">
              <form onSubmit={handleSubmitNoti}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Tiêu đề</label>
                  <input
                    type="text"
                    className="ds-form-control"
                    value={notiForm.title}
                    onChange={e => setNotiForm({ ...notiForm, title: e.target.value })}
                  />
                </div>
                <div className="ds-grid-2col">
                  <div className="ds-form-group">
                    <label className="ds-form-label">Ngày</label>
                    <input
                      type="text"
                      className="ds-form-control"
                      value={notiForm.date}
                      onChange={e => setNotiForm({ ...notiForm, date: e.target.value })}
                    />
                  </div>
                  <div className="ds-form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '30px' }}>
                    <input
                      type="checkbox"
                      checked={notiForm.isNew}
                      onChange={e => setNotiForm({ ...notiForm, isNew: e.target.checked })}
                      style={{ width: '20px', height: '20px', marginRight: '10px' }}
                    />
                    <label>Badge MỚI</label>
                  </div>
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Link</label>
                  <input
                    type="text"
                    className="ds-form-control"
                    value={notiForm.link}
                    onChange={e => setNotiForm({ ...notiForm, link: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  style={{ width: '100%', padding: '10px' }}
                  disabled={loading}
                >
                  {loading ? "Đang xử lý..." : (isEditingNoti ? "CẬP NHẬT" : "ĐĂNG")}
                </button>
              </form>
            </div>
          </>
        )}

        {/* TAB POLICIES - CHÍNH SÁCH & ĐIỀU KHOẢN */}
        {activeTab === 'policies' && (
          <>
            <div className="ds-header">
              <h2 className="ds-header-title">Quản lý Chính sách & Điều khoản</h2>
              <button
                onClick={handleSaveAllPolicies}
                disabled={savingPrivacy || savingTerms || policyLoading}
                className={`ds-header-button ${(savingPrivacy || savingTerms || policyLoading) ? 'ds-loading-button' : ''}`}
                style={{ background: '#28a745' }}
              >
                {(savingPrivacy || savingTerms) ? 'Đang lưu...' : 'Lưu tất cả'}
              </button>
            </div>

            {policyLoading ? (
              <div className="ds-loading-text">
                Đang tải nội dung...
              </div>
            ) : (
              <div className="form-section">
                {/* CHÍNH SÁCH BẢO MẬT */}
                <div className="ds-policy-section">
                  <div className="ds-policy-header privacy">
                    <span>Chính sách Bảo mật</span>
                    <button
                      onClick={handleSavePrivacyPolicy}
                      disabled={savingPrivacy}
                      className={`ds-policy-save-btn privacy ${savingPrivacy ? 'ds-loading-button' : ''}`}
                    >
                      {savingPrivacy ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                  <div className="ds-policy-content">
                    <textarea
                      className="ds-policy-textarea"
                      value={privacyPolicy}
                      onChange={(e) => setPrivacyPolicy(e.target.value)}
                      rows={15}
                      placeholder="Nhập nội dung Chính sách bảo mật... (hỗ trợ Markdown: # Tiêu đề, **in đậm**, *nghiêng*)"
                    />
                    <div className="ds-policy-note">
                      <strong>Ghi chú:</strong> Hỗ trợ định dạng Markdown. Sử dụng # cho tiêu đề, **text** cho in đậm, *text* cho nghiêng.
                    </div>
                  </div>
                </div>

                {/* ĐIỀU KHOẢN SỬ DỤNG */}
                <div className="ds-policy-section">
                  <div className="ds-policy-header terms">
                    <span>Điều khoản Sử dụng</span>
                    <button
                      onClick={handleSaveTermsOfService}
                      disabled={savingTerms}
                      className={`ds-policy-save-btn terms ${savingTerms ? 'ds-loading-button' : ''}`}
                    >
                      {savingTerms ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                  <div className="ds-policy-content">
                    <textarea
                      className="ds-policy-textarea"
                      value={termsOfService}
                      onChange={(e) => setTermsOfService(e.target.value)}
                      rows={15}
                      placeholder="Nhập nội dung Điều khoản sử dụng... (hỗ trợ Markdown: # Tiêu đề, **in đậm**, *nghiêng*)"
                    />
                    <div className="ds-policy-note">
                      <strong>Ghi chú:</strong> Hỗ trợ định dạng Markdown. Sử dụng # cho tiêu đề, **text** cho in đậm, *text* cho nghiêng.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}