import React, { useState, useEffect, useRef } from 'react';
import './LegalManagement.css';

const API_URL = "http://localhost:5000/api/study-materials";
const CLOUDINARY_UPLOAD_URL = "http://localhost:5000/api/cloudinary/upload";

export default function StudyMaterialsManager() {
    const fileInputRef = useRef(null);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadedFileUrl, setUploadedFileUrl] = useState('');
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [message, setMessage] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        file_url: '',
        display_name: ''
    });

    useEffect(() => {
        fetchMaterials();
    }, [search, page]);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page,
                limit: 20
            });

            if (search) {
                params.append('search', search);
            }

            const res = await fetch(`${API_URL}?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setMaterials(data.data || []);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Lỗi tải tài liệu:', error);
            setMessage({ type: 'error', text: 'Lỗi tải dữ liệu' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            console.log('❌ No file selected');
            return;
        }

        console.log('📁 File selected:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        try {
            setUploading(true);
            const token = localStorage.getItem('admin_token');

            if (!token) {
                setMessage({ type: 'error', text: 'Vui lòng đăng nhập lại' });
                return;
            }

            console.log('🚀 Creating FormData with file');
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('folder', 'uav-study-materials');
            uploadFormData.append('displayName', file.name);

            console.log('📤 Uploading to:', CLOUDINARY_UPLOAD_URL);
            console.log('🔑 Token:', token ? `${token.substring(0, 20)}...` : 'MISSING');

            const res = await fetch(CLOUDINARY_UPLOAD_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: uploadFormData
            });

            console.log('📥 Upload response status:', res.status);

            const data = await res.json();
            console.log('📦 Upload response data:', data);

            if (data.success) {
                setUploadedFileUrl(data.url);
                setUploadedFileName(data.displayName || data.originalFilename || file.name);
                setFormData(prev => ({
                    ...prev,
                    file_url: data.url,
                    display_name: data.displayName || file.name
                }));
                setMessage({ type: 'success', text: 'Upload file thành công!' });
            } else {
                setMessage({ type: 'error', text: 'Upload thất bại: ' + (data.error || 'Không rõ lý do') });
            }
        } catch (error) {
            console.error('❌ Lỗi upload:', error);
            setMessage({ type: 'error', text: 'Lỗi upload file: ' + error.message });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title) {
            setMessage({ type: 'error', text: 'Tiêu đề không được để trống' });
            return;
        }

        if (!editingId && !formData.file_url) {
            setMessage({ type: 'error', text: 'File không được để trống' });
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('admin_token');

            if (!token) {
                setMessage({ type: 'error', text: 'Vui lòng đăng nhập lại' });
                setUploading(false);
                return;
            }

            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `${API_URL}/${editingId}` : API_URL;

            console.log(`📤 [StudyMaterials] Sending ${method} request to:`, url);

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    file_url: formData.file_url,
                    display_name: formData.display_name
                })
            });

            const data = await res.json();
            console.log('📦 Response data:', data);

            if (data.success) {
                setMessage({
                    type: 'success',
                    text: editingId ? 'Cập nhật thành công' : 'Tạo mới thành công'
                });
                resetForm();
                fetchMaterials();
                setShowModal(false);
            } else {
                console.error('❌ API Error:', data.error);
                setMessage({ type: 'error', text: data.error || 'Lỗi lưu dữ liệu' });
            }
        } catch (error) {
            console.error('❌ Fetch Error:', error);
            setMessage({ type: 'error', text: error.message || 'Lỗi lưu dữ liệu' });
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (material) => {
        setFormData({
            title: material.title,
            description: material.description || '',
            file_url: material.file_url,
            display_name: material.display_name || material.title
        });
        setUploadedFileName(material.display_name || material.title);
        setEditingId(material.id);
        setShowModal(true);
    };

    const handleSelectItem = (id) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedItems(new Set(materials.map(m => m.id)));
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleDeleteMultiple = async () => {
        if (selectedItems.size === 0) return;
        if (!window.confirm(`Bạn chắc chắn muốn xóa ${selectedItems.size} tài liệu?`)) return;

        try {
            const token = localStorage.getItem('admin_token');
            for (const id of selectedItems) {
                await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            setMessage({ type: 'success', text: `Đã xóa ${selectedItems.size} tài liệu` });
            setSelectedItems(new Set());
            fetchMaterials();
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi xóa tài liệu' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn chắc chắn muốn xóa?')) return;

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Xóa thành công' });
                fetchMaterials();
            } else {
                setMessage({ type: 'error', text: 'Lỗi xóa dữ liệu' });
            }
        } catch (error) {
            console.error('Lỗi:', error);
            setMessage({ type: 'error', text: 'Lỗi xóa dữ liệu' });
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            file_url: '',
            display_name: ''
        });
        setUploadedFileUrl('');
        setUploadedFileName('');
        setEditingId(null);
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="legal-management-container">
            {/* Header */}
            <div className="legal-header">
                <h2 className="legal-title">Tài liệu Ôn thi</h2>
                <div className="legal-actions">
                    {selectedItems.size > 0 && (
                        <button
                            className="legal-btn legal-btn-danger"
                            onClick={handleDeleteMultiple}
                            style={{ marginRight: '10px' }}
                        >
                            Xóa ({selectedItems.size})
                        </button>
                    )}
                    <button
                        className="legal-btn legal-btn-primary"
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                    >
                        + Thêm tài liệu
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`ds-message ${message.type}`} style={{ marginBottom: '20px' }}>
                    {message.text}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    Đang tải...
                </div>
            ) : materials.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    Không có tài liệu nào
                </div>
            ) : (
                <table className="legal-table">
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedItems.size === materials.length && materials.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th>Tên tài liệu</th>
                            <th>File đã upload</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materials.map(material => (
                            <tr key={material.id}>
                                <td style={{ width: '50px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(material.id)}
                                        onChange={() => handleSelectItem(material.id)}
                                    />
                                </td>
                                <td style={{ maxWidth: '300px' }}>
                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                        {material.title}
                                    </div>
                                </td>
                                <td style={{ fontSize: '12px', color: '#6c757d' }}>
                                    {material.file_url ? material.file_url.split('/').pop() : '---'}
                                </td>
                                <td>
                                    <div className="legal-table-actions">
                                        <button
                                            className="legal-btn legal-btn-secondary"
                                            onClick={() => handleEdit(material)}
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            className="legal-btn legal-btn-danger"
                                            onClick={() => handleDelete(material.id)}
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
            )}

            {/* Modal */}
            {showModal && (
                <div className="legal-modal-overlay">
                    <div className="legal-modal-content" style={{ maxWidth: '500px' }}>
                        <div className="legal-modal-header">
                            <h3 className="legal-modal-title">
                                {editingId ? 'Cập nhật tài liệu' : 'Thêm tài liệu ôn thi mới'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="legal-modal-close"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="legal-form">
                            <div className="form-group">
                                <label className="form-label">Tiêu đề *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Nhập tiêu đề tài liệu"
                                    className="form-control"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">File tài liệu {!editingId && '*'}</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="form-control"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.jpg,.png"
                                />
                                <small style={{ color: '#999', marginTop: '6px', display: 'block' }}>
                                    Hỗ trợ: PDF, Word, Excel, PowerPoint, ZIP, RAR (Tối đa 100MB)
                                </small>

                                {uploadedFileName && (
                                    <div style={{
                                        marginTop: '12px',
                                        padding: '12px',
                                        background: '#e8f5e9',
                                        borderRadius: '4px',
                                        border: '1px solid #4caf50',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ color: '#2e7d32', fontWeight: '600' }}>
                                            ✓ {uploadedFileName}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUploadedFileUrl('');
                                                setUploadedFileName('');
                                                setFormData(prev => ({ ...prev, file_url: '' }));
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#2e7d32',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                padding: '0'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="legal-modal-actions">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="legal-btn legal-btn-secondary"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="legal-btn legal-btn-primary"
                                    style={{ opacity: uploading ? 0.6 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
                                >
                                    {uploading ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
