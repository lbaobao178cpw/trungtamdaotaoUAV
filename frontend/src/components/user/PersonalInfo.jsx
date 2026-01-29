import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiInterceptor';
import { notifySuccess, notifyError, notifyWarning } from '../../lib/notifications';
import { API_ENDPOINTS } from '../../config/apiConfig';

function PersonalInfo() {

  const { profile, formatDate, setProfile } = useOutletContext();
  const params = useParams();
  const fileInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(profile?.is_approved);
  const [tierBServices, setTierBServices] = useState([]);

  // Fetch tier B services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await apiClient.get(`${API_ENDPOINTS.BASE_URL}/nghiep-vu-hang-b`);
        setTierBServices(res.data || []);
      } catch (err) {
        console.error('Error fetching tier B services:', err);
      }
    };
    fetchServices();
  }, []);

  // Kiểm tra status phê duyệt từ localStorage hoặc fetch lại từ server
  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        // Kiểm tra trước từ localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData.is_approved) {
            setApprovalStatus(true);
            if (setProfile) {
              setProfile(prev => ({ ...prev, is_approved: true }));
            }
            return;
          }
        }

        // Nếu chưa approved, fetch từ server để kiểm tra có được phê duyệt chưa
        const res = await apiClient.get(`/users/${params.id}/profile`);
        if (res.data?.is_approved) {
          setApprovalStatus(true);
          if (setProfile) {
            setProfile(prev => ({ ...prev, is_approved: true }));
          }
          // Cập nhật localStorage nếu đã được phê duyệt
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            userData.is_approved = true;
            localStorage.setItem('user', JSON.stringify(userData));
          }
        }
      } catch (err) {
        // Ignore errors, use cached approval status
      }
    };

    // Kiểm tra lần đầu khi component mount
    if (!profile?.is_approved) {
      checkApprovalStatus();
    } else {
      setApprovalStatus(true);
    }
  }, [params.id, profile?.is_approved, setProfile]);

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

  const normalizeGenderForStorage = (g) => {
    if (!g) return null;
    const s = String(g).trim();
    if (!s) return null;
    const lowered = s.toLowerCase();
    const stripped = lowered.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['nam', 'n', 'male', 'm'].includes(stripped)) return 'Nam';
    if (['nu', 'nu', 'female', 'f'].includes(stripped) || stripped === 'nu') return 'Nữ';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

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

  // Hàm riêng để kiểm tra trạng thái phê duyệt từ server
  const refreshApprovalStatus = async () => {
    try {
      const res = await apiClient.get(`/users/${params.id}/profile`);
      // Check nếu is_approved = 1 (number) hoặc true (boolean)
      const isApproved = res.data?.is_approved == 1;
      
      if (isApproved) {
        setApprovalStatus(true);
        if (setProfile) {
          setProfile(prev => ({ ...prev, is_approved: true }));
        }
        // Cập nhật localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userData.is_approved = true;
          localStorage.setItem('user', JSON.stringify(userData));
        }
      }
      return isApproved;
    } catch (err) {
      console.error('Error checking approval status:', err);
      return approvalStatus || profile?.is_approved;
    }
  };

  // Handle avatar upload
  const handleAvatarClick = async () => {
    // Kiểm tra lại từ server trước
    const isApproved = await refreshApprovalStatus();
    
    if (!isApproved) {
      notifyWarning('Tài khoản của bạn chưa được phê duyệt. Vui lòng chờ admin phê duyệt để sử dụng tính năng này.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra lại từ server trước khi upload
    const isApproved = await refreshApprovalStatus();
    
    if (!isApproved) {
      notifyWarning('Tài khoản của bạn chưa được phê duyệt. Vui lòng chờ admin phê duyệt để sử dụng tính năng này.');
      return;
    }

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
        gender: normalizeGenderForStorage(form.gender),
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
                  <span className="info-label">Ngày kích hoạt</span>
                  <span className="info-value">
                    {profile.created_at ? formatDate(profile.created_at) : '--'}
                  </span>
                </div>

                {profile.tier_b_services && (
                  <div className="info-row">
                    <span className="info-label">Nghiệp vụ đã đăng kí</span>
                    <span className="info-value">
                      {(() => {
                        try {
                          const serviceIds = typeof profile.tier_b_services === 'string'
                            ? JSON.parse(profile.tier_b_services)
                            : Array.isArray(profile.tier_b_services)
                              ? profile.tier_b_services
                              : [];
                          
                          if (!serviceIds.length) return '--';
                          
                          const serviceNames = serviceIds
                            .map(id => tierBServices.find(s => s.id === id)?.title || `ID: ${id}`)
                            .join(', ');
                          
                          return serviceNames || '--';
                        } catch (err) {
                          return '--';
                        }
                      })()}
                    </span>
                  </div>
                )}
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
</>
  );
}

export default PersonalInfo;
