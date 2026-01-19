import React, { useState, useEffect } from 'react';
import './LegalManagement.css';

const API_URL = "http://localhost:5000/api/display";

export default function AuthoritiesManager() {
    const [authorities, setAuthorities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        website: '',
        contact_email: '',
        contact_phone: '',
        logo_url: '',
        parent_id: '',
        level: 'national',
        is_active: true
    });

    const levelOptions = [
        { value: 'national', label: 'Trung ương' },
        { value: 'provincial', label: 'Tỉnh/Thành phố' },
        { value: 'district', label: 'Quận/Huyện' },
        { value: 'commune', label: 'Xã/Phường' },
        { value: 'other', label: 'Khác' }
    ];

    useEffect(() => {
        fetchAuthorities();
    }, [pagination.page, selectedLevel, searchTerm]);

    const fetchAuthorities = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...(selectedLevel && { level: selectedLevel }),
                ...(searchTerm && { search: searchTerm })
            });

            const res = await fetch(`${API_URL}/authorities?${params}`);
            const data = await res.json();

            if (data.success) {
                setAuthorities(data.data);
                setPagination(prev => ({ ...prev, ...data.pagination }));
            }
        } catch (error) {
            console.error('Lỗi tải thẩm quyền:', error);
            setMessage({ type: 'error', text: 'Lỗi tải dữ liệu' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchAuthorities();
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [selectedLevel, searchTerm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = editingId
                ? `${API_URL}/authorities/${editingId}`
                : `${API_URL}/authorities`;

            const method = editingId ? 'PUT' : 'POST';

            // ===== BUILD PAYLOAD ĐÚNG CHUẨN =====
            const payload = {
                name: formData.name,
                description: formData.description || null,
                website: formData.website || null,
                contact_email: formData.contact_email || null,
                contact_phone: formData.contact_phone || null,
                logo_url: formData.logo_url || null,
                level: formData.level,
                is_active: formData.is_active ? 1 : 0,
                parent_id:
                    formData.parent_id === '' || formData.parent_id === null
                        ? null
                        : parseInt(formData.parent_id, 10)
            };

            console.log("Sending payload:", payload);

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                setMessage({
                    type: 'success',
                    text: editingId ? 'Cập nhật thành công' : 'Thêm mới thành công'
                });
                setShowModal(false);
                resetForm();
                fetchAuthorities();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi kết nối server' });
        } finally {
            setLoading(false);
        }
    };


    const handleEdit = (auth) => {
        setFormData({
            name: auth.name || '',
            description: auth.description || '',
            website: auth.website || '',
            contact_email: auth.contact_email || '',
            contact_phone: auth.contact_phone || '',
            logo_url: auth.logo_url || '',
            parent_id: auth.parent_id ?? '',
            level: auth.level || 'national',
            is_active: Boolean(auth.is_active)
        });
        setEditingId(auth.id);
        setShowModal(true);
    };


    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa thẩm quyền này?')) return;

        try {
            const res = await fetch(`${API_URL}/authorities/${id}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Xóa thành công' });
                fetchAuthorities();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi kết nối server' });
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            website: '',
            contact_email: '',
            contact_phone: '',
            logo_url: '',
            parent_id: '',
            level: 'national',
            is_active: true
        });
        setEditingId(null);
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    return (
        <div className="legal-management-container">
            {/* Header */}
            <div className="legal-header">
                <h2 className="legal-title">Quản lý Thẩm quyền</h2>
                <div className="legal-actions">
                    <button
                        className="legal-btn legal-btn-primary"
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                    >
                        + Thêm thẩm quyền
                    </button>

                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`ds-message ${message.type}`} style={{ marginBottom: '20px' }}>
                    {message.text}
                </div>
            )}

            {/* Search và Filter */}
            <form onSubmit={handleSearch} className="legal-search-bar">
                <input
                    type="text"
                    className="legal-search-input"
                    placeholder="Tìm kiếm thẩm quyền..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="legal-filter-group">
                    <select
                        className="legal-filter-select"
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                    >
                        <option value="">Tất cả cấp độ</option>
                        {levelOptions.map(level => (
                            <option key={level.value} value={level.value}>
                                {level.label}
                            </option>
                        ))}
                    </select>
                    <button type="submit" className="legal-btn legal-btn-primary">
                        Tìm kiếm
                    </button>
                </div>
            </form>

            {/* Table */}
            <div className="legal-card">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        Đang tải dữ liệu...
                    </div>
                ) : authorities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                        Không có thẩm quyền nào
                    </div>
                ) : (
                    <>
                        <table className="legal-table">
                            <thead>
                                <tr>
                                    <th>Tên thẩm quyền</th>
                                    <th>Cấp độ</th>
                                    <th>Liên hệ</th>
                                    <th>Thẩm quyền cha</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {authorities.map(auth => (
                                    <tr key={auth.id}>
                                        <td style={{ maxWidth: '300px' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                {auth.name}
                                            </div>
                                            {auth.description && (
                                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                                    {auth.description.substring(0, 100)}...
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="legal-badge legal-badge-info">
                                                {levelOptions.find(l => l.value === auth.level)?.label || auth.level}
                                            </span>
                                        </td>
                                        <td>
                                            {auth.contact_email && (
                                                <div style={{ fontSize: '12px' }}>
                                                    {auth.contact_email}
                                                </div>
                                            )}
                                            {auth.contact_phone && (
                                                <div style={{ fontSize: '12px' }}>
                                                    {auth.contact_phone}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {auth.parent_name ? (
                                                <span className="legal-badge legal-badge-secondary">
                                                    {auth.parent_name}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#6c757d', fontSize: '12px' }}>
                                                    Không có
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`legal-badge legal-badge-${auth.is_active ? 'success' : 'danger'}`}>
                                                {auth.is_active ? 'Hoạt động' : 'Ngừng hoạt động'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="legal-table-actions">
                                                <button
                                                    className="legal-btn legal-btn-secondary"
                                                    onClick={() => handleEdit(auth)}
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    className="legal-btn legal-btn-danger"
                                                    onClick={() => handleDelete(auth.id)}
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="legal-pagination">
                                <button
                                    className="legal-page-btn"
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                >
                                    ← Trước
                                </button>

                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (pagination.totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (pagination.page <= 3) {
                                        pageNum = i + 1;
                                    } else if (pagination.page >= pagination.totalPages - 2) {
                                        pageNum = pagination.totalPages - 4 + i;
                                    } else {
                                        pageNum = pagination.page - 2 + i;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            className={`legal-page-btn ${pagination.page === pageNum ? 'active' : ''}`}
                                            onClick={() => handlePageChange(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    className="legal-page-btn"
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                >
                                    Sau →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal thêm/sửa thẩm quyền */}
            {showModal && (
                <div className="legal-modal-overlay">
                    <div className="legal-modal-content">
                        <div className="legal-modal-header">
                            <h3 style={{ margin: 0, color: '#0066cc' }}>
                                {editingId ? 'Chỉnh sửa Thẩm quyền' : 'Thêm Thẩm quyền mới'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="legal-modal-body">
                                <div className="legal-grid legal-grid-2">
                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Tên thẩm quyền *</label>
                                        <input
                                            type="text"
                                            className="legal-form-control"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Cấp độ</label>
                                        <select
                                            className="legal-form-control"
                                            name="level"
                                            value={formData.level}
                                            onChange={handleChange}
                                        >
                                            {levelOptions.map(level => (
                                                <option key={level.value} value={level.value}>
                                                    {level.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Email liên hệ</label>
                                        <input
                                            type="email"
                                            className="legal-form-control"
                                            name="contact_email"
                                            value={formData.contact_email}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Số điện thoại</label>
                                        <input
                                            type="tel"
                                            className="legal-form-control"
                                            name="contact_phone"
                                            value={formData.contact_phone}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Website</label>
                                        <input
                                            type="url"
                                            className="legal-form-control"
                                            name="website"
                                            value={formData.website}
                                            onChange={handleChange}
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Logo URL</label>
                                        <input
                                            type="url"
                                            className="legal-form-control"
                                            name="logo_url"
                                            value={formData.logo_url}
                                            onChange={handleChange}
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Thẩm quyền cha</label>
                                        <select
                                            className="legal-form-control"
                                            name="parent_id"
                                            value={formData.parent_id}
                                            onChange={handleChange}
                                        >
                                            <option value="">-- Không có cấp cha --</option>

                                            {authorities
                                                .filter(a => a.id !== editingId) // không cho chọn chính nó
                                                .map(a => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                </div>

                                <div className="legal-form-group">
                                    <label className="legal-form-label">Mô tả</label>
                                    <textarea
                                        className="legal-form-control legal-form-textarea"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows="3"
                                    />
                                </div>

                                <div className="legal-form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="is_active" className="legal-form-label" style={{ margin: 0 }}>
                                        Đang hoạt động
                                    </label>
                                </div>
                            </div>

                            <div className="legal-modal-footer">
                                <button
                                    type="button"
                                    className="legal-btn legal-btn-secondary"
                                    onClick={() => setShowModal(false)}
                                    disabled={loading}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="legal-btn legal-btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Đang xử lý...' : editingId ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}