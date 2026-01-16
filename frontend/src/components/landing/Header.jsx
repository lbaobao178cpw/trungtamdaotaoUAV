import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const checkLoginStatus = () => {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');

            if (token && userData) {
                try {
                    setUser(JSON.parse(userData));
                } catch (e) {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        };

        checkLoginStatus();
    }, [location]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        setUser(null);
        navigate('/dang-nhap');
    };

    return (
        <header className="header">
            <div className="nav-container">
                {/* Logo */}
                <div className="logo">
                    <Link to="/">
                        {/* [THEME] Đổi sang logo trắng để nổi trên nền đen */}
                        <img
                            src="/images/logo_black_on_white.png"
                            alt="UAV Logo"
                            onError={(e) => {
                                // Fallback nếu không có ảnh trắng: Dùng ảnh đen nhưng invert màu
                                e.target.onerror = null;
                                e.target.src = "/images/logo_black_on_white.png";
                                e.target.style.filter = "invert(1) brightness(100%)";
                            }}
                        />
                    </Link>
                </div>

                {/* Menu chính */}
                <nav className="nav">
                    <ul className="nav-menu">
                        <li><Link to="/">Trang chủ</Link></li>
                        <li><Link to="/gioi-thieu">Giới thiệu</Link></li>
                        <li><Link to="/khoa-hoc">Khóa học</Link></li>
                        <li><Link to="/thi-sat-hach">Thi sát hạch</Link></li>
                        <li><Link to="/tra-cuu">Tra cứu</Link></li>
                    </ul>
                </nav>

                {/* Khu vực nút bấm bên phải */}
                <div className="nav-buttons">
                    {user ? (
                        // === NẾU ĐÃ ĐĂNG NHẬP ===
                        <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {/* [THEME] Sửa màu chữ User thành trắng/vàng */}
                            <Link 
                                to={`/profile/${user.id}`} 
                                className="user-info" 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    color: '#000000', 
                                    fontWeight: '500',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                    transition: 'color 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#0050b8'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
                            >
                                <User size={20} color="#0050b8" /> {/* Icon màu vàng */}
                                <span>Xin chào, {user.full_name || user.phone || 'Học viên'}</span>
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    border: '1px solid #dc3545',
                                    color: '#fff', // Chữ trắng
                                    background: '#dc3545', // Nền đỏ
                                    padding: '8px 16px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                <LogOut size={16} />
                                Đăng xuất
                            </button>
                        </div>
                    ) : (
                        // === NẾU CHƯA ĐĂNG NHẬP ===
                        <>
                            <Link to="/dang-nhap" className="btn-register">Đăng nhập</Link>
                            <Link to="/dang-ky" className="btn-register">Đăng ký</Link>


                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;