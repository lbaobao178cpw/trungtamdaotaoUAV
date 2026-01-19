import React, { useState, useEffect } from 'react';
import './StudyMaterialsManager.css';

const API_URL = "http://localhost:5000/api/study-materials";

export default function StudyMaterialsManager() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        certificateType: '',
        file: null
    });

    const certificateTypes = ['Hạng A', 'Hạng B', 'Hạng C', 'Hạng D'];

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
        setFormData(prev => ({
            ...prev,
            file: file
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.file) {
            setMessage({ type: 'error', text: 'Tiêu đề và file không được để trống' });
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

            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('certificateType', formData.certificateType);
            formDataToSend.append('file', formData.file);

            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `${API_URL}/${editingId}` : API_URL;

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataToSend
            });

            const data = await res.json();
            if (data.success) {
                setMessage({
                    type: 'success',
                    text: editingId ? 'Cập nhật thành công' : 'Tạo mới thành công'
                });
                resetForm();
                fetchMaterials();
                setShowModal(false);
            } else {
                setMessage({ type: 'error', text: data.error || 'Lỗi lưu dữ liệu' });
            }
        } catch (error) {
            console.error('Lỗi:', error);
            setMessage({ type: 'error', text: 'Lỗi lưu dữ liệu' });
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (material) => {
        setFormData({
            title: material.title,
            description: material.description || '',
            certificateType: material.certificate_type || '',
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
            description: '',
            certificateType: '',
            file: null
        });
        setEditingId(null);
    };

    const filteredMaterials = materials.filter(m =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="study-materials-container">
            <div className="study-materials-header">
                <h2 className="study-materials-title">Quản lý Tài liệu Ôn thi</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                >
                    + Thêm tài liệu
                </button>
            </div>

            {message && (
                <div className={`message ${message.type}`} style={{ marginBottom: '20px' }}>
                    {message.text}
                </div>
            )}

            <div className="study-materials-search" style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Tìm kiếm tài liệu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>
            ) : filteredMaterials.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    Không có tài liệu nào
                </div>
            ) : (
                <div className="study-materials-table-wrapper">
                    <table className="study-materials-table">
                        <thead>
                            <tr>
                                <th>Tiêu đề</th>
                                <th>Loại chứng chỉ</th>
                                <th>Kích thước</th>
                                <th>Lượt tải</th>
                                <th>Ngày tạo</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMaterials.map(material => (
                                <tr key={material.id}>
                                    <td>
                                        <div style={{ fontWeight: '600' }}>{material.title}</div>
                                        {material.description && (
                                            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                                {material.description.substring(0, 50)}...
                                            </p>
                                        )}
                                    </td>
                                    <td>{material.certificate_type || '-'}</td>
                                    <td>{material.file_size_formatted || 'N/A'}</td>
                                    <td>{material.download_count || 0}</td>
                                    <td>{new Date(material.created_at).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleEdit(material)}
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleDelete(material.id)}
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editingId ? 'Cập nhật tài liệu' : 'Thêm tài liệu ôn thi mới'}</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label>Tiêu đề *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Nhập tiêu đề tài liệu"
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Nhập mô tả (tùy chọn)"
                                    className="form-textarea"
                                    rows="3"
                                />
                            </div>

                            <div className="form-group">
                                <label>Loại chứng chỉ</label>
                                <select
                                    name="certificateType"
                                    value={formData.certificateType}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="">Chọn loại chứng chỉ</option>
                                    {certificateTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>File tài liệu {!editingId && '*'}</label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="form-input"
                                    required={!editingId}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                                />
                                <small style={{ color: '#999' }}>
                                    Các định dạng được hỗ trợ: PDF, Word, Excel, PowerPoint, ZIP, RAR (Tối đa 100MB)
                                </small>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={uploading}
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
