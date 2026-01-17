"use client";

import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Experience } from "../components/3d/Experience"; // Đảm bảo đường dẫn đúng
import { useNavigate, Link } from "react-router-dom";
import { useActivate } from "react-activation";
import "./UAVLandingPage.css";

// =====================================================================
// 1. COMPONENT PANORAMA VIEWER (FINAL FIX: LOADING LOGIC)
// =====================================================================
const PanoramaViewer = ({ panoramaUrl }) => {
  const viewerContainerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!viewerContainerRef.current) return;

    // 1. Dọn dẹp viewer cũ ngay lập tức
    if (viewerInstanceRef.current) {
      try {
        viewerInstanceRef.current.destroy();
      } catch (e) { }
      viewerInstanceRef.current = null;
    }

    // Luôn bật loading khi URL thay đổi
    setIsLoading(true);

    // 2. Dùng setTimeout để trì hoãn việc khởi tạo (tránh lag khi slide panel)
    const timer = setTimeout(() => {
      if (!window.pannellum || !viewerContainerRef.current) return;

      try {
        viewerInstanceRef.current = window.pannellum.viewer(
          viewerContainerRef.current,
          {
            type: "equirectangular",
            panorama: panoramaUrl,
            autoLoad: true, // Tự động tải ảnh
            showControls: true,
            showFullscreenCtrl: true,
            showZoomCtrl: true,
            mouseZoom: true,
            draggable: true,
            friction: 0.15,
            hfov: 110,
            pitch: 0,
            yaw: 0,
            backgroundColor: [0.1, 0.1, 0.1], // Màu nền tối
            strings: {
              loadingLabel: "", // Ẩn loading mặc định của thư viện (hộp đen)
              errorMsg: "Không thể tải ảnh.",
            },
          }
        );

        // --- QUAN TRỌNG: Lắng nghe sự kiện 'load' ---
        // Chỉ tắt loading spinner KHI ẢNH ĐÃ TẢI XONG
        viewerInstanceRef.current.on('load', () => {
          setIsLoading(false);
        });

        // Phòng trường hợp lỗi tải ảnh thì cũng tắt loading
        viewerInstanceRef.current.on('error', () => {
          setIsLoading(false);
        });

      } catch (error) {
        console.error("Lỗi khởi tạo Pannellum:", error);
        setIsLoading(false);
      }
    }, 500); // 500ms delay cho hiệu ứng trượt panel

    return () => {
      clearTimeout(timer);
      if (viewerInstanceRef.current) {
        try {
          viewerInstanceRef.current.destroy();
        } catch (e) { }
      }
    };
  }, [panoramaUrl]);

  return (
    <div
      ref={viewerContainerRef}
      className="panorama-container"
      style={{
        width: "100%",
        height: "350px",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#222",
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
        position: "relative",
        border: "1px solid #444",
      }}
    >
      {/* Chỉ hiển thị Loading khi state isLoading = true */}
      {isLoading && (
        <div className="panorama-loading-overlay">
          <div className="pano-spinner"></div>
          <span className="panorama-loading-text">
            Đang tải không gian 360°...
          </span>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// 2. ICON STAR
// =====================================================================
const StarIcon = () => (
  <svg
    className="star-icon"
    viewBox="0 0 24 24"
    style={{ width: "16px", height: "16px", fill: "#0050b8" }}
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);

// =====================================================================
// 3. MAIN COMPONENT (UAV LANDING PAGE)
// =====================================================================
function UAVLandingPage() {
  const navigate = useNavigate();

  // State
  const [points, setPoints] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseRatings, setCourseRatings] = useState({});
  const [modelUrl, setModelUrl] = useState(null);
  const [cameraSettings, setCameraSettings] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedPointData, setSelectedPointData] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeCertTab, setActiveCertTab] = useState("map");

  useActivate(() => {
    window.dispatchEvent(new Event("resize"));
  });

  const certTabsData = {
    map: ["Nghiệp vụ Khảo Sát Bản Đồ Số Hoá Dân Dụng & Công Nghiệp"],
    check: ["Nghiệp vụ Khảo Sát - Kiểm Tra Thiết bị", "Hạ tầng Dân Dụng & Công Nghiệp"],
    agro: ["Nghiệp vụ Khảo Sát Nông - Lâm - Ngư Nghiệp", "Dịch Vụ Nông Nghiệp Công Nghệ cao"],
    art: ["Trình diễn nghệ thuật UAV", "Biểu Diễn Mô Hình R/C", "Tổ hợp sáng tạo nội dung số UAV"],
  };

  useEffect(() => {
    fetch("http://localhost:5000/api/points")
      .then((res) => res.json()).then((data) => setPoints(data)).catch((err) => console.error(err));
    fetch("http://localhost:5000/api/solutions")
      .then((res) => res.json()).then((data) => setSolutions(data)).catch((err) => console.error(err));
    fetch("http://localhost:5000/api/notifications")
      .then((res) => res.json()).then((data) => setNotifications(data)).catch((err) => console.error(err));
    
    // Fetch courses và ratings
    fetch("http://localhost:5000/api/courses")
      .then((res) => res.json())
      .then((data) => {
        setCourses(data);
        
        // Fetch ratings cho từng course
        const ratings = {};
        data.forEach((course) => {
          fetch(`http://localhost:5000/api/comments/course/${course.id}`)
            .then((res) => res.json())
            .then((comments) => {
              const ratedComments = (comments.comments || []).filter(c => c.rating);
              if (ratedComments.length > 0) {
                const avg = (ratedComments.reduce((sum, c) => sum + c.rating, 0) / ratedComments.length).toFixed(1);
                ratings[course.id] = { average: avg, count: ratedComments.length };
                setCourseRatings(prev => ({ ...prev, [course.id]: { average: avg, count: ratedComments.length } }));
              }
            })
            .catch((err) => console.error(`Lỗi fetch comments cho course ${course.id}:`, err));
        });
      })
      .catch((err) => console.error(err));
    
    fetch("http://localhost:5000/api/settings/current_model_url")
      .then((res) => res.json()).then((data) => setModelUrl(data.value || "/models/scene.glb")).catch(() => setModelUrl("/models/scene.glb"));
    fetch("http://localhost:5000/api/settings/default_camera_view")
      .then((res) => res.json()).then((data) => { if (data.value) try { setCameraSettings(JSON.parse(data.value)); } catch (e) { } }).catch(() => { });
  }, []);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isFullscreen]);

  const handlePointClick = (pointId) => {
    const data = points.find((p) => p.id === pointId);
    if (data) {
      setSelectedPointData(data);
      setIsPanelOpen(true);
    }
  };

  const handleClosePanel = () => setIsPanelOpen(false);
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
  const handleCourseClick = (id) => {
    navigate(`/khoa-hoc/${id}`);
    window.scrollTo(0, 0);
  };

  const shouldShowSchedule = (point) => {
    if (!point.schedule || Object.keys(point.schedule).length === 0) return false;
    const status = point.enableSchedule;
    if (status === false || status === 0 || status === "false") return false;
    return true;
  };

  const newestCourses = [...courses]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4);

  const renderCourseCard = (course) => {
    const rating = courseRatings[course.id]?.average ? parseFloat(courseRatings[course.id].average) : (course.rating || 5.0);
    
    return (
      <div key={course.id} className="course-card" onClick={() => handleCourseClick(course.id)}>
        <div className="course-image-wrapper">
          <img src={course.image} alt={course.title} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300x200"; }} />
          {course.badge && <div className="course-badge">{course.badge}</div>}
        </div>
        <div className="course-content">
          <h3 className="course-title">{course.title}</h3>
          <div className="course-rating">
            <div className="stars" style={{ display: "flex" }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="star-icon" viewBox="0 0 24 24" style={{ width: "16px", height: "16px" }}>
                  <path 
                    d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" 
                    fill={i < Math.round(rating) ? '#FFC107' : '#ddd'} 
                  />
                </svg>
              ))}
            </div>
            <span style={{ marginLeft: "8px", fontSize: "14px", color: "#b0b0b0" }}>
              {courseRatings[course.id] 
                ? `${courseRatings[course.id].average} (${course.totalViews || 0} lượt xem)` 
                : `${course.rating || '5.0'} (${course.totalViews || 0} lượt xem)`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-logo">
            <img src="/images/logo_white_on_trans.png" alt="Logo" onError={(e) => (e.target.style.display = "none")} />
          </div>
          <h1>Hệ thống Đào tạo và Cấp Chứng chỉ<br />Điều khiển UAV Theo Tiêu Chuẩn<br />Quy Định Pháp Luật Việt Nam</h1>
          <p>Theo Nghị định Số 288/2025/NĐ-CP Quy Định về Quản lý Tàu Bay Không Người Lái</p>
          <Link to="/dang-ky" className="btn btn-register1">
            Đăng ký học tập
          </Link>

        </div>
      </section>

      {/* 2. Intro */}
      <section className="intro-section">
        <div className="container">
          <h2 className="intro-title">Giới thiệu</h2>
          <div className="intro-content">
            <p className="intro-description">Hệ thống đào tạo và Cấp Chứng Chỉ Điều Khiển UAV Theo Tiêu Chuẩn Quy Định Pháp Luật VN <strong>được xây dựng nhằm đảm bảo an toàn không phân, nâng cao ý thức người sử dụng và tuân thủ các quy định pháp luật về hoạt động bay không người lái tại Việt Nam.</strong></p>
            <p className="intro-description">Sở hữu chứng chỉ hợp pháp giúp bạn tránh các khoản phạt hành chính, được phép bay tại các khu vực cho phép, và mở ra cơ hội nghề nghiệp trong lĩnh vực công nghệ bay không người lái đang phát triển mạnh mẽ.</p>
          </div>
          <div className="intro-stats">
            <div className="intro-stat-item"><div className="intro-stat-number">XXX+</div><div className="intro-stat-label">Học viên</div></div>
            <div className="intro-stat-item"><div className="intro-stat-number">100%</div><div className="intro-stat-label">Công nhận</div></div>
            <div className="intro-stat-item"><div className="intro-stat-number">24/7</div><div className="intro-stat-label">Hỗ trợ</div></div>
          </div>
        </div>
      </section>

      {/* 3. Steps */}
      <section className="section section-white steps-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="section-title" style={{ fontWeight: "800", marginBottom: "50px" }}>Các bước thực hiện</h2>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-icon"><img src="/images/icons/register.svg" alt="Đăng ký" onError={(e) => (e.target.src = "https://img.icons8.com/ios-filled/50/ffffff/open-book.png")} /></div>
              <div className="step-title">Đăng ký tài khoản</div>
              <div className="step-desc">Tạo tài khoản với thông tin cá nhân và xác thực qua CCCD/CMND</div>
            </div>
            <img className="step-arrow-img" src="/images/icons/arrow.svg" alt="arrow" />
            <div className="step-item">
              <div className="step-icon"><img src="/images/icons/course.svg" alt="Học" onError={(e) => (e.target.src = "https://img.icons8.com/ios-filled/50/ffffff/learning.png")} /></div>
              <div className="step-title">Hoàn thành khóa học</div>
              <div className="step-desc">Học các bài giảng trực tuyến và hoàn thành bài tập</div>
            </div>
            <img className="step-arrow-img" src="/images/icons/arrow.svg" alt="arrow" />
            <div className="step-item">
              <div className="step-icon"><img src="/images/icons/test.svg" alt="Sát hạch" onError={(e) => (e.target.src = "https://img.icons8.com/ios-filled/50/ffffff/todo-list.png")} /></div>
              <div className="step-title">Đăng ký lịch thi sát hạch</div>
              <div className="step-desc">Tham gia kỳ thi trắc nghiệm trực tuyến E-learning</div>
            </div>
            <img className="step-arrow-img" src="/images/icons/arrow.svg" alt="arrow" />
            <div className="step-item">
              <div className="step-icon"><img src="/images/icons/license.svg" alt="Giấy phép" onError={(e) => (e.target.src = "https://img.icons8.com/ios-filled/50/ffffff/medal.png")} /></div>
              <div className="step-title">Giấy phép điều khiển</div>
              <div className="step-desc">Nhận chứng chỉ số sau 10 ngày từ lúc xác nhận kết quả</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Certificates */}
      <section className="uav-cert-section">
        <div className="container">
          <h2 className="section-title">Các loại chứng chỉ UAV</h2>
          <div className="uav-cert-grid">
            <div className="uav-cert-card">
              <div>
                <span className="uav-cert-badge badge-a">Hạng A</span>
                <h3 className="uav-cert-title">VLOS – Visual Line of Sight</h3>
                <p className="uav-cert-desc">Giấy phép điều khiển bay bằng trực quan (Hạng A) áp dụng đối với người điều khiển phương tiện bay có trọng lượng cất cách tối đa từ 0,25 ki-lô-gam đến nhỏ hơn 2 ki-lô-gam, bay trong tầm nhìn trực quan;</p>
                <p className="uav-cert-note">Thời gian hiệu lực: 10 năm.</p>
                <p className="uav-cert-note">Chứng chỉ cơ bản phù hợp cho người mới bắt đầu sử dụng UAV.</p>
                <strong>Nội dung chương trình học:</strong>
                <ol className="uav-cert-list">
                  <li>Pháp luật quy định về tàu bay.</li>
                  <li>Kiến thức hàng không cơ bản.</li>
                  <li>Hệ thống tàu bay không người lái.</li>
                  <li>Vận hành an toàn và quy trình bay.</li>
                  <li>Khí tượng và môi trường bay.</li>
                  <li>Quản lý không phận và UTM cơ bản.</li>
                  <li>Kỹ năng điều khiển cơ bản (VLOS).</li>
                  <li>Thực hành nhiệm vụ VLOS nâng cao.</li>
                </ol>
                <br />
                <br />
              </div>
              <div className="uav-duration-box">Thời gian đào tạo: xx Tuần</div>
              <button className="uav-cert-btn">Xem chi tiết</button>
            </div>
            <div className="uav-cert-card">
              <div>
                <span className="uav-cert-badge badge-b">Hạng B</span>
                <h3 className="uav-cert-title">BVLOS - Beyond Visual Line of Sight</h3>
                <p className="uav-cert-desc">Giấy phép điều khiển bay bằng thiết bị (Hạng B) áp dụng đối với người điều khiển phương tiện bay có trọng lượng cất cánh tối đa từ 2 ki-lô-gam trở lên, phương tiện bay bay ngoài tầm nhìn trực quan, phương tiện bay được lập trình thông qua bộ điều khiển trung tâm.</p>
                <p className="uav-cert-note">Thời gian hiệu lực: 10 năm.</p>
                <br /> <br />
                <strong>Nội dung chương trình học:</strong>
                <ol className="uav-cert-list">
                  <li>Pháp luật quy định về tàu bay không người lái và phương tiện bay khác.</li>
                  <li>Kiến thức hàng không cơ bản và nguyên lý bay.</li>
                  <li>Hệ thống tàu bay không người lái và phương tiện bay khác; trang bị, thiết bị đồng bộ.</li>
                  <li>Vận hành an toàn và quy trình bay.</li>
                  <li>Khí tượng và môi trường bay.</li>
                  <li>Quản lý không phận và UTM cơ bản.</li>
                  <li>Kỹ năng điều khiển cơ bản (VLOS).</li>
                  <li>Thực hành nhiệm vụ VLOS nâng cao.</li>
                  <li>Kỹ năng điều khiển nâng cao (BVLOS).</li>
                </ol>
              </div>
              <div className="uav-duration-box">Thời gian đào tạo: xx Tuần (Tùy lĩnh vực ứng dụng)</div>
              {/* <div className="cert-tabs-container">
                <span className="cert-tabs-label">Các nghiệp vụ bao gồm:</span>
                <div className="cert-tabs-header">
                  {Object.keys(certTabsData).map((key) => (
                    <button key={key} className={`cert-tab-btn ${activeCertTab === key ? "active" : ""}`} onClick={() => setActiveCertTab(key)}>
                      {key === 'map' ? 'Khảo sát bản đồ' : key === 'check' ? 'Kiểm tra công nghiệp' : key === 'agro' ? 'Nông Lâm Vận Tải' : 'Trình diễn nghệ thuật'}
                    </button>
                  ))}
                </div>
                <div className="cert-tab-content">
                  <ul className="sub-list-arrow">
                    {certTabsData[activeCertTab].map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div> */}
              <div className="cert-tabs-container">
                <span className="cert-tabs-label">Các nghiệp vụ bao gồm:</span>

                <div className="cert-tabs-header scroll-x">
                  {Object.keys(certTabsData).map((key) => (
                    <button
                      key={key}
                      className={`cert-tab-btn ${activeCertTab === key ? "active" : ""}`}
                      onClick={() => setActiveCertTab(key)}
                    >
                      {key === 'map'
                        ? 'Khảo sát bản đồ'
                        : key === 'check'
                          ? 'Kiểm tra công nghiệp'
                          : key === 'agro'
                            ? 'Nông Lâm Vận Tải'
                            : 'Trình diễn nghệ thuật'}
                    </button>
                  ))}
                </div>

                <div className="cert-tab-content">
                  <ul className="sub-list-arrow">
                    {certTabsData[activeCertTab].map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button className="uav-cert-btn-detail">Xem chi tiết</button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Courses */}
      <section className="section section-gray">
        <div className="container">
          <h2 className="section-title">Khóa học mới nhất</h2>
          <div className="courses-grid">
            {newestCourses.map((course) => renderCourseCard(course))}
          </div>
        </div>
      </section>

      {/* 6. Map 3D */}
      <section className="map-3d-section">
        <div className="map-3d-header">
          <h2 className="section-title">Cơ sở vật chất</h2>
          <p style={{ color: "#000000", maxWidth: "800px", margin: "0 auto" }}>Khám phá cơ sở vật chất hiện đại qua mô hình 3D tương tác.</p>
        </div>
        <div className={`map-3d-container ${isFullscreen ? "fullscreen" : ""}`} id="map3d">
          <button className="fullscreen-btn" onClick={toggleFullscreen}>{isFullscreen ? "✕" : "⛶"}</button>
          <Canvas shadows camera={{ position: [15, 15, 15], fov: 25 }}>
            <Experience points={points} onPointClick={handlePointClick} modelUrl={modelUrl} cameraSettings={cameraSettings} />
          </Canvas>

          {/* INFO PANEL */}
          <div className={`map-info-panel ${isPanelOpen ? "active" : ""}`} id="infoPanel">
            <div className="map-info-header"><button className="close-btn" onClick={handleClosePanel}>✕</button></div>
            {selectedPointData && (
              <div className="map-info-body">
                <div style={{ marginBottom: "20px", width: "100%" }}>
                  {selectedPointData.panoramaUrl ? (
                    <div style={{ position: "relative" }}>
                      <PanoramaViewer key={selectedPointData.id} panoramaUrl={selectedPointData.panoramaUrl} />
                      <div style={{ position: "absolute", bottom: "10px", left: "10px", background: "rgba(0,0,0,0.6)", color: "white", padding: "5px", borderRadius: "4px", fontSize: "11px", pointerEvents: "none" }}>Kéo để xoay 360°</div>
                    </div>
                  ) : (
                    <img className="map-info-image" src={selectedPointData.imageSrc || "/images/img-default.jpg"} alt={selectedPointData.title} style={{ width: "100%", height: "auto", borderRadius: "8px" }} />
                  )}
                </div>
                <div className="map-info-content">
                  {/* FIX LOGO: Style inline để chắc chắn logo nhỏ */}
                  <img
                    className="map-info-logo"
                    src={selectedPointData.logoSrc}
                    alt="logo"
                    style={{ maxWidth: "150px", height: "auto", display: "block", marginBottom: "15px" }}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                  <h3 className="map-info-title-new">{selectedPointData.title}</h3>
                  {selectedPointData.description && (
                    <div className="map-info-description-new html-content" dangerouslySetInnerHTML={{ __html: selectedPointData.description }} />
                  )}
                  {selectedPointData.website && (
                    <div style={{ marginTop: "20px" }}>
                      <a href={selectedPointData.website} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: "inline-block", fontSize: "14px" }}>Truy cập Website</a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. GIẢI PHÁP */}
      <section className="section section-white" style={{ padding: "60px 0" }}>
        <div className="container">
          <h2 className="section-title solutions-section-title">Giải pháp cho các ngành nghề khác nhau</h2>
          {solutions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#ffffff" }}><p>Đang tải dữ liệu giải pháp...</p></div>
          ) : (
            <div className="solutions-grid">
              {solutions.map((item) => (
                <div key={item.id} className="service-card">
                  <div className="service-image-wrapper">
                    <img src={item.image} alt={item.title} className="service-image" onError={(e) => { e.target.onerror = null; e.target.src = `https://via.placeholder.com/250x150?text=${encodeURIComponent(item.title)}`; }} />
                  </div>
                  <h3 className="service-title">{item.title}</h3>
                  <p className="service-desc">{item.description}</p>
                  <Link to={item.link || "#"} className="service-btn" onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")} onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
                    Xem chi tiết
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 8. THÔNG BÁO CHÍNH THỨC */}
      <section className="section section-gray">
        <div className="container">
          <h2 className="section-title">Thông báo chính thức</h2>
          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#b0b0b0" }}>Chưa có thông báo nào.</div>
          ) : (
            <div className="news-grid">
              {notifications.map((news) => (
                <div key={news.id} className="news-card">
                  {news.isNew && <div className="news-badge">MỚI</div>}
                  <div className="news-content">
                    <div className="news-date">{news.date}</div>
                    <div className="news-title">{news.title}</div>
                    <div className="news-desc">{news.description}</div>
                    <a href={news.link || "#"} className="link-button">Xem chi tiết</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default UAVLandingPage;