import React, { Suspense, useRef, useEffect } from 'react';
import { CameraControls, Html, useGLTF } from '@react-three/drei';
import { AlertTriangle, Loader2 } from 'lucide-react';  

const DRACO_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

// === 1. ERROR BOUNDARY ===
class ErrorBoundary3D extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("3D Error:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <Html center>
            <div style={{ 
                color: '#d32f2f', 
                background: 'rgba(255,255,255,0.95)', 
                padding: '30px 40px', 
                borderRadius: '12px', 
                border: '1px solid #fecaca', 
                textAlign: 'center', 
                minWidth: '320px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <AlertTriangle size={48} strokeWidth={1.5} style={{ marginBottom: 15 }} />
                <h3 style={{margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold'}}>Lỗi Model 3D</h3>
                <p style={{fontSize: '13px', margin: 0, color: '#555'}}>
                    Không thể tải file. Vui lòng kiểm tra đường dẫn.
                </p>
            </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

// === 2. LOADING FALLBACK ===
const LoadingFallback = () => (
  <Html center>
    <div style={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.95)', 
        padding: '30px 50px', 
        borderRadius: '12px', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)', 
        backdropFilter: 'blur(5px)',
        minWidth: '320px',
        textAlign: 'center',
        pointerEvents: 'none'
    }}>
      <Loader2 
        size={48} 
        color="#0066cc" 
        style={{ marginBottom: '15px', animation: 'spin 1s linear infinite' }} 
      />
      
      <div style={{
          color: '#0066cc', 
          fontSize: '16px', 
          fontWeight: '600',
          whiteSpace: 'nowrap'
      }}>
          Đang tải dữ liệu 3D...
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  </Html>
);

// === 3. SCENE CHÍNH ===
function Scene({ onPointClick, points, modelUrl, cameraSettings }) { 
    const controlsRef = useRef();
    const { scene } = useGLTF(modelUrl, DRACO_URL);

    // Hiệu ứng Camera Intro
    useEffect(() => {
        if (controlsRef.current) {
            let targetPos = [25, 35, 45]; 
            let lookAtPos = [0, 0, 0];    

            if (cameraSettings && cameraSettings.position && cameraSettings.target) {
                targetPos = cameraSettings.position;
                lookAtPos = cameraSettings.target;
            }

            const startX = targetPos[0] * 1.5 + 10; 
            const startY = targetPos[1] * 1.5 + 10; 
            const startZ = targetPos[2] * 1.5 + 10;

            controlsRef.current.setLookAt(startX, startY, startZ, lookAtPos[0], lookAtPos[1], lookAtPos[2], false);

            const timer = setTimeout(() => {
                controlsRef.current.setLookAt(targetPos[0], targetPos[1], targetPos[2], lookAtPos[0], lookAtPos[1], lookAtPos[2], true);
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [cameraSettings]);

    return (
        <>
            <ambientLight intensity={2} color={0xe8e5f5} />
            <directionalLight intensity={5} color={0xdad5ff} position={[25, 35, 25]} castShadow />
            <directionalLight intensity={0.5} color={0xf0ecff} position={[-20, 25, -20]} />

            <CameraControls 
                ref={controlsRef} 
                makeDefault 
                dollyToCursor={false} 
                smoothTime={0.6} 
                dollySpeed={0.5} 
                minDistance={5} 
                maxDistance={300} 
            />

            <primitive object={scene} scale={0.4} />

            {points.map((point) => (
                <Html 
                    position={point.position} 
                    key={point.id} 
                    center 
                    distanceFactor={8}
                    zIndexRange={[100, 0]}
                >
                    <div 
                        className="point-image-marker" 
                        onClick={(e) => { e.stopPropagation(); onPointClick(point.id); }}
                    >
                        <img src={point.logoSrc} alt={point.title} />
                    </div>
                </Html>
            ))}
        </>
    );
}

// === 4. COMPONENT WRAPPER ===
export function Experience({ onPointClick, points, modelUrl, cameraSettings }) {
    if (!modelUrl) return <LoadingFallback />;

    return (
        <ErrorBoundary3D>
            <Suspense fallback={<LoadingFallback />}>
                <Scene 
                    onPointClick={onPointClick} 
                    points={points} 
                    modelUrl={modelUrl} 
                    cameraSettings={cameraSettings} 
                />
            </Suspense>
        </ErrorBoundary3D>
    );
}