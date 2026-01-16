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

// State mặc định cho Chính sách & Điều khoản
const initialPolicyState = {
  privacyPolicy: `# CHÍNH SÁCH BẢO MẬT

## 1. Thu thập thông tin
Chúng tôi thu thập thông tin cá nhân khi bạn đăng ký tài khoản, đăng ký khóa học, hoặc liên hệ với chúng tôi.

## 2. Sử dụng thông tin
Thông tin được sử dụng để:
- Cung cấp dịch vụ đào tạo
- Cải thiện chất lượng dịch vụ
- Liên hệ hỗ trợ khi cần thiết

## 3. Bảo mật thông tin
Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn bằng các biện pháp bảo mật tiên tiến.`,

  termsOfService: `# ĐIỀU KHOẢN SỬ DỤNG

## 1. Chấp nhận điều khoản
Bằng việc sử dụng dịch vụ, bạn đồng ý với các điều khoản và điều kiện được nêu dưới đây.

## 2. Quyền và trách nhiệm người dùng
- Sử dụng dịch vụ đúng mục đích đào tạo
- Không chia sẻ tài khoản cho người khác
- Tuân thủ các quy định về an toàn bay

## 3. Quyền sở hữu trí tuệ
Toàn bộ nội dung đào tạo thuộc quyền sở hữu của Trung tâm Đào tạo UAV.`
};

