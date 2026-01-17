import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import './Heder.css';



const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);

    const [openMenu, setOpenMenu] = useState(false);



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
                        <div className="user-menu">
                            {/* ICON USER */}
                            <div
                                className="user-icon"
                                onClick={() => setOpenMenu(!openMenu)}
                            >
                                <User size={22} color="#0050b8" />
                            </div>

                            {/* DROPDOWN */}
                            {openMenu && (
                                <div className="dropdown-menu">
                                    <Link
                                        to={`/profile/${user.id}`}
                                        className="dropdown-item"
                                        onClick={() => setOpenMenu(false)}
                                    >
                                        Tài khoản
                                    </Link>

                                    <button
                                        className="dropdown-item logout"
                                        onClick={() => {
                                            setOpenMenu(false);
                                            handleLogout();
                                        }}
                                    >
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
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