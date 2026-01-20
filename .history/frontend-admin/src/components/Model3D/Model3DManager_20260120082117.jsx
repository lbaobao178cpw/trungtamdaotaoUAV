import React, { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import { AlertTriangle, Loader2, Box, MonitorX } from "lucide-react"; // 1. IMPORT ICON LUCIDE
import MediaSelector from "../mediaSelector/MediaSelector";
import "./Model3DManager.css";

const API_SETTINGS = "http://localhost:5000/api/settings";
const API_POINTS = "http://localhost:5000/api/points";

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
const WebGLFallback = () => (
  <div style={{
    width: '100%',
    height: '100%',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    borderRadius: '12px',
    color: '#92400e',
    textAlign: 'center',
    padding: '40px'
  }}>
    <MonitorX size={48} strokeWidth={1.5} style={{ marginBottom: '20px' }} />
    <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 'bold' }}>WebGL Không Khả Dụng</h3>
    <p style={{ margin: 0, opacity: 0.8, fontSize: '13px', maxWidth: '300px', lineHeight: '1.5' }}>
      Trình duyệt không hỗ trợ WebGL hoặc GPU đang bận.<br />
      Thử refresh trang hoặc đóng các tab khác.
    </p>
  </div>
);

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

// === 2. LOADING FALLBACK (DÙNG ICON LOADER2 XOAY) ===
const LoadingFallback = () => (
  <Html center zIndexRange={[1000, 0]}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '20px 40px',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      backdropFilter: 'blur(5px)',
      minWidth: '250px',
      pointerEvents: 'none'
    }}>
      {/* Thay Spinner CSS bằng icon Loader2 có animation xoay */}
      <Loader2
        size={40}
        color="#0066cc"
        style={{ marginBottom: '10px', animation: 'spin 1s linear infinite' }}
      />

      <div style={{
        color: '#0066cc',
        fontSize: '15px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}>
        Đang tải dữ liệu 3D...
      </div>

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  </Html>
);

// === MODEL PREVIEW ===
const ModelPreview = ({ url }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={0.4} />;
};

// === POINTS LAYER ===
const PointsLayer = ({ points }) => {
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
          <div
            title={point.title}
            style={{
              width: "12px",
              height: "12px",
              background: "#ef4444",
              borderRadius: "50%",
              border: "2px solid white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          />
        </Html>
      ))}
    </>
  );
};

// === CAMERA HANDLER ===
const CameraHandler = ({ defaultView, onControlReady }) => {
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
};

// === MAIN COMPONENT ===
export default function Model3DManager() {
  const [currentModel, setCurrentModel] = useState("");
  const [defaultView, setDefaultView] = useState(null);
  const [points, setPoints] = useState([]);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    fetch(`${API_SETTINGS}/current_model_url`)
      .then((res) => res.json())
      .then((data) => {
        if (data.value) setCurrentModel(data.value);
      })
      .catch((e) => console.error("Lỗi model:", e));

    fetch(`${API_SETTINGS}/default_camera_view`)
      .then((res) => res.json())
      .then((data) => {
        if (data.value) {
          try {
            setDefaultView(JSON.parse(data.value));
          } catch (e) { }
        }
      })
      .catch((e) => console.error("Lỗi camera:", e));

    fetch(API_POINTS)
      .then((res) => res.json())
      .then((data) => setPoints(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Lỗi points:", e));
  }, []);

  const handleSelectModel = async (url) => {
    if (!url.toLowerCase().endsWith(".glb"))
      return alert("Chỉ chọn file .glb!");
    setLoading(true);
    try {
      await fetch(API_SETTINGS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "current_model_url", value: url }),
      });
      setCurrentModel(url);
      setMessage({ type: "success", text: "Đã đổi Model!" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
      setShowMediaModal(false);
    }
  };

  const handleSaveCameraView = async () => {
    const controls = controlsRef.current?.current;
    if (!controls) return alert("Chưa tải xong khung 3D...");

    const viewData = {
      position: [
        controls.object.position.x,
        controls.object.position.y,
        controls.object.position.z,
      ],
      target: [controls.target.x, controls.target.y, controls.target.z],
    };

    setLoading(true);
    try {
      await fetch(API_SETTINGS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "default_camera_view",
          value: JSON.stringify(viewData),
        }),
      });
      setMessage({ type: "success", text: "Đã lưu góc nhìn!" });
      setDefaultView(viewData);
    } catch (err) {
      setMessage({ type: "error", text: "Lỗi lưu góc nhìn" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-layout">
      {/* CỘT TRÁI: FORM */}
      <div className="panel">
        <div className="panel-header">Quản Lý File Model</div>
        <div className="form-section">
          {message && (
            <div
              className={`message-box ${message.type === "success" ? "msg-success" : "msg-error"
                }`}
            >
              {message.text}
            </div>
          )}

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
            <button
              onClick={() => setShowMediaModal(true)}
              className="btn btn-primary"
              style={{ width: "100%" }}
            >
              Chọn File Từ Thư Viện
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