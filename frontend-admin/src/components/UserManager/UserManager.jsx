import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Edit, Trash2, RefreshCw, Plus, Save, X, CheckCircle2, AlertCircle,
  Mail, Phone, Shield, UserCircle, MapPin, Calendar, CreditCard, Award
} from "lucide-react";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { API_ENDPOINTS, MESSAGES, VALIDATION } from "../../constants/api";
import "../admin/Admin/Admin.css";

const initialUserState = {
  id: "", full_name: "", email: "", phone: "", role: "student", is_active: true, password: "",
  // Các trường profile (chỉ để hiển thị hoặc update sau này)
  identity_number: "", address: "", birth_date: "", gender: "", target_tier: ""
};

export default function UserManager() {
  const [form, setForm] = useState(initialUserState);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState(null);

  // State để mở rộng xem chi tiết
  const [expandedUserId, setExpandedUserId] = useState(null);

  // === FETCH USERS WITH CUSTOM HOOK ===
  const { data: usersData, loading, refetch: refreshUsers } = useApi(API_ENDPOINTS.USERS);
  const users = useMemo(() => Array.isArray(usersData) ? usersData : [], [usersData]);
  const { mutate: saveUser } = useApiMutation();

  const handleAddNew = useCallback(() => {
    setForm(initialUserState);
    setIsEditing(false);
    setMessage(null);
  }, []);

  const handleEditClick = (user) => {
    setForm({
      ...user,
      is_active: user.is_active === 1 || user.is_active === true,
      password: "",
    });
    setIsEditing(true);
    setMessage(null);
    // Cuộn lên đầu form
    document.querySelector('.admin-content-wrapper')?.scrollTo(0, 0);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${API_ENDPOINTS.USERS}/${form.id}` : API_ENDPOINTS.USERS;
      const payload = { ...form, is_active: form.is_active };

      await saveUser({
        url: url,
        method: method,
        data: payload,
      });

      setMessage({ type: "success", text: `${isEditing ? "Cập nhật" : "Tạo mới"} thành công!` });
      if (!isEditing) handleAddNew();
      refreshUsers();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa người dùng này sẽ xóa toàn bộ dữ liệu liên quan. Tiếp tục?")) return;
    try {
      await saveUser({
        url: `${API_ENDPOINTS.USERS}/${id}`,
        method: "DELETE",
      });
      setMessage({ type: "success", text: "Đã xóa thành công!" });
      refreshUsers();
    } catch (error) {
      setMessage({ type: "error", text: "Lỗi khi xóa" });
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
    setExpandedUserId(expandedUserId === id ? null : id);
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
          {message && (
            <div className={`message-box ${message.type === "success" ? "msg-success" : "msg-error"}`} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-group"><label className="form-label">Họ và tên</label><input className="form-control" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">SĐT (Tài khoản)</label><input type="tel" className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
            {!isEditing && <div className="form-group"><label className="form-label">Mật khẩu</label><input className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mặc định: 123456" /></div>}

            <div style={{ display: "flex", gap: "10px" }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Vai trò</label><select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="student">Học viên</option><option value="admin">Admin</option><option value="instructor">Giảng viên</option></select></div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Trạng thái</label><select className="form-control" value={form.is_active ? "true" : "false"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}><option value="true">Hoạt động</option><option value="false">Khóa</option></select></div>
            </div>

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

        <div className="list-group">
          {users.map((user) => (
            <div key={user.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', padding: "15px" }}>

              {/* Header của User Card */}
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: "#f0f7ff", border: "1px solid #cce3ff", color: "#0066cc", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "15px", flexShrink: 0 }}>
                  <UserCircle size={28} />
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><CreditCard size={14} color="#666" /> <strong>CCCD:</strong> {user.identity_number || "Chưa cập nhật"}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Calendar size={14} color="#666" /> <strong>Ngày sinh:</strong> {user.birth_date ? new Date(user.birth_date).toLocaleDateString('vi-VN') : "--"}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><UserCircle size={14} color="#666" /> <strong>Giới tính:</strong> {user.gender || '--'}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Award size={14} color="#666" /> <strong>Hạng thi:</strong> {user.target_tier || "Chưa đăng ký"}</div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <MapPin size={14} color="#666" style={{ marginTop: '2px' }} />
                    <span><strong>Địa chỉ:</strong> {user.address || "Chưa cập nhật"}</span>
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}