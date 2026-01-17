import React from 'react';
import { useOutletContext } from 'react-router-dom';

function PersonalInfo() {
  const { profile, formatDate } = useOutletContext();

  return (
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
                <span className="info-value">{profile.department}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Chức vụ</span>
                <span className="info-value">{profile.position || '--'}</span>
              </div>
            </div>
          </div>

          <div className="info-avatar-large">
            {profile.full_name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonalInfo;
