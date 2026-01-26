import React, { useState, useMemo, useRef, useEffect } from "react";
import {
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    Save,
    X,
    CheckCircle2,
    AlertCircle,
    FileCheck,
    FileText,
    Calendar,
    Search,
    ChevronDown,
} from "lucide-react";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { API_ENDPOINTS, MESSAGES, VALIDATION } from "../../constants/api";
import { notifySuccess, notifyError } from "../../lib/notifications";
import "../admin/Admin/Admin.css";

const initialLicenseState = {
    id: "",
    licenseNumber: "",
    userId: null,
    category: "",
    name: "",
    idNumber: "",
    issueDate: "",
    expireDate: "",
    status: "active",
    drones: [],
    licenseImage: null,
};

export default function LookupManager() {
    const [form, setForm] = useState(initialLicenseState);
    const [isEditing, setIsEditing] = useState(false);
    const [userSearchInput, setUserSearchInput] = useState("");
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [message, setMessage] = useState(null);
    const userSearchRef = useRef(null);

    // === FETCH DATA WITH CUSTOM HOOK ===
    const { data: licensesData, loading, refetch: refreshLicenses } = useApi(
        API_ENDPOINTS.LICENSES || "/api/licenses"
    );
    const { data: usersData } = useApi(API_ENDPOINTS.USERS);
    const users = useMemo(() => Array.isArray(usersData) ? usersData : [], [usersData]);
    const licenses = useMemo(
        () => Array.isArray(licensesData) ? licensesData : [],
        [licensesData]
    );
    const { mutate: saveLicense } = useApiMutation();

    // === FILTER USERS BY SEARCH ===
    const filteredUsers = useMemo(() => {
        if (!userSearchInput.trim()) return users;
        const search = userSearchInput.toLowerCase();
        return users.filter(u =>
            String(u.id).includes(search) ||
            (u.full_name || '').toLowerCase().includes(search) ||
            (u.identity_number || '').toLowerCase().includes(search) ||
            (u.email || '').toLowerCase().includes(search) ||
            (u.phone || '').toLowerCase().includes(search)
        );
    }, [users, userSearchInput]);

    // === FIND EXISTING LICENSE FOR USER ===
    const getUserLicense = (userId) => {
        if (!userId) return null;
        return licenses.find(l => l.userId === userId);
    };

    // === CLOSE DROPDOWN ON OUTSIDE CLICK ===
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userSearchRef.current && !userSearchRef.current.contains(e.target)) {
                setShowUserDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // === SELECT USER HANDLER ===
    const handleSelectUser = (user) => {
        const existingLicense = getUserLicense(user.id);
        setForm({
            ...form,
            userId: Number(user.id),
            name: user.full_name || '',
            idNumber: user.identity_number || '',
            category: user.target_tier ? (user.target_tier.length === 1 ? `Hạng ${user.target_tier}` : user.target_tier) : 'Hạng A',
            licenseNumber: existingLicense?.licenseNumber || form.licenseNumber,
        });
        setUserSearchInput(user.full_name || String(user.id));
        setShowUserDropdown(false);

        // Thông báo nếu user đã có giấy phép
        if (existingLicense) {
            notifyWarning(`Người dùng này đã có giấy phép: ${existingLicense.licenseNumber}`);
        }
    };

    // === HANDLERS ===
    const handleAddNew = () => {
        setForm(initialLicenseState);
        setUserSearchInput("");
        setShowUserDropdown(false);
        setIsEditing(false);
        setMessage(null);
    };

    const handleEditClick = (license) => {
        const selectedUser = users.find(u => u.id === license.userId);
        setForm({
            ...license,
            status: license.status || "active",
        });
        setUserSearchInput(selectedUser?.full_name || String(license.userId) || "");
        setShowUserDropdown(false);
        setIsEditing(true);
        setMessage(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            // Kiểm tra nếu tạo mới (không phải edit)
            if (!isEditing) {
                // Kiểm tra xem licenseNumber đã tồn tại chưa
                const licenseExists = licenses.some(l => l.licenseNumber === form.licenseNumber);
                if (licenseExists) {
                    notifyError(`Số giấy phép "${form.licenseNumber}" đã tồn tại rồi`);
                    return;
                }
            }

            const method = isEditing ? "PUT" : "POST";
            const url = isEditing
                ? `${API_ENDPOINTS.LICENSES}/${form.licenseNumber}`
                : API_ENDPOINTS.LICENSES;

            const payload = {
                licenseNumber: form.licenseNumber,
                userId: form.userId || null,
                category: form.category,
                name: form.name,
                idNumber: form.idNumber,
                issueDate: form.issueDate,
                expireDate: form.expireDate,
                status: form.status,
                drones: form.drones || [],
                licenseImage: form.licenseImage || null,
            };

            await saveLicense({
                url: url,
                method: method,
                data: payload,
            });

            const successMsg = `${isEditing ? "Cập nhật" : "Tạo mới"} thành công!`;
            notifySuccess(successMsg);

            if (!isEditing) handleAddNew();
            refreshLicenses();
        } catch (error) {
            // Kiểm tra lỗi trùng số giấy phép
            if (
                error?.response?.data?.error?.includes("đã tồn tại") ||
                (typeof error?.message === "string" && error.message.includes("đã tồn tại"))
            ) {
                notifyError("Số giấy phép đã tồn tại. Vui lòng nhập số khác!");
            } else {
                notifyError(error.message);
            }
        }
    };

    const handleDelete = async (licenseNumber) => {
        if (!window.confirm("Bạn có chắc muốn xóa giấy phép này?")) return;
        try {
            await saveLicense({
                url: `${API_ENDPOINTS.LICENSES}/${licenseNumber}`,
                method: "DELETE",
            });
            notifySuccess("Đã xóa thành công!");
            refreshLicenses();
            if (form.licenseNumber === licenseNumber) handleAddNew();
        } catch (error) {
            notifyError("Lỗi khi xóa");
        }
    };

    const handleAddDrone = () => {
        const newDrone = { model: "", serial: "", weight: "", status: "active" };
        setForm({
            ...form,
            drones: [...(form.drones || []), newDrone],
        });
    };

    const handleRemoveDrone = (index) => {
        setForm({
            ...form,
            drones: form.drones.filter((_, i) => i !== index),
        });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setForm({
                    ...form,
                    licenseImage: event.target.result,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setForm({
            ...form,
            licenseImage: null,
        });
    };

    const handleUpdateDrone = (index, field, value) => {
        const updatedDrones = [...form.drones];
        updatedDrones[index] = { ...updatedDrones[index], [field]: value };
        setForm({ ...form, drones: updatedDrones });
    };

    const getStatusBadgeColor = (status) => {
        if (status === "active") return "#22c55e";
        if (status === "expired") return "#ef4444";
        return "#f59e0b";
    };

    const getCategoryColor = (category) => {
        const c = String(category || '').replace(/Hạng\s*/i, '').trim();
        if (c === 'A') return "#0066cc";
        if (c === 'B') return "#d97706";
        return "#0066cc";
    };

    // Normalize tier value to single letter 'A'|'B'|'C' for display/storage
    const mapTier = (tier) => {
        if (tier === undefined || tier === null) return '';
        const s = String(tier).trim();
        if (!s) return '';
        const m = s.match(/[ABC]/i);
        if (m) return m[0].toUpperCase();
        // handle values like 'Hạng A'
        const parts = s.split(' ');
        if (parts.length >= 2 && /^[A-Ca-c]$/.test(parts[1])) return parts[1].toUpperCase();
        return s.toUpperCase();
    };
    const formatDate = (dateString) => {
        if (!dateString) return "--";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("vi-VN");
        } catch {
            return dateString;
        }
    };

    const getDaysUntilExpire = (expireDate) => {
        if (!expireDate) return null;
        const today = new Date();
        const expire = new Date(expireDate);
        const diffTime = expire - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };


    return (
        <div
            className="solution-manager-container"
            style={{
                display: "flex",
                gap: "24px",
                marginTop: "20px",
                flexDirection: "row-reverse",
            }}
        >
            {/* --- PANEL 1: FORM NHẬP LIỆU --- */}
            <div className="panel" style={{ flex: 1 }}>
                <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                        {isEditing
                            ? `Sửa Giấy phép #${form.licenseNumber}`
                            : "Thêm Giấy phép Mới"}
                    </span>
                    {isEditing && (
                        <button
                            type="button"
                            onClick={handleAddNew}
                            className="btn btn-sm btn-secondary"
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                        >
                            <X size={14} /> Hủy
                        </button>
                    )}
                </div>

                <div className="form-section">
                    <form onSubmit={handleSave}>
                        <div className="form-group" ref={userSearchRef} style={{ position: 'relative' }}>
                            <label className="form-label">Tìm Kiếm Người Dùng</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    padding: '8px 12px',
                                    backgroundColor: '#fff',
                                }}>
                                    <Search size={18} color="#999" />
                                    <input
                                        type="text"
                                        className="form-control"
                                        style={{
                                            border: 'none',
                                            outline: 'none',
                                            flex: 1,
                                            padding: 0,
                                            fontSize: '14px',
                                        }}
                                        placeholder="Nhập ID, tên, CCCD, email hoặc SĐT..."
                                        value={userSearchInput}
                                        onChange={(e) => {
                                            setUserSearchInput(e.target.value);
                                            setShowUserDropdown(true);
                                        }}
                                        onFocus={() => setShowUserDropdown(true)}
                                    />
                                </div>

                                {/* Dropdown */}
                                {showUserDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: '#fff',
                                        border: '1px solid #ddd',
                                        borderTop: 'none',
                                        borderRadius: '0 0 4px 4px',
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        zIndex: 1000,
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                    }}>
                                        {filteredUsers.length === 0 ? (
                                            <div style={{
                                                padding: '16px',
                                                textAlign: 'center',
                                                color: '#999',
                                                fontSize: '14px',
                                            }}>
                                                Không tìm thấy người dùng
                                            </div>
                                        ) : (
                                            filteredUsers.map(user => {
                                                const existingLicense = getUserLicense(user.id);
                                                return (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => handleSelectUser(user)}
                                                        style={{
                                                            padding: '12px 16px',
                                                            borderBottom: '1px solid #f0f0f0',
                                                            cursor: 'pointer',
                                                            transition: 'background-color 0.2s',
                                                            backgroundColor: form.userId === user.id ? '#e3f2fd' : '#fff',
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = form.userId === user.id ? '#e3f2fd' : '#f9f9f9'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = form.userId === user.id ? '#e3f2fd' : '#fff'}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 500, color: '#333' }}>
                                                                    {user.full_name || 'N/A'} (ID: {user.id})
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                                    CCCD: {user.identity_number || 'N/A'} | SĐT: {user.phone || 'N/A'}
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: '#0050b8', marginTop: '2px', fontWeight: 500 }}>
                                                                    Loại chứng chỉ: Hạng {user.target_tier || 'A'}
                                                                </div>
                                                            </div>
                                                            {existingLicense && (
                                                                <div style={{
                                                                    backgroundColor: '#dcf1e0',
                                                                    color: '#00a86b',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '3px',
                                                                    fontSize: '12px',
                                                                    fontWeight: 500,
                                                                    whiteSpace: 'nowrap',
                                                                }}>
                                                                    {existingLicense.licenseNumber}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* Selected User Info */}
                                {form.userId && (
                                    <div style={{
                                        marginTop: '12px',
                                        padding: '12px',
                                        backgroundColor: '#f0f7ff',
                                        border: '1px solid #d0e8ff',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                    }}>
                                        <div style={{ color: '#0050b8', fontWeight: 500, marginBottom: '8px' }}>
                                            ✓ Đã chọn: {users.find(u => u.id === form.userId)?.full_name || 'N/A'}
                                        </div>
                                        <div style={{ color: '#0050b8', marginBottom: '8px' }}>
                                            Loại chứng chỉ: <span style={{ fontWeight: 600 }}>Hạng {form.category.replace('Hạng ', '')}</span>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Số giấy phép</label>
                            <input
                                type="text"
                                className="form-control"
                                value={form.licenseNumber}
                                onChange={(e) =>
                                    setForm({ ...form, licenseNumber: e.target.value })
                                }
                                placeholder="DC-YYYY-XXXXXXX"
                                required
                            />
                        </div>


                        <div className="form-group">
                            <label className="form-label">Họ tên</label>
                            <input
                                type="text"
                                className="form-control"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Nhập họ tên"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">CCCD/CMND</label>
                            <input
                                type="text"
                                className="form-control"
                                value={form.idNumber}
                                onChange={(e) =>
                                    setForm({ ...form, idNumber: e.target.value })
                                }
                                placeholder="Số CCCD/CMND"
                                required
                            />
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Ngày cấp</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={form.issueDate}
                                    onChange={(e) =>
                                        setForm({ ...form, issueDate: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Ngày hết hạn</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={form.expireDate}
                                    onChange={(e) =>
                                        setForm({ ...form, expireDate: e.target.value })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Trạng thái</label>
                            <select
                                className="form-control"
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                            >
                                <option value="active">Đang hoạt động</option>
                                <option value="expired">Hết hạn</option>
                            </select>
                        </div>

                        {/* --- IMAGE SECTION --- */}
                        <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #eee" }}>
                            <label className="form-label" style={{ marginBottom: "12px" }}>Hình ảnh Giấy phép</label>
                            <div style={{
                                border: "2px dashed #ccc",
                                borderRadius: "8px",
                                padding: "24px",
                                textAlign: "center",
                                backgroundColor: "#fafafa",
                                cursor: "pointer",
                                transition: "all 0.3s",
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "#0066cc";
                                    e.currentTarget.style.backgroundColor = "#f0f7ff";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "#ccc";
                                    e.currentTarget.style.backgroundColor = "#fafafa";
                                }}
                                onClick={() => document.getElementById("licenseImageInput")?.click()}
                            >
                                {!form.licenseImage ? (
                                    <div>
                                        <div style={{ fontSize: "32px", marginBottom: "8px" }}>📷</div>
                                        <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "4px" }}>
                                            Nhấp để chọn hình ảnh
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#999" }}>
                                            PNG, JPG, GIF (Tối đa 5MB)
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <img
                                            src={form.licenseImage}
                                            alt="License"
                                            style={{
                                                maxWidth: "100%",
                                                maxHeight: "250px",
                                                borderRadius: "6px",
                                                marginBottom: "12px"
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveImage();
                                            }}
                                            className="btn btn-danger btn-sm"
                                            style={{ display: "flex", alignItems: "center", gap: "4px", margin: "0 auto" }}
                                        >
                                            <Trash2 size={14} /> Xóa hình ảnh
                                        </button>
                                    </div>
                                )}
                            </div>
                            <input
                                id="licenseImageInput"
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{ display: "none" }}
                            />
                        </div>

                        {/* --- DRONES SECTION --- */}
                        <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #eee" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <label className="form-label" style={{ margin: 0 }}>Thiết bị</label>
                                <button
                                    type="button"
                                    onClick={handleAddDrone}
                                    className="btn btn-success btn-sm"
                                    style={{ display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                    <Plus size={14} /> Thêm
                                </button>
                            </div>

                            {form.drones && form.drones.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {form.drones.map((drone, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                background: "#ffffff",
                                                border: "1px solid #ddd",
                                                borderRadius: "8px",
                                                padding: "16px",
                                                display: "grid",
                                                gridTemplateColumns: "1.2fr 1fr 100px 120px 44px",
                                                gap: "16px",
                                                alignItems: "center",
                                            }}
                                        >
                                            <div>
                                                <label style={{ fontSize: "11px", fontWeight: "600", color: "#999", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                                                    Mẫu
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={drone.model}
                                                    onChange={(e) => handleUpdateDrone(index, "model", e.target.value)}
                                                    placeholder="DJI Mavic 3"
                                                    style={{ fontSize: "13px" }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: "11px", fontWeight: "600", color: "#999", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                                                    Số seri
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={drone.serial}
                                                    onChange={(e) => handleUpdateDrone(index, "serial", e.target.value)}
                                                    placeholder="MAV39428472"
                                                    style={{ fontSize: "13px" }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: "11px", fontWeight: "600", color: "#999", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                                                    Trọng lượng
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={drone.weight || ""}
                                                    onChange={(e) => handleUpdateDrone(index, "weight", e.target.value)}
                                                    placeholder="249"
                                                    style={{ fontSize: "13px" }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: "11px", fontWeight: "600", color: "#999", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                                                    Trạng thái
                                                </label>
                                                <select
                                                    className="form-control"
                                                    value={drone.status}
                                                    onChange={(e) => handleUpdateDrone(index, "status", e.target.value)}
                                                    style={{ fontSize: "13px" }}
                                                >
                                                    <option value="active">Dùng</option>
                                                    <option value="inactive">Không</option>
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDrone(index)}
                                                className="btn btn-danger btn-sm"
                                                style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "36px", padding: "0" }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: "16px", background: "#f5f5f5", borderRadius: "8px", textAlign: "center", color: "#999", fontSize: "13px", border: "1px dashed #ddd" }}>
                                    Chưa có thiết bị. Nhấn "Thêm" để thêm mới.
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: "20px", borderTop: "1px solid #eee", paddingTop: 20 }}>
                            <button
                                type="submit"
                                className="btn btn-primary btn-block"
                                disabled={loading}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                }}
                            >
                                {loading ? (
                                    <RefreshCw className="spin" size={18} />
                                ) : (
                                    <Save size={18} />
                                )}
                                {loading
                                    ? "Đang xử lý..."
                                    : isEditing
                                        ? "CẬP NHẬT GIẤY PHÉP"
                                        : "TẠO GIẤY PHÉP MỚI"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* --- PANEL 2: DANH SÁCH --- */}
            <div className="panel" style={{ flex: 1.5 }}>
                <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FileCheck size={18} /> Danh sách Giấy phép
                    </span>
                    <button
                        className="btn btn-success btn-sm"
                        onClick={refreshLicenses}
                        style={{ display: "flex", alignItems: "center", gap: "4px" }}
                    >
                        <RefreshCw size={14} /> Làm mới
                    </button>
                </div>

                <div className="list-group">
                    {licenses.length === 0 && (
                        <div
                            style={{
                                padding: 20,
                                textAlign: "center",
                                color: "#999",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "10px",
                            }}
                        >
                            <FileText size={40} strokeWidth={1} />
                            Chưa có giấy phép nào.
                        </div>
                    )}

                    {licenses.map((license) => {
                        const daysLeft = getDaysUntilExpire(license.expireDate);
                        const isExpiringSoon = daysLeft && daysLeft <= 30 && daysLeft > 0;

                        return (
                            <div
                                key={license.id}
                                className="list-item"
                                style={{ alignItems: "flex-start", padding: "15px" }}
                            >
                                <div
                                    style={{
                                        width: "60px",
                                        height: "60px",
                                        borderRadius: "8px",
                                        background: "#f0f7ff",
                                        border: "1px solid #cce3ff",
                                        color: getCategoryColor(license.category),
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginRight: "15px",
                                        flexShrink: 0,
                                        fontSize: "11px",
                                        fontWeight: "bold",
                                    }}
                                >
                                    <span style={{ fontSize: "14px" }}>
                                        {license.category || "N/A"}
                                    </span>
                                    <span>Chứng chỉ</span>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: "6px",
                                        }}
                                    >
                                        <div
                                            className="item-title"
                                            style={{ fontSize: "15px", fontWeight: "bold" }}
                                        >
                                            {license.licenseNumber}
                                        </div>
                                        <span
                                            style={{
                                                fontSize: "10px",
                                                padding: "2px 8px",
                                                borderRadius: "10px",
                                                color: "#fff",
                                                backgroundColor: getStatusBadgeColor(license.status),
                                                height: "fit-content",
                                                whiteSpace: "nowrap",
                                                fontWeight: "600",
                                            }}
                                        >
                                            {license.status === "active"
                                                ? "Đang hoạt động"
                                                : "Hết hạn"}
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "13px",
                                            color: "#555",
                                            marginBottom: "6px",
                                        }}
                                    >
                                        <span style={{ fontWeight: "500" }}>{license.name}</span> |{" "}
                                        <span style={{ color: "#888" }}>CCCD: {license.idNumber}</span>
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "12px",
                                            color: "#888",
                                            display: "flex",
                                            gap: "12px",
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <Calendar size={14} />
                                            Cấp: {formatDate(license.issueDate)}
                                        </div>

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                color: isExpiringSoon ? "#f59e0b" : "inherit",
                                                fontWeight: isExpiringSoon ? "500" : "normal",
                                            }}
                                        >
                                            <Calendar size={14} />
                                            Hết: {formatDate(license.expireDate)}
                                            {isExpiringSoon && (
                                                <span style={{ color: "#f59e0b", marginLeft: "4px" }}>
                                                    ({daysLeft} ngày)
                                                </span>
                                            )}
                                        </div>

                                        {license.drones && license.drones.length > 0 && (
                                            <div style={{ color: "#0066cc", fontWeight: "500" }}>
                                                {license.drones.length} thiết bị
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className="item-actions"
                                        style={{
                                            marginTop: "12px",
                                            display: "flex",
                                            gap: "8px",
                                        }}
                                    >
                                        <button
                                            onClick={() => handleEditClick(license)}
                                            className="btn btn-primary btn-sm"
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px",
                                            }}
                                        >
                                            <Edit size={14} /> Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(license.licenseNumber)}
                                            className="btn btn-danger btn-sm"
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px",
                                            }}
                                        >
                                            <Trash2 size={14} /> Xóa
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