export default function DisplaySettingsManager() {
  const [activeTab, setActiveTab] = useState('footer');
  const [footerConfig, setFooterConfig] = useState(initialFooterState);
  const [notis, setNotis] = useState([]);
  const [policies, setPolicies] = useState(initialPolicyState);

  // --- STATE CHO PHẦN VĂN BẢN PHÁP LÝ ---
  const [tempDoc, setTempDoc] = useState({ title: "", url: "" });
  const [editingDocIndex, setEditingDocIndex] = useState(null);

  // --- STATE NOTIFICATIONS ---
  const [notiForm, setNotiForm] = useState(initialNotiFormState);
  const [isEditingNoti, setIsEditingNoti] = useState(false);

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  useEffect(() => {
    fetchNotis();
    fetchFooterConfig();
    fetchPolicies();
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

  const fetchPolicies = async () => {
    try {
      const res = await fetch(`${API_URL}/policies`);
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (error) { console.error("Lỗi tải chính sách:", error); }
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

  const handleSavePolicies = async () => {
    setSavingPolicy(true);
    try {
      const res = await fetch(`${API_URL}/policies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policies)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: "Đã lưu Chính sách & Điều khoản thành công!" });
      } else {
        setMessage({ type: 'error', text: "Lỗi khi lưu chính sách." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingPolicy(false);
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

  return (
    <div className="split-layout">
      {/* SIDEBAR */}
      <aside className="panel">
        <div className="panel-header">Menu Cấu Hình</div>
        <div style={{ padding: '15px', borderBottom: '1px solid #eee', background: '#fff' }}>
          <button style={tabBtnStyle(activeTab === 'footer')} onClick={() => { setActiveTab('footer'); setMessage(null); }}>
            <span>⚙️</span> Cấu hình Footer
          </button>
          <button style={tabBtnStyle(activeTab === 'notifications')} onClick={() => { setActiveTab('notifications'); setMessage(null); }}>
            <span>🔔</span> Quản lý Thông báo
          </button>
          <button style={tabBtnStyle(activeTab === 'policies')} onClick={() => { setActiveTab('policies'); setMessage(null); }}>
            <span>📄</span> Chính sách & Điều khoản
          </button>
        </div>

        {activeTab === 'notifications' && (
          <div className="list-group" style={{ marginTop: '0', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            {notis.map(item => (
              <div key={item.id} className="list-item" onClick={() => handleEditNoti(item)} style={{ cursor: 'pointer', borderLeft: item.id === notiForm.id ? '4px solid #0066cc' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#333' }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>{item.date}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteNoti(item.id); }} style={{ background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>
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
            borderRadius: '6px',
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: message.type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
          }}>
            {message.text}
          </div>
        )}

        {/* TAB FOOTER */}
        {activeTab === 'footer' && (
          <>
            <div className="panel-header">Chỉnh Sửa Nội Dung Footer</div>
            <div className="form-section">
              <form onSubmit={handleSaveFooter}>

                {/* 1. THÔNG TIN LIÊN HỆ */}
                <h5 style={{ borderBottom: '2px solid #0066cc', paddingBottom: '8px', marginBottom: '15px', color: '#0066cc', fontWeight: '600' }}>1. Thông tin liên hệ</h5>
                <div className="form-group"><label className="form-label">Tên Công Ty</label><input type="text" className="form-control" value={footerConfig.companyName} onChange={e => setFooterConfig({ ...footerConfig, companyName: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Chi nhánh</label><input type="text" className="form-control" value={footerConfig.branch} onChange={e => setFooterConfig({ ...footerConfig, branch: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Địa chỉ</label><input type="text" className="form-control" value={footerConfig.address} onChange={e => setFooterConfig({ ...footerConfig, address: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group"><label className="form-label">Email</label><input type="text" className="form-control" value={footerConfig.email} onChange={e => setFooterConfig({ ...footerConfig, email: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Giờ làm việc</label><input type="text" className="form-control" value={footerConfig.workingHours} onChange={e => setFooterConfig({ ...footerConfig, workingHours: e.target.value })} /></div>
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
                    <input type="text" className="form-control" placeholder="Tiêu đề..." value={tempDoc.title} onChange={e => setTempDoc({ ...tempDoc, title: e.target.value })} style={{ fontSize: '13px' }} />
                    <input type="text" className="form-control" placeholder="Link (URL)..." value={tempDoc.url} onChange={e => setTempDoc({ ...tempDoc, url: e.target.value })} style={{ fontSize: '13px' }} />

                    <button type="button" onClick={handleSaveDoc}
                      style={{
                        height: '38px', whiteSpace: 'nowrap', fontWeight: '600',
                        background: editingDocIndex !== null ? '#28a745' : '#0066cc',
                        color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 15px'
                      }}>
                      {editingDocIndex !== null ? "✓ Lưu thay đổi" : "+ Thêm"}
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
                <div className="form-group"><textarea className="form-control" rows="2" value={footerConfig.copyright} onChange={e => setFooterConfig({ ...footerConfig, copyright: e.target.value })} /></div>

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
          <div className="form-section">
            <div className="panel-header">
              {isEditingNoti ? "Chỉnh sửa Thông báo" : "Tạo Thông báo Mới"}
            </div>
            <form onSubmit={handleSubmitNoti}>
              <div className="form-group"><label className="form-label">Tiêu đề</label><input type="text" className="form-control" value={notiForm.title} onChange={e => setNotiForm({ ...notiForm, title: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group"><label className="form-label">Ngày</label><input type="text" className="form-control" value={notiForm.date} onChange={e => setNotiForm({ ...notiForm, date: e.target.value })} /></div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '30px' }}>
                  <input type="checkbox" checked={notiForm.isNew} onChange={e => setNotiForm({ ...notiForm, isNew: e.target.checked })} style={{ width: '20px', height: '20px', marginRight: '10px' }} />
                  <label>Badge MỚI</label>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Link</label><input type="text" className="form-control" value={notiForm.link} onChange={e => setNotiForm({ ...notiForm, link: e.target.value })} /></div>
              <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', padding: '10px' }}>{isEditingNoti ? "CẬP NHẬT" : "ĐĂNG"}</button>
            </form>
          </div>
        )}

        {/* TAB POLICIES - CHÍNH SÁCH & ĐIỀU KHOẢN */}
        {activeTab === 'policies' && (
          <>
            <div className="panel-header">Quản lý Chính sách & Điều khoản</div>
            <div className="form-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                {/* CHÍNH SÁCH BẢO MẬT */}
                <div>
                  <h5 style={{ borderBottom: '2px solid #28a745', paddingBottom: '8px', marginBottom: '15px', color: '#28a745', fontWeight: '600' }}>
                    📋 Chính sách Bảo mật
                  </h5>
                  <div className="form-group">
                    <label className="form-label">Nội dung (hỗ trợ Markdown)</label>
                    <textarea
                      className="form-control"
                      rows="15"
                      value={policies.privacyPolicy}
                      onChange={e => setPolicies({ ...policies, privacyPolicy: e.target.value })}
                      style={{ fontFamily: 'monospace', fontSize: '14px' }}
                    />
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Hỗ trợ định dạng Markdown: # Tiêu đề, **in đậm**, *nghiêng*, - danh sách
                  </div>
                </div>

                {/* ĐIỀU KHOẢN SỬ DỤNG */}
                <div>
                  <h5 style={{ borderBottom: '2px solid #17a2b8', paddingBottom: '8px', marginBottom: '15px', color: '#17a2b8', fontWeight: '600' }}>
                    📜 Điều khoản Sử dụng
                  </h5>
                  <div className="form-group">
                    <label className="form-label">Nội dung (hỗ trợ Markdown)</label>
                    <textarea
                      className="form-control"
                      rows="15"
                      value={policies.termsOfService}
                      onChange={e => setPolicies({ ...policies, termsOfService: e.target.value })}
                      style={{ fontFamily: 'monospace', fontSize: '14px' }}
                    />
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Hỗ trợ định dạng Markdown: # Tiêu đề, **in đậm**, *nghiêng*, - danh sách
                  </div>
                </div>
              </div>

              {/* XEM TRƯỚC */}
              <div style={{ marginBottom: '30px' }}>
                <h5 style={{ borderBottom: '2px solid #6c757d', paddingBottom: '8px', marginBottom: '15px', color: '#6c757d', fontWeight: '600' }}>
                  👁️ Xem trước
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', background: '#f8f9fa', maxHeight: '300px', overflowY: 'auto' }}>
                    <h4>Chính sách Bảo mật</h4>
                    <div style={{ whiteSpace: 'pre-line', fontSize: '14px' }}>
                      {policies.privacyPolicy}
                    </div>
                  </div>
                  <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', background: '#f8f9fa', maxHeight: '300px', overflowY: 'auto' }}>
                    <h4>Điều khoản Sử dụng</h4>
                    <div style={{ whiteSpace: 'pre-line', fontSize: '14px' }}>
                      {policies.termsOfService}
                    </div>
                  </div>
                </div>
              </div>

              {/* NÚT LƯU */}
              <div className="form-actions-footer">
                <button
                  type="button"
                  onClick={handleSavePolicies}
                  className="btn btn-success"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                  disabled={savingPolicy}
                >
                  {savingPolicy ? "Đang lưu..." : "💾 LƯU CHÍNH SÁCH & ĐIỀU KHOẢN"}
                </button>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
                  Lưu ý: Các chính sách này sẽ hiển thị công khai trên website
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}