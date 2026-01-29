import React, { useState, useEffect } from 'react';
import '../../admin/Admin/Admin.css';
import './NghiepVuHangBManager.css';
import { apiClient } from '../../../lib/apiInterceptor';
import { API_BASE_URL } from '../../../config/apiConfig';
import { notifySuccess, notifyError, notifyWarning } from '../../../lib/notifications';

const API_URL = `${API_BASE_URL}/nghiep-vu-hang-b`;

export default function NghiepVuHangBManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ id: '', title: '', description: '', category: 'map', is_active: true, sort_order: 0 });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(API_URL);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      notifyError('Lỗi tải dữ liệu');
    } finally { setLoading(false); }
  };

  const handleEdit = (it) => {
    setForm({ ...it, is_active: it.is_active === 1 || it.is_active === true });
    setIsEditing(true);
  };

  const handleNew = () => {
    setForm({ id: '', title: '', description: '', category: 'map', duration_minutes: 0, price: 0, is_active: true, sort_order: 0 });
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, duration_minutes: Number(form.duration_minutes) || 0, price: Number(form.price) || 0, is_active: !!form.is_active };
      if (isEditing) {
        await apiClient.put(`${API_URL}/${form.id}`, payload);
        notifySuccess('Cập nhật thành công');
      } else {
        await apiClient.post(API_URL, payload);
        notifySuccess('Tạo mới thành công');
      }
      handleNew();
      fetchItems();
    } catch (err) {
      notifyError(err?.message || 'Lỗi lưu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa mục này?')) return;
    try {
      await apiClient.delete(`${API_URL}/${id}`);
      notifySuccess('Đã xóa');
      fetchItems();
    } catch (err) { notifyError('Lỗi xóa'); }
  };

  return (
    <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
      <div className="panel" style={{ flex: 1 }}>
            <div className="panel-header nvhb-panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{isEditing ? `Sửa #${form.id}` : 'Thêm nghiệp vụ Hạng B'}</strong>
              {isEditing && <button className="btn btn-sm nvhb-btn-small" onClick={handleNew}>Hủy</button>}
            </div>
        <form className="form-section" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Tiêu đề</label>
            <input className="form-control" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <input className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
            </div>
          </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> Kích hoạt
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="form-label">Thứ tự</span>
              <input type="number" className="form-control" style={{ width: 100 }} value={form.sort_order} onChange={e => setForm({...form, sort_order: e.target.value})} />
            </label>
            <button className="btn btn-primary nvhb-btn-small" type="submit">{isEditing ? 'Lưu' : 'Tạo'}</button>
          </div>
        </form>
      </div>

      <div className="panel" style={{ flex: 1.2 }}>
        <div className="panel-header">Danh sách</div>
        <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {loading ? <div>Loading...</div> : (
            <table className="table nvhb-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>ID</th>
                  <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Title</th>
                  <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Category</th>
                  
                  <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Active</th>
                  <th style={{ textAlign: 'center', verticalAlign: 'middle' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id}>
                    <td>{it.id}</td>
                    <td>{it.title}</td>
                    <td>{it.category}</td>
                    <td>{it.is_active ? 'Yes' : 'No'}</td>
                    <td>
                      <div className="nvhb-actions">
                        <button className="btn btn-sm nvhb-btn-small" onClick={() => handleEdit(it)}>Sửa</button>
                        <button className="btn btn-sm btn-danger nvhb-btn-small" onClick={() => handleDelete(it.id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
