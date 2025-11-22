import React, { Suspense, useEffect, useState, useRef, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF } from '@react-three/drei'; // Dùng useGLTF
import * as THREE from 'three';

// === QUAN TRỌNG: DÙNG CHUNG FILE GLB VỚI TRANG CHỦ ===
// (Đảm bảo đường dẫn này Y HỆT bên Experience.jsx)
const GLB_URL = '/models/scene.glb'; 
const DRAG_THRESHOLD = 5;

const PickerScene = ({ onPick }) => {
    const dragStartRef = useRef(null);
    
    // 1. Load từ cache chung (Không tốn thêm RAM tải lại)
    const { scene } = useGLTF(GLB_URL);
    
    const [readyScene, setReadyScene] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!scene) return;
        setIsLoading(true);

        // 2. Clone (Nhân bản) scene để tô màu xám mà không ảnh hưởng trang chủ
        // Dùng clone(true) để copy sâu cấu trúc
        const clonedScene = scene.clone(true); 
        
        const solidMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.7,
            metalness: 0.1
        });

        // Gán màu xám
        clonedScene.traverse((child) => {
            if (child.isMesh) {
                child.material = solidMaterial;
            }
        });

        setReadyScene(clonedScene);
        
        const timer = setTimeout(() => setIsLoading(false), 300);

        return () => {
            clearTimeout(timer);
            solidMaterial.dispose(); 
            setReadyScene(null);
        };
    }, [scene]);

    const handlePointerDown = (event) => {
        event.stopPropagation();
        dragStartRef.current = { x: event.clientX, y: event.clientY, point: event.point };
    };

    const handlePointerUp = (event) => {
        event.stopPropagation();
        if (!dragStartRef.current) return;
        const dx = Math.abs(event.clientX - dragStartRef.current.x);
        const dy = Math.abs(event.clientY - dragStartRef.current.y);
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) {
            handlePickClick(dragStartRef.current.point);
        }
        dragStartRef.current = null;
    };

    const handlePickClick = (point) => {
        onPick(point.x, point.y, point.z);
    };

    if (!readyScene || isLoading) {
        return (
            <Html center>
                <div style={{ color: '#041676', fontWeight: 'bold' }}>Đang tải bản đồ...</div>
            </Html>
        );
    }

    return (
        <>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <OrbitControls makeDefault />
            <primitive
                object={readyScene}
                scale={0.4} // Chỉnh scale cho khớp trang chủ
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
            />
        </>
    );
};

// Preload để đảm bảo cache có sẵn
useGLTF.preload(GLB_URL);

function MapPicker({ onPick, onClose }) {
    return (
        <div style={styles.canvasWrapper}>
            <Canvas camera={{ position: [0, 20, 40], fov: 35 }} style={{ backgroundColor: '#f4f7f6' }}>
                <Suspense fallback={null}>
                    <PickerScene onPick={onPick} />
                </Suspense>
            </Canvas>
            <div style={styles.header}>
                <p style={styles.tip}>💡 Click để chọn tọa độ</p>
                <button onClick={onClose} style={styles.closeButton}>Đóng</button>
            </div>
        </div>
    );
}

export default memo(MapPicker);

const styles = {
    canvasWrapper: { width: '100%', height: '100%', position: 'relative' },
    header: { position: 'absolute', top: '10px', left: '10px', right: '10px', padding: '10px', background: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', zIndex: 10 },
    tip: { margin: 0, fontWeight: 'bold', color: '#333' },
    closeButton: { background: '#ff6407', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }
};