import React, { useState, useEffect, useCallback, useMemo } from "react";
// Đảm bảo đường dẫn CSS đúng với cấu trúc dự án của bạn
import "../admin/Admin/Admin.css";
import MediaSelector from "../mediaSelector/MediaSelector";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { API_ENDPOINTS, MESSAGES, VALIDATION } from "../../constants/api";
import { notifySuccess, notifyError } from "../../lib/notifications";
import { uploadImage, uploadVideo, uploadSolutionImage, listImages, uploadSolutionVideo, listVideos } from "../../lib/cloudinaryService";

const initialSolutionState = {
  id: "",
  title: "",
  image: "",
  hero_video: "",
  hero_description: "",

  service_title: "Explore Our Software Based Services",
  client_title: "Clientele",

  bottom_title: "",
  bottom_description: "",
  video_title: "",
  video_url: "",

  content: "[]",
  client_images: "[]",
};

// === HÀM XỬ LÝ URL ẢNH (PHIÊN BẢN ỔN ĐỊNH NHẤT) ===
const getImageUrl = (path) => {
  if (!path) return "/images/img-default.jpg";
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;
  if (path.startsWith("/images/") || path.startsWith("images/")) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  if (path.startsWith("http")) {
    return path.replace(":5001", ":5000");
  }
  let cleanPath = path.startsWith("/") ? path.slice(1) : path;
  if (!cleanPath.startsWith("uploads/")) {
    cleanPath = `uploads/${cleanPath}`;
  }
  return `${API_ENDPOINTS.SOLUTIONS.split('/api')[0]}/api/${cleanPath}`;
};

