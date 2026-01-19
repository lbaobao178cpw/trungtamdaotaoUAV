import React, { useState, useEffect } from 'react';
import './DisplaySettingsManager.css';
import './LegalManagement.css'; // Thêm CSS cho legal management

const API_URL = "http://localhost:5000/api/display";

// Import các component mới
import LegalDocumentsManager from './LegalManagement';
import AuthoritiesManager from './AuthoritiesManager';
import FormsManager from './FormsManager';
import StudyMaterialsManager from './StudyMaterialsManager';

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
  const [activeTab, setActiveTab] = useState('legal-documents');
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
  }, [activeTab]);

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

      const privacyRes = await fetch(`${API_URL}/privacy-policy`);
      if (privacyRes.ok) {
        const privacyData = await privacyRes.json();
        setPrivacyPolicy(privacyData.content || '');
      }

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
      await Promise.all([
        fetch(`${API_URL}/privacy-policy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: privacyPolicy })
        }),
        fetch(`${API_URL}/terms-of-service`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: termsOfService })
        })
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
    width: '100%',
    padding: '12px 15px',
    marginBottom: '8px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: isActive ? '#0066cc' : '#f8f9fa',
    color: isActive ? '#ffffff' : '#333',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: isActive ? '0 2px 8px rgba(0, 102, 204, 0.15)' : 'none'
  });

  const formatNumber = (num) => {
    return num ? num.toLocaleString('vi-VN') : '0';
  };

  return (
    <div className="split-layout">
      {/* SIDEBAR */}
      <aside className="panel">
        <div className="panel-header">Menu Cấu Hình</div>
        <div style={{ padding: '15px', borderBottom: '1px solid #eee', background: '#fff' }}>
          {/* Tab menu */}
          <button style={tabBtnStyle(activeTab === 'legal-documents')} onClick={() => { setActiveTab('legal-documents'); setMessage(null); }}>
            Văn bản Pháp luật
          </button>
          <button style={tabBtnStyle(activeTab === 'authorities')} onClick={() => { setActiveTab('authorities'); setMessage(null); }}>
            Thẩm quyền
          </button>
          <button style={tabBtnStyle(activeTab === 'forms')} onClick={() => { setActiveTab('forms'); setMessage(null); }}>
            Biểu mẫu
          </button>

          <div style={{ height: '1px', background: '#ddd', margin: '12px 0', opacity: 0.5 }} />

          <button style={tabBtnStyle(activeTab === 'footer')} onClick={() => { setActiveTab('footer'); setMessage(null); }}>
            Cấu hình Footer
          </button>
          <button style={tabBtnStyle(activeTab === 'notifications')} onClick={() => { setActiveTab('notifications'); setMessage(null); }}>
            Quản lý Thông báo
          </button>
          <button style={tabBtnStyle(activeTab === 'study-materials')} onClick={() => { setActiveTab('study-materials'); setMessage(null); }}>
            📚 Tài liệu Ôn thi
          </button>
          <button style={tabBtnStyle(activeTab === 'policies')} onClick={() => { setActiveTab('policies'); setMessage(null); }}>
            Chính sách & Điều khoản
          </button>
        </div>

        {activeTab === 'notifications' && (
          <>
            <button
              onClick={() => {
                setNotiForm(initialNotiFormState);
                setIsEditingNoti(false);
              }}
              style={{
                width: 'calc(100% - 30px)',
                padding: '12px 15px',
                margin: '0 15px 10px 15px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(40, 167, 69, 0.2)'
              }}
              onMouseEnter={(e) => e.target.style.background = '#218838'}
              onMouseLeave={(e) => e.target.style.background = '#28a745'}
            >
              + Tạo Thông báo Mới
            </button>
            <div className="list-group" style={{ marginTop: '0', maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
              {notis.map(item => (
                <div key={item.id} className="list-item" onClick={() => handleEditNoti(item)} style={{ cursor: 'pointer', borderLeft: item.id === notiForm.id ? '4px solid #0066cc' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#333' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{item.date}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteNoti(item.id); }} style={{ background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}>X</button>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="panel">
        {message && (
          <div style={{
            padding: '12px 15px',
            margin: '15px',
            borderRadius: '6px',
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: message.type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
          }}>
            {message.text}
          </div>
        )}

        {/* VĂN BẢN PHÁP LUẬT */}
        {activeTab === 'legal-documents' && <LegalDocumentsManager />}

        {/* THẨM QUYỀN */}
        {activeTab === 'authorities' && <AuthoritiesManager />}

        {/* BIỂU MẪU */}
        {activeTab === 'forms' && <FormsManager />}

        {/* TAB FOOTER */}
        {activeTab === 'footer' && (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginBottom: '25px',
              paddingBottom: '8px',
              paddingLeft: '10px',
              borderBottom: '2px solid #0066cc'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#0066cc' }}>
                Chỉnh Sửa Nội Dung Footer
              </h2>
              <button
                onClick={handleSaveFooter}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  paddingRight: '20px',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
            </div>
            <div className="form-section">
              <form onSubmit={handleSaveFooter}>
                <h5 style={{ borderBottom: '2px solid #0066cc', paddingBottom: '8px', marginBottom: '15px', color: '#0066cc', fontWeight: '600' }}>1. Thông tin liên hệ</h5>
                <div className="ds-form-group"><label className="ds-form-label">Tên Công Ty</label><input type="text" className="ds-form-control" value={footerConfig.companyName} onChange={e => setFooterConfig({ ...footerConfig, companyName: e.target.value })} /></div>
                <div className="ds-form-group"><label className="ds-form-label">Chi nhánh</label><input type="text" className="ds-form-control" value={footerConfig.branch} onChange={e => setFooterConfig({ ...footerConfig, branch: e.target.value })} /></div>
                <div className="ds-form-group"><label className="ds-form-label">Địa chỉ</label><input type="text" className="ds-form-control" value={footerConfig.address} onChange={e => setFooterConfig({ ...footerConfig, address: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="ds-form-group"><label className="ds-form-label">Email</label><input type="text" className="ds-form-control" value={footerConfig.email} onChange={e => setFooterConfig({ ...footerConfig, email: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-form-label">Giờ làm việc</label><input type="text" className="ds-form-control" value={footerConfig.workingHours} onChange={e => setFooterConfig({ ...footerConfig, workingHours: e.target.value })} /></div>
                </div>

                {/* 2. VĂN BẢN PHÁP LÝ */}
                <h5 style={{ borderBottom: '2px solid #0066cc', paddingBottom: '8px', marginBottom: '15px', marginTop: '30px', color: '#0066cc', fontWeight: '600' }}>
                  2. Văn bản pháp lý (Cột 3 Footer)
                </h5>

                <div style={{ background: editingDocIndex !== null ? '#e8f5e9' : '#f1f8ff', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: editingDocIndex !== null ? '1px solid #c3e6cb' : '1px solid #cce5ff', transition: 'all 0.3s' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: editingDocIndex !== null ? '#155724' : '#004085', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{editingDocIndex !== null ? "Đang chỉnh sửa mục:" : "Thêm liên kết mới:"}</span>
                    {editingDocIndex !== null && <button type="button" onClick={handleCancelEditDoc} style={{ border: 'none', background: 'transparent', textDecoration: 'underline', cursor: 'pointer', color: '#dc3545' }}>Hủy sửa</button>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px' }}>
                    <input type="text" className="ds-form-control" placeholder="Tiêu đề..." value={tempDoc.title} onChange={e => setTempDoc({ ...tempDoc, title: e.target.value })} style={{ fontSize: '13px' }} />
                    <input type="text" className="ds-form-control" placeholder="Link (URL)..." value={tempDoc.url} onChange={e => setTempDoc({ ...tempDoc, url: e.target.value })} style={{ fontSize: '13px' }} />

                    <button type="button" onClick={handleSaveDoc}
                      style={{
                        height: '38px', whiteSpace: 'nowrap', fontWeight: '600',
                        background: editingDocIndex !== null ? '#28a745' : '#0066cc',
                        color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 15px'
                      }}>
                      {editingDocIndex !== null ? "Lưu thay đổi" : "Thêm"}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '20px', border: '1px solid #eee', borderRadius: '6px', overflow: 'hidden' }}>
                  {footerConfig.legalDocuments.length === 0 && <div style={{ padding: '15px', textAlign: 'center', color: '#999', fontSize: '13px' }}>Chưa có văn bản nào.</div>}

                  {footerConfig.legalDocuments.map((doc, index) => (
                    <div key={index} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px',
                      borderBottom: '1px solid #eee', background: editingDocIndex === index ? '#e8f5e9' : 'white'
                    }}>
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>{doc.title}</div>
                        <div style={{ fontSize: '12px', color: '#0066cc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.url || '#'}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                        <button type="button" onClick={() => handleStartEditDoc(index)}
                          style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                          Sửa
                        </button>
                        <button type="button" onClick={() => handleDeleteDoc(index)}
                          style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. COPYRIGHT */}
                <h5 style={{ borderBottom: '2px solid #0066cc', paddingBottom: '8px', marginBottom: '15px', marginTop: '30px', color: '#0066cc', fontWeight: '600' }}>3. Bản quyền</h5>
                <div className="ds-form-group"><textarea className="ds-form-control" rows="2" value={footerConfig.copyright} onChange={e => setFooterConfig({ ...footerConfig, copyright: e.target.value })} /></div>

                <div className="form-actions-footer" style={{ marginTop: '30px' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }} disabled={loading}>
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginBottom: '25px',
              paddingBottom: '8px',
              paddingLeft: '10px',
              borderBottom: '2px solid #0066cc'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#0066cc' }}>
                {isEditingNoti ? "Chỉnh sửa Thông báo" : "Tạo Thông báo Mới"}
              </h2>
            </div>
            <div className="form-section">
              <form onSubmit={handleSubmitNoti}>
                <div className="ds-form-group"><label className="ds-form-label">Tiêu đề</label><input type="text" className="ds-form-control" value={notiForm.title} onChange={e => setNotiForm({ ...notiForm, title: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="ds-form-group"><label className="ds-form-label">Ngày</label><input type="text" className="ds-form-control" value={notiForm.date} onChange={e => setNotiForm({ ...notiForm, date: e.target.value })} /></div>
                  <div className="ds-form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '30px' }}>
                    <input type="checkbox" checked={notiForm.isNew} onChange={e => setNotiForm({ ...notiForm, isNew: e.target.checked })} style={{ width: '20px', height: '20px', marginRight: '10px' }} />
                    <label>Badge MỚI</label>
                  </div>
                </div>
                <div className="ds-form-group"><label className="ds-form-label">Link</label><input type="text" className="ds-form-control" value={notiForm.link} onChange={e => setNotiForm({ ...notiForm, link: e.target.value })} /></div>
                <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', padding: '10px' }} disabled={loading}>
                  {loading ? "Đang xử lý..." : (isEditingNoti ? "CẬP NHẬT" : "ĐĂNG")}
                </button>
              </form>
            </div>
          </>
        )}

        {/* TAB POLICIES - CHÍNH SÁCH & ĐIỀU KHOẢN */}
        {activeTab === 'policies' && (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginBottom: '25px',
              paddingBottom: '8px',
              paddingLeft: '10px',
              borderBottom: '2px solid #0066cc'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#0066cc' }}>
                Quản lý Chính sách & Điều khoản
              </h2>
              <button
                onClick={handleSaveAllPolicies}
                disabled={savingPrivacy || savingTerms || policyLoading}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (savingPrivacy || savingTerms || policyLoading) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  paddingRight: '20px',
                  opacity: (savingPrivacy || savingTerms || policyLoading) ? 0.7 : 1
                }}
              >
                {(savingPrivacy || savingTerms) ? 'Đang lưu...' : 'Lưu tất cả'}
              </button>
            </div>

            {policyLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>Đang tải nội dung...</div>
              </div>
            ) : (
              <div className="form-section">
                {/* CHÍNH SÁCH BẢO MẬT */}
                <div style={{ marginBottom: '30px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    background: '#28a745',
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
                      style={{
                        padding: '6px 12px',
                        background: 'white',
                        color: '#28a745',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingPrivacy ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '13px'
                      }}
                    >
                      {savingPrivacy ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                  <div style={{ padding: '20px', background: '#f8f9fa' }}>
                    <textarea
                      value={privacyPolicy}
                      onChange={(e) => setPrivacyPolicy(e.target.value)}
                      rows={15}
                      style={{
                        width: '100%',
                        padding: '15px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        resize: 'vertical',
                        background: 'white'
                      }}
                      placeholder="Nhập nội dung Chính sách bảo mật... (hỗ trợ Markdown: # Tiêu đề, **in đậm**, *nghiêng*)"
                    />
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                      <strong>Ghi chú:</strong> Hỗ trợ định dạng Markdown. Sử dụng # cho tiêu đề, **text** cho in đậm, *text* cho nghiêng.
                    </div>
                  </div>
                </div>

                {/* ĐIỀU KHOẢN SỬ DỤNG */}
                <div style={{ marginBottom: '30px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    background: '#17a2b8',
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
                      style={{
                        padding: '6px 12px',
                        background: 'white',
                        color: '#17a2b8',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingTerms ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '13px'
                      }}
                    >
                      {savingTerms ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                  <div style={{ padding: '20px', background: '#f8f9fa' }}>
                    <textarea
                      value={termsOfService}
                      onChange={(e) => setTermsOfService(e.target.value)}
                      rows={15}
                      style={{
                        width: '100%',
                        padding: '15px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        resize: 'vertical',
                        background: 'white'
                      }}
                      placeholder="Nhập nội dung Điều khoản sử dụng... (hỗ trợ Markdown: # Tiêu đề, **in đậm**, *nghiêng*)"
                    />
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                      <strong>Ghi chú:</strong> Hỗ trợ định dạng Markdown. Sử dụng # cho tiêu đề, **text** cho in đậm, *text* cho nghiêng.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TÀI LIỆU ÔN THI */}
            {activeTab === 'study-materials' && <StudyMaterialsManager />}
          </>
        )}
      </main>
    </div>
  );
}