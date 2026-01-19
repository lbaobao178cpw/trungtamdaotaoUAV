import React from 'react';
import { useOutletContext } from 'react-router-dom';

function PersonalInfo() {

  const { profile, formatDate } = useOutletContext();
  console.log("PROFILE:", profile);
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
                <span className="info-label">Email</span>
                <span className="info-value">{profile.email || '--'}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Số điện thoại</span>
                <span className="info-value">{profile.phone || '--'}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Giới tính</span>
                <span className="info-value">{profile.gender || '--'}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Mã định danh</span>
                <span className="info-value">{profile.identity_number || '--'}</span>
              </div>

              {/* <div className="info-row">
                <span className="info-label">Sinh nhật</span>
                <span className="info-value">
                  {profile.birth_date ? formatDate(profile.birth_date) : '--'}
                </span>
              </div> */}

              <div className="info-row">
                <span className="info-label">Địa chỉ</span>
                <span className="info-value">{profile.address || '--'}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Hạng</span>
                <span className="info-value">{profile.target_tier || '--'}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Loại UAV</span>
                <span className="info-value">{profile.uav_type || '--'}</span>
              </div>



              <div className="info-row">
                <span className="info-label">Ngày kích hoạt</span>
                <span className="info-value">
                  {profile.created_at ? formatDate(profile.created_at) : '--'}
                </span>
              </div>


            </div>
          </div>

          <div className="info-avatar-wrapper">
            <div className="info-avatar-large">
              {profile.full_name?.charAt(0).toUpperCase()}
            </div>

            <button
              className="btn-edit-profile"
              onClick={() => navigate("/sua-thong-tin")}
            >
              Sửa thông tin
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PersonalInfo;
