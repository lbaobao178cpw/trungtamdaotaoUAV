import React, { useState, useEffect } from 'react';
import './LegalManagement.css';

const API_URL = "http://localhost:5000/api/display";

export default function FormsManager() {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [documents, setDocuments] = useState([]);
    const [authorities, setAuthorities] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        form_code: '',
        description: '',
        category: '',
        file_url: '',
        file_size: '',
        file_type: '',
        related_document_id: '',
        authority_id: '',
        version: '1.0',
        is_active: true
    });

    const categories = [
        'Đăng ký', 'Thông báo', 'Đề nghị', 'Khởi kiện', 'Khiếu nại',
        'Báo cáo', 'Thẩm tra', 'Thẩm định', 'Phê duyệt', 'Khác'
    ];

    useEffect(() => {
        fetchForms();
        fetchDocuments();
        fetchAuthorities();
    }, [pagination.page, selectedCategory]);

    const fetchForms = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...(selectedCategory && { category: selectedCategory }),
                ...(searchTerm && { search: searchTerm })
            });

            const res = await fetch(`${API_URL}/forms?${params}`);
            const data = await res.json();

            if (data.success) {
                setForms(data.data);
                setPagination(prev => ({ ...prev, ...data.pagination }));
            }
        } catch (error) {
            console.error('Lỗi tải biểu mẫu:', error);
            setMessage({ type: 'error', text: 'Lỗi tải dữ liệu' });
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async () => {
        try {
            const res = await fetch(`${API_URL}/legal-documents?limit=100`);
            const data = await res.json();
            if (data.success) setDocuments(data.data);
        } catch (error) {
            console.error('Lỗi tải văn bản:', error);
        }
    };

    const fetchAuthorities = async () => {
        try {
            const res = await fetch(`${API_URL}/authorities?limit=100`);
            const data = await res.json();
            if (data.success) setAuthorities(data.data);
        } catch (error) {
            console.error('Lỗi tải thẩm quyền:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchForms();
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
                ? `${API_URL}/forms/${editingId}`
                : `${API_URL}/forms`;

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
                fetchForms();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi kết nối server' });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (form) => {
        setFormData({
            title: form.title || '',
            form_code: form.form_code || '',
            description: form.description || '',
            category: form.category || '',
            file_url: form.file_url || '',
            file_size: form.file_size || '',
            file_type: form.file_type || '',
            related_document_id: form.related_document_id || '',
            authority_id: form.authority_id || '',
            version: form.version || '1.0',
            is_active: form.is_active || true
        });
        setEditingId(form.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa biểu mẫu này?')) return;

        try {
            const res = await fetch(`${API_URL}/forms/${id}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Xóa thành công' });
                fetchForms();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi kết nối server' });
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            form_code: '',
            description: '',
            category: '',
            file_url: '',
            file_size: '',
            file_type: '',
            related_document_id: '',
            authority_id: '',
            version: '1.0',
            is_active: true
        });
        setEditingId(null);
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    return (
        <div className="legal-management-container">
            {/* Header */}
            <div className="legal-header">
                <h2 className="legal-title">Quản lý Biểu mẫu</h2>
                <div className="legal-actions">
                    <button
                        className="legal-btn legal-btn-primary"
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                    >
                        + Thêm biểu mẫu
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
                    placeholder="Tìm kiếm biểu mẫu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="legal-filter-group">
                    <select
                        className="legal-filter-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat}
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
                ) : forms.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                        Không có biểu mẫu nào
                    </div>
                ) : (
                    <>
                        <table className="legal-table">
                            <thead>
                                <tr>
                                    <th>Mã biểu mẫu</th>
                                    <th>Tên biểu mẫu</th>
                                    <th>Danh mục</th>
                                    <th>Văn bản liên quan</th>
                                    <th>Lượt tải</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forms.map(form => (
                                    <tr key={form.id}>
                                        <td>
                                            <strong style={{ color: '#0066cc' }}>{form.form_code}</strong>
                                        </td>
                                        <td style={{ maxWidth: '250px' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                {form.title}
                                            </div>
                                            {form.description && (
                                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                                    {form.description.substring(0, 80)}...
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="legal-badge legal-badge-info">
                                                {form.category}
                                            </span>
                                        </td>
                                        <td>
                                            {form.related_document_title ? (
                                                <div style={{ fontSize: '12px' }}>
                                                    {form.related_document_title.substring(0, 60)}...
                                                </div>
                                            ) : (
                                                <span style={{ color: '#6c757d', fontSize: '12px' }}>
                                                    Không có
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600', color: '#28a745' }}>
                                                {form.download_count || 0}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`legal-badge legal-badge-${form.is_active ? 'success' : 'danger'}`}>
                                                {form.is_active ? 'Hoạt động' : 'Ngừng hoạt động'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="legal-table-actions">
                                                <button
                                                    className="legal-btn legal-btn-secondary"
                                                    onClick={() => handleEdit(form)}
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    className="legal-btn legal-btn-danger"
                                                    onClick={() => handleDelete(form.id)}
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                >
                                                    Xóa
                                                </button>
                                                {form.file_url && (
                                                    <a
                                                        href={form.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="legal-btn legal-btn-primary"
                                                        style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}
                                                    >
                                                        Tải về
                                                    </a>
                                                )}
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

            {/* Modal thêm/sửa biểu mẫu */}
            {showModal && (
                <div className="legal-modal-overlay">
                    <div className="legal-modal-content">
                        <div className="legal-modal-header">
                            <h3 style={{ margin: 0, color: '#0066cc' }}>
                                {editingId ? 'Chỉnh sửa Biểu mẫu' : 'Thêm Biểu mẫu mới'}
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
                                        <label className="legal-form-label">Mã biểu mẫu *</label>
                                        <input
                                            type="text"
                                            className="legal-form-control"
                                            name="form_code"
                                            value={formData.form_code}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Tên biểu mẫu *</label>
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
                                        <label className="legal-form-label">Danh mục</label>
                                        <select
                                            className="legal-form-control"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                        >
                                            <option value="">Chọn danh mục</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Phiên bản</label>
                                        <input
                                            type="text"
                                            className="legal-form-control"
                                            name="version"
                                            value={formData.version}
                                            onChange={handleChange}
                                            placeholder="1.0"
                                        />
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">URL file *</label>
                                        <input
                                            type="url"
                                            className="legal-form-control"
                                            name="file_url"
                                            value={formData.file_url}
                                            onChange={handleChange}
                                            placeholder="https://..."
                                            required
                                        />
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Loại file</label>
                                        <select
                                            className="legal-form-control"
                                            name="file_type"
                                            value={formData.file_type}
                                            onChange={handleChange}
                                        >
                                            <option value="">Chọn loại file</option>
                                            <option value="pdf">PDF</option>
                                            <option value="doc">DOC</option>
                                            <option value="docx">DOCX</option>
                                            <option value="xls">XLS</option>
                                            <option value="xlsx">XLSX</option>
                                            <option value="other">Khác</option>
                                        </select>
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Kích thước file (bytes)</label>
                                        <input
                                            type="number"
                                            className="legal-form-control"
                                            name="file_size"
                                            value={formData.file_size}
                                            onChange={handleChange}
                                            placeholder="1024"
                                        />
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Văn bản liên quan</label>
                                        <select
                                            className="legal-form-control"
                                            name="related_document_id"
                                            value={formData.related_document_id}
                                            onChange={handleChange}
                                        >
                                            <option value="">Chọn văn bản</option>
                                            {documents.map(doc => (
                                                <option key={doc.id} value={doc.id}>
                                                    {doc.document_number} - {doc.title.substring(0, 50)}...
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="legal-form-group">
                                        <label className="legal-form-label">Thẩm quyền</label>
                                        <select
                                            className="legal-form-control"
                                            name="authority_id"
                                            value={formData.authority_id}
                                            onChange={handleChange}
                                        >
                                            <option value="">Chọn thẩm quyền</option>
                                            {authorities.map(auth => (
                                                <option key={auth.id} value={auth.id}>
                                                    {auth.name}
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