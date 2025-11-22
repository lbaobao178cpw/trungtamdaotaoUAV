import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header className="header">
            <div className="nav-container">
                {/* Logo */}
                <div className="logo">
                    {/* 2. Đổi a href -> Link to */}
                    <Link to="/"> 
                        <img src="/images/logo_black_on_white.png" alt="UAV Logo" />
                    </Link>
                </div>

                {/* Menu chính */}
                <nav className="nav">
                    <ul className="nav-menu">
                        <li>
                            <Link to="/">Trang chủ</Link>
                        </li>
                        <li>
                            <Link to="/gioi-thieu">Giới thiệu</Link>
                        </li>
                        <li>
                            <Link to="/khoa-hoc">Khóa học</Link>
                        </li>
                        <li>
                            <Link to="/thi-sat-hach">Thi sát hạch</Link>
                        </li>
                        <li>
                            <Link to="/tra-cuu">Tra cứu</Link>
                        </li>
                    </ul>
                </nav>

                {/* Nút đăng nhập / đăng ký */}
                <div className="nav-buttons">
                    <Link to="/dang-nhap" className="btn btn-primary">Đăng nhập</Link>
                    <Link to="/dang-ky" className="btn btn-secondary">Đăng ký</Link>
                </div>
            </div>
        </header>
    );
};

export default Header;