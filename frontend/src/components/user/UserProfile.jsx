import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import './UserProfile.css';

const API_BASE = "http://localhost:5000/api/users";

function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE}/${id}/profile`, { headers });

        if (!res.ok) {
          if (res.status === 401) {
            alert('Vui lòng đăng nhập');
            navigate('/dang-nhap');
            return;
          }
          throw new Error('Lỗi tải profile');
        }

        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error('Lỗi fetch profile:', err);
        alert('Không thể tải thông tin người dùng');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id, token, navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const menuItems = [

    { id: 'learning', label: 'Lịch Sử Học tập', path: `/profile/${id}/learning-history` },

    { id: 'comments', label: 'Bình Luận', path: `/profile/${id}/comments` },
    { id: 'personal', label: 'Thông Tin Cá Nhân', path: `/profile/${id}` },

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
              {profile.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h3 className="user-name">{profile.full_name}</h3>
            <p className="user-id">{profile.email || profile.phone}</p>
            <div className="user-buttons">
              <Link to={`/profile/${id}`} className="btn-home">Trang chủ</Link>
              <Link to={`/profile/${id}/profile`} className="btn-profile">My Profile</Link>
            </div>
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
          <div className="personal-info-container">
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
          </div>
        </main>
      </div>
    </div>
  );
}

export default UserProfile;
