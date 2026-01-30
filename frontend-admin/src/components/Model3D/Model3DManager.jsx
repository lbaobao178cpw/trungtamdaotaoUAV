import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import { AlertTriangle, Loader2, Box, MonitorX } from "lucide-react";
import MediaSelector from "../mediaSelector/MediaSelector";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { API_ENDPOINTS, MESSAGES, VALIDATION } from "../../constants/api";
import { STYLES, ANIMATIONS } from "../../constants/styles";
import { notifyWarning, notifyError, notifySuccess } from "../../lib/notifications";
import { uploadModel3D, listModel3Ds } from "../../lib/cloudinaryService";
import "./Model3DManager.css";

// === 0. WEBGL SUPPORT CHECK ===
const checkWebGLSupport = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
};

// Fallback component khi WebGL không khả dụng
const WebGLFallback = React.memo(() => (
  <div style={STYLES.WEBGL_FALLBACK}>
    <MonitorX size={48} strokeWidth={1.5} style={STYLES.WEBGL_ICON} />
    <h3 style={STYLES.WEBGL_TITLE}>WebGL Không Khả Dụng</h3>
    <p style={{ ...STYLES.TEXT_SMALL, ...STYLES.TEXT_MUTED }}>
      Trình duyệt không hỗ trợ WebGL hoặc GPU đang bận.<br />
      Thử refresh trang hoặc đóng các tab khác.
    </p>
  </div>
));

