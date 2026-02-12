import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation, Outlet } from 'react-router-dom';
import { apiClient } from '../../lib/apiInterceptor';
import { notifyWarning, notifyError } from '../../lib/notifications';
import { API_ENDPOINTS } from '../../config/apiConfig';

import './UserProfile.css';
import formatDateDDMM from '../../lib/formatDate';

const API_BASE = API_ENDPOINTS.USERS;

function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [location.pathname]);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('user_token'));
  const [currentUser, setCurrentUser] = useState(null);

  // Kiểm tra user từ localStorage khi component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
      } catch (error) {
        navigate('/dang-nhap');
      }
    } else {
      navigate('/dang-nhap');
    }
  }, [navigate]);

  // Kiểm tra ID khớp và fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Kiểm tra user đã login chưa
        if (!currentUser) {
          notifyWarning('Vui lòng đăng nhập');
          navigate('/dang-nhap');
          return;
        }

        // Kiểm tra ID trong URL có khớp với ID từ token không
        if (String(currentUser.id) !== String(id)) {
          notifyWarning('Bạn không có quyền xem profile này');
          navigate(`/profile/${currentUser.id}`);
          return;
        }

        setLoading(true);
        const res = await apiClient.get(`/users/${id}/profile`);
        const data = res.data;
        
        // Kiểm tra nếu bị khóa (is_active = 0/false)
        const isActive = data.is_active == 1;
        if (!isActive) {
          notifyWarning('Tài khoản của bạn đã bị khóa');
          localStorage.removeItem('user_token');
          localStorage.removeItem('user');
          navigate('/dang-nhap');
          return;
        }
        
        // Kiểm tra nếu hủy phê duyệt (is_approved = 0/false)
        const isApproved = data.is_approved == 1;
        if (!isApproved) {
          notifyWarning('Tài khoản của bạn bị hủy phê duyệt');
          localStorage.removeItem('user_token');
          localStorage.removeItem('user');
          navigate('/dang-nhap');
          return;
        }
        
        setProfile(data);
      } catch (err) {
        if (err.response?.status === 401) {
          notifyWarning('Vui lòng đăng nhập');
          navigate('/dang-nhap');
          return;
        }
        notifyError('Không thể tải thông tin người dùng');
      } finally {
        setLoading(false);
      }
    };

    if (id && currentUser && token) {
      fetchProfile();
    }
  }, [id, token, navigate, currentUser]);

  const formatDate = (dateString) => formatDateDDMM(dateString);

  const menuItems = [

    { id: 'learning', label: 'Lịch Sử Học tập', path: `/profile/${id}/learning-history` },
    { id: 'examHistory', label: 'Lịch thi đã đăng kí', path: `/profile/${id}/exam-history` },
    { id: 'comments', label: 'Bình Luận', path: `/profile/${id}/comments` },
    { id: 'personal', label: 'Thông Tin Cá Nhân', path: `/profile/${id}` },
    { id: 'changePassword', label: 'Đổi mật khẩu', path: `/profile/${id}/doi-mat-khau` }
  ];

  const isMenuActive = (path) => location.pathname === path;

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">Đang tải...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="loading-container">Không tìm thấy người dùng</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* SIDEBAR */}
        <aside className="profile-sidebar">
          {/* User Card */}
          <div className="user-card">
            <div className="user-avatar">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%'
                  }}
                />
              ) : (
                profile.full_name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <h3 className="user-name">{profile.full_name}</h3>
            {/* <p className="user-id">{profile.email || profile.phone}</p> */}
          </div>

          {/* Menu */}
          <nav className="sidebar-menu">
            {menuItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                className={`menu-item ${isMenuActive(item.path) ? 'active' : ''}`}
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="profile-main">
          
          <main className="profile-main">
            <Outlet context={{ profile, formatDate, setProfile }} />
          </main>

        </main>
      </div>
    </div>
  );
}

export default UserProfile;
