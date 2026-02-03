import React, { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Import optimization utilities
import MediaSelector from "../mediaSelector/MediaSelector";
import PointPreview from "../pointsPreview/PointPreview";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { API_ENDPOINTS, MESSAGES, VALIDATION, MEDIA_BASE_URL } from "../../constants/api";
import { notifySuccess, notifyError, notifyWarning } from "../../lib/notifications";
import { uploadPointImage, uploadPanoramaImage, listImages } from "../../lib/cloudinaryService";
import './PointManager.css';

// MapPicker thường nặng nên dùng Lazy load
const MapPicker = React.lazy(() => import("../mappicker/MapPicker"));

// --- INITIAL STATE ---
const initialPointState = {
  id: "",
  title: "",
  lead: "",
  description: "",
  website: "",
  logoSrc: "/images/logo-default.svg",
  imageSrc: "/images/img-default.jpg",
  panoramaUrl: "",
  enableSchedule: true,
  schedule: {
    monday: "Closed", tuesday: "10:00 - 18:00", wednesday: "10:00 - 18:00",
    thursday: "10:00 - 20:00", friday: "10:00 - 18:00", saturday: "10:00 - 18:00", sunday: "10:00 - 18:00"
  },
  contact: { phone: "", email: "" },
  posX: 0, posY: 0, posZ: 0,
};

// Cấu hình Toolbar cho ReactQuill
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link', 'image'],
    ['clean']
  ],
};

const formats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'link', 'image'];

