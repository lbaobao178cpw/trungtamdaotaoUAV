import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Edit, Trash2, RefreshCw, Plus, Save, X, CheckCircle2, AlertCircle,
  Mail, Phone, Shield, UserCircle, MapPin, Calendar, CreditCard, Award, Search
} from "lucide-react";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { API_ENDPOINTS, MESSAGES, VALIDATION } from "../../constants/api";
import { notifySuccess, notifyError } from "../../lib/notifications";
import "../admin/Admin/Admin.css";

const initialUserState = {
  id: "", full_name: "", email: "", phone: "", role: "student", is_active: true, password: "",
  // Các trường profile (chỉ để hiển thị hoặc update sau này)
  identity_number: "", address: "", birth_date: "", gender: "", target_tier: "",
};

export default function UserManager() {
  const [form, setForm] = useState(initialUserState);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // State để mở rộng xem chi tiết
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [addressMode, setAddressMode] = useState('other'); // 'select' or 'other'
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [street, setStreet] = useState('');

  // === State cho điểm số ===
  const [userScores, setUserScores] = useState({});
  const [loadingScores, setLoadingScores] = useState({});

  // === FETCH USERS WITH CUSTOM HOOK ===
  const { data: usersData, loading, refetch: refreshUsers } = useApi(API_ENDPOINTS.USERS);
  const allUsers = useMemo(() => Array.isArray(usersData) ? usersData : [], [usersData]);

  const users = useMemo(() => {
    return allUsers.filter(user => {
      const search = searchTerm.toLowerCase();
      return (
        user.full_name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.phone?.toLowerCase().includes(search) ||
        String(user.id).includes(search)
      );
    });
  }, [allUsers, searchTerm]);

  const { mutate: saveUser } = useApiMutation();

  // === Fetch điểm số của user khi expand ===
  const fetchUserScores = async (userId) => {
    if (userScores[userId] || loadingScores[userId]) return;

    setLoadingScores(prev => ({ ...prev, [userId]: true }));
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_ENDPOINTS.USERS}/${userId}/scores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserScores(prev => ({ ...prev, [userId]: data }));
      }
    } catch (error) {
      console.error('Lỗi lấy điểm số:', error);
    } finally {
      setLoadingScores(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAddNew = useCallback(() => {
    setForm(initialUserState);
    setIsEditing(false);
    setShowDetails(false);
    setAddressMode('other');
    setSelectedProvince('');
    setSelectedWard('');
    setStreet('');
  }, []);

  const handleEditClick = (user) => {
    // Convert stored birth_date to input-friendly YYYY-MM-DD
    const formatBirthForInput = (d) => {
      if (!d) return '';
      try {
        // If already ISO-like, normalize
        const isoMatch = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

        // Detect DD/MM/YYYY or DD-MM-YYYY
        const dmMatch = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmMatch) {
          const dd = dmMatch[1].padStart(2, '0');
          const mm = dmMatch[2].padStart(2, '0');
          const yyyy = dmMatch[3];
          return `${yyyy}-${mm}-${dd}`;
        }

        // Fallback to Date parse
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) {
          const yyyy = parsed.getFullYear();
          const mm = String(parsed.getMonth() + 1).padStart(2, '0');
          const dd = String(parsed.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      } catch (e) {
        // ignore
      }
      return '';
    };

    setForm({
      ...user,
      is_active: user.is_active === 1 || user.is_active === true,
      password: "",
      gender: normalizeGender(user.gender),
      birth_date: formatBirthForInput(user.birth_date),
      // keep original address in form so it's available if needed
      address: user.address || ''
    });
    // Immediately populate street and form.address so user sees existing address right away
    setStreet(user.address || '');
    setForm(prev => ({ ...prev, address: user.address || '' }));
    setShowDetails(true);
    const mode = user.address ? 'select' : 'other';
    setAddressMode(mode);
    if (mode === 'select') {
      // load provinces and try to match existing address into selects
      (async () => {
        const provs = await fetchProvinces();
        if (!provs || provs.length === 0) return;
        const addr = String(user.address || '').toLowerCase();
        const matched = provs.find(p => addr.includes(String(p.name).toLowerCase()));
        if (matched) {
          // Keep selected IDs as strings so they match <select> option values
          setSelectedProvince(String(matched.id));
          const wardsData = await fetchWards(matched.id);
          if (wardsData && wardsData.length) {
            const matchedWard = wardsData.find(w => addr.includes(String(w.name).toLowerCase()));
            if (matchedWard) setSelectedWard(String(matchedWard.id));
            // extract street (text before ward name or province)
            let idx = -1;
            if (matchedWard) idx = addr.indexOf(String(matchedWard.name).toLowerCase());
            if ((idx === -1 || idx === 0) && matched) idx = addr.indexOf(String(matched.name).toLowerCase());
            if (idx > 0) {
              setStreet(user.address.substring(0, idx).replace(/,\s*$/, ''));
            } else {
              // fallback: put entire address into street so input shows something
              setStreet(user.address);
            }
          } else {
            // no wards but province matched: put entire address into street
            setStreet(user.address);
          }
          // also ensure form.address holds the original address so textarea shows when switching
          setForm(prev => ({ ...prev, address: user.address || '' }));
        } else {
          // if no province matched, place whole address into street input so user sees it
          setStreet(user.address || '');
          setForm(prev => ({ ...prev, address: user.address || '' }));
        }
      })();
    }
    setIsEditing(true);
    // Cuộn lên đầu form
    document.querySelector('.admin-content-wrapper')?.scrollTo(0, 0);
  };

  // Normalize various stored gender values into select-friendly values
  const normalizeGender = (g) => {
    if (!g) return '';
    const s = String(g).toLowerCase();
    if (s === 'nam') return 'nam';
    if (s === 'nữ' || s === 'nu') return 'nữ';
    return '';
  };

  const displayGender = (g) => {
    if (!g) return '--';
    const s = String(g).toLowerCase();
    if (s === 'nam') return 'Nam';
    if (s === 'nữ' || s === 'nu') return 'Nữ';
    return '--';
  };

  // Normalize gender value to storage format ('Nam'/'Nữ')
  const normalizeGenderForStorage = (g) => {
    if (!g) return null;
    const s = String(g).trim();
    if (!s) return null;
    const lowered = s.toLowerCase();
    const stripped = lowered.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['nam', 'n', 'male', 'm'].includes(stripped)) return 'Nam';
    if (['nu', 'nu', 'female', 'f'].includes(stripped) || stripped === 'nu') return 'Nữ';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // location helpers
  const fetchProvinces = async () => {
    try {
      const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
        ? import.meta.env.VITE_API_BASE
        : `${window.location.protocol}//${window.location.hostname}:5000`;
      const url = `${base}/api/location/provinces`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error('fetchProvinces bad status', res.status, url);
        return [];
      }
      const data = await res.json();
      setProvinces(data || []);
      return data || [];
    } catch (e) {
      console.error('fetchProvinces', e);
      return [];
    }
  };

  const fetchWards = async (provinceId) => {
    try {
      if (!provinceId) {
        setWards([]);
        return [];
      }
      const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
        ? import.meta.env.VITE_API_BASE
        : `${window.location.protocol}//${window.location.hostname}:5000`;
      const url = `${base}/api/location/wards?province_id=${provinceId}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error('fetchWards bad status', res.status, url);
        setWards([]);
        return [];
      }
      const data = await res.json();
      setWards(data || []);
      return data || [];
    } catch (e) {
      console.error('fetchWards', e);
      setWards([]);
      return [];
    }
  };

  const applySelectedAddress = (provId = selectedProvince, wardId = selectedWard, st = street) => {
    const prov = provinces.find(p => String(p.id) === String(provId));
    const ward = wards.find(w => String(w.id) === String(wardId));
    let composed = '';
    if (st) composed += st + ', ';
    if (ward) composed += ward.name + ', ';
    if (prov) composed += prov.name;
    if (composed) setForm(prev => ({ ...prev, address: composed }));
  };

  // when addressMode changes to select, load provinces
  useEffect(() => {
    if (showDetails && addressMode === 'select') fetchProvinces();
  }, [showDetails, addressMode]);

  // load wards when province changes
  useEffect(() => {
    if (selectedProvince) fetchWards(selectedProvince);
    else {
      setWards([]);
      setSelectedWard('');
    }
  }, [selectedProvince]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${API_ENDPOINTS.USERS}/${form.id}` : API_ENDPOINTS.USERS;
      const payload = { ...form, is_active: form.is_active };
      // ensure gender is stored in canonical capitalized form
      if (payload.gender) payload.gender = normalizeGenderForStorage(payload.gender);
      // ensure we don't send removed fields
      if (payload.hasOwnProperty('uav_type')) delete payload.uav_type;

      await saveUser({
        url: url,
        method: method,
        data: payload,
      });

      const successMsg = `${isEditing ? "Cập nhật" : "Tạo mới"} thành công!`;
      notifySuccess(successMsg);
      if (!isEditing) handleAddNew();
      refreshUsers();
    } catch (error) {
      notifyError(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa người dùng này sẽ xóa toàn bộ dữ liệu liên quan. Tiếp tục?")) return;
    try {
      await saveUser({
        url: `${API_ENDPOINTS.USERS}/${id}`,
        method: "DELETE",
      });
      notifySuccess("Đã xóa thành công!");
      refreshUsers();
    } catch (error) {
      notifyError("Lỗi khi xóa");
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin": return "#dc3545";
      case "instructor": return "#0066cc";
      default: return "#28a745";
    }
  };

  const toggleExpand = (id) => {
    if (expandedUserId === id) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(id);
      // Fetch điểm số khi mở rộng
      fetchUserScores(id);
    }
  };

  // Helper function để lấy màu điểm
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="solution-manager-container" style={{ display: "flex", gap: "24px", marginTop: "20px", flexDirection: "row-reverse" }}>

      {/* PANEL 1: FORM (Giữ nguyên, chỉ thêm validate) */}
      <div className="panel" style={{ flex: 1, height: 'fit-content' }}>
        <div className="panel-header">
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isEditing ? <Edit size={18} /> : <Plus size={18} />}
            {isEditing ? `Sửa #${form.id}` : "Thêm Mới"}
          </span>
          {isEditing && <button onClick={handleAddNew} className="btn btn-sm btn-secondary"><X size={14} /> Hủy</button>}
        </div>

        <div className="form-section">
          <form onSubmit={handleSave}>
            <div className="form-group"><label className="form-label">Họ và tên</label><input className="form-control" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">SĐT (Tài khoản)</label><input type="tel" className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
            {!isEditing && <div className="form-group"><label className="form-label">Mật khẩu</label><input className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mặc định: 123456" /></div>}

            <div style={{ display: "flex", gap: "10px" }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Vai trò</label><select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="student">Học viên</option><option value="admin">Admin</option><option value="instructor">Giảng viên</option></select></div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Trạng thái</label><select className="form-control" value={form.is_active ? "true" : "false"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}><option value="true">Hoạt động</option><option value="false">Khóa</option></select></div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowDetails(s => !s)} style={{ padding: '6px 10px' }}>
                {showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết hồ sơ'}
              </button>
              <small style={{ color: '#666' }}>Bạn đang {isEditing ? `chỉnh sửa #${form.id}` : 'tạo người dùng mới'}</small>
            </div>

            {showDetails && (
              <div style={{ marginTop: 12, padding: 12, background: '#fbfbfc', border: '1px solid #eee', borderRadius: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group"><label className="form-label">CCCD</label><input className="form-control" value={form.identity_number || ''} onChange={(e) => setForm({ ...form, identity_number: e.target.value })} placeholder="Số định danh" /></div>
                  <div className="form-group"><label className="form-label">Ngày sinh</label><input type="date" className="form-control" value={form.birth_date || ''} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>

                  <div className="form-group"><label className="form-label">Giới tính</label>
                    <select className="form-control" value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="">Chọn</option>
                      <option value="nam">Nam</option>
                      <option value="nữ">Nữ</option>
                    </select>
                  </div>

                  <div className="form-group"><label className="form-label">Hạng</label>
                    <select className="form-control" value={form.target_tier || ''} onChange={(e) => setForm({ ...form, target_tier: e.target.value })}>
                      <option value="">Chưa chọn</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Địa chỉ</label>
                    {addressMode === 'select' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
                        <div>
                          <label className="form-label">Tỉnh/TP</label>
                          <select className="form-control" value={selectedProvince || ''} onChange={(e) => { setSelectedProvince(e.target.value); }}>
                            <option value="">Chọn tỉnh</option>
                            {provinces.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Xã/Phường</label>
                          <select className="form-control" value={selectedWard || ''} onChange={(e) => { setSelectedWard(e.target.value); applySelectedAddress(undefined, e.target.value); }} disabled={!selectedProvince}>
                            <option value="">Chọn xã/phường</option>
                            {wards.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
                          </select>
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                          <label className="form-label">Đường / Số nhà (tuỳ chọn)</label>
                          <input className="form-control" value={street} onChange={(e) => { setStreet(e.target.value); }} placeholder="Ví dụ: 123 Đường ABC" />
                        </div>

                      </div>
                    ) : (
                      <textarea className="form-control" rows={2} value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Địa chỉ liên hệ" />
                    )}
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {loading ? <RefreshCw className="spin" size={18} /> : <Save size={18} />} Lưu thông tin
            </button>
          </form>
        </div>
      </div>

      {/* PANEL 2: DANH SÁCH CHI TIẾT */}
      <div className="panel" style={{ flex: 1.8 }}>
        <div className="panel-header" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><Users size={18} /> Danh sách ({users.length})</span>
          <button className="btn btn-success btn-sm" onClick={refreshUsers}><RefreshCw size={14} /> Làm mới</button>
        </div>

        <div style={{ padding: "12px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", gap: "12px", alignItems: "center" }}>
          <Search size={18} color="#999" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, SĐT, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              border: "1px solid #ddd",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "14px",
              outline: "none"
            }}
            onFocus={(e) => e.target.style.borderColor = "#0066cc"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          />
        </div>

        <div className="list-group">
          {users.map((user) => {
            const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
            return (
              <div key={user.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', padding: "15px" }}>

                {/* Header của User Card */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ minWidth: "50px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#0066cc", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "18px", flexShrink: 0, border: "2px solid #cce3ff" }}>
                      {initials}
                    </div>
                    <span style={{ fontSize: "10px", color: "#999", fontWeight: "600", background: "#f0f0f0", padding: "2px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>ID: {user.id}</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <div className="item-title" style={{ fontSize: "15px", fontWeight: "bold" }}>{user.full_name}</div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", color: "#fff", backgroundColor: getRoleBadgeColor(user.role), fontWeight: "600", textTransform: "capitalize" }}>
                          {user.role}
                        </span>
                        {user.target_tier && (
                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", color: "#fff", backgroundColor: "#f59e0b", fontWeight: "600" }}>
                            Hạng {user.target_tier}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "15px", fontSize: "13px", color: "#555", flexWrap: "wrap" }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {user.email || "--"}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {user.phone}</div>
                    </div>
                  </div>
                </div>

                {/* Nút mở rộng chi tiết */}
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => toggleExpand(user.id)} style={{ background: 'none', border: 'none', color: '#0066cc', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    {expandedUserId === user.id ? "Thu gọn ▲" : "Xem chi tiết ▼"}
                  </button>

                  <div className="item-actions" style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleEditClick(user)} className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '12px' }}><Edit size={12} /> Sửa</button>
                    <button onClick={() => handleDelete(user.id)} className="btn btn-danger btn-sm" style={{ padding: '4px 8px', fontSize: '12px' }}><Trash2 size={12} /> Xóa</button>
                  </div>
                </div>

                {/* Phần chi tiết (chỉ hiện khi expand) */}
                {expandedUserId === user.id && (
                  <div style={{ marginTop: '10px', background: '#f9fafb', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
                    {/* Thông tin cá nhân */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><CreditCard size={14} color="#666" /> <strong>CCCD:</strong> {user.identity_number || "Chưa cập nhật"}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Calendar size={14} color="#666" /> <strong>Ngày sinh:</strong> {user.birth_date ? new Date(user.birth_date).toLocaleDateString('vi-VN') : "--"}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><UserCircle size={14} color="#666" /> <strong>Giới tính:</strong> {displayGender(user.gender)}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Award size={14} color="#666" /> <strong>Hạng thi:</strong> {user.target_tier || "Chưa đăng ký"}</div>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <MapPin size={14} color="#666" style={{ marginTop: '2px' }} />
                      <span><strong>Địa chỉ:</strong> {user.address || "Chưa cập nhật"}</span>
                    </div>

                    {/* Phần điểm số khóa học */}
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📊 Điểm số khóa học
                      </h4>

                      {loadingScores[user.id] ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                          <RefreshCw size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                          <span style={{ marginLeft: '8px' }}>Đang tải...</span>
                        </div>
                      ) : userScores[user.id]?.courseScores?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {userScores[user.id].courseScores.map((course, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              background: '#fff',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>
                                  {course.course_title}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                                  <span>Tiến độ: <strong>{parseFloat(course.progress_percentage || 0).toFixed(0)}%</strong></span>
                                  <span>Quiz: <strong style={{ color: getScoreColor(course.quiz_score || 0) }}>{parseFloat(course.quiz_score || 0).toFixed(1)}</strong></span>
                                </div>
                              </div>
                              <div style={{
                                minWidth: '60px',
                                textAlign: 'center',
                                padding: '6px 12px',
                                background: getScoreColor(course.overall_score || 0),
                                color: '#fff',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '14px'
                              }}>
                                {parseFloat(course.overall_score || 0).toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>
                          Chưa có dữ liệu điểm số
                        </div>
                      )}

                      {/* Lịch sử Quiz gần đây */}
                      {userScores[user.id]?.quizResults?.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>
                            📝 Quiz gần đây
                          </h5>
                          <div style={{ fontSize: '12px' }}>
                            {userScores[user.id].quizResults.slice(0, 5).map((quiz, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                                borderBottom: idx < 4 ? '1px dashed #e5e7eb' : 'none'
                              }}>
                                <span style={{ color: '#6b7280' }}>
                                  {quiz.lesson_title || quiz.course_title} - {new Date(quiz.created_at).toLocaleDateString('vi-VN')}
                                </span>
                                <span style={{
                                  fontWeight: '600',
                                  color: getScoreColor(quiz.score)
                                }}>
                                  {quiz.correct_answers}/{quiz.total_questions} ({parseFloat(quiz.score).toFixed(1)} điểm)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}