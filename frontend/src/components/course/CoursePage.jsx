import React from 'react';
import { useNavigate, Link } from 'react-router-dom'; // 1. Import thêm Link
import './CoursePage.css';

// Icon SVG
const StarIcon = () => (
    <svg className="star-icon" viewBox="0 0 24 24">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
);

const MedalIcon = () => (
    <svg className="icon-medal" viewBox="0 0 24 24">
         <path fill="currentColor" d="M12 2l-5.5 9h11z"/>
         <circle fill="none" stroke="currentColor" strokeWidth="2" cx="12" cy="16" r="4"/>
    </svg>
);

function CoursesPage() {
    const navigate = useNavigate(); // Hook điều hướng

    // Hàm xử lý khi click vào khóa học
    const handleCourseClick = (id) => {
        navigate(`/khoa-hoc/${id}`);
        // Scroll lên đầu trang khi chuyển trang
        window.scrollTo(0, 0);
    };

    const courses = [
        // --- KHÓA HỌC MỚI NHẤT ---
        {
            id: 1,
            title: 'ĐIỀU KHIỂN THIẾT BỊ BAY KHÔNG NGƯỜI LÁI HẠNG A',
            image: '/images/course-images/course-a.jpeg',
            badge: 'Sản phẩm mới',
            rating: 4.8,
            reviews: 250,
            group: 'newest'
        },
        {
            id: 2,
            title: 'ĐIỀU KHIỂN THIẾT BỊ BAY KHÔNG NGƯỜI LÁI HẠNG B',
            image: '/images/course-images/course-b.jpeg',
            badge: 'Sản phẩm mới',
            rating: 4.9,
            reviews: 171,
            group: 'newest'
        },
        {
            id: 3,
            title: 'LỚP ỨNG DỤNG: KIỂM TRA CÔNG NGHIỆP VỚI ĐƯỜNG DÂY CAO THẾ VỚI UAV',
            image: '/images/course-images/course-industry.jpeg',
            badge: 'Sản phẩm mới',
            rating: 4.8,
            reviews: 150,
            group: 'newest'
        },
        {
            id: 4,
            title: 'LỚP ỨNG DỤNG: QUÉT CHỤP KHẢO SÁT BẢN ĐỒ SỐ 2D/3D (MAPPING - DIGITAL TWIN)',
            image: '/images/course-images/course-mapping.jpeg',
            badge: 'Cập nhật',
            rating: 4.5,
            reviews: 198,
            group: 'newest'
        },
        // --- KHÓA HỌC NỔI BẬT ---
        {
            id: 5,
            title: 'ĐIỀU KHIỂN THIẾT BỊ BAY KHÔNG NGƯỜI LÁI HẠNG A',
            image: '/images/course-images/course-a.jpeg',
            badge: 'Nổi bật',
            rating: 4.9,
            reviews: 199,
            group: 'featured'
        },
        {
            id: 6,
            title: 'ĐIỀU KHIỂN THIẾT BỊ BAY KHÔNG NGƯỜI LÁI HẠNG B',
            image: '/images/course-images/course-b.jpeg',
            badge: 'Nổi bật',
            rating: 4.8,
            reviews: 381,
            group: 'featured'
        },
        {
            id: 7,
            title: 'LỚP ỨNG DỤNG: TRẠM DRONE TỰ ĐỘNG - TRUNG TÂM ĐIỀU KHIỂN TẬP TRUNG OCC',
            image: '/images/course-images/course-auto.jpeg',
            badge: 'Nổi bật',
            rating: 4.7,
            reviews: 227,
            group: 'featured'
        },
        {
            id: 8,
            title: 'LỚP ỨNG DỤNG: QUÉT CHỤP KHẢO SÁT BẢN ĐỒ SỐ 2D/3D (MAPPING - DIGITAL TWIN)',
            image: '/images/course-images/course-mapping.jpeg',
            badge: 'Nổi bật',
            rating: 4.6,
            reviews: 293,
            group: 'featured'
        }
    ];

    const newestCourses = courses.filter(c => c.group === 'newest');
    const featuredCourses = courses.filter(c => c.group === 'featured');

    const renderCourseCard = (course) => (
        <div 
            key={course.id} 
            className="course-card" 
            onClick={() => handleCourseClick(course.id)}
        >
            <div className="course-image-wrapper">
                <img src={course.image} alt={course.title} />
                {course.badge && <div className="course-badge">{course.badge}</div>}
            </div>
            <div className="course-content">
                <h3 className="course-title">{course.title}</h3>
                <div className="course-rating">
                    <div className="stars">
                        {[...Array(5)].map((_, i) => (
                            <StarIcon key={i} />
                        ))}
                    </div>
                    <span>{course.rating} ({course.reviews} lượt xem)</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="courses-page">
            {/* Header Links */}
            <div className="container">
                <nav className="top-nav">
                    {/* 2. Đổi tất cả thẻ a thành Link */}
                    <Link to="/">Trang chủ</Link>
                    <Link to="/gioi-thieu">Giới thiệu</Link>
                    <Link to="/khoa-hoc">Khóa học</Link>
                    <Link to="/thi-sat-hach">Thi sát hạch</Link>
                    <Link to="/tra-cuu">Tra cứu</Link>
                </nav>
            </div>

            {/* HERO BANNER */}
            <section className="hero-banner-wrapper">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-text">
                            <h1 className="hero-title">TRAINING & CERTIFICATION</h1>
                            <span className="hero-pill">PUBLIC SAFETY</span>
                        </div>
                        
                        <div className="hero-illustration">
                             <img 
                                src="https://cdn-icons-png.flaticon.com/512/3063/3063822.png" 
                                alt="Training Illustration" 
                                style={{opacity: 0.8, filter: 'invert(1) brightness(2)'}} 
                            />
                        </div>
                    </div>
                    
                    {/* Bottom Bar */}
                    <div className="hero-bottom-bar">
                        <div className="bar-content">
                            <div className="bar-item">
                                <MedalIcon />
                                <span>GET DJI OFFICIAL CERTIFICATION</span>
                            </div>
                            <div className="bar-item">
                                <MedalIcon />
                                <span>LEARN THE GLOBAL DRONE USE CASE</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 1 */}
            <section className="courses-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Khóa học mới nhất</h2>
                        {/* 3. Đổi nút Xem tất cả thành Link */}
                        <Link to="/newest" className="view-all">Xem tất cả</Link>
                    </div>
                    <div className="courses-grid">
                        {newestCourses.map(course => renderCourseCard(course))}
                    </div>
                </div>
            </section>

            {/* SECTION 2 */}
            <section className="courses-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Khóa học nổi bật</h2>
                        {/* 4. Đổi nút Xem tất cả thành Link */}
                        <Link to="/featured" className="view-all">Xem tất cả</Link>
                    </div>
                    <div className="courses-grid">
                        {featuredCourses.map(course => renderCourseCard(course))}
                    </div>
                </div>
            </section>
        </div>
    );
}

export default CoursesPage;