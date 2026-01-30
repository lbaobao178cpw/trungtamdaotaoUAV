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
import { uploadLicenseImage, listImages } from "../../lib/cloudinaryService";
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
    const [uploadingImage, setUploadingImage] = useState(false);
    const [userSearchInput, setUserSearchInput] = useState("");
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [message, setMessage] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState("");
    const [showLibrary, setShowLibrary] = useState(false);
    const [libraryImages, setLibraryImages] = useState([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
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

    // === CHECK AND UPDATE EXPIRED LICENSES ===
    useEffect(() => {
        if (licenses.length > 0 && users.length > 0) {
            const today = new Date();
            const userIds = new Set(users.map(u => u.id));
            licenses.forEach(license => {
                if (!license.expireDate || !userIds.has(license.userId)) return;

                const expireDate = new Date(license.expireDate);
                const isExpired = expireDate < today;

                if (isExpired && license.status !== 'expired') {
                    // Update status to expired
                    saveLicense({
                        url: `${API_ENDPOINTS.LICENSES}/${license.licenseNumber}`,
                        method: 'PUT',
                        data: { ...license, status: 'expired' }
                    }).then(() => {
                        refreshLicenses();
                    }).catch(error => {
                        console.error('Error updating expired license:', error);
                    });
                } else if (!isExpired && license.status === 'expired') {
                    // Update status to active if previously expired but now valid
                    saveLicense({
                        url: `${API_ENDPOINTS.LICENSES}/${license.licenseNumber}`,
                        method: 'PUT',
                        data: { ...license, status: 'active' }
                    }).then(() => {
                        refreshLicenses();
                    }).catch(error => {
                        console.error('Error updating active license:', error);
                    });
                }
            });
        }
    }, [licenses, users, saveLicense, refreshLicenses]);

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
            licenseImage: license.portraitImage || null,
        });
        setUserSearchInput(selectedUser?.full_name || String(license.userId) || "");
        setShowUserDropdown(false);
        setIsEditing(true);
        setMessage(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            // Validate CCCD length (12 digits)
            if (!/^[0-9]{12}$/.test(form.idNumber)) {
                notifyError('Số CCCD phải gồm 12 chữ số');
                return;
            }
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

            const today = new Date();
            const isExpired = new Date(form.expireDate) < today;
            const autoStatus = isExpired ? 'expired' : 'active';

            const payload = {
                licenseNumber: form.licenseNumber,
                userId: form.userId || null,
                category: form.category,
                name: form.name,
                idNumber: form.idNumber,
                issueDate: form.issueDate,
                expireDate: form.expireDate,
                status: autoStatus, // Auto-set based on expire date
                drones: form.drones || [],
                portraitImage: form.licenseImage || null, // backend expects portraitImage
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

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Only images allowed
        if (!file.type.startsWith('image/')) {
            notifyError('Vui lòng chọn file hình ảnh (JPG/PNG/GIF)');
            return;
        }

        try {
            setUploadingImage(true);
            const res = await uploadLicenseImage(file);
            if (!res.success) {
                notifyError(res.error || 'Upload ảnh thất bại');
                return;
            }

            setForm({
                ...form,
                licenseImage: res.url || res.secure_url || res.publicId || ''
            });
            notifySuccess('Tải ảnh giấy phép lên Cloudinary thành công');
        } catch (err) {
            console.error('Image upload error:', err);
            notifyError(err.message || 'Lỗi khi upload ảnh');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleRemoveImage = () => {
        setForm({
            ...form,
            licenseImage: null,
        });
    };

    const handleImageClick = (imageUrl) => {
        setSelectedImage(imageUrl);
        setIsModalOpen(true);
    };

    const handleShowLibrary = async () => {
        setShowLibrary(true);
        setLoadingLibrary(true);
        try {
            const result = await listImages("uav-training/licenses");
            if (result.success) {
                setLibraryImages(result.images);
            } else {
                alert('Failed to load images: ' + result.error);
            }
        } catch (err) {
            alert('Error loading images: ' + err.message);
        } finally {
            setLoadingLibrary(false);
        }
    };

    const handleSelectFromLibrary = (image) => {
        setForm({
            ...form,
            licenseImage: image.url
        });
        setShowLibrary(false);
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
        <>
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
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '');
                                    setForm({ ...form, idNumber: digits.slice(0, 12) });
                                }}
                                placeholder="Số CCCD/CMND (12 chữ số)"
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
                            <div style={{ textAlign: "center" }}>
                                {!showLibrary ? (
                                    <>
                                        {uploadingImage ? (
                                            <div>
                                                <div style={{ fontSize: "20px", marginBottom: "8px" }}>⏳</div>
                                                <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "4px" }}>
                                                    Đang tải ảnh lên...
                                                </div>
                                            </div>
                                        ) : !form.licenseImage ? (
                                            <div>
                                                <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "12px" }}>
                                                    Chưa có hình ảnh giấy phép
                                                </div>
                                                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById("licenseImageInput")?.click()}
                                                        className="btn btn-primary btn-sm"
                                                        style={{ display: "flex", alignItems: "center", gap: "4px" }}
                                                    >
                                                        <FileCheck size={14} /> Upload từ máy tính
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleShowLibrary}
                                                        className="btn btn-secondary btn-sm"
                                                        style={{ display: "flex", alignItems: "center", gap: "4px" }}
                                                    >
                                                        Chọn từ thư viện
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <img
                                                    src={form.licenseImage}
                                                    alt="Giấy phép điều khiển"
                                                    style={{
                                                        maxWidth: "100%",
                                                        maxHeight: "250px",
                                                        borderRadius: "6px",
                                                        marginBottom: "12px",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => handleImageClick(form.licenseImage)}
                                                />
                                                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById("licenseImageInput")?.click()}
                                                        className="btn btn-sm"
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                            backgroundColor: "#007bff",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "6px",
                                                            padding: "6px 12px",
                                                            cursor: "pointer",
                                                            fontSize: "14px",
                                                            transition: "background-color 0.2s",
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#0056b3"}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = "#007bff"}
                                                    >
                                                        <FileCheck size={14} /> Thay đổi hình ảnh
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleShowLibrary}
                                                        className="btn btn-secondary btn-sm"
                                                        style={{ display: "flex", alignItems: "center", gap: "4px" }}
                                                    >
                                                        Chọn từ thư viện
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveImage}
                                                        className="btn btn-danger btn-sm"
                                                        style={{ display: "flex", alignItems: "center", gap: "4px" }}
                                                    >
                                                        <Trash2 size={14} /> Xóa hình ảnh
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="library-view" style={{
                                        border: "1px solid #e0e0e0",
                                        borderRadius: "12px",
                                        padding: "24px",
                                        background: "#ffffff",
                                        maxHeight: "500px",
                                        overflowY: "auto",
                                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                                    }}>
                                        <div className="library-header" style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: "24px",
                                            position: "sticky",
                                            top: 0,
                                            background: "#ffffff",
                                            padding: "12px",
                                            borderBottom: "1px solid #f0f0f0",
                                            margin: "-12px -12px 24px -12px",
                                            borderRadius: "12px 12px 0 0"
                                        }}>
                                            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#333" }}>Chọn từ thư viện hình ảnh</h3>
                                            <button
                                                onClick={() => setShowLibrary(false)}
                                                style={{
                                                    padding: "8px",
                                                    background: "#f8f9fa",
                                                    color: "#6c757d",
                                                    border: "1px solid #e0e0e0",
                                                    borderRadius: "6px",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    transition: "all 0.2s"
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.background = "#e9ecef";
                                                    e.target.style.color = "#495057";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.background = "#f8f9fa";
                                                    e.target.style.color = "#6c757d";
                                                }}
                                                title="Đóng"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        {loadingLibrary ? (
                                            <div style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                padding: "40px",
                                                color: "#6c757d"
                                            }}>
                                                <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>
                                                <div style={{ fontSize: "16px", fontWeight: "500" }}>Đang tải hình ảnh...</div>
                                            </div>
                                        ) : libraryImages.length === 0 ? (
                                            <div style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                padding: "40px",
                                                color: "#6c757d"
                                            }}>
                                                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📷</div>
                                                <div style={{ fontSize: "16px", fontWeight: "500", textAlign: "center" }}>
                                                    Chưa có hình ảnh nào trong thư viện
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="image-grid" style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                                                gap: "16px"
                                            }}>
                                                {libraryImages.map((image) => (
                                                    <div
                                                        key={image.publicId}
                                                        className="image-item"
                                                        onClick={() => handleSelectFromLibrary(image)}
                                                        style={{
                                                            border: "1px solid #e0e0e0",
                                                            borderRadius: "8px",
                                                            padding: "12px",
                                                            cursor: "pointer",
                                                            transition: "all 0.3s ease",
                                                            background: "white",
                                                            textAlign: "center",
                                                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                                                            position: "relative",
                                                            overflow: "hidden"
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.borderColor = "#007bff";
                                                            e.target.style.boxShadow = "0 4px 12px rgba(0, 123, 255, 0.15)";
                                                            e.target.style.transform = "translateY(-2px)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.borderColor = "#e0e0e0";
                                                            e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.05)";
                                                            e.target.style.transform = "translateY(0)";
                                                        }}
                                                    >
                                                        <img
                                                            src={image.url}
                                                            alt={image.displayName}
                                                            style={{
                                                                width: "100%",
                                                                height: "120px",
                                                                objectFit: "cover",
                                                                borderRadius: "6px",
                                                                marginBottom: "8px"
                                                            }}
                                                        />
                                                        <p style={{
                                                            margin: 0,
                                                            fontSize: "12px",
                                                            color: "#495057",
                                                            wordBreak: "break-word",
                                                            lineHeight: "1.4",
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden"
                                                        }}>
                                                            {image.displayName}
                                                        </p>
                                                        <div style={{
                                                            position: "absolute",
                                                            top: "8px",
                                                            right: "8px",
                                                            background: "rgba(0, 123, 255, 0.8)",
                                                            color: "white",
                                                            borderRadius: "50%",
                                                            width: "20px",
                                                            height: "20px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: "12px",
                                                            opacity: 0,
                                                            transition: "opacity 0.3s"
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.opacity = "1"}
                                                        onMouseLeave={(e) => e.target.style.opacity = "0"}
                                                        >
                                                            ✓
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
                                {license.portraitImage ? (
                                    <img
                                        src={license.portraitImage}
                                        alt={license.name || license.licenseNumber}
                                        style={{
                                            width: "60px",
                                            height: "60px",
                                            borderRadius: "8px",
                                            objectFit: "cover",
                                            marginRight: "15px",
                                            flexShrink: 0,
                                            cursor: "pointer",
                                        }}
                                        onClick={() => handleImageClick(license.portraitImage)}
                                    />
                                ) : (
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
                                )}

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

        {/* Modal for viewing full image */}
        {isModalOpen && (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    cursor: 'pointer',
                }}
                onClick={() => setIsModalOpen(false)}
            >
                <img
                    src={selectedImage}
                    alt="Giấy phép điều khiển - Xem đầy đủ"
                    style={{
                        maxWidth: '90%',
                        maxHeight: '90%',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
                <button
                    onClick={() => setIsModalOpen(false)}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    ×
                </button>
            </div>
        )}
        </>
    );
}
