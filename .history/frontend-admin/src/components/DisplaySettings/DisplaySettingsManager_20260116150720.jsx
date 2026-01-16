import React, { useState, useEffect } from 'react';

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
    fetchPolicies(); // Tải chính sách
  }, []);

  const fetchNotis = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`);
      const data = await res.json();
      setNotis(Array.isArray(data) ? data : []);
    } catch (error) { console.error("Lỗi tải thông báo:", error); }
  };

  const fetchFooterConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/footer-config`);
      if (res.ok) {
        const data = await res.json();
        setFooterConfig({
          ...initialFooterState,
          ...data,
          legalDocuments: Array.isArray(data.legalDocuments) ? data.legalDocuments : []
        });
      }
    } catch (error) { console.error("Lỗi tải config footer:", error); }
  };

  // === HÀM LẤY CHÍNH SÁCH RIÊNG ===
  const fetchPolicies = async () => {
    try {
      setPolicyLoading(true);

      // Lấy chính sách bảo mật
      const privacyRes = await fetch(`${API_URL}/privacy-policy`);
      if (privacyRes.ok) {
        const privacyData = await privacyRes.json();
        setPrivacyPolicy(privacyData.content || '');
      }

      // Lấy điều khoản sử dụng
      const termsRes = await fetch(`${API_URL}/terms-of-service`);
      if (termsRes.ok) {
        const termsData = await termsRes.json();
        setTermsOfService(termsData.content || '');
      }
    } catch (error) {
      console.error("Lỗi tải chính sách:", error);
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleSaveFooter = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/footer-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(footerConfig)
      });
      if (res.ok) setMessage({ type: 'success', text: "Đã cập nhật Footer thành công!" });
      else setMessage({ type: 'error', text: "Lỗi khi lưu Footer." });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // === HÀM LƯU CHÍNH SÁCH RIÊNG ===
  const handleSavePrivacyPolicy = async () => {
    setSavingPrivacy(true);
    try {
      const res = await fetch(`${API_URL}/privacy-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: privacyPolicy })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: "Đã lưu Chính sách bảo mật!" });
      } else {
        setMessage({ type: 'error', text: "Lỗi khi lưu chính sách." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleSaveTermsOfService = async () => {
    setSavingTerms(true);
    try {
      const res = await fetch(`${API_URL}/terms-of-service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: termsOfService })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: "Đã lưu Điều khoản sử dụng!" });
      } else {
        setMessage({ type: 'error', text: "Lỗi khi lưu điều khoản." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingTerms(false);
    }
  };

  const handleSaveAllPolicies = async () => {
    setSavingPrivacy(true);
    setSavingTerms(true);
    try {
      // Lưu cả 2 cùng lúc
      await Promise.all([
        handleSavePrivacyPolicy(),
        handleSaveTermsOfService()
      ]);
      setMessage({ type: 'success', text: "Đã lưu tất cả chính sách!" });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingPrivacy(false);
      setSavingTerms(false);
    }
  };

  // --- LOGIC MỚI: QUẢN LÝ THÊM / SỬA DOC ---
  const handleSaveDoc = () => {
    if (!tempDoc.title.trim()) {
      alert("Vui lòng nhập tiêu đề văn bản!");
      return;
    }

    const newDocs = [...footerConfig.legalDocuments];

    if (editingDocIndex !== null) {
      newDocs[editingDocIndex] = tempDoc;
      setEditingDocIndex(null);
    } else {
      newDocs.push(tempDoc);
    }

    setFooterConfig({ ...footerConfig, legalDocuments: newDocs });
    setTempDoc({ title: "", url: "" });
  };

  const handleStartEditDoc = (index) => {
    const docToEdit = footerConfig.legalDocuments[index];
    setTempDoc(docToEdit);
    setEditingDocIndex(index);
  };

  const handleCancelEditDoc = () => {
    setTempDoc({ title: "", url: "" });
    setEditingDocIndex(null);
  };

  const handleDeleteDoc = (index) => {
    if (!window.confirm("Bạn muốn xóa dòng này?")) return;
    const newDocs = footerConfig.legalDocuments.filter((_, i) => i !== index);
    setFooterConfig({ ...footerConfig, legalDocuments: newDocs });
    if (editingDocIndex === index) { handleCancelEditDoc(); }
  };

  // --- NOTIFICATION HANDLERS ---
  const handleEditNoti = (item) => {
    setNotiForm({ ...item, isNew: item.isNew });
    setIsEditingNoti(true);
    setMessage(null);
    setActiveTab('notifications');
  };

  const handleDeleteNoti = async (id) => {
    if (!window.confirm("Bạn chắc chắn xóa?")) return;
    try {
      await fetch(`${API_URL}/notifications/${id}`, { method: "DELETE" });
      fetchNotis();
      if (notiForm.id === id) { setNotiForm(initialNotiFormState); setIsEditingNoti(false); }
    } catch (err) { alert("Lỗi xóa: " + err.message); }
  };

  const handleSubmitNoti = async (e) => {
    e.preventDefault();
    setLoading(true);
    const method = isEditingNoti ? "PUT" : "POST";
    const url = isEditingNoti ? `${API_URL}/notifications/${notiForm.id}` : `${API_URL}/notifications`;
    try {
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(notiForm)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: isEditingNoti ? "Cập nhật xong!" : "Đã thêm mới!" });
        setNotiForm(initialNotiFormState);
        setIsEditingNoti(false);
        fetchNotis();
      } else { setMessage({ type: 'error', text: "Lỗi lưu thông báo." }); }
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  };

  const tabBtnStyle = (isActive) => ({
    width: '100%', padding: '12px 15px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: '600',
    backgroundColor: isActive ? '#0066cc' : '#f8f9fa', color: isActive ? '#ffffff' : '#333', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px'
  });

  // Hàm render header thống nhất cho tất cả các tab
  const renderHeader = (title, subtitle = null, actionButton = null) => (
    <div className="panel-header" style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1a365d'
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{
              margin: '5px 0 0 0',
              fontSize: '0.9rem',
              color: '#666',
              fontWeight: 'normal'
            }}>
              {subtitle}
            </p>
          )}
        </div>
        {actionButton && (
          <div style={{ flexShrink: 0 }}>
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="split-layout">
      {/* SIDEBAR */}
      <aside className="panel">
        <div className="panel-header">Menu Cấu Hình</div>
        <div style={{ padding: '15px', borderBottom: '1px solid var(--border-light)', background: '#fff' }}>
          <button style={tabBtnStyle(activeTab === 'footer')} onClick={() => { setActiveTab('footer'); setMessage(null); }}>
            Cấu hình Footer
          </button>
          <button style={tabBtnStyle(activeTab === 'notifications')} onClick={() => { setActiveTab('notifications'); setMessage(null); }}>
            Quản lý Thông báo
          </button>
          <button style={tabBtnStyle(activeTab === 'policies')} onClick={() => { setActiveTab('policies'); setMessage(null); }}>
            Chính sách & Điều khoản
          </button>
        </div>

        {activeTab === 'notifications' && (
          <div className="list-group" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0'
          }}>
            {notis.map(item => (
              <div key={item.id} className="list-item" onClick={() => handleEditNoti(item)} style={{
                cursor: 'pointer',
                borderLeft: item.id === notiForm.id ? '4px solid var(--primary)' : 'none'
              }}>
                <div style={{ flex: 1 }}>
                  <div className="item-title" style={{ fontSize: '13px' }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{item.date}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteNoti(item.id); }}
                  className="btn-danger"
                  style={{
                    background: 'var(--danger)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
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
          <div style={{
            padding: '12px 15px',
            margin: '15px',
            borderRadius: 'var(--radius)',
            background: message.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
            color: message.type === 'success' ? 'var(--text-primary)' : '#721c24',
            borderLeft: message.type === 'success' ? '4px solid var(--success)' : '4px solid var(--danger)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {message.text}
          </div>
        )}

        {/* TAB FOOTER */}
        {activeTab === 'footer' && (
          <>
            {renderHeader(
              "Cấu hình Footer",
              "Chỉnh sửa toàn bộ nội dung hiển thị ở chân trang website",
              <button
                type="submit"
                form="footer-form"
                className="btn btn-primary"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  minWidth: '150px'
                }}
                disabled={loading}
              >
                {loading ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
            )}

            <div className="form-section">
              <form id="footer-form" onSubmit={handleSaveFooter}>

                {/* 1. THÔNG TIN LIÊN HỆ */}
                <h5 className="section-title">1. Thông tin liên hệ</h5>
                <div className="form-group"><label className="form-label">Tên Công Ty</label><input type="text" className="form-control" value={footerConfig.companyName} onChange={e => setFooterConfig({ ...footerConfig, companyName: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Chi nhánh</label><input type="text" className="form-control" value={footerConfig.branch} onChange={e => setFooterConfig({ ...footerConfig, branch: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Địa chỉ</label><input type="text" className="form-control" value={footerConfig.address} onChange={e => setFooterConfig({ ...footerConfig, address: e.target.value })} /></div>
                <div className="contact-grid">
                  <div className="form-group"><label className="form-label">Email</label><input type="text" className="form-control" value={footerConfig.email} onChange={e => setFooterConfig({ ...footerConfig, email: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Giờ làm việc</label><input type="text" className="form-control" value={footerConfig.workingHours} onChange={e => setFooterConfig({ ...footerConfig, workingHours: e.target.value })} /></div>
                </div>

                {/* 2. VĂN BẢN PHÁP LÝ */}
                <h5 className="section-title" style={{ marginTop: '30px' }}>
                  2. Văn bản pháp lý (Cột 3 Footer)
                </h5>

                <div style={{
                  background: editingDocIndex !== null ? 'var(--success-light)' : 'var(--primary-lighter)',
                  padding: '15px',
                  borderRadius: 'var(--radius)',
                  marginBottom: '15px',
                  border: editingDocIndex !== null ? '1px solid var(--success)' : '1px solid var(--primary-light)',
                  transition: 'all var(--transition-base)'
                }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    color: editingDocIndex !== null ? 'var(--text-primary)' : 'var(--primary-dark)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{editingDocIndex !== null ? "Đang chỉnh sửa mục:" : "Thêm liên kết mới:"}</span>
                    {editingDocIndex !== null && (
                      <button
                        type="button"
                        onClick={handleCancelEditDoc}
                        className="btn-secondary"
                        style={{
                          padding: '4px 12px',
                          fontSize: '12px'
                        }}
                      >
                        Hủy sửa
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px' }}>
                    <input type="text" className="form-control" placeholder="Tiêu đề..." value={tempDoc.title} onChange={e => setTempDoc({ ...tempDoc, title: e.target.value })} style={{ fontSize: '13px' }} />
                    <input type="text" className="form-control" placeholder="Link (URL)..." value={tempDoc.url} onChange={e => setTempDoc({ ...tempDoc, url: e.target.value })} style={{ fontSize: '13px' }} />

                    <button
                      type="button"
                      onClick={handleSaveDoc}
                      className={editingDocIndex !== null ? "btn-success" : "btn-primary"}
                      style={{
                        height: '38px',
                        whiteSpace: 'nowrap',
                        fontWeight: '600',
                        padding: '0 15px'
                      }}
                    >
                      {editingDocIndex !== null ? "✓ Lưu thay đổi" : "+ Thêm"}
                    </button>
                  </div>
                </div>

                <div style={{
                  marginBottom: '20px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  background: 'white'
                }}>
                  {footerConfig.legalDocuments.length === 0 && (
                    <div style={{
                      padding: '15px',
                      textAlign: 'center',
                      color: 'var(--text-light)',
                      fontSize: '13px'
                    }}>
                      Chưa có văn bản nào.
                    </div>
                  )}

                  {footerConfig.legalDocuments.map((doc, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 15px',
                      borderBottom: '1px solid var(--border-light)',
                      background: editingDocIndex === index ? 'var(--success-light)' : 'white',
                      transition: 'background var(--transition-base)'
                    }}>
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{doc.title}</div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {doc.url || '#'}
                        </div>
                      </div>

                      <div className="item-actions" style={{ marginLeft: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleStartEditDoc(index)}
                          className="btn-secondary"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px'
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(index)}
                          className="btn-danger"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px'
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. COPYRIGHT */}
                <h5 className="section-title" style={{ marginTop: '30px' }}>3. Bản quyền</h5>
                <div className="form-group">
                  <textarea
                    className="form-control"
                    rows="2"
                    value={footerConfig.copyright}
                    onChange={e => setFooterConfig({ ...footerConfig, copyright: e.target.value })}
                  />
                </div>

                <div className="form-actions-footer" style={{ marginTop: '30px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
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
            {renderHeader(
              isEditingNoti ? "Chỉnh sửa Thông báo" : "Tạo Thông báo Mới",
              isEditingNoti ? "Cập nhật thông tin thông báo hiện tại" : "Thêm thông báo mới vào hệ thống"
            )}

            <div className="form-section">
              <form onSubmit={handleSubmitNoti}>
                <div className="form-group">
                  <label className="form-label">Tiêu đề</label>
                  <input
                    type="text"
                    className="form-control"
                    value={notiForm.title}
                    onChange={e => setNotiForm({ ...notiForm, title: e.target.value })}
                  />
                </div>
                <div className="contact-grid">
                  <div className="form-group">
                    <label className="form-label">Ngày</label>
                    <input
                      type="text"
                      className="form-control"
                      value={notiForm.date}
                      onChange={e => setNotiForm({ ...notiForm, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '30px' }}>
                    <input
                      type="checkbox"
                      checked={notiForm.isNew}
                      onChange={e => setNotiForm({ ...notiForm, isNew: e.target.checked })}
                      style={{
                        width: '20px',
                        height: '20px',
                        marginRight: '10px',
                        cursor: 'pointer'
                      }}
                    />
                    <label style={{ cursor: 'pointer' }}>Badge MỚI</label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Link</label>
                  <input
                    type="text"
                    className="form-control"
                    value={notiForm.link}
                    onChange={e => setNotiForm({ ...notiForm, link: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  style={{ width: '100%', padding: '12px' }}
                >
                  {isEditingNoti ? "CẬP NHẬT" : "ĐĂNG"}
                </button>
              </form>
            </div>
          </>
        )}

        {/* TAB POLICIES - CHÍNH SÁCH & ĐIỀU KHOẢN */}
        {activeTab === 'policies' && (
          <>
            {renderHeader(
              "Quản lý Chính sách & Điều khoản",
              "Chỉnh sửa nội dung Chính sách bảo mật và Điều khoản sử dụng",
              <button
                onClick={handleSaveAllPolicies}
                disabled={savingPrivacy || savingTerms || policyLoading}
                className="btn-success"
                style={{
                  padding: '10px 20px',
                  minWidth: '150px'
                }}
              >
                {(savingPrivacy || savingTerms) ? 'Đang lưu...' : 'Lưu tất cả'}
              </button>
            )}

            <div className="form-section">
              {policyLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Đang tải nội dung...</div>
                </div>
              ) : (
                <>
                  {/* CHÍNH SÁCH BẢO MẬT */}
                  <div style={{ marginBottom: '30px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{
                      background: 'var(--success)',
                      color: 'white',
                      padding: '12px 20px',
                      fontWeight: 'bold',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>Chính sách Bảo mật</span>
                      <button
                        onClick={handleSavePrivacyPolicy}
                        disabled={savingPrivacy}
                        className="btn-secondary"
                        style={{
                          padding: '6px 12px',
                          background: 'white',
                          color: 'var(--success)',
                          fontWeight: 'bold',
                          fontSize: '13px'
                        }}
                      >
                        {savingPrivacy ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </div>
                    <div style={{ padding: '20px', background: 'var(--bg-gray-50)' }}>
                      <textarea
                        value={privacyPolicy}
                        onChange={(e) => setPrivacyPolicy(e.target.value)}
                        rows={15}
                        className="form-control"
                        style={{
                          fontFamily: 'monospace',
                          lineHeight: '1.6',
                          resize: 'vertical'
                        }}
                        placeholder="Nhập nội dung Chính sách bảo mật... (hỗ trợ Markdown: # Tiêu đề, **in đậm**, *nghiêng*)"
                      />
                      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <strong>Ghi chú:</strong> Hỗ trợ định dạng Markdown. Sử dụng # cho tiêu đề, **text** cho in đậm, *text* cho nghiêng.
                      </div>
                    </div>
                  </div>

                  {/* ĐIỀU KHOẢN SỬ DỤNG */}
                  <div style={{ marginBottom: '30px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{
                      background: 'var(--info)',
                      color: 'white',
                      padding: '12px 20px',
                      fontWeight: 'bold',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>Điều khoản Sử dụng</span>
                      <button
                        onClick={handleSaveTermsOfService}
                        disabled={savingTerms}
                        className="btn-secondary"
                        style={{
                          padding: '6px 12px',
                          background: 'white',
                          color: 'var(--info)',
                          fontWeight: 'bold',
                          fontSize: '13px'
                        }}
                      >
                        {savingTerms ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </div>
                    <div style={{ padding: '20px', background: 'var(--bg-gray-50)' }}>
                      <textarea
                        value={termsOfService}
                        onChange={(e) => setTermsOfService(e.target.value)}
                        rows={15}
                        className="form-control"
                        style={{
                          fontFamily: 'monospace',
                          lineHeight: '1.6',
                          resize: 'vertical'
                        }}
                        placeholder="Nhập nội dung Điều khoản sử dụng... (hỗ trợ Markdown: # Tiêu đề, **in đậm**, *nghiêng*)"
                      />
                      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <strong>Ghi chú:</strong> Hỗ trợ định dạng Markdown. Sử dụng # cho tiêu đề, **text** cho in đậm, *text* cho nghiêng.
                      </div>
                    </div>
                  </div>

                  {/* XEM TRƯỚC */}
                  <div style={{ marginBottom: '30px' }}>
                    <h5 className="section-title">
                      Xem trước
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div style={{
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius)',
                        padding: '15px',
                        background: 'var(--bg-gray-50)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        <h4 style={{ color: 'var(--success)', marginBottom: '10px' }}>Chính sách Bảo mật</h4>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '14px', color: 'var(--text-primary)' }}>
                          {privacyPolicy || <em style={{ color: 'var(--text-light)' }}>Chưa có nội dung...</em>}
                        </div>
                      </div>
                      <div style={{
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius)',
                        padding: '15px',
                        background: 'var(--bg-gray-50)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        <h4 style={{ color: 'var(--info)', marginBottom: '10px' }}>Điều khoản Sử dụng</h4>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '14px', color: 'var(--text-primary)' }}>
                          {termsOfService || <em style={{ color: 'var(--text-light)' }}>Chưa có nội dung...</em>}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}