// === 1. ERROR BOUNDARY (DÙNG ICON LUCIDE) ===
class ErrorBoundary3D extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error("3D Error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Html
          center
          zIndexRange={[1000, 0]}
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            style={{
              color: "#d32f2f",
              background: "rgba(255,255,255,0.98)",
              padding: "30px 40px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              minWidth: "320px",
              border: "1px solid #fecaca",
              pointerEvents: "auto",
              backdropFilter: 'blur(5px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Thay emoji ⚠️ bằng icon AlertTriangle */}
            <AlertTriangle size={48} strokeWidth={1.5} style={{ marginBottom: 15 }} />

            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold" }}>
              Không tải được Model!
            </h3>
            <p style={{ fontSize: "13px", marginTop: "5px", color: "#555", lineHeight: "1.5" }}>
              File có thể đã bị xóa hoặc hỏng.<br />
              Hãy chọn file khác ở cột bên trái để thay thế.
            </p>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

// === 2. LOADING FALLBACK ===
const LoadingFallback = React.memo(() => (
  <Html center zIndexRange={[1000, 0]}>
    <div style={STYLES.LOADING_CONTAINER}>
      <Loader2 size={40} color="#0066cc" style={STYLES.LOADING_ICON} />
      <div style={STYLES.LOADING_TEXT}>Đang tải dữ liệu 3D...</div>
      <style>{ANIMATIONS.SPIN}</style>
    </div>
  </Html>
));

// === MODEL PREVIEW ===
const ModelPreview = React.memo(({ url }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={0.4} />;
});

// === POINTS LAYER ===
const PointsLayer = React.memo(({ points }) => {
  return (
    <>
      {points.map((point) => (
        <Html
          key={point.id}
          position={[point.posX, point.posY, point.posZ]}
          center
          zIndexRange={[100, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div title={point.title} style={STYLES.POINT_MARKER} />
        </Html>
      ))}
    </>
  );
});

// === CAMERA HANDLER ===
const CameraHandler = React.memo(({ defaultView, onControlReady }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  useEffect(() => {
    if (defaultView && controlsRef.current) {
      camera.position.set(...defaultView.position);
      controlsRef.current.target.set(...defaultView.target);
      controlsRef.current.update();
    }
    if (onControlReady) onControlReady(controlsRef);
  }, [defaultView, camera, onControlReady]);

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      makeDefault
      minDistance={2}
      autoRotate={false}
    />
  );
});

// === MAIN COMPONENT ===
export default function Model3DManager() {
  const [currentModel, setCurrentModel] = useState("");
  const [defaultView, setDefaultView] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showModelLibrary, setShowModelLibrary] = useState(false);
  const [libraryModels, setLibraryModels] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);
  const controlsRef = useRef(null);

  // Fetch data using custom hook
  const { data: pointsData } = useApi(API_ENDPOINTS.POINTS);
  const { data: currentModelData } = useApi(`${API_ENDPOINTS.SETTINGS}/current_model_url`);
  const { data: defaultViewData } = useApi(`${API_ENDPOINTS.SETTINGS}/default_camera_view`);
  const points = useMemo(() => Array.isArray(pointsData) ? pointsData : [], [pointsData]);

  // Initialize model and camera view from API data
  useEffect(() => {
    if (currentModelData?.value) setCurrentModel(currentModelData.value);
  }, [currentModelData]);

  useEffect(() => {
    if (defaultViewData?.value) {
      try {
        setDefaultView(JSON.parse(defaultViewData.value));
      } catch (e) {
        console.error("Invalid camera view data:", e);
      }
    }
  }, [defaultViewData]);

  // Memoized API mutation for saving settings
  const { mutate: saveSettings, loading } = useApiMutation();

  const handleSelectModel = useCallback(async (url) => {
    if (!VALIDATION.GLB_ONLY(url)) return notifyWarning("Chỉ chọn file .glb!");

    const result = await saveSettings({
      url: API_ENDPOINTS.SETTINGS,
      method: "POST",
      data: { key: "current_model_url", value: url },
    });

    if (result.success) {
      setCurrentModel(url);
      notifySuccess("Đã đổi Model!");
      setShowMediaModal(false);
    } else {
      notifyError(result.error || "Lỗi lưu cài đặt");
    }
  }, [saveSettings]);

  // === MODEL LIBRARY FUNCTIONS ===
  const handleShowModelLibrary = useCallback(async () => {
    console.log("Opening model library modal");
    setShowModelLibrary(true);
    setLoadingLibrary(true);
    
    try {
      const result = await listModel3Ds();
      console.log("Model library result:", result);
      if (result.success) {
        setLibraryModels(result.images || []);
        console.log("Set library models:", result.images);
      } else {
        notifyError("Không thể tải thư viện model");
      }
    } catch (error) {
      console.error("Load model library error:", error);
      notifyError("Lỗi tải thư viện model");
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  const handleSelectFromModelLibrary = useCallback(async (model) => {
    const result = await saveSettings({
      url: API_ENDPOINTS.SETTINGS,
      method: "POST",
      data: { key: "current_model_url", value: model.url },
    });

    if (result.success) {
      setCurrentModel(model.url);
      notifySuccess("Đã chọn model từ thư viện!");
      setShowModelLibrary(false);
    } else {
      notifyError(result.error || "Lỗi lưu cài đặt");
    }
  }, [saveSettings]);

  const handleModelUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      notifyError("Chỉ hỗ trợ file .glb hoặc .gltf");
      return;
    }

    setUploadingModel(true);
    try {
      const result = await uploadModel3D(file);
      if (result.success) {
        notifySuccess("Upload model thành công!");
        
        // Auto select the uploaded model
        const saveResult = await saveSettings({
          url: API_ENDPOINTS.SETTINGS,
          method: "POST",
          data: { key: "current_model_url", value: result.url },
        });

        if (saveResult.success) {
          setCurrentModel(result.url);
          notifySuccess("Đã đặt làm model hiện tại!");
        }
      } else {
        notifyError(result.error || "Upload thất bại");
      }
    } catch (error) {
      console.error("Upload model error:", error);
      notifyError("Lỗi upload model");
    } finally {
      setUploadingModel(false);
      // Reset file input
      event.target.value = '';
    }
  }, [saveSettings]);

  const handleSaveCameraView = useCallback(async () => {
    const controls = controlsRef.current?.current;
    if (!controls) return notifyWarning("Chưa tải xong khung 3D...");

    const viewData = {
      position: [
        controls.object.position.x,
        controls.object.position.y,
        controls.object.position.z,
      ],
      target: [controls.target.x, controls.target.y, controls.target.z],
    };

    const result = await saveSettings({
      url: API_ENDPOINTS.SETTINGS,
      method: "POST",
      data: {
        key: "default_camera_view",
        value: JSON.stringify(viewData),
      },
    });

    if (result.success) {
      notifySuccess("Đã lưu góc nhìn!");
      setDefaultView(viewData);
    } else {
      notifyError(result.error || "Lỗi lưu góc nhìn");
    }
  }, [saveSettings]);

  return (
    <div className="split-layout">
      {/* CỘT TRÁI: FORM */}
      <div className="panel">
        <div className="panel-header">Quản Lý File Model</div>
        <div className="form-section">
          <div className="current-model-info">
            <h3 className="current-model-title">Model Đang Dùng:</h3>
            <div className="model-url-display">
              {currentModel ? currentModel.split("/").pop() : "---"}
            </div>

            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px dashed #ccc" }}>
              <label className="form-label">Cài đặt hiển thị</label>
              <p style={{ fontSize: "13px", color: "#666", marginBottom: "10px" }}>
                Xoay model bên phải đến góc ưng ý, sau đó bấm nút này để đặt làm góc nhìn mặc định cho khách.
              </p>
              <button
                onClick={handleSaveCameraView}
                className="btn btn-warning"
                style={{ width: "100%", fontWeight: "bold" }}
                disabled={!currentModel || loading}
              >
                Lưu Góc Nhìn Hiện Tại
              </button>
            </div>
          </div>

          <div className="upload-wrapper">
            <input
              id="modelUploadInput"
              type="file"
              accept=".glb,.gltf"
              onChange={handleModelUpload}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => document.getElementById("modelUploadInput")?.click()}
              className="btn btn-success"
              disabled={uploadingModel}
              style={{ width: "100%", marginBottom: "10px" }}
            >
              {uploadingModel ? "Đang upload..." : "Upload từ máy tính"}
            </button>
            <button
              type="button"
              onClick={handleShowModelLibrary}
              className="btn btn-secondary"
              style={{ width: "100%", marginBottom: "10px" }}
            >
              Chọn từ thư viện
            </button>
            <button
              onClick={() => setShowMediaModal(true)}
              className="btn btn-primary"
              style={{ width: "100%" }}
            >
              Chọn File Từ Media
            </button>
          </div>
        </div>
      </div>

      {/* CỘT PHẢI: PREVIEW */}
      <div className="panel">
        <div className="panel-header">Xem Trước & Chỉnh Góc</div>
        <div className="preview-3d-container">
          {!checkWebGLSupport() ? (
            <WebGLFallback />
          ) : currentModel ? (
            <Canvas shadows dpr={[1, 2]} camera={{ fov: 25 }}>
              <ErrorBoundary3D>
                <Suspense fallback={<LoadingFallback />}>
                  <ambientLight intensity={2} color={0xe8e5f5} />
                  <directionalLight intensity={5} color={0xdad5ff} position={[25, 35, 25]} />
                  <directionalLight intensity={0.5} color={0xf0ecff} position={[-20, 25, -20]} />

                  <ModelPreview url={currentModel} />
                  <PointsLayer points={points} />
                </Suspense>
              </ErrorBoundary3D>

              <CameraHandler
                defaultView={defaultView}
                onControlReady={(ref) => { controlsRef.current = ref; }}
              />
            </Canvas>
          ) : (
            <div className="preview-empty-state">
              <Box size={48} color="#cbd5e1" strokeWidth={1} style={{ marginBottom: 10 }} />
              <div>Chưa có model nào để hiển thị</div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL THƯ VIỆN MODEL */}
      {showModelLibrary && (
        <div 
          className="legal-modal-overlay" 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div className="legal-modal-content" style={{ maxWidth: '900px', maxHeight: '80vh' }}>
            <div className="legal-modal-header">
              <h3 style={{ margin: 0, color: '#0066cc' }}>Chọn từ thư viện model 3D</h3>
              <button
                onClick={() => setShowModelLibrary(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                X
              </button>
            </div>
            <div className="legal-modal-body" style={{ padding: '20px' }}>
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
                  <div style={{ fontSize: "16px", fontWeight: "500" }}>Đang tải model...</div>
                </div>
              ) : libraryModels.length === 0 ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                  color: "#6c757d"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
                  <div style={{ fontSize: "16px", fontWeight: "500", textAlign: "center" }}>
                    Chưa có model nào trong thư viện
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
                  {libraryModels.map((model) => {
                    // Làm sạch displayName để loại bỏ timestamp
                    const cleanDisplayName = model.displayName
                      .replace(/^\d+-\w+-\d+-/, '') // Loại bỏ pattern timestamp-name-timestamp-
                      .replace(/^\d+-/, '') // Loại bỏ timestamp ở đầu
                      .replace(/-\d+$/, ''); // Loại bỏ timestamp ở cuối
                    
                    return (
                      <div
                        key={model.publicId}
                        onClick={() => handleSelectFromModelLibrary(model)}
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
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📦</div>
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
                          {cleanDisplayName || 'Model 3D'}
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

      {/* MODAL */}
      {showMediaModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ width: "90vw", height: "85vh", maxWidth: "1200px" }}
          >
            <MediaSelector
              onSelect={handleSelectModel}
              onClose={() => setShowMediaModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}