import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiInterceptor';
import { notifySuccess, notifyError, notifyWarning } from '../../lib/notifications';

function PersonalInfo() {

  const { profile, formatDate, setProfile } = useOutletContext();
  const params = useParams();
  const fileInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Hàm helper để format ngày thành YYYY-MM-DD theo local timezone
  const formatDateToInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Kiểm tra date hợp lệ
    if (isNaN(date.getTime())) return '';
    // Lấy theo local timezone để tránh bị lệch ngày
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Hàm helper để parse địa chỉ thành các phần riêng biệt
  const parseAddress = (fullAddress) => {
    if (!fullAddress) return { street: '', wardName: '', cityName: '' };

    const parts = fullAddress.split(',').map(p => p.trim());
    let street = '';
    let wardName = '';
    let cityName = '';

    const streetParts = [];
    for (const part of parts) {
      if (/^(Phường|Xã|Thị trấn)/i.test(part)) {
        wardName = part;
      } else if (/^(Tỉnh|TP\.?|Tp |Thành phố|Quận|Huyện|Thị xã)/i.test(part)) {
        if (!cityName) {
          cityName = part;
        } else {
          cityName = cityName + ', ' + part;
        }
      } else {
        streetParts.push(part);
      }
    }

    street = streetParts.join(', ');
    return { street, wardName, cityName };
  };

  // Parse địa chỉ ban đầu
  const initialParsedAddress = parseAddress(profile.address);

  const [isEditing, setIsEditing] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    birth_date: formatDateToInput(profile.birth_date) || '',
    gender: profile.gender || '',
    address: initialParsedAddress.street || '',
    cityId: '',
    cityName: initialParsedAddress.cityName || '',
    wardId: '',
    wardName: initialParsedAddress.wardName || ''
  });

  // Fetch provinces khi component mount
  useEffect(() => {
    apiClient.get('/location/provinces')
      .then(res => setProvinces(res.data))
      .catch(err => console.error('Lỗi fetch provinces:', err));
  }, []);

  const handleProvinceChange = (e) => {
    const provinceId = e.target.value;
    const province = provinces.find(p => p.id == provinceId);

    setForm(prev => ({
      ...prev,
      cityId: provinceId,
      cityName: province?.name || '',
      wardId: '',
      wardName: '',
    }));

    if (!provinceId) {
      setWards([]);
      return;
    }

    apiClient.get(`/location/wards?province_id=${provinceId}`)
      .then(res => setWards(res.data))
      .catch(console.error);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    const parsed = parseAddress(profile.address);
    setForm({
      full_name: profile.full_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      birth_date: formatDateToInput(profile.birth_date) || '',
      gender: profile.gender || '',
      address: parsed.street || '',
      cityId: '',
      cityName: parsed.cityName || '',
      wardId: '',
      wardName: parsed.wardName || ''
    });
    setWards([]);
  };

  // Handle avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notifyWarning('Chỉ hỗ trợ file ảnh');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      notifyWarning('Kích thước file ảnh tối đa 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      // Dùng apiClient để có request interceptor tự động refresh token
      const res = await apiClient.post(`/users/${params.id}/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = res.data;

      // Cập nhật profile với avatar mới
      if (setProfile) {
        setProfile(prev => ({ ...prev, avatar: data.avatar }));
      }
      notifySuccess('Cập nhật ảnh đại diện thành công!');
    } catch (err) {
      notifyError('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploadingAvatar(false);
      // Reset input để có thể upload lại cùng file
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('user_token');

      // Reconstruct address từ components
      const fullAddress = [
        form.address,
        form.wardName,
        form.cityName,
      ].filter(Boolean).join(', ');

      // Convert birth_date to YYYY-MM-DD format
      let birthDateFormatted = form.birth_date;
      if (form.birth_date) {
        // Nếu có T (ISO format), lấy phần date
        if (form.birth_date.includes('T')) {
          birthDateFormatted = form.birth_date.split('T')[0];
        }
        // Nếu chỉ có YYYY-MM-DD, giữ nguyên
      }

      // Dùng apiClient để có request interceptor tự động refresh token
      const res = await apiClient.put(`/users/${params.id}`, {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        birth_date: birthDateFormatted || null,
        gender: form.gender,
        address: fullAddress
      });

      if (!res.data) {
        throw new Error(res.data?.error || 'Lỗi khi cập nhật');
      }

      // Refetch updated profile
      const profileRes = await apiClient.get(`/users/${params.id}/profile`);
      if (profileRes.data) {
        if (setProfile) setProfile(profileRes.data);
      }

      notifySuccess('Cập nhật thông tin thành công!');
      setIsEditing(false);
    } catch (err) {
      notifyError('Không thể cập nhật thông tin. Vui lòng thử lại.');
    }
  };
  return (
    <>
      <div className="personal-info-container">
        <h2 className="section-title">Thông Tin Cá Nhân</h2>

        <div className="info-card">
          <div className="info-header">
            <div className="info-left">
              <h3 className="info-name">{profile.full_name}</h3>

              <div className="info-grid">


                <div className="info-row">
                  <span className="info-label">Họ tên</span>
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
                  <span className="info-label">Mã định danh</span>
                  <span className="info-value">{profile.identity_number || '--'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Giới tính</span>
                  <span className="info-value">{profile.gender || '--'}</span>
                </div>

                <div className="info-row">
                  <span className="info-label">Ngày sinh</span>
                  <span className="info-value">
                    {profile.birth_date ? formatDate(profile.birth_date) : '--'}
                  </span>
                </div>



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


                {/* <>
                    <div className="info-row">
                      <span className="info-label">Họ tên</span>
                      <span className="info-value">{profile.full_name}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Email</span>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                    </div>

                    <div className="info-row">
                      <span className="info-label">Số điện thoại</span>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                    </div>
                    <div className="info-row">
                      <span className="info-label">Mã định danh</span>
                      <span className="info-value">{profile.identity_number || '--'}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Giới tính</span>
                      <span className="info-value">{profile.gender || '--'}</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Ngày sinh</span>
                      <span className="info-value">
                        {profile.birth_date ? formatDate(profile.birth_date) : '--'}
                      </span>
                    </div>


                    <div className="info-row">
                      <span className="info-label">Địa chỉ</span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          type="text"
                          name="address"
                          value={form.address}
                          onChange={handleChange}
                          className="form-input"
                          placeholder="Số nhà, đường..."
                        />
                        <select
                          value={form.cityId}
                          onChange={handleProvinceChange}
                          className="form-input"
                        >
                          <option value="">
                            {form.cityName && !form.cityId
                              ? `${form.cityName}`
                              : 'Chọn tỉnh/thành '}
                          </option>
                          {provinces.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={form.wardId}
                          onChange={(e) => {
                            const ward = wards.find(w => w.id == e.target.value);
                            setForm(prev => ({
                              ...prev,
                              wardId: ward?.id || '',
                              wardName: ward?.name || '',
                            }));
                          }}
                          className="form-input"
                          disabled={!wards.length && !form.wardName}
                        >
                          <option value="">
                            {form.wardName && !form.wardId
                              ? `${form.wardName}`
                              : 'Chọn xã/phường'}
                          </option>
                          {wards.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
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
                  </>
                )} */}
              </div>

            </div>

            <div className="info-avatar-wrapper">
              {/* Hidden file input for avatar upload */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div
                className="info-avatar-large"
                onClick={handleAvatarClick}
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                title="Nhấn để thay đổi ảnh đại diện"
              >
                {isUploadingAvatar ? (
                  <span style={{ fontSize: '14px' }}>...</span>
                ) : profile.avatar ? (
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
                  profile.full_name?.charAt(0).toUpperCase()
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 0',
                    textAlign: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s'
                  }}
                  className="avatar-overlay"
                >
                  Đổi ảnh
                </div>
              </div>


            </div>

          </div>
        </div>
      </div>
      {/* <div>
        {!isEditing ? (
          <button
            className="btn-edit-profile"
            onClick={() => {
              const parsed = parseAddress(profile.address);
              setForm({
                full_name: profile.full_name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                birth_date: formatDateToInput(profile.birth_date) || '',
                gender: profile.gender || '',
                address: parsed.street || '',
                cityId: '',
                cityName: parsed.cityName || '',
                wardId: '',
                wardName: parsed.wardName || ''
              });
              setIsEditing(true);
            }}
          >
            Chỉnh Sửa Thông Tin Cá Nhân
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-cancel btn-large"
              style={{ flex: 2 }}
              onClick={handleCancel}
            >
              Hủy
            </button>

            <button
              className="btn btn-primary btn-large"
              style={{ flex: 8 }}
              onClick={handleSave}
            >
              Lưu
            </button>
          </div>

        )}
      </div> */}
    </>
  );
}

export default PersonalInfo;
