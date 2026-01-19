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
        document_number: '',
        document_type: 'decree',
        description: '',
        issue_date: '',
        effective_date: '',
        authority: '',
        file_url: '',
        forms: [],
        status: 'active',
        is_featured: false
    });

    const documentTypes = [
        { value: 'decree', label: 'Nghị định' },
        { value: 'circular', label: 'Thông tư' },
        { value: 'decision', label: 'Quyết định' },
        { value: 'law', label: 'Luật' },
        { value: 'regulation', label: 'Quy định' },
        { value: 'other', label: 'Khác' }
    ];

    const statusOptions = [
        { value: 'active', label: 'Hiệu lực' },
        { value: 'expired', label: 'Hết hiệu lực' },
        { value: 'amended', label: 'Đã sửa đổi' },
        { value: 'draft', label: 'Dự thảo' }
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
            document_number: doc.document_number || '',
            document_type: doc.document_type || 'decree',
            description: doc.description || '',
            issue_date: doc.issue_date ? doc.issue_date.split('T')[0] : '',
            effective_date: doc.effective_date ? doc.effective_date.split('T')[0] : '',
            authority: doc.authority || '',
            file_url: doc.file_url || '',
            forms: doc.forms || [],
            status: getStatusDisplay(doc.status) || 'active',
            is_featured: doc.is_featured || false
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
                setSelectedIds(new Set()); // Clear selection
                fetchDocuments();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi kết nối server' });
        }
    };

    // Bulk delete
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) {
            setMessage({ type: 'warning', text: 'Vui lòng chọn ít nhất một văn bản' });
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} văn bản này?`)) return;

        setLoading(true);
        try {
            let successCount = 0;
            for (const id of selectedIds) {
                const res = await fetch(`${API_URL}/legal-documents/${id}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (data.success) successCount++;
            }

            setMessage({
                type: 'success',
                text: `Đã xóa ${successCount}/${selectedIds.size} văn bản`
            });
            setSelectedIds(new Set());
            fetchDocuments();
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi kết nối server' });
        } finally {
            setLoading(false);
        }
    };

    // Toggle selection
    const toggleSelect = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // Select all
    const toggleSelectAll = () => {
        if (selectedIds.size === documents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(documents.map(doc => doc.id)));
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            document_number: '',
            document_type: 'decree',
            description: '',
            issue_date: '',
            effective_date: '',
            authority: '',
            file_url: '',
            forms: [],
            status: 'active',
            is_featured: false
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

            {/* Search và Filter */}
            <form onSubmit={handleSearch} className="legal-search-bar">
                <input
                    type="text"
                    className="legal-search-input"
                    placeholder="Tìm kiếm văn bản..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="legal-filter-group">
                    <select
                        className="legal-filter-select"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                    >
                        <option value="">Tất cả loại văn bản</option>
                        {documentTypes.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
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
                {selectedIds.size > 0 && (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#e3f2fd',
                        borderBottom: '1px solid #ddd',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>Đã chọn {selectedIds.size} văn bản</span>
                        <button
                            className="legal-btn legal-btn-danger"
                            onClick={handleBulkDelete}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                            Xóa các văn bản đã chọn
                        </button>
                    </div>
                )}
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
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === documents.length && documents.length > 0}
                                            onChange={toggleSelectAll}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </th>
                                    <th>Số hiệu</th>
                                    <th>Tiêu đề</th>
                                    <th>Loại</th>
                                    <th>Ngày ban hành</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map(doc => (
                                    <tr key={doc.id} style={{
                                        backgroundColor: selectedIds.has(doc.id) ? '#f5f5f5' : 'transparent'
                                    }}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(doc.id)}
                                                onChange={() => toggleSelect(doc.id)}
                                                style={{ cursor: 'pointer' }}
                                            />                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(doc.id)}
                                                onChange={() => toggleSelect(doc.id)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </td>                                        </td>
                                            <strong style={{ color: '#0066cc' }}>{doc.document_number}</strong>
                                        </td>
                                        <td style={{ maxWidth: '300px' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                {doc.title}
                                            </div>
                                            {doc.authority && (
                                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                                    {doc.authority}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="legal-badge legal-badge-info">
                                                {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                                            </span>
                                        </td>
                                        <td>{formatDate(doc.issue_date)}</td>
                                        <td>
                                            <span className={`legal-badge legal-badge-${getStatusDisplay(doc.status) === 'active' ? 'success' : 'warning'}`}>
                                                {statusOptions.find(s => s.value === getStatusDisplay(doc.status))?.label || doc.status}
                                            </span>
                                            {doc.is_featured && (
                                                <span className="legal-badge legal-badge-primary" style={{ marginLeft: '5px' }}>
                                                    Nổi bật
                                                </span>
                                            )}
                                        </td>
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

            {/* Modal thêm/sửa văn bản */ }
    {
        showModal && (
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
                            <div className="legal-grid legal-grid-2">
                                <div className="legal-form-group">
                                    <label className="legal-form-label">Số hiệu *</label>
                                    <input
                                        type="text"
                                        className="legal-form-control"
                                        name="document_number"
                                        value={formData.document_number}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

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
                                    <label className="legal-form-label">Loại văn bản</label>
                                    <select
                                        className="legal-form-control"
                                        name="document_type"
                                        value={formData.document_type}
                                        onChange={handleChange}
                                    >
                                        {documentTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="legal-form-group">
                                    <label className="legal-form-label">Trạng thái</label>
                                    <select
                                        className="legal-form-control"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                    >
                                        {statusOptions.map(status => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="legal-form-group">
                                    <label className="legal-form-label">Ngày ban hành *</label>
                                    <input
                                        type="date"
                                        className="legal-form-control"
                                        name="issue_date"
                                        value={formData.issue_date}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="legal-form-group">
                                    <label className="legal-form-label">Ngày hiệu lực</label>
                                    <input
                                        type="date"
                                        className="legal-form-control"
                                        name="effective_date"
                                        value={formData.effective_date}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="legal-form-group">
                                    <label className="legal-form-label">Cơ quan ban hành</label>
                                    <input
                                        type="text"
                                        className="legal-form-control"
                                        name="authority"
                                        value={formData.authority}
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

                            <div className="legal-form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="checkbox"
                                    id="is_featured"
                                    name="is_featured"
                                    checked={formData.is_featured}
                                    onChange={handleChange}
                                />
                                <label htmlFor="is_featured" className="legal-form-label" style={{ margin: 0 }}>
                                    Văn bản nổi bật
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
        )
    }
        </div >
    );
}