export default function PointManager() {
  // === STATE ===
  const [pointForm, setPointForm] = useState(initialPointState);
  const [isEditingPoint, setIsEditingPoint] = useState(false);

  // Modal State (Map & Media)
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState(null);

  // Image upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPanorama, setUploadingPanorama] = useState(false);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [libraryImages, setLibraryImages] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // === FETCH DATA USING CUSTOM HOOK ===
  const { data: pointsData, loading, error, refetch } = useApi(API_ENDPOINTS.POINTS);
  const points = useMemo(() => Array.isArray(pointsData) ? pointsData : [], [pointsData]);

  const { mutate: savePoint } = useApiMutation();

  // === HANDLERS WITH useCallback ===
  const handleEditPointClick = useCallback((point) => {
    // Xử lý lấy toạ độ từ array hoặc field lẻ
    let x = 0, y = 0, z = 0;
    if (Array.isArray(point.position) && point.position.length >= 3) {
      x = point.position[0]; y = point.position[1]; z = point.position[2];
    } else {
      x = point.posX || 0; y = point.posY || 0; z = point.posZ || 0;
    }

    // Merge dữ liệu cũ với default để tránh lỗi undefined khi render
    const editingData = {
      ...initialPointState,
      ...point,
      posX: x, posY: y, posZ: z,
      enableSchedule: point.enableSchedule !== undefined ? point.enableSchedule : true,
      schedule: point.schedule || initialPointState.schedule,
      contact: point.contact || initialPointState.contact,
    };

    setPointForm(editingData);
    setIsEditingPoint(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleCancelEditPoint = useCallback(() => {
    setPointForm(initialPointState);
    setIsEditingPoint(false);
    setMessage(null);
  }, []);

  const handleDescriptionChange = useCallback((val) => {
    setPointForm(prev => ({ ...prev, description: val }));
  }, []);

  const handleSavePoint = useCallback(async (e) => {
    e.preventDefault();

    // 1. Validate cơ bản
    if (!pointForm.id || !pointForm.title) {
      notifyWarning("Vui lòng điền ID và Tiêu đề.");
      return;
    }

    try {
      // 2. Hàm làm sạch số
      const cleanNumber = (val) => {
        if (!val) return 0;
        const strVal = String(val).replace(',', '.');
        const num = Number(strVal);
        return isNaN(num) ? 0 : num;
      };

      // 3. Chuẩn bị Payload
      const payload = {
        ...pointForm,
        posX: cleanNumber(pointForm.posX),
        posY: cleanNumber(pointForm.posY),
        posZ: cleanNumber(pointForm.posZ),
      };

      const method = isEditingPoint ? "PUT" : "POST";
      const url = isEditingPoint ? `${API_ENDPOINTS.POINTS}/${pointForm.id}` : API_ENDPOINTS.POINTS;

      const result = await savePoint({ url, method, data: payload });

      if (result.success) {
        const msg = `${isEditingPoint ? "Đã cập nhật" : "Đã tạo mới"} thành công!`;
        notifySuccess(msg);
        if (!isEditingPoint) setPointForm(initialPointState);
        refetch(); // Reload danh sách
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      notifyError(`LỖI: ${error.message}`);
    }
  }, [pointForm, isEditingPoint, savePoint, refetch]);

  const handleDeletePoint = useCallback(async (pointId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa điểm ${pointId}?`)) return;

    try {
      const result = await savePoint({
        url: `${API_ENDPOINTS.POINTS}/${pointId}`,
        method: "DELETE"
      });

      if (result.success) {
        notifySuccess("Đã xóa thành công.");
        refetch();
        if (pointForm.id === pointId) handleCancelEditPoint();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      notifyError("Lỗi khi xóa: " + error.message);
    }
  }, [pointForm.id, savePoint, refetch, handleCancelEditPoint]);

  // Image upload handlers
  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const result = await uploadPointImage(file);
      if (result.success) {
        setPointForm(prev => ({ ...prev, logoSrc: result.url }));
        notifySuccess("Upload logo thành công!");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      notifyError("Lỗi upload logo: " + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const result = await uploadPointImage(file);
      if (result.success) {
        setPointForm(prev => ({ ...prev, imageSrc: result.url }));
        notifySuccess("Upload ảnh thành công!");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      notifyError("Lỗi upload ảnh: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePanoramaUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPanorama(true);
      const result = await uploadPanoramaImage(file);
      if (result.success) {
        setPointForm(prev => ({ ...prev, panoramaUrl: result.url }));
        notifySuccess("Upload ảnh 360 thành công!");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      notifyError("Lỗi upload ảnh 360: " + error.message);
    } finally {
      setUploadingPanorama(false);
    }
  };

  const handleShowImageLibrary = async (folder = "uav-training/quản lí điểm 3D") => {
    try {
      setLoadingLibrary(true);
      const result = await listImages(folder);
      if (result.success) {
        setLibraryImages(result.images || []);
      } else {
        setLibraryImages([]);
      }
    } catch (error) {
      setLibraryImages([]);
    } finally {
      setLoadingLibrary(false);
    }
    setShowImageLibrary(true);
  };

  const handleSelectFromImageLibrary = (imageUrl) => {
    if (mediaTarget === 'logoSrc') {
      setPointForm(prev => ({ ...prev, logoSrc: imageUrl }));
    } else if (mediaTarget === 'imageSrc') {
      setPointForm(prev => ({ ...prev, imageSrc: imageUrl }));
    }
    setShowImageLibrary(false);
  };

  // Helper hiển thị toạ độ đẹp
  const displayXYZ = (val) => (val !== undefined && val !== null) ? Number(val).toFixed(3) : "0.000";

  return (
    <>
      <div className="split-layout">

        {/* CỘT TRÁI: DANH SÁCH ĐIỂM */}
        <aside className="panel">
          <div className="panel-header">
            <span>Danh Sách Điểm ({points.length})</span>
          </div>
          <div className="list-group">
            {points.map(point => (
              <div key={point.id} className="list-item">
                <span className="item-title">{point.title || point.id}</span>
                <div className="item-actions">
                  <button onClick={() => handleEditPointClick(point)} className="btn btn-primary btn-sm">Sửa</button>
                  <button onClick={() => handleDeletePoint(point.id)} className="btn btn-danger btn-sm">Xóa</button>
                </div>
              </div>
            ))}
            {points.length === 0 && <div style={{ padding: 15, color: '#999', fontStyle: 'italic' }}>Chưa có dữ liệu</div>}
          </div>
        </aside>

        {/* CỘT GIỮA & PHẢI: FORM + PREVIEW */}
        <div className="admin-layout-grid">

          {/* CỘT GIỮA: FORM NHẬP LIỆU */}
          <main className="panel">
            <div className="panel-header panel-header-actions">
              <span>{isEditingPoint ? `Đang sửa: ${pointForm.title}` : "Thêm Điểm Mới"}</span>
              {isEditingPoint && (
                <button onClick={handleCancelEditPoint} className="btn btn-sm btn-secondary">Hủy</button>
              )}
            </div>

            <div className="form-section">
              <form onSubmit={handleSavePoint}>

                {/* ID & Title */}
                <div className="form-row-id-title">
                  <div className="form-group">
                    <label className="form-label">ID (Duy nhất)</label>
                    <input
                      type="text" className="form-control" required
                      value={pointForm.id} disabled={isEditingPoint}
                      onChange={(e) => setPointForm(prev => ({ ...prev, id: e.target.value }))}
                      placeholder="VD: P01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tiêu đề hiển thị</label>
                    <input
                      type="text" className="form-control" required
                      value={pointForm.title}
                      onChange={(e) => setPointForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="VD: Khu vực A"
                    />
                  </div>
                </div>

                {/* Map Picker Button */}
                <div className="form-group">
                  <label className="form-label">Vị trí trong không gian 3D</label>
                  <div className="input-group">
                    <div className="form-control input-display-readonly">
                      X: {displayXYZ(pointForm.posX)} | Y: {displayXYZ(pointForm.posY)} | Z: {displayXYZ(pointForm.posZ)}
                    </div>
                    <button type="button" className="btn btn-primary" onClick={() => setIsPickerOpen(true)}>
                      Chọn trên bản đồ
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả ngắn (Lead)</label>
                  <textarea
                    className="form-control" rows="2"
                    value={pointForm.lead}
                    onChange={(e) => setPointForm(prev => ({ ...prev, lead: e.target.value }))}
                  />
                </div>

                {/* Rich Editor */}
                <div className="form-group">
                  <label className="form-label">Mô tả chi tiết</label>
                  <div className="quill-wrapper">
                    <ReactQuill
                      theme="snow" value={pointForm.description} onChange={handleDescriptionChange}
                      modules={modules} formats={formats}
                      className="quill-editor-custom"
                    />
                  </div>
                </div>

                {/* Media Section */}
                <h3 className="section-title">Hình ảnh & Media</h3>

                <div className="form-group">
                  <label className="form-label">Logo</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {uploadingLogo && <span style={{ color: '#17a2b8' }}>Đang upload...</span>}
                    {pointForm.logoSrc && pointForm.logoSrc !== "/images/logo-default.svg" && <span style={{ color: '#28a745', fontSize: '12px' }}>✓ Đã upload</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('logoInput')?.click()}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      disabled={uploadingLogo}
                    >
                      Upload từ máy tính
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMediaTarget('logoSrc'); handleShowImageLibrary(); }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Chọn từ thư viện
                    </button>
                  </div>
                  {pointForm.logoSrc && pointForm.logoSrc !== "/images/logo-default.svg" && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={pointForm.logoSrc} alt="Logo" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                    </div>
                  )}
                  <input
                    id="logoInput"
                    type="file"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ảnh đại diện</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {uploadingImage && <span style={{ color: '#17a2b8' }}>Đang upload...</span>}
                    {pointForm.imageSrc && pointForm.imageSrc !== "/images/img-default.jpg" && <span style={{ color: '#28a745', fontSize: '12px' }}>✓ Đã upload</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('imageInput')?.click()}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      disabled={uploadingImage}
                    >
                      Upload từ máy tính
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMediaTarget('imageSrc'); handleShowImageLibrary(); }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Chọn từ thư viện
                    </button>
                  </div>
                  {pointForm.imageSrc && pointForm.imageSrc !== "/images/img-default.jpg" && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={pointForm.imageSrc} alt="Ảnh đại diện" style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                    </div>
                  )}
                  <input
                    id="imageInput"
                    type="file"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ảnh 360 Panorama</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {uploadingPanorama && <span style={{ color: '#17a2b8' }}>Đang upload...</span>}
                    {pointForm.panoramaUrl && <span style={{ color: '#28a745', fontSize: '12px' }}>✓ Đã upload</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('panoramaInput')?.click()}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      disabled={uploadingPanorama}
                    >
                      Upload từ máy tính
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMediaTarget('panoramaUrl'); handleShowImageLibrary("uav-training/quản lí điểm 3D/panoramas"); }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Chọn từ thư viện
                    </button>
                  </div>
                  {pointForm.panoramaUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={pointForm.panoramaUrl} alt="Ảnh 360 Panorama" style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                    </div>
                  )}
                  <input
                    id="panoramaInput"
                    type="file"
                    onChange={handlePanoramaUpload}
                    disabled={uploadingPanorama}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Website */}
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input
                    type="text" className="form-control"
                    value={pointForm.website || ''}
                    onChange={(e) => setPointForm(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                {/* Schedule Toggle */}
                <div className="section-header-toggle">
                  <h3 className="section-title" style={{ border: 'none', margin: 0, padding: 0 }}>Giờ mở cửa</h3>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className={`toggle-status-label ${pointForm.enableSchedule ? 'on' : ''}`}>
                      {pointForm.enableSchedule ? 'Đang Hiển thị' : 'Đang Ẩn'}
                    </span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={pointForm.enableSchedule}
                        onChange={(e) => setPointForm(prev => ({ ...prev, enableSchedule: e.target.checked }))}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                {pointForm.enableSchedule ? (
                  <div className="schedule-grid" style={{ marginBottom: '24px' }}>
                    {Object.keys(pointForm.schedule).map(day => (
                      <div key={day} className="schedule-item">
                        <span className="schedule-label" style={{ textTransform: 'capitalize' }}>{day}:</span>
                        <input
                          type="text" className="form-control schedule-input"
                          value={pointForm.schedule[day]}
                          onChange={(e) => setPointForm(prev => ({ ...prev, schedule: { ...prev.schedule, [day]: e.target.value } }))}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '15px', background: '#f9fafb', border: '1px dashed #ccc', borderRadius: '8px', marginBottom: '20px', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
                    Thông tin giờ mở cửa sẽ bị ẩn.
                  </div>
                )}

                {/* Contact */}
                <h3 className="section-title">Thông tin liên hệ</h3>
                <div className="contact-grid">
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="text" className="form-control"
                      value={pointForm.contact?.phone || ''}
                      onChange={(e) => setPointForm(prev => ({ ...prev, contact: { ...prev.contact, phone: e.target.value } }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email" className="form-control"
                      value={pointForm.contact?.email || ''}
                      onChange={(e) => setPointForm(prev => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="form-actions-footer">
                  <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? "Đang xử lý..." : isEditingPoint ? "LƯU CẬP NHẬT" : "TẠO ĐIỂM MỚI"}
                  </button>
                </div>

              </form>
            </div>
          </main>

          {/* CỘT PHẢI: LIVE PREVIEW */}
          <aside className="panel preview-sticky-sidebar">
            <div className="panel-header preview-header-gradient">
              <span>Xem trước trực tiếp</span>
            </div>
            <div className="preview-content-wrapper">
              <PointPreview formData={pointForm} />
            </div>
          </aside>

        </div>
      </div>

      {/* --- MODALS --- */}
      {isPickerOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '90vw', height: '90vh', maxWidth: 'none' }}>
            <Suspense fallback={<div>Đang tải bản đồ...</div>}>
              <MapPicker
                onPick={(x, y, z) => {
                  setPointForm(prev => ({ ...prev, posX: x, posY: y, posZ: z }));
                  setIsPickerOpen(false);
                }}
                onClose={() => setIsPickerOpen(false)}
              />
            </Suspense>
          </div>
        </div>
      )}

      {isMediaModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '800px' }}>
            <div className="modal-header">Chọn hình ảnh</div>
            <MediaSelector
              onSelect={(url) => {
                setPointForm(prev => ({ ...prev, [mediaTarget]: url }));
                setIsMediaModalOpen(false);
              }}
              onClose={() => setIsMediaModalOpen(false)}
              mediaBaseUrl={MEDIA_BASE_URL}
            />
          </div>
        </div>
      )}

      {/* Image Library Modal */}
      {showImageLibrary && (
        <div className="modal-overlay" onClick={() => setShowImageLibrary(false)}>
          <div className="modal-content" style={{ width: '800px', maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chọn từ thư viện ảnh</h3>
              <button className="modal-close" onClick={() => setShowImageLibrary(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              {loadingLibrary ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>
              ) : libraryImages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Chưa có ảnh nào trong thư viện</div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {libraryImages.map((image, index) => (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        aspectRatio: '1',
                        transition: 'border-color 0.2s'
                      }}
                      onClick={() => handleSelectFromImageLibrary(image.url)}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#0050b8'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#ddd'}
                    >
                      <img
                        src={image.url}
                        alt={`Library image ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'rgba(0, 80, 184, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}>
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
    </>
  );
}