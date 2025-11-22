import React, { useState, useEffect, Suspense } from "react"; // Thêm Suspense
import { Link } from "react-router-dom";

// Dùng Lazy Load cho MapPicker để tối ưu tốc độ trang Admin
const MapPicker = React.lazy(() => import("./MapPicker.jsx"));
import MediaSelector from "./MediaSelector.jsx";

const API_URL = "http://localhost:5000/api/points";
const MEDIA_BASE_URL = "http://localhost:5001/uploads/";

const initialPointState = {
  id: "",
  title: "",
  lead: "",
  description: "",
  website: "https://",
  logoSrc: "/images/logo-default.svg",
  imageSrc: "/images/img-default.jpg",
  panoramaUrl: "", // <--- ĐÃ THÊM TRƯỜNG NÀY
  schedule: {
    monday: "Closed",
    tuesday: "10:00 - 18:00",
    wednesday: "10:00 - 18:00",
    thursday: "10:00 - 20:00",
    friday: "10:00 - 18:00",
    saturday: "10:00 - 18:00",
    sunday: "10:00 - 18:00",
  },
  contact: { phone: "", email: "" },
  posX: "",
  posY: "",
  posZ: "",
};

export default function Admin() {
  const [points, setPoints] = useState([]);
  const [form, setForm] = useState(initialPointState);
  const [message, setMessage] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchPoints = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      // Map dữ liệu để đảm bảo có panoramaUrl
      const transformed = (Array.isArray(data) ? data : []).map((p) => ({
        ...p,
        panoramaUrl: p.panoramaUrl || "",
      }));
      setPoints(transformed);
    } catch (error) {
      console.error("Error fetching points:", error);
      setPoints([]);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, []);

  // --- HÀM TẢI DỮ LIỆU VÀO FORM ---
  const handleEditClick = (point) => {
    setForm({
      ...point,
      posX: point.position[0],
      posY: point.position[1],
      posZ: point.position[2],
      panoramaUrl: point.panoramaUrl || "", // Load panoramaUrl lên form
    });

    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setForm(initialPointState);
    setIsEditing(false);
    setMessage(null);
  };

  const handleSavePoint = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (
      !form.id ||
      !form.title ||
      form.posX === "" ||
      form.posY === "" ||
      form.posZ === ""
    ) {
      setMessage({
        type: "error",
        text: "Vui lòng điền ID, Tiêu đề và Tọa độ.",
      });
      setLoading(false);
      return;
    }

    try {
      const payload = { ...form };
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${API_URL}/${form.id}` : API_URL;

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = await response.json();

      if (!response.ok)
        throw new Error(data.message || `Lỗi HTTP ${response.status}`);

      // Fix format position trả về nếu có
      if (data.position && data.position.length === 3) {
        data = {
          ...data,
          posX: data.position[0],
          posY: data.position[1],
          posZ: data.position[2],
        };
      }

      setMessage({
        type: "success",
        text: `${isEditing ? "Đã cập nhật" : "Đã lưu"} điểm: ${
          data.id
        } thành công!`,
      });
      setForm(initialPointState);
      setIsEditing(false);
      fetchPoints();
    } catch (error) {
      setMessage({ type: "error", text: `LỖI: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePoint = async (pointId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa điểm ${pointId}?`)) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/${pointId}`, { method: "DELETE" });
      setMessage({ type: "success", text: "Đã xóa thành công." });
      fetchPoints();
    } catch (error) {
      setMessage({ type: "error", text: "Lỗi khi xóa." });
    } finally {
      setLoading(false);
    }
  };

  const handlePositionPicked = (x, y, z) => {
    setForm((prev) => ({ ...prev, posX: x, posY: y, posZ: z }));
    setIsPickerOpen(false);
  };

  const handleMediaSelected = (fileUrl) => {
    setForm((prev) => ({ ...prev, [mediaTarget]: fileUrl }));
    setIsMediaModalOpen(false);
  };

  const displayXYZ = (val) =>
    typeof val === "number" ? val.toFixed(3) : val || "---";

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/" style={styles.backButton}>
          ← Quay lại Bản đồ Chính
        </Link>
        <h1 style={styles.title}>Trang Quản Lý Điểm Thông tin (Admin)</h1>
      </div>

      {message && (
        <div style={styles.message(message.type)}>{message.text}</div>
      )}

      <div style={styles.contentWrapper}>
        {/* === FORM BÊN TRÁI === */}
        <div style={styles.leftPanel}>
          <h2 style={styles.subtitle}>
            {isEditing ? `CHỈNH SỬA Điểm: ${form.id}` : "Thêm Điểm Mới"}
          </h2>

          <button
            type="button"
            style={styles.pickerButton}
            onClick={() => setIsPickerOpen(true)}
          >
            1. Chọn Vị Trí Trên Bản Đồ 📍
          </button>

          <form onSubmit={handleSavePoint}>
            <div style={styles.coords}>
              <input
                readOnly
                value={`X: ${displayXYZ(form.posX)}`}
                style={styles.coordInput}
              />
              <input
                readOnly
                value={`Y: ${displayXYZ(form.posY)}`}
                style={styles.coordInput}
              />
              <input
                readOnly
                value={`Z: ${displayXYZ(form.posZ)}`}
                style={styles.coordInput}
              />
            </div>

            <input
              type="text"
              placeholder="ID (Mã điểm - Duy nhất)"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              style={styles.input}
              required
              disabled={isEditing}
            />
            <input
              type="text"
              placeholder="Tiêu đề"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Mô tả ngắn (Lead)"
              value={form.lead}
              onChange={(e) => setForm({ ...form, lead: e.target.value })}
              style={styles.input}
            />
            <textarea
              placeholder="Mô tả chi tiết"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              style={{ ...styles.input, height: "80px" }}
            />
            <input
              type="url"
              placeholder="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              style={styles.input}
            />

            <p style={styles.label}>Hình ảnh & Logo</p>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <div style={{ flex: 1 }}>
                <p style={styles.subLabel}>Logo Icon</p>
                <button
                  type="button"
                  style={styles.selectMediaButton}
                  onClick={() => {
                    setMediaTarget("logoSrc");
                    setIsMediaModalOpen(true);
                  }}
                >
                  Chọn Logo
                </button>
                {form.logoSrc && (
                  <img
                    src={form.logoSrc}
                    alt="Logo"
                    style={styles.imagePreview}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={styles.subLabel}>Ảnh Chính (Thumbnail)</p>
                <button
                  type="button"
                  style={styles.selectMediaButton}
                  onClick={() => {
                    setMediaTarget("imageSrc");
                    setIsMediaModalOpen(true);
                  }}
                >
                  Chọn Ảnh
                </button>
                {form.imageSrc && (
                  <img
                    src={form.imageSrc}
                    alt="Thumbnail"
                    style={styles.imagePreview}
                  />
                )}
              </div>
            </div>

            {/* === Ô NHẬP PANORAMA URL (MỚI - QUAN TRỌNG) === */}
            <div
              style={{
                marginBottom: "20px",
                padding: "10px",
                border: "2px solid #6f42c1",
                borderRadius: "8px",
                backgroundColor: "#f3f0ff",
              }}
            >
              <p style={{ ...styles.label, color: "#6f42c1", marginTop: 0 }}>
                📸 Ảnh Panorama 360° (Bắt buộc để xoay)
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="http://...webp"
                  value={form.panoramaUrl}
                  onChange={(e) =>
                    setForm({ ...form, panoramaUrl: e.target.value })
                  }
                  style={{ ...styles.input, margin: 0, flex: 1 }}
                />
                <button
                  type="button"
                  style={{
                    ...styles.selectMediaButton,
                    backgroundColor: "#6f42c1",
                    width: "auto",
                  }}
                  onClick={() => {
                    setMediaTarget("panoramaUrl");
                    setIsMediaModalOpen(true);
                  }}
                >
                  Chọn 360
                </button>
              </div>
              {form.panoramaUrl ? (
                <div
                  style={{
                    color: "green",
                    fontSize: "12px",
                    marginTop: "5px",
                    fontWeight: "bold",
                  }}
                >
                  ✅ Đã có ảnh 360
                </div>
              ) : (
                <div
                  style={{ color: "#666", fontSize: "12px", marginTop: "5px" }}
                >
                  ⚠️ Chưa có ảnh (sẽ hiện ảnh thường)
                </div>
              )}
            </div>
            {/* ================================================= */}

            <p style={styles.label}>Lịch làm việc</p>
            {Object.keys(form.schedule).map((day) => (
              <input
                key={day}
                type="text"
                placeholder={`Lịch ${day}`}
                value={form.schedule[day]}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    schedule: { ...prev.schedule, [day]: e.target.value },
                  }))
                }
                style={styles.input}
              />
            ))}

            <p style={styles.label}>Thông tin Liên hệ</p>
            <input
              type="tel"
              placeholder="Điện thoại"
              value={form.contact.phone}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, phone: e.target.value },
                }))
              }
              style={styles.input}
            />
            <input
              type="email"
              placeholder="Email"
              value={form.contact.email}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, email: e.target.value },
                }))
              }
              style={styles.input}
            />

            <button
              type="submit"
              style={styles.saveButton(isEditing)}
              disabled={loading}
            >
              {loading
                ? "Đang lưu..."
                : isEditing
                ? "LƯU CẬP NHẬT"
                : "LƯU ĐIỂM MỚI"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={styles.cancelButton}
                disabled={loading}
              >
                Hủy Bỏ
              </button>
            )}
          </form>
        </div>

        {/* === DANH SÁCH BÊN PHẢI === */}
        <div style={styles.rightPanel}>
          <h2 style={styles.subtitle}>Danh sách ({points.length})</h2>
          <div style={styles.pointList}>
            {points.map((point) => (
              <div key={point.id} style={styles.pointItem}>
                <div style={styles.pointInfo}>
                  <strong>{point.title}</strong>{" "}
                  <span style={{ color: "#666", fontSize: "0.8em" }}>
                    ({point.id})
                  </span>
                  <div style={{ fontSize: "0.8em", marginTop: "5px" }}>
                    {point.panoramaUrl ? (
                      <span
                        style={{
                          background: "#d1c4e9",
                          color: "#4a148c",
                          padding: "2px 5px",
                          borderRadius: "3px",
                        }}
                      >
                        Có 360°
                      </span>
                    ) : (
                      <span
                        style={{
                          background: "#eee",
                          color: "#999",
                          padding: "2px 5px",
                          borderRadius: "3px",
                        }}
                      >
                        Không có 360
                      </span>
                    )}
                  </div>
                </div>
                <div style={styles.pointActions}>
                  <button
                    onClick={() => handleEditClick(point)}
                    style={styles.editButton}
                    disabled={isEditing}
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeletePoint(point.id)}
                    style={styles.deleteButton}
                    disabled={isEditing}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isPickerOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            {/* Dùng Suspense cho MapPicker để tránh load model khi vừa vào trang */}
            <Suspense
              fallback={
                <div style={{ textAlign: "center", padding: 20 }}>
                  ⏳ Đang tải bản đồ 3D...
                </div>
              }
            >
              <MapPicker
                onPick={handlePositionPicked}
                onClose={() => setIsPickerOpen(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
      {isMediaModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.mediaModalContent}>
            <MediaSelector
              onSelect={handleMediaSelected}
              onClose={() => setIsMediaModalOpen(false)}
              mediaBaseUrl={MEDIA_BASE_URL}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// === STYLES (Giữ nguyên style của bạn) ===
const styles = {
  container: {
    padding: "20px",
    backgroundColor: "#fff",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    paddingBottom: "20px",
    borderBottom: "1px solid #ddd",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "10px 0 0 0",
    color: "#041676",
  },
  backButton: {
    color: "#ff6407",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "bold",
  },
  contentWrapper: { display: "flex", gap: "40px", flexWrap: "wrap" },
  leftPanel: {
    flex: 1,
    minWidth: "350px",
    maxWidth: "500px",
    paddingRight: "20px",
  },
  rightPanel: {
    flex: 2,
    minWidth: "350px",
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    maxHeight: "80vh",
    overflowY: "auto",
  },
  subtitle: { fontSize: "20px", marginBottom: "15px", color: "#041676" },
  input: {
    width: "100%",
    padding: "10px",
    margin: "8px 0",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxSizing: "border-box",
  },
  label: {
    marginTop: "15px",
    marginBottom: "5px",
    fontWeight: "bold",
    color: "#041676",
  },
  subLabel: { fontSize: "0.9em", fontWeight: "normal", marginBottom: "5px" },
  pickerButton: {
    backgroundColor: "#041676",
    color: "white",
    padding: "10px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    border: "none",
    width: "100%",
    margin: "10px 0",
    fontWeight: "bold",
  },
  selectMediaButton: {
    backgroundColor: "#5cb85c",
    color: "white",
    padding: "8px 15px",
    borderRadius: "4px",
    cursor: "pointer",
    border: "none",
    width: "100%",
    fontWeight: "bold",
    fontSize: "14px",
  },
  imagePreview: {
    marginTop: "10px",
    width: "100%",
    height: "auto",
    maxHeight: "100px",
    objectFit: "contain",
    border: "1px solid #ccc",
    borderRadius: "4px",
    padding: "5px",
  },
  saveButton: (isEditing) => ({
    backgroundColor: isEditing ? "#28a745" : "#ff6407",
    color: "white",
    padding: "12px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    border: "none",
    width: "100%",
    marginTop: "20px",
    fontWeight: "bold",
  }),
  cancelButton: {
    backgroundColor: "#6c757d",
    color: "white",
    padding: "12px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    border: "none",
    width: "100%",
    marginTop: "10px",
    fontWeight: "bold",
  },
  message: (type) => ({
    padding: "10px",
    margin: "10px 0",
    borderRadius: "4px",
    backgroundColor: type === "success" ? "#d4edda" : "#f8d7da",
    color: type === "success" ? "#155724" : "#721c24",
    border: `1px solid ${type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
    fontWeight: "bold",
  }),
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    width: "90%",
    height: "90%",
    backgroundColor: "white",
    borderRadius: "8px",
    overflow: "hidden",
  },
  mediaModalContent: {
    width: "90%",
    height: "90%",
    maxWidth: "900px",
    backgroundColor: "white",
    borderRadius: "8px",
    overflow: "hidden",
    padding: "20px",
  },
  coords: { display: "flex", gap: "10px", marginBottom: "10px" },
  coordInput: {
    flex: 1,
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "#eee",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: "bold",
  },
  pointList: { display: "flex", flexDirection: "column", gap: "10px" },
  pointItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    border: "1px solid #eee",
    borderRadius: "4px",
    backgroundColor: "#fafafa",
  },
  pointInfo: { flexGrow: 1 },
  pointActions: { display: "flex", gap: "5px" },
  editButton: {
    backgroundColor: "#041676",
    color: "white",
    padding: "5px 10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    color: "white",
    padding: "5px 10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },
};
