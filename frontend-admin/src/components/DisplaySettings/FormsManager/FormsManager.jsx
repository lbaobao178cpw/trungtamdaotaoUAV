import React, { useState, useEffect } from 'react';
import { uploadDocument, listDocuments } from "../../../lib/cloudinaryService";
import { notifySuccess, notifyError, notifyWarning } from '../../../lib/notifications';
import "../LegalManagement/LegalManagement.css";
import { API_ENDPOINTS } from '../../../config/apiConfig';

const API_URL = API_ENDPOINTS.DISPLAY;

// Helper function to sanitize Vietnamese filenames
const sanitizeFileName = (filename) => {
    if (!filename) return '';

    // Remove extension to sanitize name only
    const lastDotIndex = filename.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

    // Sanitize: remove diacritics and convert to ASCII
    const sanitized = nameWithoutExt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-zA-Z0-9-_\s]/g, '-') // Replace special chars with dash
        .replace(/\s+/g, '-') // Replace spaces with dash
        .replace(/-+/g, '-') // Collapse multiple dashes
        .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
        .toLowerCase();

    return sanitized + ext;
};

export default function FormsManager() {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [documents, setDocuments] = useState([]);
    const [authorities, setAuthorities] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [showLibrary, setShowLibrary] = useState(false);
    const [libraryDocuments, setLibraryDocuments] = useState([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        file_url: '',
        display_name: ''
    });

    const categories = [
        'Đăng ký', 'Thông báo', 'Đề nghị', 'Khởi kiện', 'Khiếu nại',
        'Báo cáo', 'Thẩm tra', 'Thẩm định', 'Phê duyệt', 'Khác'
    ];

    useEffect(() => {
        fetchForms();
    }, [pagination.page]);

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
            notifyError('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await uploadDocument(file);
            if (result.success) {
                setFormData(prev => ({
                    ...prev,
                    file_url: result.url,
                    display_name: result.originalFilename || file.name
                }));
                setUploadedFileName(result.originalFilename || file.name);
                notifySuccess('Upload file thành công!');
            } else {
                notifyError('Upload thất bại: ' + (result.error || 'Không rõ lý do'));
            }
        } catch (error) {
            console.error('Lỗi upload:', error);
            notifyError('Lỗi upload file: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleShowLibrary = async () => {
        setShowLibrary(true);
        setLoadingLibrary(true);
        try {
            const result = await listDocuments("uav-training/documents");
            if (result.success) {
                setLibraryDocuments(result.images);
            } else {
                alert('Failed to load documents: ' + result.error);
            }
        } catch (err) {
            alert('Error loading documents: ' + err.message);
        } finally {
            setLoadingLibrary(false);
        }
    };

    const handleSelectFromLibrary = (document) => {
        setFormData({
            ...formData,
            file_url: document.url,
            display_name: document.displayName
        });
        setUploadedFileName(document.displayName);
        setShowLibrary(false);
    };

    const handleClearFile = async () => {
        setFormData(prev => ({
            ...prev,
            file_url: '',
            display_name: ''
        }));
        setUploadedFileName('');

        // Tự động lưu ngay mà không cần click "Cập nhật"
        if (!editingId) return;

        setLoading(true);
        try {
            const submitData = { ...formData, file_url: '', display_name: '' };

            const res = await fetch(`${API_URL}/forms/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData)
            });

            const data = await res.json();

            if (data.success) {
                notifySuccess('Xóa file thành công');
                setShowModal(false);
                resetForm();
                fetchForms();
            } else {
                notifyError(data.message);
            }
        } catch (error) {
            notifyError('Lỗi kết nối server');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = editingId
                ? `${API_URL}/forms/${editingId}`
                : `${API_URL}/forms`;

            const method = editingId ? 'PUT' : 'POST';

            // Chuẩn bị dữ liệu - chỉ gửi file_url nếu có giá trị
            const submitData = { ...formData };
            if (!submitData.file_url) {
                // Nếu đang sửa và file_url rỗng, lấy file_url cũ
                if (editingId) {
                    const existingForm = forms.find(f => f.id === editingId);
                    submitData.file_url = existingForm?.file_url || '';
                } else {
                    // Nếu tạo mới, file_url là bắt buộc (kiểm tra ở form)
                    submitData.file_url = submitData.file_url || '';
                }
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData)
            });

            const data = await res.json();

            if (data.success) {
                notifySuccess(editingId ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setShowModal(false);
                resetForm();
                fetchForms();
            } else {
                notifyError(data.message);
            }
        } catch (error) {
            notifyError('Lỗi kết nối server');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (form) => {
        setFormData({
            title: form.title || '',
            file_url: form.file_url || '',
            display_name: form.display_name || ''
        });
        setUploadedFileName(form.display_name || (form.file_url ? form.file_url.split('/').pop() : ''));
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
                notifySuccess('Xóa thành công');
                fetchForms();
            } else {
                notifyError(data.message);
            }
        } catch (error) {
            notifyError('Lỗi kết nối server');
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
            setSelectedIds(new Set(forms.map(form => form.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) {
            notifyWarning('Vui lòng chọn ít nhất một biểu mẫu');
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} biểu mẫu được chọn?`)) return;

        setLoading(true);
        try {
            let deletedCount = 0;
            let errorCount = 0;

            for (const id of selectedIds) {
                try {
                    const res = await fetch(`${API_URL}/forms/${id}`, {
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
                notifySuccess(`Xóa thành công ${deletedCount} biểu mẫu`);
            } else {
                notifyWarning(`Xóa ${deletedCount} thành công, ${errorCount} lỗi`);
            }
            fetchForms();
        } catch (error) {
            notifyError('Lỗi xóa hàng loạt');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            file_url: '',
            display_name: ''
        });
        setUploadedFileName('');
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
                        + Thêm biểu mẫu
                    </button>
                </div>
            </div>

            {/* Search và Filter */}
            <form onSubmit={handleSearch} className="legal-search-bar">
                <input
                    type="text"
                    className="legal-search-input"
                    placeholder="Tìm kiếm biểu mẫu..."
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
                ) : forms.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                        Không có biểu mẫu nào
                    </div>
                ) : (
                    <>
                        <table className="legal-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === forms.length && forms.length > 0}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th>Tên biểu mẫu</th>
                                    <th>File đã upload</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forms.map(form => (
                                    <tr key={form.id}>
                                        <td style={{ width: '50px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(form.id)}
                                                onChange={() => handleSelectRow(form.id)}
                                            />
                                        </td>
                                        <td style={{ maxWidth: '300px' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                {form.title}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '12px', color: '#6c757d' }}>
                                            {form.display_name || (form.file_url ? form.file_url.split('/').pop() : '---')}
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
                                X
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="legal-modal-body">
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
                                    <label className="legal-form-label">Upload file</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input
                                            type="file"
                                            className="legal-form-control"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                            style={{ flex: 1 }}
                                        />
                                        {uploading && <span style={{ color: '#17a2b8' }}>Đang upload...</span>}
                                        {formData.file_url && <span style={{ color: '#28a745', fontSize: '12px' }}>✓ Đã upload</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => document.querySelector('input[type="file"]').click()}
                                            className="legal-btn legal-btn-primary"
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                            disabled={uploading}
                                        >
                                            Upload từ máy tính
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleShowLibrary}
                                            className="legal-btn legal-btn-secondary"
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                        >
                                            Chọn từ thư viện
                                        </button>
                                    </div>
                                    {formData.file_url && (
                                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>
                                            File: {uploadedFileName || formData.file_url.split('/').pop()}
                                        </div>
                                    )}
                                </div>

                                <div className="legal-form-group">
                                    <label className="legal-form-label">URL file (tự động điền sau khi upload)</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                        <input
                                            type="url"
                                            className="legal-form-control"
                                            name="file_url"
                                            value={formData.file_url}
                                            onChange={handleChange}
                                            placeholder="https://..."
                                            required={!editingId}
                                            readOnly
                                            style={{ flex: 1 }}
                                        />
                                        {formData.file_url && (
                                            <button
                                                type="button"
                                                onClick={handleClearFile}
                                                className="legal-btn legal-btn-danger"
                                                style={{ padding: '8px 12px', minWidth: '60px', marginTop: '2px' }}
                                            >
                                                Xóa
                                            </button>
                                        )}
                                    </div>
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

            {/* Modal thư viện tài liệu */}
            {showLibrary && (
                <div className="legal-modal-overlay">
                    <div className="legal-modal-content" style={{ maxWidth: '800px', maxHeight: '80vh' }}>
                        <div className="legal-modal-header">
                            <h3 style={{ margin: 0, color: '#0066cc' }}>Chọn từ thư viện tài liệu</h3>
                            <button
                                onClick={() => setShowLibrary(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                            >
                                X
                            </button>
                        </div>
                        <div className="legal-modal-body" style={{ padding: '20px' }}>
                            {loadingLibrary ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '14px', color: '#666' }}>Đang tải tài liệu...</div>
                                </div>
                            ) : libraryDocuments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
                                    <div style={{ fontSize: '16px', fontWeight: '500', color: '#6c757d' }}>
                                        Chưa có tài liệu nào trong thư viện
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: '16px',
                                    maxHeight: '400px',
                                    overflowY: 'auto'
                                }}>
                                    {libraryDocuments.map((document) => (
                                        <div
                                            key={document.publicId}
                                            onClick={() => handleSelectFromLibrary(document)}
                                            style={{
                                                border: '1px solid #e0e0e0',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                background: 'white',
                                                textAlign: 'center',
                                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.borderColor = '#007bff';
                                                e.target.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.15)';
                                                e.target.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.borderColor = '#e0e0e0';
                                                e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                                                e.target.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                                            <p style={{
                                                margin: 0,
                                                fontSize: '12px',
                                                color: '#495057',
                                                wordBreak: 'break-word',
                                                lineHeight: '1.4',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}>
                                                {document.displayName}
                                            </p>
                                            <div style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px',
                                                background: 'rgba(0, 123, 255, 0.8)',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '20px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                opacity: 0,
                                                transition: 'opacity 0.3s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.opacity = '1'}
                                            onMouseLeave={(e) => e.target.style.opacity = '0'}
                                            >
                                                ✓
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}