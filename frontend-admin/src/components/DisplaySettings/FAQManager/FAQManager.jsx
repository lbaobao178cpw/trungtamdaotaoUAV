import React, { useState, useEffect } from "react";

import "../../admin/Admin/Admin.css";
import { API_BASE_URL } from '../../../config/apiConfig';

const API_FAQ_URL = `${API_BASE_URL}/faqs`;

export default function FAQManager() {
    const [faqs, setFaqs] = useState([]);
    const [form, setForm] = useState({
        id: "",
        question: "",
        answer: "",
        category: "exam",
        display_order: 0,
        is_active: true
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("exam");

    const token = localStorage.getItem("admin_token");

    const categories = [
        { value: "exam", label: "Thi sát hạch" },
        { value: "about", label: "Giới thiệu" }
    ];

    // === FETCH DATA ===
    const fetchFAQs = async () => {
        try {
            const params = new URLSearchParams({
                limit: 1000,
                category: selectedCategory,
                ...(searchQuery && { search: searchQuery })
            });
            const response = await fetch(API_FAQ_URL + "?" + params);
            if (!response.ok) throw new Error("Không thể kết nối Server");
            const data = await response.json();
            setFaqs(data.data || []);
        } catch (error) {
            console.error("Lỗi fetch:", error);
            toast.error("Lỗi kết nối Server");
        }
    };

    // Filter FAQ theo category và search
    useEffect(() => {
        fetchFAQs();
    }, [selectedCategory]);

    useEffect(() => {
        fetchFAQs();
    }, []);

    // === HANDLERS ===
    const handleSearch = (e) => {
        e.preventDefault();
        fetchFAQs();
    };

    const handleAddNew = () => {
        setForm({
            id: "",
            question: "",
            answer: "",
            category: "exam",
            display_order: 0,
            is_active: true
        });
        setIsEditing(false);
    };

    const handleEditClick = (faq) => {
        setForm({
            ...faq,
            category: faq.category || "exam",
            is_active: faq.is_active === 1 || faq.is_active === true
        });
        setIsEditing(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const method = isEditing ? "PUT" : "POST";
            const url = isEditing ? `${API_FAQ_URL}/${form.id}` : API_FAQ_URL;

            const payload = {
                question: form.question,
                answer: form.answer,
                category: form.category || "exam",
                display_order: parseInt(form.display_order) || 0,
                is_active: form.is_active
            };

            if (!payload.question || !payload.answer) {
                toast.error("Câu hỏi và trả lời không được để trống");
                setLoading(false);
                return;
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Lỗi khi lưu dữ liệu");

            toast.success(`${isEditing ? "Cập nhật" : "Tạo"} FAQ thành công!`);

            if (!isEditing) handleAddNew();
            fetchFAQs();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xóa FAQ này?")) return;
        try {
            const response = await fetch(`${API_FAQ_URL}/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error("Lỗi xóa");

            toast.success("Xóa FAQ thành công!");
            fetchFAQs();
            if (form.id === id) handleAddNew();
        } catch (error) {
            toast.error("Lỗi khi xóa");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một FAQ");
            return;
        }
        if (!window.confirm(`Xóa ${selectedIds.length} FAQ?`)) return;

        try {
            const response = await fetch(API_FAQ_URL, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedIds })
            });
            if (!response.ok) throw new Error("Lỗi xóa");

            toast.success(`Xóa ${selectedIds.length} FAQ thành công!`);
            setSelectedIds([]);
            fetchFAQs();
        } catch (error) {
            toast.error("Lỗi khi xóa");
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <div className="solution-manager-container" style={{ display: "flex", gap: "24px", marginTop: "20px", flexDirection: "row-reverse" }}>
            {/* --- PANEL 1: FORM NHẬP LIỆU --- */}
            <div className="panel" style={{ flex: 1 }}>
                <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                        {isEditing ? `Sửa FAQ #${form.id}` : "Thêm FAQ Mới"}
                    </span>
                    {isEditing && (
                        <button
                            type="button"
                            onClick={handleAddNew}
                            className="btn btn-sm btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <X size={14} /> Hủy
                        </button>
                    )}
                </div>

                <div className="form-section">
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label className="form-label">Câu hỏi</label>
                            <input
                                type="text"
                                className="form-control"
                                value={form.question}
                                onChange={(e) => setForm({ ...form, question: e.target.value })}
                                placeholder="Nhập câu hỏi... (hỗ trợ tất cả ký tự)"
                                required
                                autoComplete="off"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Trả lời</label>
                            <textarea
                                className="form-control"
                                rows="6"
                                value={form.answer}
                                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                                placeholder="Nhập nội dung trả lời... (hỗ trợ tất cả ký tự và xuống dòng)"
                                required
                                autoComplete="off"
                                spellCheck="false"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Danh mục</label>
                            <select
                                className="form-control"
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                            >
                                <option value="exam">Thi sát hạch</option>
                                <option value="about">Giới thiệu</option>
                            </select>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Thứ tự hiển thị</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={form.display_order}
                                    onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                                    min="0"
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Trạng thái</label>
                                <select
                                    className="form-control"
                                    value={form.is_active ? "true" : "false"}
                                    onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}
                                >
                                    <option value="true">Hiển thị</option>
                                    <option value="false">Ẩn</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginTop: "20px", borderTop: "1px solid #eee", paddingTop: 20 }}>
                            <button
                                type="submit"
                                className="btn btn-primary btn-block"
                                disabled={loading}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {loading ? <RefreshCw className="spin" size={18} /> : <Save size={18} />}
                                {loading ? "Đang xử lý..." : isEditing ? "CẬP NHẬT FAQ" : "TẠO FAQ MỚI"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* --- PANEL 2: DANH SÁCH --- */}
            <div className="panel" style={{ flex: 1.5 }}>
                <div className="panel-header" style={{ justifyContent: "space-between" }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={18} /> Danh sách FAQ ({faqs.length})
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {selectedIds.length > 0 && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={handleBulkDelete}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <Trash2 size={14} /> Xóa ({selectedIds.length})
                            </button>
                        )}
                        <button
                            className="btn btn-success btn-sm"
                            onClick={fetchFAQs}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <RefreshCw size={14} /> Làm mới
                        </button>
                    </div>
                </div>

                {/* Filter Tab */}
                <div style={{ padding: "12px", borderBottom: "1px solid #eee", display: "flex", gap: "8px" }}>
                    {categories.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => { setSelectedCategory(cat.value); setSearchQuery(""); }}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: selectedCategory === cat.value ? "bold" : "normal",
                                background: selectedCategory === cat.value ? "#0050b8" : "#f0f0f0",
                                color: selectedCategory === cat.value ? "white" : "#333",
                                transition: "all 0.3s"
                            }}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} style={{ padding: "12px", borderBottom: "1px solid #eee", display: "flex", gap: "8px" }}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm câu hỏi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: "6px",
                            border: "1px solid #ddd",
                            fontSize: "14px"
                        }}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                        Tìm kiếm
                    </button>
                </form>

                <div className="list-group">
                    {faqs.length === 0 && (
                        <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
                            {searchQuery ? "Không tìm thấy kết quả" : "Chưa có FAQ nào"}
                        </div>
                    )}

                    {faqs.map((faq) => (
                        <div key={faq.id} className="list-item" style={{ alignItems: "flex-start", padding: "15px" }}>
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(faq.id)}
                                onChange={() => toggleSelect(faq.id)}
                                style={{ marginRight: "12px", marginTop: "4px", cursor: "pointer" }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: "8px" }}>
                                    <div className="item-title" style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "4px" }}>
                                        {faq.question}
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px", lineHeight: "1.4" }}>
                                        {faq.answer.substring(0, 150)}...
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#999", marginBottom: "8px" }}>
                                        Danh mục: <span style={{ fontWeight: "bold", color: "#0050b8" }}>{faq.category === "exam" ? "Thi sát hạch" : "Giới thiệu"}</span>
                                        {" • "} Thứ tự: {faq.display_order}
                                        {faq.is_active === 0 && <span style={{ marginLeft: "10px", color: "#f59e0b" }}>⚠ Đã ẩn</span>}
                                    </div>
                                </div>

                                <div className="item-actions" style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        onClick={() => handleEditClick(faq)}
                                        className="btn btn-primary btn-sm"
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Edit size={14} /> Sửa
                                    </button>
                                    <button
                                        onClick={() => handleDelete(faq.id)}
                                        className="btn btn-danger btn-sm"
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Trash2 size={14} /> Xóa
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
