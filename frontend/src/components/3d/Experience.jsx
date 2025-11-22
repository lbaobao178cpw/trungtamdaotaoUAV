import React, { Suspense, useRef } from 'react';
import { OrbitControls, Html, useGLTF } from '@react-three/drei';

// === ĐƯỜNG DẪN FILE GLB CỦA BẠN ===
// (Tương ứng với public/models/scene.glb)
const GLB_URL = '/models/scene.glb';

// === QUAN TRỌNG: ĐƯỜNG DẪN BỘ GIẢI MÃ DRACO ===
// (Tương ứng với public/draco/)
const DRACO_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

function Scene({ onPointClick, points }) {
    const controlsRef = useRef();

    // === SỬA Ở ĐÂY: Thêm tham số DRACO_URL vào ===
    // useGLTF(đường_dẫn_file, đường_dẫn_bộ_giải_mã)
    const { scene } = useGLTF(GLB_URL, DRACO_URL);

    const handleSceneClick = (event) => {
        event.stopPropagation();
    };

    return (
        <>
            {/* Ánh sáng */}
            <ambientLight intensity={2} color={0xe8e5f5} />
            <directionalLight 
                intensity={5} 
                color={0xdad5ff} 
                position={[25, 35, 25]} 
                castShadow 
                shadow-mapSize={[2048, 2048]} 
            />
            <directionalLight intensity={0.5} color={0xf0ecff} position={[-20, 25, -20]} />
            <directionalLight intensity={0} color={0xffffff} position={[0, 20, 40]} />

            {/* Điều khiển Camera */}
            <OrbitControls
                ref={controlsRef}
                enableDamping={true}
                dampingFactor={0.15}
                target={[0, 0, 0]}
                minDistance={2} 
                maxDistance={100}
                makeDefault={true}
            />

            {/* Render Model 3D */}
            <primitive 
                object={scene} 
                scale={0.4} // Giữ scale 0.1 (hoặc chỉnh lại nếu model quá to/nhỏ)
                onClick={handleSceneClick} 
            />

            {/* Render các điểm đánh dấu */}
            {points.map((point) => (
                <Html
                    position={point.position}
                    key={point.id}
                    center /* Căn giữa HTML so với điểm 3D */
                    distanceFactor={8} /* Giảm giá trị để icon nhỏ lại khi xa */
                    zIndexRange={[100, 0]} 
                >
                    <div className="point-image-marker" onClick={(e) => { e.stopPropagation(); onPointClick(point.id); }}>
                        <img src={point.logoSrc} alt={point.title} />
                    </div>
                </Html>
            ))}
        </>
    );
}

// === SỬA Ở ĐÂY: Preload cũng phải thêm DRACO_URL ===
// Nếu không thêm dòng này, trình duyệt sẽ không tải trước được
useGLTF.preload(GLB_URL, DRACO_URL);

export function Experience(props) {
    return (
        <Suspense fallback={
            <Html center>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div className="spinner" style={{
                        width: '40px', height: '40px', 
                        border: '4px solid #e0e0e0', borderTop: '4px solid #041676', 
                        borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }}></div>
                    <div style={{ color: '#041676', fontWeight: 'bold', fontSize: '14px', width: 'max-content' }}>
                        Đang tải dữ liệu 3D...
                    </div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </Html>
        }>
            <Scene {...props} />
        </Suspense>
    );
}