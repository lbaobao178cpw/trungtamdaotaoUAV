import React, { useState, useEffect } from 'react';
import './LegalManagement.css';

const API_URL = "http://localhost:5000/api/display";

export default function LegalDocumentsManager() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        issue_date: '',
        file_url: ''
    });

    const documentTypes = [
        { value: 'decree', label: 'Nghị định' },
        { value: 'circular', label: 'Thông tư' },
        { value: 'decision', label: 'Quyết định' },
        { value: 'law', label: 'Luật' },
        { value: 'regulation', label: 'Quy định' },
        { value: 'other', label: 'Khác' }
    ];
    ];

    // Status mapping từ single char ('a','e','m','d') thành display value
    const statusDisplayMap = {
        'a': 'active',
        'e': 'expired',
        'm': 'amended',
        'd': 'draft'
    };

    const getStatusDisplay = (dbStatus) => {
        const result = statusDisplayMap[dbStatus] || dbStatus;
        console.log(`getStatusDisplay("${dbStatus}") => "${result}"`);
        return result;
    };

    useEffect(() => {
        fetchDocuments();
    }, [pagination.page, selectedType]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...(selectedType && { type: selectedType }),
                ...(searchTerm && { search: searchTerm })
            });

            const res = await fetch(`${API_URL}/legal-documents?${params}`);
            const data = await res.json();

            if (data.success) {
                // Convert is_featured from 0/1 to boolean
                const normalizedData = data.data.map(doc => ({
                    ...doc,
                    is_featured: Boolean(doc.is_featured)
                }));
                console.log('Loaded documents:', normalizedData);
                setDocuments(normalizedData);
                setPagination(prev => ({ ...prev, ...data.pagination }));
            }
        } catch (error) {
            console.error('Lỗi tải văn bản:', error);
            setMessage({ type: 'error', text: 'Lỗi tải dữ liệu' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchDocuments();
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = editingId
                ? `${API_URL}/legal-documents/${editingId}`
                : `${API_URL}/legal-documents`;

            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: editingId ? 'Cập nhật thành công' : 'Thêm mới thành công' });
                setShowModal(false);
                resetForm();
                fetchDocuments();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi kết nối server' });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (doc) => {
        setFormData({
            title: doc.title || '',
            description: doc.description || '',
            issue_date: doc.issue_date ? doc.issue_date.split('T')[0] : '',
            file_url: doc.file_url || ''
        });
        setEditingId(doc.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa văn bản này?')) return;

        try {
            const res = await fetch(`${API_URL}/legal-documents/${id}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Xóa thành công' });
                fetchDocuments();
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
            setSelectedIds(new Set(documents.map(doc => doc.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) {
            setMessage({ type: 'warning', text: 'Vui lòng chọn ít nhất một văn bản' });
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} văn bản được chọn?`)) return;

        setLoading(true);
        try {
            let deletedCount = 0;
            let errorCount = 0;

            for (const id of selectedIds) {
                try {
                    const res = await fetch(`${API_URL}/legal-documents/${id}`, {
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
                setMessage({ type: 'success', text: `Xóa thành công ${deletedCount} văn bản` });
            } else {
                setMessage({ type: 'warning', text: `Xóa ${deletedCount} thành công, ${errorCount} lỗi` });
            }
            fetchDocuments();
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi xóa hàng loạt' });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            issue_date: '',
            file_url: ''
        });
        setEditingId(null);
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="legal-management-container">
            {/* Header */}
            <div className="legal-header">
                <h2 className="legal-title">Quản lý Văn bản Pháp luật</h2>
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
                        + Thêm văn bản
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
                    placeholder="Tìm kiếm văn bản..."
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
                ) : documents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                        Không có văn bản nào
                    </div>
                ) : (
                    <>
                        <table className="legal-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === documents.length && documents.length > 0}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th>Tiêu đề</th>
                                    <th>Ngày</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map(doc => (
                                    <tr key={doc.id}>
                                        <td style={{ width: '50px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(doc.id)}
                                                onChange={() => handleSelectRow(doc.id)}
                                            />
                                        </td>
                                        <td style={{ maxWidth: '400px' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                {doc.title}
                                            </div>
                                            {doc.description && (
                                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                                    {doc.description}
                                                </div>
                                            )}
                                        </td>
                                        <td>{formatDate(doc.issue_date)}</td>
                                        <td>
                                            <div className="legal-table-actions">
                                                <button
                                                    className="legal-btn legal-btn-secondary"
                                                    onClick={() => handleEdit(doc)}
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    className="legal-btn legal-btn-danger"
                                                    onClick={() => handleDelete(doc.id)}
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

            {/* Modal thêm/sửa văn bản */}
            {showModal && (
                <div className="legal-modal-overlay">
                    <div className="legal-modal-content">
                        <div className="legal-modal-header">
                            <h3 style={{ margin: 0, color: '#0066cc' }}>
                                {editingId ? 'Chỉnh sửa Văn bản' : 'Thêm Văn bản mới'}
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
                                    <label className="legal-form-label">Tiêu đề *</label>
                                    <input
                                        type="text"
                                        className="legal-form-control"
                                        name="title"
                                        value={formData.title}
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

                                <div className="legal-form-group">
                                    <label className="legal-form-label">Ngày (tùy chọn)</label>
                                    <input
                                        type="date"
                                        className="legal-form-control"
                                        name="issue_date"
                                        value={formData.issue_date}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="legal-form-group">
                                    <label className="legal-form-label">Link file</label>
                                    <input
                                        type="url"
                                        className="legal-form-control"
                                        name="file_url"
                                        value={formData.file_url}
                                        onChange={handleChange}
                                        placeholder="https://..."
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