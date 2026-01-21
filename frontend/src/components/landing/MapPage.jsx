import React, { useState, useEffect, Suspense, useCallback, memo, useMemo } from 'react';
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
            // [THEME] Đổi màu nền Canvas sang xám đen
            style={{ background: '#222222' }}
            camera={{
                position: [1, 1, 1],
                fov: 30
            }}
        >
            <Suspense fallback={null}>
                <Experience onPointClick={onPointClick} points={points} />
            </Suspense>
        </Canvas>
    );
});

export default function MapPage() {
    const [pointsData, setPointsData] = useState([]);
    const [selectedPointId, setSelectedPointId] = useState(null);

    // Hàm tải dữ liệu
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

    // --- LOGIC MỚI: XỬ LÝ DATA CHO UI ---
    const pointsDataForUI = useMemo(() => {
        return pointsData.map(point => {
            const isScheduleDisabled =
                point.enableSchedule === false ||
                point.enableSchedule === 0 ||
                point.enableSchedule === "false";

            if (isScheduleDisabled) {
                return { ...point, schedule: null };
            }
            return point;
        });
    }, [pointsData]);

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
                backgroundColor: '#222' // [THEME] Nền bao ngoài
            }}>
                {/* Logo Admin */}
                <Link to="/admin" style={styles.adminButton}>
                    {/* [THEME] Đổi icon sang màu vàng bằng filter CSS */}
                    <img src="/images/icn-settings.svg" alt="Admin Settings" style={styles.adminIcon} />
                    ADMIN
                </Link>

                {/* Lớp 3D */}
                <div style={styles.layer3D}>
                    <Scene onPointClick={handlePointClick} points={pointsData} />
                </div>

                {/* Lớp 2D */}
                <div style={styles.layer2D}>
                    <UI
                        points={pointsDataForUI}
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
        padding: '10px 20px',
        // [THEME] Đổi sang style Neon: Nền tối, Viền vàng, Chữ vàng
        backgroundColor: '#e1e1e1',
        color: '#0050b8',
        border: '1px solid #0050b8',
        borderRadius: '30px', // Bo tròn nhiều hơn cho hiện đại
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        fontFamily: 'Roboto, sans-serif',
        pointerEvents: 'auto',
        boxShadow: '0 0 10px rgba(255, 202, 5, 0.2)', // Glow nhẹ
        transition: 'all 0.3s'
    },
    adminIcon: {
        width: '16px',
        height: '16px',
        marginRight: '8px',
        // [THEME] Filter này biến icon màu trắng/đen thành màu vàng #0050b8
        filter: 'invert(74%) sepia(61%) saturate(1682%) hue-rotate(359deg) brightness(103%) contrast(106%)',
    },
    layer3D: {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1,
    },
    layer2D: {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none',
    }
};