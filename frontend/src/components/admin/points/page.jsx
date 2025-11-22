import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api'; // Đảm bảo đường dẫn import đúng với cấu trúc của bạn
import MapPicker from '@/components/admin/MapPicker';
import MediaSelector from '@/components/admin/MediaSelector';

export default function AdminPoints() {
  const [points, setPoints] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  
  // Biến này xác định xem đang chọn ảnh cho trường nào (logo, image, hay panorama)
  const [mediaFieldType, setMediaFieldType] = useState(''); 

  // === 1. THÊM panoramaUrl VÀO STATE ===
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    lead: '',
    description: '',
    posX: 0,
    posY: 0,
    posZ: 0,
    logoSrc: '',
    imageSrc: '',
    panoramaUrl: '', // <--- TRƯỜNG MỚI QUAN TRỌNG
    website: '',
    schedule: {
      monday: 'Closed', tuesday: 'Closed', wednesday: 'Closed',
      thursday: 'Closed', friday: 'Closed', saturday: 'Closed', sunday: 'Closed'
    },
    contact: { phone: '', email: '' }
  });

  // Fetch dữ liệu
  const fetchPoints = async () => {
    try {
      const { data } = await api.points.getAll();
      // Map dữ liệu từ API vào state form
      const transformed = data.map(p => ({
        ...p,
        posX: p.position[0],
        posY: p.position[1], // Giữ nguyên tọa độ
        posZ: p.position[2],
        panoramaUrl: p.panoramaUrl || '' // Đảm bảo không null
      }));
      setPoints(transformed);
    } catch (error) {
      console.error('Error fetching points:', error);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, []);

  // Xử lý Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.points.update(formData.id, formData);
        alert('Đã cập nhật thành công!');
      } else {
        await api.points.create(formData);
        alert('Đã thêm điểm mới!');
      }
      
      // Reset form
      setFormData({
        id: '', title: '', lead: '', description: '',
        posX: 0, posY: 0, posZ: 0,
        logoSrc: '', imageSrc: '', panoramaUrl: '', 
        website: '',
        schedule: { monday: 'Closed' }, // ...reset các thứ khác
        contact: { phone: '', email: '' }
      });
      setIsEditing(false);
      fetchPoints();
    } catch (error) {
      console.error('Error:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  // Xử lý xóa
  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa?')) return;
    try {
      await api.points.delete(id);
      fetchPoints();
    } catch (error) {
      alert('Lỗi khi xóa!');
    }
  };

  // Xử lý khi bấm Sửa
  const handleEdit = (point) => {
    setFormData(point);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Xử lý chọn vị trí từ Map
  const handlePickPosition = (x, y, z) => {
    setFormData(prev => ({
      ...prev,
      posX: parseFloat(x.toFixed(3)),
      posY: parseFloat(y.toFixed(3)),
      posZ: parseFloat(z.toFixed(3))
    }));
    setShowMapPicker(false);
  };

  // Xử lý chọn ảnh từ Media Selector
  const handleSelectMedia = (url) => {
    setFormData(prev => ({
      ...prev,
      [mediaFieldType]: url // Cập nhật trường tương ứng (logoSrc, imageSrc, hoặc panoramaUrl)
    }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold text-blue-800">Trang Quản Lý Điểm Thông Tin (Admin)</h1>
         <button onClick={() => window.location.href='/'} className="text-sm text-blue-600 underline">← Quay lại Bản đồ Chính</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* === FORM BÊN TRÁI === */}
        <div className="lg:col-span-1 bg-white p-4 rounded shadow border">
          <h2 className="text-xl font-bold mb-4 text-blue-800 border-b pb-2">
            {isEditing ? 'CHỈNH SỬA Điểm: ' + formData.id : 'THÊM MỚI Điểm'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Chọn Vị trí */}
            <button 
              type="button"
              onClick={() => setShowMapPicker(true)}
              className="w-full bg-blue-900 text-white py-2 rounded font-bold hover:bg-blue-800 transition"
            >
              1. Chọn Vị Trí Trên Bản Đồ 📍
            </button>
            
            <div className="grid grid-cols-3 gap-2 text-sm">
               <div className="bg-gray-100 p-2 rounded text-center border">X: {formData.posX}</div>
               <div className="bg-gray-100 p-2 rounded text-center border">Y: {formData.posY}</div>
               <div className="bg-gray-100 p-2 rounded text-center border">Z: {formData.posZ}</div>
            </div>

            {/* Thông tin cơ bản */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold">ID (Mã điểm)</label>
                <input className="w-full border p-2 rounded" 
                       value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} 
                       placeholder="vd: 1234" disabled={isEditing} />
                
                <label className="block text-sm font-semibold">Tên hiển thị</label>
                <input className="w-full border p-2 rounded" 
                       value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                       placeholder="vd: Khu vực Căn Tin" />
                
                <label className="block text-sm font-semibold">Mô tả ngắn (Lead)</label>
                <input className="w-full border p-2 rounded" 
                       value={formData.lead} onChange={e => setFormData({...formData, lead: e.target.value})} />

                <label className="block text-sm font-semibold">Mô tả chi tiết</label>
                <textarea className="w-full border p-2 rounded h-24" 
                          value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                
                <label className="block text-sm font-semibold">Website</label>
                <input className="w-full border p-2 rounded" 
                       value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="https://..." />
            </div>

            {/* === PHẦN HÌNH ẢNH (ĐÃ CẬP NHẬT) === */}
            <div className="border-t pt-4 mt-4">
                <h3 className="font-bold mb-2">Đường dẫn Icon và Ảnh</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* Cột Logo */}
                    <div>
                        <label className="block text-xs font-semibold mb-1">Logo Icon</label>
                        <button type="button" 
                                onClick={() => { setMediaFieldType('logoSrc'); setShowMediaSelector(true); }}
                                className="w-full bg-green-600 text-white text-sm py-1 rounded hover:bg-green-700">
                            Chọn Logo
                        </button>
                        {formData.logoSrc && <img src={formData.logoSrc} className="mt-2 w-16 h-16 object-contain border mx-auto bg-gray-100" />}
                    </div>

                    {/* Cột Ảnh Chính (Ảnh thường) */}
                    <div>
                        <label className="block text-xs font-semibold mb-1">Ảnh Chính (Thumbnail)</label>
                        <button type="button" 
                                onClick={() => { setMediaFieldType('imageSrc'); setShowMediaSelector(true); }}
                                className="w-full bg-green-600 text-white text-sm py-1 rounded hover:bg-green-700">
                            Chọn Ảnh
                        </button>
                        {formData.imageSrc && <img src={formData.imageSrc} className="mt-2 w-full h-16 object-cover border rounded" />}
                    </div>
                </div>

                {/* === Ô NHẬP PANORAMA MỚI === */}
                <div className="mt-4 bg-purple-50 p-3 rounded border border-purple-200">
                    <label className="block text-sm font-bold text-purple-800 mb-1">📸 Ảnh Panorama 360° (Quan trọng)</label>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 border p-1 text-sm rounded"
                            placeholder="http://...webp"
                            value={formData.panoramaUrl}
                            onChange={e => setFormData({...formData, panoramaUrl: e.target.value})}
                        />
                        <button type="button" 
                                onClick={() => { setMediaFieldType('panoramaUrl'); setShowMediaSelector(true); }}
                                className="bg-purple-600 text-white text-sm px-3 py-1 rounded hover:bg-purple-700">
                            Chọn
                        </button>
                    </div>
                    {formData.panoramaUrl ? (
                        <div className="mt-2 text-xs text-green-600 font-semibold">✅ Đã có ảnh 360</div>
                    ) : (
                        <div className="mt-2 text-xs text-gray-400">Chưa có ảnh 360 (sẽ hiện ảnh thường)</div>
                    )}
                </div>
                {/* =========================== */}

            </div>

            {/* Nút Submit */}
            <div className="flex gap-2 mt-6 pt-4 border-t">
                <button type="submit" className="flex-1 bg-blue-800 text-white py-2 rounded font-bold hover:bg-blue-900">
                    {isEditing ? 'LƯU CẬP NHẬT' : 'THÊM ĐIỂM MỚI'}
                </button>
                {isEditing && (
                    <button type="button" 
                            onClick={() => { setIsEditing(false); setFormData({ ...formData, id: '' }); }}
                            className="bg-gray-500 text-white px-4 rounded hover:bg-gray-600">
                        Hủy
                    </button>
                )}
            </div>
          </form>
        </div>

        {/* === DANH SÁCH BÊN PHẢI === */}
        <div className="lg:col-span-2 bg-white p-4 rounded shadow border">
          <h2 className="text-xl font-bold mb-4 text-blue-800">Danh sách {points.length} Điểm</h2>
          
          <div className="space-y-3">
            {points.map(point => (
              <div key={point.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50">
                <div>
                   <div className="font-bold text-lg">{point.id} <span className="text-gray-500 text-sm font-normal">({point.title})</span></div>
                   <div className="text-xs text-gray-500">Vị trí: [{point.position.join(', ')}]</div>
                   
                   {/* Hiển thị trạng thái ảnh */}
                   <div className="flex gap-2 mt-1">
                      {point.panoramaUrl ? 
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">360° OK</span> : 
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Không có 360°</span>
                      }
                   </div>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={() => handleEdit(point)} className="bg-blue-800 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-900">Sửa</button>
                    <button onClick={() => handleDelete(point.id)} className="bg-red-500 text-white text-xs px-3 py-1.5 rounded hover:bg-red-600">Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Modals */}
      {showMapPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <MapPicker onPick={handlePickPosition} onClose={() => setShowMapPicker(false)} />
        </div>
      )}

      {showMediaSelector && (
        <MediaSelector onSelect={handleSelectMedia} onClose={() => setShowMediaSelector(false)} />
      )}
    </div>
  );
}