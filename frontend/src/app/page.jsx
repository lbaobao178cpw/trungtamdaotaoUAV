'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from "../components/3d/Experience";
// 1. THÊM 'Link' VÀO DÒNG IMPORT NÀY
import { useNavigate, Link } from 'react-router-dom'; 
import { useActivate } from 'react-activation';
import './UAVLandingPage.css';

// =====================================================================
// 1. COMPONENT PANORAMA VIEWER
// =====================================================================
const PanoramaViewer = ({ panoramaUrl }) => {
    const viewerContainerRef = useRef(null);
    const viewerInstanceRef = useRef(null);

    useEffect(() => {
        if (!window.pannellum || !viewerContainerRef.current) return;

        if (viewerInstanceRef.current) {
            try { viewerInstanceRef.current.destroy(); } catch(e) {}
            viewerInstanceRef.current = null;
        }

        try {
            viewerInstanceRef.current = window.pannellum.viewer(viewerContainerRef.current, {
                type: "equirectangular",
                panorama: panoramaUrl, 
                autoLoad: true,
                showControls: true,
                showFullscreenCtrl: true,
                showZoomCtrl: true,
                mouseZoom: true,
                draggable: true,
                friction: 0.15,
                hfov: 110,
                pitch: 0,
                yaw: 0,
                backgroundColor: [0, 0, 0],
                strings: {
                    loadingLabel: "Đang tải không gian 360°...",
                    errorMsg: "Không thể tải ảnh. Vui lòng kiểm tra đường dẫn."
                }
            });
        } catch (error) {
            console.error("Lỗi khởi tạo Pannellum:", error);
        }

        return () => {
            if (viewerInstanceRef.current) {
                try { viewerInstanceRef.current.destroy(); } catch(e) {}
            }
        };
    }, [panoramaUrl]);

    return (
        <div 
            ref={viewerContainerRef} 
            style={{ 
                width: '100%', 
                height: '350px', 
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#000',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                position: 'relative'
            }} 
        />
    );
};

// =====================================================================
// 2. ICON STAR
// =====================================================================
const StarIcon = () => (
    <svg className="star-icon" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: '#ffc107' }}>
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
);

