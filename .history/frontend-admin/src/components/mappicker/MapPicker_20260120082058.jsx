import React, { Suspense, useEffect, useState, useRef, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, Html, useGLTF, Environment, Bvh } from '@react-three/drei'; // 1. THÊM Bvh
import ErrorBoundary from '../ErrorBoundary';
import { MonitorX } from 'lucide-react';
import "../admin/AdminStyles.css";

const DRAG_THRESHOLD = 5;
const API_SETTINGS = "http://localhost:5000/api/settings";
const API_POINTS = "http://localhost:5000/api/points";
const DRACO_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

// === WEBGL SUPPORT CHECK ===
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
const WebGLFallback = ({ onClose }) => (
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
    <p style={{ margin: '0 0 20px', opacity: 0.8, fontSize: '13px', maxWidth: '300px', lineHeight: '1.5' }}>
      Trình duyệt không hỗ trợ WebGL hoặc GPU đang bận.<br/>
      Thử refresh trang hoặc đóng các tab khác.
    </p>
    <button onClick={onClose} className="btn btn-danger btn-sm">Đóng</button>
  </div>
);

// === COMPONENT: HIỂN THỊ CÁC ĐIỂM CŨ ===
const ExistingPointsLayer = memo(({ points }) => {
    return (
        <>
            {points.map((point) => (
                <Html key={point.id} position={[point.posX, point.posY, point.posZ]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                    <div style={{ opacity: 0.8, transform: 'scale(0.8)' }}>
                        <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.9)', borderRadius: '20%', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                            <img src={point.logoSrc} alt="" style={{ width: '60%', height: '60%', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                        </div>
                    </div>
                </Html>
            ))}
        </>
    );
});

// === SCENE CHÍNH ===
const PickerScene = ({ onPick, modelUrl }) => {
    const dragStartRef = useRef(null);
    const { scene } = useGLTF(modelUrl, DRACO_URL);
    const [existingPoints, setExistingPoints] = useState([]);

    useEffect(() => {
        fetch(API_POINTS).then(res => res.json()).then(data => setExistingPoints(Array.isArray(data) ? data : [])).catch(err => console.error(err));
    }, []);

    const handlePointerDown = (event) => { 
        event.stopPropagation(); // Ngăn sự kiện lan ra ngoài
        dragStartRef.current = { x: event.clientX, y: event.clientY, point: event.point }; 
    };
    
    const handlePointerUp = (event) => {
        event.stopPropagation();
        if (!dragStartRef.current) return;
        const dx = Math.abs(event.clientX - dragStartRef.current.x);
        const dy = Math.abs(event.clientY - dragStartRef.current.y);
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) { 
            onPick(dragStartRef.current.point.x, dragStartRef.current.point.y, dragStartRef.current.point.z); 
        }
        dragStartRef.current = null;
    };

    return (
        <>
            <ambientLight intensity={2} color={0xe8e5f5} />
            <directionalLight intensity={5} color={0xdad5ff} position={[25, 35, 25]} castShadow />
            <directionalLight intensity={0.5} color={0xf0ecff} position={[-20, 25, -20]} />
            
            <CameraControls 
                makeDefault
                dollyToCursor={false} 
                smoothTime={0.6}      
                dollySpeed={0.5}      
                minDistance={5}       
                maxDistance={300}     
            />
            
            {/* 2. BỌC BVH QUANH MODEL ĐỂ TỐI ƯU CLICK */}
            {/* firstHitOnly: Chỉ tính toán va chạm với bề mặt đầu tiên -> Tăng tốc cực lớn */}
            <Bvh firstHitOnly>
                <primitive 
                    object={scene} 
                    scale={0.4} 
                    onPointerDown={handlePointerDown} 
                    onPointerUp={handlePointerUp} 
                />
            </Bvh>

            <ExistingPointsLayer points={existingPoints} />
        </>
    );
};

// === MAIN COMPONENT ===
function MapPicker({ onPick, onClose }) {
    const [modelUrl, setModelUrl] = useState(null);

    useEffect(() => {
        fetch(`${API_SETTINGS}/current_model_url`)
            .then(res => res.json())
            .then(data => setModelUrl(data.value || '/models/scene.glb'))
            .catch(() => setModelUrl('/models/scene.glb'));
    }, []);

    if (!modelUrl) return <div className="map-loading-container">Đang tải cấu hình...</div>;

    // Kiểm tra WebGL support
    if (!checkWebGLSupport()) {
        return (
            <div className="map-picker-wrapper">
                <WebGLFallback onClose={onClose} />
            </div>
        );
    }

    return (
        <div className="map-picker-wrapper">
            <Canvas 
                dpr={1}
                gl={{ antialias: false, powerPreference: "high-performance" }} 
                camera={{ position: [25, 35, 45], fov: 25 }} 
                style={{ width: '100%', height: '100%', backgroundColor: '#f4f7f6' }}
            >
                <ErrorBoundary fallback={
                    <Html center>
                        <div style={{color: 'red', fontWeight: 'bold', background:'white', padding: 20, borderRadius: 8}}>
                            <h3> Lỗi hiển thị 3D</h3>
                            <p>Không tìm thấy file model.</p>
                        </div>
                    </Html>
                }>
                    <Suspense fallback={<Html center><div style={{color:'#666', fontWeight:'bold'}}> Đang tải bản đồ...</div></Html>}>
                        <PickerScene onPick={onPick} modelUrl={modelUrl} />
                    </Suspense> 
                </ErrorBoundary>
            </Canvas>
            
            <div className="map-picker-controls">
                <p className="map-tip">Click vào vị trí bất kỳ trên mô hình để chọn tọa độ</p>
                <button onClick={onClose} className="btn btn-danger btn-sm">Đóng Bản Đồ</button>
            </div>
        </div>
    );
}

export default memo(MapPicker);