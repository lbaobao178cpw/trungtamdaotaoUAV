import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation, Outlet } from 'react-router-dom';
import { apiClient } from '../../lib/apiInterceptor';
import { notifyWarning, notifyError } from '../../lib/notifications';

import './UserProfile.css';

const API_BASE = "http://localhost:5000/api/users";

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

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const menuItems = [

    { id: 'learning', label: 'Lịch Sử Học tập', path: `/profile/${id}/learning-history` },
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
            <p className="user-id">{profile.email || profile.phone}</p>
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
          {/* <div className="personal-info-container">
            <h2 className="section-title">Thông Tin Cá Nhân</h2>
            
            <div className="info-card">
              <div className="info-header">
                <div className="info-left">
                  <h3 className="info-name">{profile.full_name}</h3>
                  <div className="info-grid">
                    <div className="info-row">
                      <span className="info-label">Tài khoản</span>
                      <span className="info-value">{profile.full_name}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">ID</span>
                      <span className="info-value">{profile.staff_id || '--'}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Giới tính</span>
                      <span className="info-value">{profile.gender || 'Male'}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Sinh nhật</span>
                      <span className="info-value">{formatDate(profile.birthday)}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Ngày kích hoạt</span>
                      <span className="info-value">{formatDate(profile.onboarding_date)}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Bộ phận</span>
                      <span className="info-value">{profile.department || 'ASC-漆器-Roboboss'}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Bộ phận (bán thời gian) </span>
                      <span className="info-value">{profile.part_time_department || '--'}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Chức vụ</span>
                      <span className="info-value">{profile.position || '--'}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Bộ sưu tập</span>
                      <span className="info-value">
                        <button className="btn-uncollected">Uncollected</button>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="info-avatar-large">
                  {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          </div> */}
          <main className="profile-main">
            <Outlet context={{ profile, formatDate, setProfile }} />
          </main>

        </main>
      </div>
    </div>
  );
}

export default UserProfile;