// =====================================================================
// 3. MAIN COMPONENT
// =====================================================================
function UAVLandingPage() {
    const navigate = useNavigate();

    // === STATE ===
    const [points, setPoints] = useState([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedPointData, setSelectedPointData] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useActivate(() => { window.dispatchEvent(new Event('resize')); });

    // === FETCH DATA ===
    useEffect(() => {
        fetch('http://localhost:5000/api/points')
            .then(res => res.json())
            .then(data => setPoints(data))
            .catch(err => console.error("Lỗi tải điểm:", err));
    }, []);

    // === HANDLERS ===
    useEffect(() => {
        document.body.style.overflow = isFullscreen ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [isFullscreen]);

    const handlePointClick = (pointId) => {
        const data = points.find(p => p.id === pointId);
        if (data) {
            setSelectedPointData(data);
            setIsPanelOpen(true);
        }
    };

    const handleClosePanel = () => setIsPanelOpen(false);
    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
    const handleCourseClick = (id) => { navigate(`/khoa-hoc/${id}`); window.scrollTo(0, 0); };

    const courses = [
        { id: 1, title: 'ĐIỀU KHIỂN THIẾT BỊ BAY KHÔNG NGƯỜI LÁI HẠNG A', image: '/images/course-images/course-a.jpeg', badge: 'Sản phẩm mới', rating: 4.8, reviews: 250, group: 'newest' },
        { id: 2, title: 'ĐIỀU KHIỂN THIẾT BỊ BAY KHÔNG NGƯỜI LÁI HẠNG B', image: '/images/course-images/course-b.jpeg', badge: 'Sản phẩm mới', rating: 4.9, reviews: 171, group: 'newest' },
        { id: 3, title: 'LỚP ỨNG DỤNG: KIỂM TRA CÔNG NGHIỆP VỚI UAV', image: '/images/course-images/course-industry.jpeg', badge: 'Sản phẩm mới', rating: 4.8, reviews: 150, group: 'newest' },
        { id: 4, title: 'LỚP ỨNG DỤNG: MAPPING - DIGITAL TWIN', image: '/images/course-images/course-mapping.jpeg', badge: 'Cập nhật', rating: 4.5, reviews: 198, group: 'newest' }
    ];
    const newestCourses = courses.filter(c => c.group === 'newest');

    const renderCourseCard = (course) => (
        <div key={course.id} className="course-card" onClick={() => handleCourseClick(course.id)} style={{ cursor: 'pointer' }}>
            <div className="course-image-wrapper">
                <img src={course.image} alt={course.title} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300x200" }} />
                {course.badge && <div className="course-badge">{course.badge}</div>}
            </div>
            <div className="course-content">
                <h3 className="course-title">{course.title}</h3>
                <div className="course-rating">
                    <div className="stars" style={{ display: 'flex', alignItems: 'center' }}>{[...Array(5)].map((_, i) => <StarIcon key={i} />)}</div>
                    <span style={{ marginLeft: '8px', fontSize: '14px', color: '#666' }}>{course.rating} ({course.reviews})</span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* 1. Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-logo"><img src="/images/logo_white_on_trans.png" alt="Logo" onError={(e) => e.target.style.display = 'none'} /></div>
                    <h1>Hệ thống Đào tạo và Cấp Chứng chỉ<br />Điều khiển UAV Theo Tiêu Chuẩn<br />Quy Định Pháp Luật VN</h1>
                    <p>Theo Nghị định Số 288/2025/NĐ-CP Quy Định về Quản lý Tàu Bay Không Người Lái</p>
                    
                    {/* 2. ĐÃ SỬA: NÚT ĐĂNG KÝ CHUYỂN THÀNH LINK */}
                    <Link 
                        to="/dang-ky" 
                        className="btn btn-primary" 
                        style={{ background: '#ffcc00', color: '#333' }}
                    >
                        Đăng ký học tập
                    </Link>
                </div>
            </section>

            {/* 2. Giới thiệu */}
            <section className="section section-white">
                <div className="container">
                    <h2 className="section-title">Giới thiệu</h2>
                    <p className="section-subtitle">Hệ thống đào tạo chuẩn quy định pháp luật Việt Nam...</p>
                    <div className="stats-row">
                        <div className="stat-item"><div className="stat-number">XXX+</div><div className="stat-label">Học viên</div></div>
                        <div className="stat-item"><div className="stat-number">100%</div><div className="stat-label">Công nhận</div></div>
                        <div className="stat-item"><div className="stat-number">24/7</div><div className="stat-label">Hỗ trợ</div></div>
                    </div>
                </div>
            </section>

            {/* 3. Các bước thực hiện */}
            <section className="section section-white" style={{paddingTop: 0}}>
                <div className="container">
                    <h2 className="section-title">Các bước thực hiện</h2>
                    <div className="steps-container">
                        <div className="step-item"><div className="step-icon"><img src="/images/icons/register.svg" alt="Đăng ký" /></div><div className="step-title">Đăng ký</div></div>
                        <div className="step-item"><div className="step-icon"><img src="/images/icons/course.svg" alt="Học" /></div><div className="step-title">Học tập</div></div>
                        <div className="step-item"><div className="step-icon"><img src="/images/icons/test.svg" alt="Thi" /></div><div className="step-title">Thi sát hạch</div></div>
                        <div className="step-item"><div className="step-icon"><img src="/images/icons/license.svg" alt="Bằng" /></div><div className="step-title">Nhận bằng</div></div>
                    </div>
                </div>
            </section>

            {/* 4. Khóa học */}
            <section className="section section-gray">
                <div className="container">
                    <h2 className="section-title">Khóa học mới nhất</h2>
                    <div className="courses-grid">{newestCourses.map(course => renderCourseCard(course))}</div>
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/khoa-hoc')}>Xem tất cả khóa học mới</button>
                    </div>
                </div>
            </section>

            {/* 5. Cơ sở vật chất (Map 3D) */}
            <section className="map-3d-section">
                <div className="map-3d-header">
                    <h2 className="section-title">Cơ sở vật chất</h2>
                    <p style={{ color: '#666', maxWidth: '800px', margin: '0 auto' }}>Khám phá cơ sở vật chất hiện đại qua mô hình 3D tương tác.</p>
                </div>

                <div className={`map-3d-container ${isFullscreen ? 'fullscreen' : ''}`} id="map3d">
                    <button className="fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? "Thoát" : "Toàn màn hình"}>
                        {isFullscreen ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d9534f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#041676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                        )}
                    </button>

                    <Canvas shadows camera={{ position: [15, 15, 15], fov: 25 }}>
                        <Experience points={points} onPointClick={handlePointClick} />
                    </Canvas>

                    {/* POPUP INFO */}
                    <div className={`map-info-panel ${isPanelOpen ? 'active' : ''}`} id="infoPanel">
                        <div className="map-info-header">
                            <button className="close-btn" onClick={handleClosePanel}>✕</button>
                        </div>
                        {selectedPointData && (
                            <div className="map-info-body">
                                <div style={{ marginBottom: '20px', width: '100%' }}>
                                    {selectedPointData.panoramaUrl ? (
                                        <div style={{ position: 'relative' }}>
                                            <PanoramaViewer key={selectedPointData.id} panoramaUrl={selectedPointData.panoramaUrl} />
                                            <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '5px', borderRadius: '4px', fontSize: '11px', pointerEvents: 'none' }}>🖱️ Kéo để xoay 360°</div>
                                        </div>
                                    ) : (
                                        <img className="map-info-image" src={selectedPointData.imageSrc || "/images/img-default.jpg"} alt={selectedPointData.title} style={{ width: '100%', height: 'auto', borderRadius: '8px', display: 'block' }} onError={(e) => { e.target.src = "https://via.placeholder.com/400x250?text=No+Image" }} />
                                    )}
                                </div>
                                <div className="map-info-content">
                                    <img className="map-info-logo" src={selectedPointData.logoSrc} alt="logo" onError={(e) => e.target.style.display = 'none'} />
                                    <h3 className="map-info-title-new">{selectedPointData.title}</h3>
                                    {selectedPointData.lead && <p className="map-info-lead">{selectedPointData.lead}</p>}
                                    <p className="map-info-description-new">{selectedPointData.description}</p>
                                    {selectedPointData.schedule && Object.keys(selectedPointData.schedule).length > 0 && (
                                        <div className="map-info-schedule">
                                            <h4 className="map-info-section-title">Lịch hoạt động</h4>
                                            <table className="info-table">
                                                <thead><tr><th>Thứ</th><th>Giờ</th></tr></thead>
                                                <tbody>{Object.entries(selectedPointData.schedule).map(([day, time]) => <tr key={day}><td>{day}</td><td>{time}</td></tr>)}</tbody>
                                            </table>
                                        </div>
                                    )}
                                    {selectedPointData.website && (
                                        <div style={{ marginTop: '20px' }}>
                                            <a href={selectedPointData.website} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-block', fontSize: '14px' }}>Truy cập Website</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 6. Tiểu mục (User Categories) */}
            <section className="section section-white" style={{backgroundColor: '#f0f4f8'}}>
                <div className="container">
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px'}}>
                        <div className="user-cat-card">
                            <div className="user-cat-header" style={{backgroundImage: 'url("/images/cat-bg-1.jpg")'}}></div>
                            <div className="user-cat-body">
                                <h3>Getting Started</h3>
                                <ul>
                                    <li><a href="#">Register Your Drone</a></li>
                                    <li><a href="#">What Kind of Drone Flyer Are You?</a></li>
                                    <li><a href="#">B4UFLY</a></li>
                                    <li><a href="#">LAANC</a></li>
                                    <li><a href="#">Temporary Flight Restrictions (TFRs)</a></li>
                                    <li><a href="#">Remote ID</a></li>
                                    <li><a href="#">Traveling with Your Drone</a></li>
                                </ul>
                            </div>
                        </div>
                        <div className="user-cat-card">
                            <div className="user-cat-header" style={{backgroundImage: 'url("/images/cat-bg-2.jpg")'}}></div>
                            <div className="user-cat-body">
                                <h3>Recreational Flyers</h3>
                                <ul>
                                    <li><a href="#">The Recreational UAS Safety Test (TRUST)</a></li>
                                    <li><a href="#">Where can I fly?</a></li>
                                    <li><a href="#">Recreational Flyer Airspace Authorizations</a></li>
                                </ul>
                            </div>
                        </div>
                        <div className="user-cat-card">
                            <div className="user-cat-header" style={{backgroundImage: 'url("/images/cat-bg-3.jpg")'}}></div>
                            <div className="user-cat-body">
                                <h3>Certificated Remote Pilots</h3>
                                <p style={{fontSize:'0.9em', color:'#666', marginBottom:'10px'}}>including Commercial Operators</p>
                                <ul>
                                    <li><a href="#">Become a Drone Pilot</a></li>
                                    <li><a href="#">Operations Over People</a></li>
                                    <li><a href="#">Part 107 Waiver</a></li>
                                    <li><a href="#">UAS Facility Maps</a></li>
                                    <li><a href="#">Part 107 Airspace Authorizations</a></li>
                                </ul>
                            </div>
                        </div>
                        <div className="user-cat-card">
                            <div className="user-cat-header" style={{backgroundImage: 'url("/images/cat-bg-4.jpg")'}}></div>
                            <div className="user-cat-body">
                                <h3>Public Safety</h3>
                                <ul>
                                    <li><a href="#">Operate a Drone, Start a Drone Program</a></li>
                                    <li><a href="#">Understanding Your Authority</a></li>
                                    <li><a href="#">Public Safety and Law Enforcement Toolkit</a></li>
                                    <li><a href="#">Emergency Situations</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. Thông báo chính thức */}
            <section className="section section-gray">
                <div className="container">
                    <h2 className="section-title">Thông báo chính thức</h2>
                    <div className="news-grid">
                        <div className="news-card"><div className="news-badge">MỚI</div><div className="news-content"><div className="news-date">05/11/2025</div><div className="news-title">Nghị định số 288/2025/NĐ-CP</div><div className="news-desc">Quy định về quản lý tàu bay không người lái...</div><a href="#" className="link-button">Xem chi tiết</a></div></div>
                        <div className="news-card"><div className="news-content"><div className="news-date">05/06/2025</div><div className="news-title">Thông tư số 39/2025/TT-BQP</div><div className="news-desc">Danh mục tiêu chuẩn kỹ thuật...</div><a href="#" className="link-button">Xem chi tiết</a></div></div>
                        <div className="news-card"><div className="news-content"><div className="news-date">01/07/2025</div><div className="news-title">Luật Phòng không nhân dân 2024</div><div className="news-desc">Có hiệu lực từ ngày 01/7/2025...</div><a href="#" className="link-button">Xem chi tiết</a></div></div>
                    </div>
                </div>
            </section>
        </>
    );
}

export default UAVLandingPage;