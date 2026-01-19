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
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

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

            const payload = {
                name: formData.name,
                description: formData.description || null
            };

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

    const handleSelectRow = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(new Set(authorities.map(auth => auth.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) {
            setMessage({ type: 'warning', text: 'Vui lòng chọn ít nhất một thẩm quyền' });
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} thẩm quyền được chọn?`)) return;

        setLoading(true);
        try {
            let deletedCount = 0;
            let errorCount = 0;

            for (const id of selectedIds) {
                try {
                    const res = await fetch(`${API_URL}/authorities/${id}`, {
                        method: 'DELETE'
                    });
                    const data = await res.json();
                    if (data.success) {
                        deletedCount++;
                    } else {
                        errorCount++;
                    }
                } catch {
                    errorCount++;
                }
            }

            setSelectedIds(new Set());
            if (errorCount === 0) {
                setMessage({ type: 'success', text: `Xóa thành công ${deletedCount} thẩm quyền` });
            } else {
                setMessage({ type: 'warning', text: `Xóa ${deletedCount} thành công, ${errorCount} lỗi` });
            }
            fetchAuthorities();
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi xóa hàng loạt' });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: ''
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
                    {selectedIds.size > 0 && (
                        <button
                            className="legal-btn legal-btn-danger"
                            onClick={handleBulkDelete}
                            style={{ marginRight: '10px' }}
                        >
                            Xóa ({selectedIds.size})
                        </button>
                    )}
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

            {/* Search */}
            <form onSubmit={handleSearch} className="legal-search-bar">
                <input
                    type="text"
                    className="legal-search-input"
                    placeholder="Tìm kiếm thẩm quyền..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="legal-btn legal-btn-primary">
                    Tìm kiếm
                </button>
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
                                    <th style={{ width: '50px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === authorities.length && authorities.length > 0}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th>Tên thẩm quyền</th>
                                    <th>Mô tả</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {authorities.map(auth => (
                                    <tr key={auth.id}>
                                        <td style={{ width: '50px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(auth.id)}
                                                onChange={() => handleSelectRow(auth.id)}
                                            />
                                        </td>
                                        <td style={{ maxWidth: '400px' }}>
                                            <div style={{ fontWeight: '600' }}>
                                                {auth.name}
                                            </div>
                                        </td>
                                        <td>
                                            {auth.description && (
                                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                                    {auth.description}
                                                </div>
                                            )}
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
                                    Trước
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
                                    Sau
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
                                X
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="legal-modal-body">
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
                                    <label className="legal-form-label">Mô tả</label>
                                    <textarea
                                        className="legal-form-control legal-form-textarea"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows="4"
                                    />
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