// === HÀM XỬ LÝ VIDEO URL (YOUTUBE & MP4) ===
const extractYouTubeId = (url) => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];
  for (let pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const getYouTubeEmbedUrl = (videoUrl) => {
  const videoId = extractYouTubeId(videoUrl);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : videoUrl;
};

export default function SolutionManager() {
  const [form, setForm] = useState(initialSolutionState);
  const [isEditing, setIsEditing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);

  const [sections, setSections] = useState([]);
  const [clients, setClients] = useState([]);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [targetContext, setTargetContext] = useState({
    type: null,
    sectionIdx: null,
    imgIdx: null,
  });

  // State cho thư viện hình ảnh
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryImages, setLibraryImages] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // State cho thư viện video
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);
  const [libraryVideos, setLibraryVideos] = useState([]);
  const [loadingVideoLibrary, setLoadingVideoLibrary] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [targetVideoType, setTargetVideoType] = useState(null); // 'hero' or 'footer'

  // State để force refresh video preview
  const [videoPreviewKey, setVideoPreviewKey] = useState(0);

  // === FETCH DATA WITH CUSTOM HOOK ===
  const { data: solutionsData, loading, refetch: refreshSolutions } = useApi(API_ENDPOINTS.SOLUTIONS);
  const solutions = useMemo(() => Array.isArray(solutionsData) ? solutionsData : [], [solutionsData]);
  const { mutate: saveSolution } = useApiMutation();

  // === HANDLERS ===
  const handleAddNew = () => {
    setForm(initialSolutionState);
    setSections([]);
    setClients([]);
    setIsEditing(false);
  };

  const handleEditClick = (sol) => {
    setForm({
      ...sol,
      hero_description: sol.hero_description || "",
      hero_video: sol.hero_video || "",
      service_title: sol.service_title || "",
      client_title: sol.client_title || "",
      bottom_title: sol.bottom_title || "",
      bottom_description: sol.bottom_description || "",
      video_title: sol.video_title || "",
      video_url: sol.video_url || "",
    });

    try {
      setSections(JSON.parse(sol.content) || []);
    } catch {
      setSections([]);
    }
    try {
      setClients(JSON.parse(sol.client_images) || []);
    } catch {
      setClients([]);
    }

    setIsEditing(true);
    // ĐÃ XÓA: window.scrollTo({ top: 0, behavior: "smooth" }); -> Giúp giữ nguyên vị trí chuột khi bấm Sửa
  };

  // LOGIC SECTIONS
  const addSection = () =>
    setSections([...sections, { title: "", items: "", images: [] }]);
  const removeSection = (idx) => {
    const n = [...sections];
    n.splice(idx, 1);
    setSections(n);
  };
  const updateSection = (idx, field, val) => {
    const n = [...sections];
    n[idx][field] = val;
    setSections(n);
  };

  const addSectionImage = (sectionIdx) => {
    const newSections = [...sections];
    newSections[sectionIdx].images.push("");
    setSections(newSections);
  };
  const removeSectionImage = (sectionIdx, imgIdx) => {
    const newSections = [...sections];
    newSections[sectionIdx].images.splice(imgIdx, 1);
    setSections(newSections);
  };
  const updateSectionImage = (sectionIdx, imgIdx, val) => {
    const newSections = [...sections];
    newSections[sectionIdx].images[imgIdx] = val;
    setSections(newSections);
  };

  // LOGIC CLIENTS
  const addClient = () => setClients([...clients, ""]);
  const removeClient = (idx) => {
    const n = [...clients];
    n.splice(idx, 1);
    setClients(n);
  };
  const updateClient = (idx, val) => {
    const n = [...clients];
    n[idx] = val;
    setClients(n);
  };

  // MEDIA
  const openMedia = (type, sectionIdx = null, imgIdx = null) => {
    setTargetContext({ type, sectionIdx, imgIdx });
    setIsMediaModalOpen(true);
  };

  const handleMediaSelected = (url) => {
    if (targetContext.type === "hero_img") {
      setForm((p) => ({ ...p, image: url }));
    } else if (targetContext.type === "hero_video") {
      setForm((p) => ({ ...p, hero_video: url }));
      setVideoPreviewKey(prev => prev + 1); // Force video preview re-render
    } else if (targetContext.type === "footer_video") {
      setForm((p) => ({ ...p, video_url: url }));
      setVideoPreviewKey(prev => prev + 1); // Force video preview re-render
    } else if (targetContext.type === "section") {
      updateSectionImage(targetContext.sectionIdx, targetContext.imgIdx, url);
    } else if (targetContext.type === "client") {
      updateClient(targetContext.imgIdx, url);
    }
    setIsMediaModalOpen(false);
  };

  const handleShowLibrary = async () => {
    setShowLibrary(true);
    setLoadingLibrary(true);
    try {
      const result = await listImages("uav-training/solutions");
      if (result.success) {
        setLibraryImages(result.images);
      } else {
        alert('Failed to load images: ' + result.error);
      }
    } catch (err) {
      alert('Error loading images: ' + err.message);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleSelectFromLibrary = (image) => {
    setForm((p) => ({ ...p, image: image.url }));
    setShowLibrary(false);
  };

  const handleShowVideoLibrary = async (videoType) => {
    setTargetVideoType(videoType);
    setShowVideoLibrary(true);
    setLoadingVideoLibrary(true);
    try {
      const result = await listVideos("uav-training/solutions/videos");
      if (result.success) {
        setLibraryVideos(result.images);
      } else {
        alert('Failed to load videos: ' + result.error);
      }
    } catch (err) {
      alert('Error loading videos: ' + err.message);
    } finally {
      setLoadingVideoLibrary(false);
    }
  };

  const handleSelectFromVideoLibrary = (video) => {
    if (targetVideoType === 'hero') {
      setForm((p) => ({ ...p, hero_video: video.url }));
    } else if (targetVideoType === 'footer') {
      setForm((p) => ({ ...p, video_url: video.url }));
    }
    setVideoPreviewKey(prev => prev + 1);
    setShowVideoLibrary(false);
  };

  const handleVideoUpload = async (e, videoType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      notifyError('Vui lòng chọn file video (MP4/AVI/MOV)');
      return;
    }

    try {
      setUploadingVideo(true);
      const res = await uploadSolutionVideo(file);
      if (!res.success) {
        notifyError(res.error || 'Upload video thất bại');
        return;
      }

      if (videoType === 'hero') {
        setForm((p) => ({ ...p, hero_video: res.url }));
      } else if (videoType === 'footer') {
        setForm((p) => ({ ...p, video_url: res.url }));
      }
      setVideoPreviewKey(prev => prev + 1);
      notifySuccess('Tải video giải pháp lên Cloudinary thành công');
    } catch (err) {
      console.error('Video upload error:', err);
      notifyError(err.message || 'Lỗi khi upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notifyError('Vui lòng chọn file hình ảnh (JPG/PNG/GIF)');
      return;
    }

    try {
      setUploadingImage(true);
      const res = await uploadSolutionImage(file);
      if (!res.success) {
        notifyError(res.error || 'Upload ảnh thất bại');
        return;
      }

      setForm((p) => ({ ...p, image: res.url }));
      notifySuccess('Tải ảnh giải pháp lên Cloudinary thành công');
    } catch (err) {
      console.error('Image upload error:', err);
      notifyError(err.message || 'Lỗi khi upload ảnh');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    // Lưu lại vị trí cuộn hiện tại nếu cần thiết (optional), nhưng React thường giữ nguyên nếu không có lệnh scroll
    try {
      const payload = {
        ...form,
        content: JSON.stringify(sections),
        client_images: JSON.stringify(clients),
      };

      const method = isEditing ? "PUT" : "POST";
      const baseUrl = API_ENDPOINTS.SOLUTIONS;
      const url = isEditing ? `${baseUrl}/${form.id}` : baseUrl;

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Lỗi khi lưu");
      const successMsg = `${isEditing ? "Cập nhật" : "Tạo mới"} thành công!`;
      notifySuccess(successMsg);

      if (!isEditing) {
        handleAddNew();
      }
      refreshSolutions();
    } catch (error) {
      notifyError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa giải pháp ID: ${id}?`)) return;
    try {
      await fetch(`${API_ENDPOINTS.SOLUTIONS}/${id}`, { method: "DELETE" });
      notifySuccess("Đã xóa thành công!");
      refreshSolutions();
      if (form.id === id) handleAddNew();
    } catch (error) {
      console.error(error);
      notifyError("Lỗi khi xóa");
    }
  };

  return (
    <div
      className="solution-manager-container"
      style={{
        display: "flex",
        gap: "24px",
        marginTop: "20px",
        flexDirection: "row-reverse",
      }}
    >
      {/* --- PANEL 1: FORM NHẬP LIỆU --- */}
      <div className="panel" style={{ flex: 2 }}>
        <div
          className="panel-header"
          style={{ justifyContent: "space-between" }}
        >
          <span>
            {isEditing ? `Đang sửa: ${form.title}` : "Thêm Giải pháp Mới"}
          </span>
          {isEditing && (
            <button
              type="button"
              onClick={handleAddNew}
              className="btn btn-sm btn-secondary"
            >
              Hủy sửa / Tạo mới
            </button>
          )}
        </div>

        <div className="form-section">
          <form onSubmit={handleSave}>
            {/* HERO SECTION */}
            <h3 className="section-title">1. Phần đầu trang (Hero)</h3>

            <div className="form-group">
              <label className="form-label">ID (URL Slug)</label>
              <input
                className="form-control"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="VD: map-4d, training-vr..."
                disabled={isEditing}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tiêu đề trang</label>
              <input
                className="form-control"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ảnh Hero (Thumbnail)</label>
              <div style={{ textAlign: "center" }}>
                {!showLibrary ? (
                  <>
                    {!form.image ? (
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "12px" }}>
                          Chưa có hình ảnh hero
                        </div>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            type="button"
                            onClick={() => document.getElementById("solutionImageInput")?.click()}
                            className="btn btn-primary btn-sm"
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                            disabled={uploadingImage}
                          >
                            {uploadingImage ? 'Đang upload...' : 'Upload từ máy tính'}
                          </button>
                          <button
                            type="button"
                            onClick={handleShowLibrary}
                            className="btn btn-secondary btn-sm"
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            Chọn từ thư viện
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <img
                          src={getImageUrl(form.image)}
                          alt="Ảnh Hero"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "250px",
                            borderRadius: "6px",
                            marginBottom: "12px",
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/images/img-default.jpg";
                          }}
                        />
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            type="button"
                            onClick={() => document.getElementById("solutionImageInput")?.click()}
                            className="btn btn-sm"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              cursor: "pointer",
                              fontSize: "14px",
                              transition: "background-color 0.2s",
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#0056b3"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "#007bff"}
                            disabled={uploadingImage}
                          >
                            {uploadingImage ? 'Đang upload...' : 'Thay đổi hình ảnh'}
                          </button>
                          <button
                            type="button"
                            onClick={handleShowLibrary}
                            className="btn btn-secondary btn-sm"
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            Chọn từ thư viện
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, image: "" })}
                            className="btn btn-danger btn-sm"
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            Xóa hình ảnh
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="library-view" style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "12px",
                    padding: "24px",
                    background: "#ffffff",
                    maxHeight: "500px",
                    overflowY: "auto",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                  }}>
                    <div className="library-header" style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px",
                      position: "sticky",
                      top: 0,
                      background: "#ffffff",
                      borderBottom: "1px solid #f0f0f0",
                      margin: "-12px -12px 24px -12px",
                      padding: "12px",
                      borderRadius: "12px 12px 0 0"
                    }}>
                      <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#333" }}>Chọn từ thư viện giải pháp</h3>
                      <button
                        onClick={() => setShowLibrary(false)}
                        style={{
                          padding: "8px",
                          background: "#f8f9fa",
                          color: "#6c757d",
                          border: "1px solid #e0e0e0",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "#e9ecef";
                          e.target.style.color = "#495057";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "#f8f9fa";
                          e.target.style.color = "#6c757d";
                        }}
                        title="Đóng"
                      >
                        ✕
                      </button>
                    </div>
                    {loadingLibrary ? (
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "40px",
                        color: "#6c757d"
                      }}>
                        <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>
                        <div style={{ fontSize: "16px", fontWeight: "500" }}>Đang tải hình ảnh...</div>
                      </div>
                    ) : libraryImages.length === 0 ? (
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "40px",
                        color: "#6c757d"
                      }}>
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>📷</div>
                        <div style={{ fontSize: "16px", fontWeight: "500", textAlign: "center" }}>
                          Chưa có hình ảnh nào trong thư viện
                        </div>
                      </div>
                    ) : (
                      <div className="image-grid" style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                        gap: "16px"
                      }}>
                        {libraryImages.map((image) => (
                          <div
                            key={image.publicId}
                            className="image-item"
                            onClick={() => handleSelectFromLibrary(image)}
                            style={{
                              border: "1px solid #e0e0e0",
                              borderRadius: "8px",
                              padding: "12px",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                              background: "white",
                              textAlign: "center",
                              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                              position: "relative",
                              overflow: "hidden"
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.borderColor = "#007bff";
                              e.target.style.boxShadow = "0 4px 12px rgba(0, 123, 255, 0.15)";
                              e.target.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.borderColor = "#e0e0e0";
                              e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.05)";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
                            <img
                              src={image.url}
                              alt={image.displayName}
                              style={{
                                width: "100%",
                                height: "120px",
                                objectFit: "cover",
                                borderRadius: "6px",
                                marginBottom: "8px"
                              }}
                            />
                            <p style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "#495057",
                              wordBreak: "break-word",
                              lineHeight: "1.4",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden"
                            }}>
                              {image.displayName}
                            </p>
                            <div style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              background: "rgba(0, 123, 255, 0.8)",
                              color: "white",
                              borderRadius: "50%",
                              width: "20px",
                              height: "20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              opacity: 0,
                              transition: "opacity 0.3s"
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = "1"}
                            onMouseLeave={(e) => e.target.style.opacity = "0"}
                            >
                              ✓
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <input
                id="solutionImageInput"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Video Hero</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                <input
                  className="form-control"
                  value={form.hero_video}
                  onChange={(e) =>
                    setForm({ ...form, hero_video: e.target.value })
                  }
                  placeholder="Link Video (MP4/Youtube)..."
                  style={{ flex: 1 }}
                />
                {uploadingVideo && <span style={{ color: '#17a2b8' }}>Đang upload...</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => document.getElementById("heroVideoInput")?.click()}
                  className="btn btn-primary btn-sm"
                  disabled={uploadingVideo}
                >
                  Upload từ máy tính
                </button>
                <button
                  type="button"
                  onClick={() => handleShowVideoLibrary('hero')}
                  className="btn btn-secondary btn-sm"
                >
                  Chọn từ thư viện
                </button>
                <button
                  type="button"
                  className="btn btn-info btn-sm"
                  onClick={() => openMedia("hero_video")}
                >
                  Chọn từ Media
                </button>
              </div>
              <input
                id="heroVideoInput"
                type="file"
                accept="video/*"
                onChange={(e) => handleVideoUpload(e, 'hero')}
                style={{ display: "none" }}
              />

              {form.hero_video && (
                <div key={`hero-video-${videoPreviewKey}`} style={{ marginTop: 15, padding: 10, border: "1px solid #ddd", borderRadius: 4, backgroundColor: "#f9f9f9" }}>
                  {form.hero_video.includes("youtube.com") || form.hero_video.includes("youtu.be") ? (
                    <iframe
                      width="100%"
                      height="200"
                      src={getYouTubeEmbedUrl(form.hero_video)}
                      title="Hero Video Preview"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ borderRadius: 4 }}
                    ></iframe>
                  ) : (
                    <video key={`hero-video-player-${videoPreviewKey}`} width="100%" height="200" controls style={{ borderRadius: 4, backgroundColor: "#000" }}>
                      <source src={form.hero_video} type="video/mp4" />
                      Trình duyệt không hỗ trợ thẻ video.
                    </video>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả Hero</label>
              <textarea
                className="form-control"
                rows="3"
                value={form.hero_description}
                onChange={(e) =>
                  setForm({ ...form, hero_description: e.target.value })
                }
              />
            </div>

            {/* SERVICES SECTION */}
            <h3 className="section-title">2. Các khối Dịch vụ</h3>
            <div className="form-group">
              <label className="form-label">Tiêu đề mục Dịch vụ</label>
              <input
                className="form-control"
                value={form.service_title}
                onChange={(e) =>
                  setForm({ ...form, service_title: e.target.value })
                }
                placeholder="VD: Explore Our Services"
              />
            </div>

            {sections.map((sec, idx) => (
              <div
                key={idx}
                style={{
                  background: "#f9fafb",
                  padding: 15,
                  marginBottom: 15,
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <strong style={{ color: "#0066cc" }}>
                    Khối dịch vụ #{idx + 1}
                  </strong>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeSection(idx)}
                  >
                    Xóa khối
                  </button>
                </div>

                <div className="form-group">
                  <input
                    className="form-control"
                    style={{ marginBottom: 8 }}
                    placeholder="Tiêu đề khối"
                    value={sec.title}
                    onChange={(e) =>
                      updateSection(idx, "title", e.target.value)
                    }
                  />
                  <textarea
                    className="form-control"
                    style={{ marginBottom: 8 }}
                    placeholder="Các mục (xuống dòng)"
                    rows="3"
                    value={sec.items}
                    onChange={(e) =>
                      updateSection(idx, "items", e.target.value)
                    }
                  />
                </div>

                <label
                  className="form-label"
                  style={{
                    fontSize: "0.9em",
                    fontWeight: "bold",
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  Hình ảnh minh họa:
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  {sec.images.map((img, imgIdx) => (
                    <div
                      key={imgIdx}
                      style={{
                        background: "#fff",
                        border: "1px solid #ddd",
                        padding: "8px",
                        borderRadius: "4px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100px",
                          background: "#f5f5f5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          borderRadius: "2px",
                          border: "1px solid #eee",
                        }}
                      >
                        {img ? (
                          <img
                            src={getImageUrl(img)}
                            alt={`Slide ảnh giải pháp ${imgIdx + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "11px", color: "#999" }}>
                            No Image
                          </span>
                        )}
                      </div>

                      <input
                        className="form-control"
                        value={img}
                        onChange={(e) =>
                          updateSectionImage(idx, imgIdx, e.target.value)
                        }
                        placeholder="URL ảnh..."
                        style={{
                          fontSize: "0.75rem",
                          padding: "4px 6px",
                          height: "auto",
                        }}
                      />

                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{
                            flex: 1,
                            padding: "2px 0",
                            fontSize: "11px",
                          }}
                          onClick={() => openMedia("section", idx, imgIdx)}
                        >
                          Chọn
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{
                            width: "30px",
                            padding: "2px 0",
                            fontSize: "12px",
                          }}
                          onClick={() => removeSectionImage(idx, imgIdx)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addSectionImage(idx)}
                    style={{
                      border: "2px dashed #0066cc",
                      background: "#f0f7ff",
                      borderRadius: "4px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#0066cc",
                      minHeight: "160px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#e0f0ff";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "#f0f7ff";
                    }}
                  >
                    <span style={{ fontSize: "24px", marginBottom: "4px" }}>
                      +
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: "600" }}>
                      Thêm ảnh
                    </span>
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={addSection}
              style={{
                marginTop: "10px",
                borderColor: "#0066cc",
                background: "#0066cc",
                color: "#ffffff",
              }}
            >
              + Thêm khối dịch vụ mới
            </button>

            {/* FOOTER & CLIENTS */}
            <h3 className="section-title" style={{ marginTop: "30px" }}>
              3. Phần chân trang & Video
            </h3>
            <div className="form-group">
              <label className="form-label">Thông tin chân trang</label>
              <input
                className="form-control"
                style={{ marginBottom: 8 }}
                value={form.bottom_title}
                onChange={(e) =>
                  setForm({ ...form, bottom_title: e.target.value })
                }
                placeholder="Tiêu đề (VD: BlueHawk)"
              />
              <textarea
                className="form-control"
                rows="3"
                value={form.bottom_description}
                onChange={(e) =>
                  setForm({ ...form, bottom_description: e.target.value })
                }
                placeholder="Mô tả chân trang"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Video giới thiệu (Footer)</label>
              <input
                className="form-control"
                style={{ marginBottom: 8 }}
                value={form.video_title}
                onChange={(e) =>
                  setForm({ ...form, video_title: e.target.value })
                }
                placeholder="Tiêu đề Video giới thiệu"
              />

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    className="form-control"
                    value={form.video_url}
                    onChange={(e) =>
                      setForm({ ...form, video_url: e.target.value })
                    }
                    placeholder="Link Video Embed giới thiệu"
                    style={{ flex: 1 }}
                  />
                  {uploadingVideo && <span style={{ color: '#17a2b8' }}>Đang upload...</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => document.getElementById("footerVideoInput")?.click()}
                    className="btn btn-primary btn-sm"
                    disabled={uploadingVideo}
                  >
                    Upload từ máy tính
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShowVideoLibrary('footer')}
                    className="btn btn-secondary btn-sm"
                  >
                    Chọn từ thư viện
                  </button>
                  <button
                    type="button"
                    className="btn btn-info btn-sm"
                    onClick={() => openMedia("footer_video")}
                  >
                    Chọn từ Media
                  </button>
                </div>
                <input
                  id="footerVideoInput"
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleVideoUpload(e, 'footer')}
                  style={{ display: "none" }}
                />

                {form.video_url && (
                  <div key={`footer-video-${videoPreviewKey}`} style={{ marginTop: 15, padding: 10, border: "1px solid #ddd", borderRadius: 4, backgroundColor: "#f9f9f9" }}>
                    {form.video_url.includes("youtube.com") || form.video_url.includes("youtu.be") ? (
                      <iframe
                        width="100%"
                        height="250"
                        src={getYouTubeEmbedUrl(form.video_url)}
                        title="Footer Video Preview"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ borderRadius: 4 }}
                      ></iframe>
                    ) : (
                      <video key={`footer-video-player-${videoPreviewKey}`} width="100%" height="250" controls style={{ borderRadius: 4, backgroundColor: "#000" }}>
                        <source src={form.video_url} type="video/mp4" />
                        Trình duyệt không hỗ trợ thẻ video.
                      </video>
                    )}
                  </div>
                )}
              </div>

            <h3 className="section-title">4. Khách hàng</h3>
            <div className="form-group">
              <label className="form-label">Tiêu đề mục Khách hàng</label>
              <input
                className="form-control"
                value={form.client_title}
                onChange={(e) =>
                  setForm({ ...form, client_title: e.target.value })
                }
                placeholder="VD: Clientele"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 10,
                marginTop: 10,
              }}
            >
              {clients.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#fff",
                    border: "1px solid #ddd",
                    padding: 5,
                    textAlign: "center",
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      height: 60,
                      marginBottom: 5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f5f5f5",
                    }}
                  >
                    {url ? (
                      <img
                        src={getImageUrl(url)}
                        style={{
                          maxHeight: "100%",
                          maxWidth: "100%",
                          objectFit: "contain",
                        }}
                        alt={`Logo khách hàng ${idx + 1}`}
                      />
                    ) : (
                      <span style={{ fontSize: 10 }}>No Img</span>
                    )}
                  </div>
                  <input
                    className="form-control"
                    value={url}
                    onChange={(e) => updateClient(idx, e.target.value)}
                    style={{ fontSize: "0.7rem", padding: 2, marginBottom: 4 }}
                  />
                  <div style={{ display: "flex", gap: 2 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => openMedia("client", null, idx)}
                    >
                      ...
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeClient(idx)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={addClient}
              style={{ marginTop: 10 }}
            >
              + Thêm Logo Khách hàng
            </button>

            <div
              style={{
                marginTop: "30px",
                borderTop: "1px solid #eee",
                paddingTop: 20,
              }}
            >
              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ padding: 12, fontSize: "1rem" }}
              >
                {loading
                  ? "Đang xử lý..."
                  : isEditing
                    ? "LƯU CẬP NHẬT"
                    : "TẠO GIẢI PHÁP MỚI"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* --- PANEL 2: DANH SÁCH GIẢI PHÁP --- */}
      <div className="panel" style={{ flex: 1, height: "fit-content" }}>
        <div
          className="panel-header"
          style={{ justifyContent: "space-between" }}
        >
          <span>Danh sách giải pháp</span>
          <button className="btn btn-success btn-sm" onClick={handleAddNew}>
            + Thêm mới
          </button>
        </div>

        <div className="list-group">
          {solutions.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
              Chưa có giải pháp nào
            </div>
          )}

          {solutions.map((sol) => (
            <div
              key={sol.id}
              className="list-item"
              style={{ alignItems: "flex-start" }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "4px",
                  overflow: "hidden",
                  marginRight: "12px",
                  border: "1px solid #eee",
                  flexShrink: 0,
                  backgroundColor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={getImageUrl(sol.image)}
                  alt={`Hình ảnh giải pháp: ${sol.title}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: "4px",
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/img-default.jpg";
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div
                  className="item-title"
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  {sol.title}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    marginBottom: "8px",
                  }}
                >
                  ID: {sol.id}
                </div>
                <div className="item-actions">
                  <button
                    onClick={() => handleEditClick(sol)}
                    className="btn btn-primary btn-sm"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(sol.id)}
                    className="btn btn-danger btn-sm"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isMediaModalOpen && (
        <div className="media-overlay">
          <div className="media-modal-content">
            <div className="modal-header">
              <span>Chọn tập tin</span>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => setIsMediaModalOpen(false)}
              >
                Đóng
              </button>
            </div>
            <MediaSelector
              onSelect={handleMediaSelected}
              onClose={() => setIsMediaModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modal thư viện video */}
      {showVideoLibrary && (
        <div className="legal-modal-overlay">
          <div className="legal-modal-content" style={{ maxWidth: '800px', maxHeight: '80vh' }}>
            <div className="legal-modal-header">
              <h3 style={{ margin: 0, color: '#0066cc' }}>Chọn từ thư viện video giải pháp</h3>
              <button
                onClick={() => setShowVideoLibrary(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                X
              </button>
            </div>
            <div className="legal-modal-body" style={{ padding: '20px' }}>
              {loadingVideoLibrary ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                  color: "#6c757d"
                }}>
                  <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>
                  <div style={{ fontSize: "16px", fontWeight: "500" }}>Đang tải video...</div>
                </div>
              ) : libraryVideos.length === 0 ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                  color: "#6c757d"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎥</div>
                  <div style={{ fontSize: "16px", fontWeight: "500", textAlign: "center" }}>
                    Chưa có video nào trong thư viện
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
                  {libraryVideos.map((video) => {
                    // Làm sạch displayName để loại bỏ timestamp
                    const cleanDisplayName = video.displayName
                      .replace(/^\d+-\w+-\d+-/, '') // Loại bỏ pattern timestamp-name-timestamp-
                      .replace(/^\d+-/, '') // Loại bỏ timestamp ở đầu
                      .replace(/-\d+$/, ''); // Loại bỏ timestamp ở cuối
                    
                    return (
                      <div
                        key={video.publicId}
                        onClick={() => handleSelectFromVideoLibrary(video)}
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
                        <video
                          src={video.url}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            backgroundColor: '#000'
                          }}
                          muted
                          preload="metadata"
                        />
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
                          {cleanDisplayName || 'Video'}
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
