import React, { useState, useEffect, useRef } from 'react';

const API_URL = "http://localhost:5000/api/study-materials";

export default function StudyMaterialsManager() {
    const fileInputRef = useRef(null);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        file: null
    });

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            if (data.success) {
                setMaterials(data.data || []);
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        console.log('📁 File selected:', file);
        if (file) {
            console.log('  - Name:', file.name);
            console.log('  - Size:', file.size, 'bytes');
            console.log('  - Type:', file.type);
        }
        setFormData(prev => ({
            ...prev,
            file: file
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title) {
            setMessage({ type: 'error', text: 'Tiêu đề không được để trống' });
            return;
        }

        if (!editingId && !formData.file) {
            setMessage({ type: 'error', text: 'File không được để trống' });
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('admin_token');
            console.log('🔐 Admin token from localStorage:', token ? `${token.substring(0, 30)}...` : 'NOT FOUND');

            if (!token) {
                setMessage({ type: 'error', text: 'Vui lòng đăng nhập lại' });
                setUploading(false);
                return;
            }

            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            if (formData.file) {
                formDataToSend.append('file', formData.file);
            }

            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `${API_URL}/${editingId}` : API_URL;

            console.log(`📤 [StudyMaterials] Sending ${method} request to:`, url);
            console.log('🔑 Token:', token ? `${token.substring(0, 20)}...` : 'MISSING');

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataToSend
            });

            console.log(`📥 Response status:`, res.status, res.statusText);

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
            file: null
        });
        setEditingId(material.id);
        setShowModal(true);
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
            file: null
        });
        setEditingId(null);
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#0066cc' }}>📚 Tài liệu Ôn thi</h3>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    style={{
                        padding: '10px 20px',
                        background: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    + Thêm tài liệu
                </button>
            </div>

            {message && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    background: message.type === 'success' ? '#d4edda' : '#f8d7da',
                    color: message.type === 'success' ? '#155724' : '#721c24',
                    border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>
            ) : materials.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    Không có tài liệu nào
                </div>
            ) : (
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    background: 'white',
                    borderRadius: '6px',
                    overflow: 'hidden'
                }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Tiêu đề</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Kích thước</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Lượt tải</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materials.map(material => (
                            <tr key={material.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px 16px', fontWeight: '600' }}>{material.title}</td>
                                <td style={{ padding: '12px 16px' }}>{material.file_size_formatted || 'N/A'}</td>
                                <td style={{ padding: '12px 16px' }}>{material.download_count || 0}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleEdit(material)}
                                            style={{
                                                padding: '6px 12px',
                                                background: '#f0f0f0',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(material.id)}
                                            style={{
                                                padding: '6px 12px',
                                                background: '#ff6b6b',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
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
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '30px',
                        maxWidth: '500px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0066cc' }}>
                            {editingId ? 'Cập nhật tài liệu' : 'Thêm tài liệu ôn thi mới'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                                    Tiêu đề *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Nhập tiêu đề tài liệu"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                                    File tài liệu {!editingId && '*'}
                                </label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                    required={!editingId}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                                />
                                <small style={{ color: '#999', marginTop: '6px', display: 'block' }}>
                                    Hỗ trợ: PDF, Word, Excel, PowerPoint, ZIP, RAR (Tối đa 100MB)
                                </small>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#f0f0f0',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#0066cc',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        opacity: uploading ? 0.6 : 1
                                    }}
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
