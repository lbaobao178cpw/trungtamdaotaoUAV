import React, { useState, useEffect, Suspense, useCallback, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from '../../../../components/Experience';
import UI from '../../../../components/UI';
import ErrorBoundary from '../../../../ErrorBoundary';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api/points';

// Component Scene 3D (Được 'memo' và định nghĩa BÊN NGOÀI App)
const Scene = memo(({ onPointClick, points }) => {
    return (
        <Canvas
            shadows
            style={{ background: '#d6d2ca' }} // Màu nền giống trong hình
            camera={{ 
                position: [1, 1, 1],
                fov: 30
            }}
        >
            <Suspense fallback={null}>
                {/* TRUYỀN DỮ LIỆU ĐỂ TẠO NÚT */}
                <Experience onPointClick={onPointClick} points={points} />
            </Suspense>
        </Canvas>
    );
});

export default function MapPage() {
    const [pointsData, setPointsData] = useState([]);
    const [selectedPointId, setSelectedPointId] = useState(null);

    // Hàm tải dữ liệu (có thể được gọi lại sau khi Admin thêm/sửa)
    const fetchPoints = async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Lỗi HTTP: ${response.status}`);
            }
            const data = await response.json();
            setPointsData(data);
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu từ API:", error);
        }
    };

    // Tải dữ liệu lần đầu
    useEffect(() => {
        fetchPoints();
    }, []);

    // Dùng 'useCallback' để hàm không bị tạo lại mỗi lần render
    const handlePointClick = useCallback((id) => {
        setSelectedPointId(id);
    }, []);

    const handleClosePanel = useCallback(() => {
        setSelectedPointId(null);
    }, []);

    return (
        <ErrorBoundary>
            <div style={{
                position: 'relative',
                width: '100%',
                height: '100vh',
                overflow: 'hidden',
            }}>
                {/* Logo Admin (Thêm nút Admin) */}
                <Link to="/admin" style={styles.adminButton}>
                    <img src="/images/icn-settings.svg" alt="Admin Settings" style={styles.adminIcon} />
                    ADMIN
                </Link>

                {/* Lớp 3D (nằm DƯỚI) */}
                <div style={styles.layer3D}>
                    <Scene onPointClick={handlePointClick} points={pointsData} />
                </div>

                {/* Lớp 2D (nằm TRÊN) */}
                <div style={styles.layer2D}>
                    <UI
                        points={pointsData}
                        selectedId={selectedPointId}
                        onClose={handleClosePanel}
                        onPointClick={handlePointClick}
                    />
                </div>
            </div>
        </ErrorBoundary>
    );
}

const styles = {
    adminButton: {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        padding: '10px 15px',
        backgroundColor: '#041676',
        color: 'white',
        borderRadius: '5px',
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontFamily: 'Arial, sans-serif',
        pointerEvents: 'auto',
    },
    adminIcon: {
        width: '16px',
        height: '16px',
        marginRight: '8px',
        filter: 'invert(100%)',
    },
    layer3D: {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1,
    },
    layer2D: {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none',
    }
};