import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Edit, Trash2, RefreshCw, Plus, Save, X, CheckCircle2, AlertCircle,
  Mail, Phone, Shield, UserCircle, MapPin, Calendar, CreditCard, Award, Search
} from "lucide-react";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { API_ENDPOINTS, MESSAGES, VALIDATION } from "../../constants/api";
import { notifySuccess, notifyError } from "../../lib/notifications";
import "./UserManager.css";

const initialUserState = {
  id: "", full_name: "", email: "", phone: "", role: "student", is_active: true, is_approved: false, password: "", avatar: "", failed_login_attempts: 0,
  // Các trường profile (chỉ để hiển thị hoặc update sau này)
  identity_number: "", address: "", birth_date: "", gender: "", target_tier: "",
  job_title: "", work_place: "", current_address: "", permanent_address: "",
  permanent_city_id: "", permanent_ward_id: "", current_city_id: "", current_ward_id: "",
  emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "",
  usage_purpose: "", operation_area: "", uav_experience: "",
  identity_image_front: "", identity_image_back: "",
};

export default function UserManager() {
  const [form, setForm] = useState(initialUserState);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalFilter, setApprovalFilter] = useState('all'); // 'all' | 'approved' | 'pending'

  // State để mở rộng xem chi tiết
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [addressMode, setAddressMode] = useState('other'); // 'select' or 'other'
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageAlt, setSelectedImageAlt] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [permanentWards, setPermanentWards] = useState([]);
  const [currentWards, setCurrentWards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedPermanentCity, setSelectedPermanentCity] = useState('');
  const [selectedPermanentWard, setSelectedPermanentWard] = useState('');
  const [selectedCurrentCity, setSelectedCurrentCity] = useState('');
  const [selectedCurrentWard, setSelectedCurrentWard] = useState('');
  const [street, setStreet] = useState('');
  const [errors, setErrors] = useState({});

  // === State cho điểm số ===
  const [userScores, setUserScores] = useState({});
  const [loadingScores, setLoadingScores] = useState({});

  // === State cho Tier B Services ===
  const [tierBServices, setTierBServices] = useState([]);

  // === FETCH USERS WITH CUSTOM HOOK ===
  const { data: usersData, loading, refetch: refreshUsers } = useApi(API_ENDPOINTS.USERS);
  const allUsers = useMemo(() => Array.isArray(usersData) ? usersData : [], [usersData]);

  const users = useMemo(() => {
    return allUsers.filter(user => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        user.full_name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.phone?.toLowerCase().includes(search) ||
        String(user.id).includes(search)
      );

      const isApproved = (String(user.is_approved) === '1' || user.is_approved === true);
      if (approvalFilter === 'approved' && !isApproved) return false;
      if (approvalFilter === 'pending' && isApproved) return false;

      return matchesSearch;
    });
  }, [allUsers, searchTerm, approvalFilter]);

  const { mutate: saveUser } = useApiMutation();

  // === Fetch điểm số của user khi expand ===
  const fetchUserScores = async (userId) => {
    if (userScores[userId] || loadingScores[userId]) return;

    setLoadingScores(prev => ({ ...prev, [userId]: true }));
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_ENDPOINTS.USERS}/${userId}/scores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserScores(prev => ({ ...prev, [userId]: data }));
      }
    } catch (error) {
      console.error('Lỗi lấy điểm số:', error);
    } finally {
      setLoadingScores(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAddNew = useCallback(() => {
    setForm(initialUserState);
    setIsEditing(false);
    setShowDetails(false);
    setAddressMode('other');
    setSelectedProvince('');
    setSelectedWard('');
    setStreet('');
    setSelectedPermanentCity('');
    setSelectedPermanentWard('');
    setSelectedCurrentCity('');
    setSelectedCurrentWard('');
    setPermanentWards([]);
    setCurrentWards([]);
    setErrors({}); // Reset errors
  }, []);

  const handleEditClick = (user) => {
    // Convert stored birth_date to input-friendly YYYY-MM-DD
    const formatBirthForInput = (d) => {
      if (!d) return '';
      try {
        // If already ISO-like, normalize
        const isoMatch = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

        // Detect DD/MM/YYYY or DD-MM-YYYY
        const dmMatch = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmMatch) {
          const dd = dmMatch[1].padStart(2, '0');
          const mm = dmMatch[2].padStart(2, '0');
          const yyyy = dmMatch[3];
          return `${yyyy}-${mm}-${dd}`;
        }

        // Fallback to Date parse
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) {
          const yyyy = parsed.getFullYear();
          const mm = String(parsed.getMonth() + 1).padStart(2, '0');
          const dd = String(parsed.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      } catch (e) {
        // ignore
      }
      return '';
    };

    setForm({
      ...user,
      is_active: user.is_active !== 0 && user.is_active !== '0' && user.is_active !== false,
      is_approved: user.is_approved !== 0 && user.is_approved !== '0' && user.is_approved !== false,
      password: "",
      gender: normalizeGender(user.gender),
      birth_date: formatBirthForInput(user.birth_date),
      // keep original address in form so it's available if needed
      address: user.address || '',
      job_title: user.job_title || '',
      work_place: user.work_place || '',
      current_address: user.current_address || '',
      permanent_address: user.permanent_address || '',
      permanent_city_id: user.permanent_city_id || '',
      permanent_ward_id: user.permanent_ward_id || '',
      current_city_id: user.current_city_id || '',
      current_ward_id: user.current_ward_id || '',
      emergency_contact_name: user.emergency_contact_name || '',
      emergency_contact_phone: user.emergency_contact_phone || '',
      emergency_contact_relation: user.emergency_contact_relation || '',
      usage_purpose: user.usage_purpose || '',
      operation_area: user.operation_area || '',
      uav_experience: user.uav_experience || '',
      identity_image_front: user.identity_image_front || '',
      identity_image_back: user.identity_image_back || '',
      avatar: user.avatar || ''
    });
    // Validate fields on load
    setErrors(prev => ({
      ...prev,
      identity_number: form.identity_number && form.identity_number.length !== 12 ? 'CCCD phải có đúng 12 số' : '',
      phone: form.phone && form.phone.length !== 10 ? 'Số điện thoại phải có đúng 10 số' : ''
    }));
    // Immediately populate street and form.address so user sees existing address right away
    setStreet(user.address || '');
    setForm(prev => ({ ...prev, address: user.address || '' }));
    // Set location selects for permanent address
    if (user.permanent_city_id) {
      (async () => {
        const base = getApiBase();
        if (!base) return;
        const url = `${base}/api/location/wards?province_id=${user.permanent_city_id}`;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setPermanentWards(data || []);
          }
        } catch (e) {
          console.error('Error loading permanent wards:', e);
        }
      })();
    }

    // Set location selects for current address
    if (user.current_city_id) {
      (async () => {
        const base = getApiBase();
        if (!base) return;
        const url = `${base}/api/location/wards?province_id=${user.current_city_id}`;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setCurrentWards(data || []);
          }
        } catch (e) {
          console.error('Error loading current wards:', e);
        }
      })();
    }
    setIsEditing(true);
    // Cuộn lên đầu form
    document.querySelector('.admin-content-wrapper')?.scrollTo(0, 0);
  };

  // Normalize various stored gender values into select-friendly values
  const normalizeGender = (g) => {
    if (!g) return '';
    const s = String(g).toLowerCase();
    if (s === 'nam') return 'nam';
    if (s === 'nữ' || s === 'nu') return 'nữ';
    return '';
  };

  const displayGender = (g) => {
    if (!g) return '--';
    const s = String(g).toLowerCase();
    if (s === 'nam') return 'Nam';
    if (s === 'nữ' || s === 'nu') return 'Nữ';
    return '--';
  };

  // Normalize gender value to storage format ('Nam'/'Nữ')
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

  // location helpers
  const getApiBase = () => {
    // Check both VITE_API_BASE_URL and VITE_API_BASE
    const envBase = (typeof import.meta !== 'undefined' && import.meta.env) 
      ? (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE)
      : null;
    
    if (envBase) {
      return envBase.replace(/\/api\/?$/, ''); // Remove /api suffix if present
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `${window.location.protocol}//localhost:5000`;
    }
    console.warn('⚠️ VITE_API_BASE_URL or VITE_API_BASE not set!');
    return null;
  };

  const fetchProvinces = async () => {
    try {
      const base = getApiBase();
      if (!base) {
        console.error('❌ API base URL not configured');
        return [];
      }
      const url = `${base}/api/location/provinces`;
      console.log('📋 Fetching provinces from:', url);
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        console.error('❌ fetchProvinces bad status', res.status, url);
        return [];
      }
      const data = await res.json();
      console.log('✅ Provinces loaded:', data?.length || 0);
      setProvinces(data || []);
      return data || [];
    } catch (e) {
      console.error('❌ fetchProvinces error:', e);
      return [];
    }
  };

  const fetchWards = async (provinceId) => {
    try {
      if (!provinceId) {
        setWards([]);
        return [];
      }
      const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
        ? import.meta.env.VITE_API_BASE
        : `${window.location.protocol}//${window.location.hostname}:5000`;
      const url = `${base}/api/location/wards?province_id=${provinceId}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error('fetchWards bad status', res.status, url);
        setWards([]);
        return [];
      }
      const data = await res.json();
      setWards(data || []);
      return data || [];
    } catch (e) {
      console.error('fetchWards', e);
      setWards([]);
      return [];
    }
  };

  const applySelectedAddress = (provId = selectedProvince, wardId = selectedWard, st = street) => {
    const prov = provinces.find(p => String(p.id) === String(provId));
    const ward = wards.find(w => String(w.id) === String(wardId));
    let composed = '';
    if (st) composed += st + ', ';
    if (ward) composed += ward.name + ', ';
    if (prov) composed += prov.name;
    if (composed) setForm(prev => ({ ...prev, address: composed }));
  };

  // Handler for permanent city (tỉnh hộ khẩu) selection
  const handlePermanentCityChange = (e) => {
    const provinceId = e.target.value;
    setForm(prev => ({ ...prev, permanent_city_id: provinceId }));
    setSelectedPermanentWard('');
  };

  // Handler for permanent ward (phường hộ khẩu) selection
  const handlePermanentWardChange = (e) => {
    const wardId = e.target.value;
    setForm(prev => ({ ...prev, permanent_ward_id: wardId }));
  };

  // Handler for current city (tỉnh hiện tại) selection
  const handleCurrentCityChange = (e) => {
    const provinceId = e.target.value;
    setForm(prev => ({ ...prev, current_city_id: provinceId }));
    setSelectedCurrentWard('');
  };

  // Handler for current ward (phường hiện tại) selection
  const handleCurrentWardChange = (e) => {
    const wardId = e.target.value;
    setForm(prev => ({ ...prev, current_ward_id: wardId }));
  };

  // Load provinces on component mount
  useEffect(() => {
    fetchProvinces();
    // Fetch tier B services
    const fetchTierBServices = async () => {
      try {
        const base = getApiBase();
        if (!base) return;
        const res = await fetch(`${base}/api/nghiep-vu-hang-b`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setTierBServices(data);
        }
      } catch (error) {
        console.error('Error loading Tier B services:', error);
      }
    };
    fetchTierBServices();
  }, []);

  // Load wards when permanent city changes
  useEffect(() => {
    if (form.permanent_city_id) {
      (async () => {
        await fetchWards(form.permanent_city_id);
      })();
    } else {
      setPermanentWards([]);
      setSelectedPermanentWard('');
    }
  }, [form.permanent_city_id]);

  // Load wards when current city changes
  useEffect(() => {
    if (form.current_city_id) {
      (async () => {
        const base = getApiBase();
        if (!base) return;
        const url = `${base}/api/location/wards?province_id=${form.current_city_id}`;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setCurrentWards(data || []);
          }
        } catch (e) {
          console.error('fetchCurrentWards', e);
        }
      })();
    } else {
      setCurrentWards([]);
      setSelectedCurrentWard('');
    }
  }, [form.current_city_id]);

  const handleSave = async (e) => {
    e.preventDefault();
    // Check for validation errors
    if (errors.identity_number || errors.phone) {
      notifyError('Vui lòng sửa các lỗi trong form trước khi lưu.');
      return;
    }
    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${API_ENDPOINTS.USERS}/${form.id}` : API_ENDPOINTS.USERS;
      const payload = { ...form, is_active: form.is_active };
      
      // If unlocking an account (is_active changed from false to true), reset failed attempts
      if (isEditing && users.length > 0) {
        const originalUser = users.find(u => u.id === form.id);
        if (originalUser && !originalUser.is_active && form.is_active) {
          payload.failed_login_attempts = 0;
        }
      }
      
      // ensure gender is stored in canonical capitalized form
      if (payload.gender) payload.gender = normalizeGenderForStorage(payload.gender);
      // remove deprecated uav_types from payload
      if (payload.uav_types) delete payload.uav_types;

      await saveUser({
        url: url,
        method: method,
        data: payload,
      });

      const successMsg = `${isEditing ? "Cập nhật" : "Tạo mới"} thành công!`;
      notifySuccess(successMsg);
      if (!isEditing) handleAddNew();
      refreshUsers();
    } catch (error) {
      notifyError(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa người dùng này sẽ xóa toàn bộ dữ liệu liên quan. Tiếp tục?")) return;
    try {
      await saveUser({
        url: `${API_ENDPOINTS.USERS}/${id}`,
        method: "DELETE",
      });
      notifySuccess("Đã xóa thành công!");
      refreshUsers();
    } catch (error) {
      notifyError("Lỗi khi xóa");
    }
  };

  const handleApprove = async (userId, isApproved) => {
    // Only allow approving; do nothing if already approved
    if (isApproved) return;
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_ENDPOINTS.USERS}/${userId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_approved: true })
      });
      
      if (response.ok) {
        notifySuccess('Phê duyệt thành công!');
        refreshUsers();
      } else {
        notifyError('Lỗi phê duyệt người dùng');
      }
    } catch (error) {
      notifyError('Lỗi khi phê duyệt: ' + error.message);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin": return "#dc3545";
      case "instructor": return "#0066cc";
      default: return "#28a745";
    }
  };

  const toggleExpand = (id) => {
    if (expandedUserId === id) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(id);
      // Fetch điểm số khi mở rộng
      fetchUserScores(id);
    }
  };

  // Helper function để lấy màu điểm
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="solution-manager-container">

      {/* PANEL 1: FORM (Giữ nguyên, chỉ thêm validate) */}
      <div className="panel flex-1 fit-content">
        <div className="panel-header">
          <span className="flex-center gap-8">
            {isEditing ? <Edit size={18} /> : <Plus size={18} />}
            {isEditing ? `Sửa #${form.id}` : "Thêm Mới"}
          </span>
          {isEditing && <button onClick={handleAddNew} className="btn btn-sm btn-secondary"><X size={14} /> Hủy</button>}
        </div>

        <div className="form-section">
          <form onSubmit={handleSave}>
            <div className="form-group"><label className="form-label">Họ và tên</label><input className="form-control" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">SĐT (Tài khoản)</label><input type="tel" className="form-control" value={form.phone} onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setForm({ ...form, phone: value });
              if (value.length !== 10) {
                setErrors(prev => ({ ...prev, phone: 'Số điện thoại phải có đúng 10 số' }));
              } else {
                setErrors(prev => ({ ...prev, phone: '' }));
              }
            }} required />
            {errors.phone && <small style={{ color: 'red', fontSize: '12px' }}>{errors.phone}</small>}</div>
            {!isEditing && <div className="form-group"><label className="form-label">Mật khẩu</label><input className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mặc định: 123456" /></div>}

            <div className="flex-gap-10">
              <div className="form-group flex-1"><label className="form-label">Vai trò</label><select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="student">Học viên</option><option value="admin">Admin</option><option value="instructor">Giảng viên</option></select></div>
              <div className="form-group flex-1"><label className="form-label">Trạng thái</label><select className="form-control" value={form.is_active ? "active" : "locked"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "active" })}><option value="active">Hoạt động</option><option value="locked">Khóa</option></select></div>
            </div>

            <div className="mt-12 flex-space-between">
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowDetails(s => !s)} style={{ padding: '6px 10px' }}>
                {showDetails ? 'Ẩn chi tiết' : 'Xem chi tiết hồ sơ'}
              </button>
              <small className="text-muted">Bạn đang {isEditing ? `chỉnh sửa #${form.id}` : 'tạo người dùng mới'}</small>
            </div>

            {showDetails && (
              <div className="user-details-section">
                <div className="grid-2-cols">
                  <div className="form-group"><label className="form-label">CCCD</label><input className="form-control" value={form.identity_number || ''} onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setForm({ ...form, identity_number: value });
                    if (value.length !== 12) {
                      setErrors(prev => ({ ...prev, identity_number: 'CCCD phải có đúng 12 số' }));
                    } else {
                      setErrors(prev => ({ ...prev, identity_number: '' }));
                    }
                  }} placeholder="Số định danh (12 số)" />
                  {errors.identity_number && <small style={{ color: 'red', fontSize: '12px' }}>{errors.identity_number}</small>}</div>
                  <div className="form-group"><label className="form-label">Ngày sinh</label><input type="date" className="form-control" value={form.birth_date || ''} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>

                  <div className="form-group"><label className="form-label">Giới tính</label>
                    <select className="form-control" value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="">Chọn</option>
                      <option value="nam">Nam</option>
                      <option value="nữ">Nữ</option>
                    </select>
                  </div>

                  <div className="form-group"><label className="form-label">Hạng</label>
                    <select className="form-control" value={form.target_tier || ''} onChange={(e) => setForm({ ...form, target_tier: e.target.value })}>
                      <option value="">Chưa chọn</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </select>
                  </div>

                  <div className="form-group"><label className="form-label">Nghề nghiệp</label><input className="form-control" value={form.job_title || ''} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="Nhập nghề nghiệp" /></div>
                  <div className="form-group"><label className="form-label">Nơi làm việc</label><input className="form-control" value={form.work_place || ''} onChange={(e) => setForm({ ...form, work_place: e.target.value })} placeholder="Nhập nơi làm việc" /></div>

                  <div className="form-group"><label className="form-label">Tên liên hệ khẩn</label><input className="form-control" value={form.emergency_contact_name || ''} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} placeholder="Tên" /></div>
                  <div className="form-group"><label className="form-label">SĐT liên hệ khẩn</label><input className="form-control" value={form.emergency_contact_phone || ''} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} placeholder="SĐT" /></div>
                  <div className="form-group"><label className="form-label">Mối quan hệ</label><input className="form-control" value={form.emergency_contact_relation || ''} onChange={(e) => setForm({ ...form, emergency_contact_relation: e.target.value })} placeholder="Quan hệ" /></div>

                  <div className="form-group"><label className="form-label">Mục đích sử dụng</label><input className="form-control" value={form.usage_purpose || ''} onChange={(e) => setForm({ ...form, usage_purpose: e.target.value })} placeholder="Mục đích" /></div>
                  <div className="form-group"><label className="form-label">Khu vực hoạt động</label>
                    <select className="form-control" value={form.operation_area || ''} onChange={(e) => setForm({ ...form, operation_area: e.target.value })}>
                      <option value="">-- Chọn khu vực --</option>
                      <option value="hanoi">Hà Nội & Miền Bắc</option>
                      <option value="danang">Đà Nẵng & Miền Trung</option>
                      <option value="hcm">TP.HCM & Miền Nam</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Kinh nghiệm</label>
                    <select className="form-control" value={form.uav_experience || ''} onChange={(e) => setForm({ ...form, uav_experience: e.target.value })}>
                      <option value="">-- Chọn kinh nghiệm --</option>
                      <option value="Chưa có kinh nghiệm">Chưa có kinh nghiệm</option>
                      <option value="Dưới 6 tháng">Dưới 6 tháng</option>
                      <option value="6-12 tháng">6-12 tháng</option>
                      <option value="1-3 năm">1-3 năm</option>
                      <option value="Trên 3 năm">Trên 3 năm</option>
                    </select>
                  </div>

                  {(form.identity_image_front || form.identity_image_back) && (
                    <div className="grid-span-2 grid-2-cols">
                      {form.identity_image_front && (
                        <div className="form-group margin-0">
                          <label className="form-label">CCCD Mặt Trước</label>
                          <img 
                            src={form.identity_image_front} 
                            alt="CCCD Front" 
                            style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', border: '1px solid #e5e7eb', cursor: 'pointer' }} 
                            onClick={() => { setSelectedImage(form.identity_image_front); setSelectedImageAlt('CCCD Mặt Trước'); setShowImageModal(true); }}
                          />
                        </div>
                      )}
                      {form.identity_image_back && (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">CCCD Mặt Sau</label>
                          <img 
                            src={form.identity_image_back} 
                            alt="CCCD Back" 
                            style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', border: '1px solid #e5e7eb', cursor: 'pointer' }} 
                            onClick={() => { setSelectedImage(form.identity_image_back); setSelectedImageAlt('CCCD Mặt Sau'); setShowImageModal(true); }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Địa chỉ hộ khẩu section */}
                  <div className="address-section">
                    <h4 className="section-title-small">Địa chỉ hộ khẩu</h4>
                    <div className="address-grid">
                      <div className="form-group">
                        <label className="form-label">Tỉnh/Thành phố</label>
                        <select 
                          className="form-control" 
                          value={form.permanent_city_id || ''} 
                          onChange={handlePermanentCityChange}
                        >
                          <option value="">-- Chọn Tỉnh/Thành --</option>
                          {provinces.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phường/Xã</label>
                        <select 
                          className="form-control" 
                          value={form.permanent_ward_id || ''} 
                          onChange={handlePermanentWardChange}
                          disabled={!form.permanent_city_id}
                        >
                          <option value="">-- Chọn Phường/Xã --</option>
                          {permanentWards.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-group mt-12">
                      <label className="form-label">Địa chỉ cụ thể</label>
                      <textarea 
                        className="form-control" 
                        rows={2} 
                        value={form.permanent_address || ''} 
                        onChange={(e) => setForm({ ...form, permanent_address: e.target.value })} 
                        placeholder="Số nhà, đường..." 
                      />
                    </div>
                  </div>

                  {/* Địa chỉ hiện tại section */}
                  <div className="address-section">
                    <h4 className="section-title-small">Địa chỉ hiện tại</h4>
                    <div className="address-grid">
                      <div className="form-group">
                        <label className="form-label">Tỉnh/Thành phố</label>
                        <select 
                          className="form-control" 
                          value={form.current_city_id || ''} 
                          onChange={handleCurrentCityChange}
                        >
                          <option value="">-- Chọn Tỉnh/Thành --</option>
                          {provinces.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phường/Xã</label>
                        <select 
                          className="form-control" 
                          value={form.current_ward_id || ''} 
                          onChange={handleCurrentWardChange}
                          disabled={!form.current_city_id}
                        >
                          <option value="">-- Chọn Phường/Xã --</option>
                          {currentWards.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-group mt-12">
                      <label className="form-label">Địa chỉ cụ thể</label>
                      <textarea 
                        className="form-control" 
                        rows={2} 
                        value={form.current_address || ''} 
                        onChange={(e) => setForm({ ...form, current_address: e.target.value })} 
                        placeholder="Số nhà, đường..." 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block mt-20 flex-center gap-8" disabled={loading}>
              {loading ? <RefreshCw className="spin" size={18} /> : <Save size={18} />} Lưu thông tin
            </button>
          </form>
        </div>
      </div>

      {/* PANEL 2: DANH SÁCH CHI TIẾT */}
      <div className="panel flex-1-8">
        <div className="panel-header justify-between">
          <span className="flex-center gap-8"><Users size={18} /> Danh sách ({users.length})</span>
          <button className="btn btn-success btn-sm" onClick={refreshUsers}><RefreshCw size={14} /> Làm mới</button>
        </div>

        <div className="user-search-section">
          <div className="search-input-wrapper">
            <Search size={18} color="#999" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email, SĐT, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              onFocus={(e) => e.target.style.borderColor = "#0066cc"}
              onBlur={(e) => e.target.style.borderColor = "#ddd"}
            />
          </div>

          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tất cả</option>
            <option value="approved">Đã duyệt</option>
            <option value="pending">Chờ duyệt</option>
          </select>
        </div>

        <div className="list-group">
          {users.map((user) => {
            const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
            return (
              <div key={user.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', padding: "15px" }}>

                {/* Header của User Card */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ minWidth: "50px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.full_name} 
                        style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", border: "2px solid #cce3ff", flexShrink: 0 }} 
                      />
                    ) : (
                      <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#0066cc", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "18px", flexShrink: 0, border: "2px solid #cce3ff" }}>
                        {initials}
                      </div>
                    )}
                    <span style={{ fontSize: "10px", color: "#999", fontWeight: "600", background: "#f0f0f0", padding: "2px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>ID: {user.id}</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <div className="item-title" style={{ fontSize: "15px", fontWeight: "bold" }}>{user.full_name}</div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", color: getRoleBadgeColor(user.role), border: `1px solid ${getRoleBadgeColor(user.role)}`, backgroundColor: "transparent", fontWeight: "600", textTransform: "capitalize" }}>
                          {user.role}
                        </span>
                        {user.target_tier && (
                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", color: "#f59e0b", border: "1px solid #f59e0b", backgroundColor: "transparent", fontWeight: "600" }}>
                            Hạng {user.target_tier}
                          </span>
                        )}
                        {String(user.is_approved) === '1' ? (
                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", color: "#10b981", border: "1px solid #10b981", backgroundColor: "transparent", fontWeight: "600" }}>
                            Đã duyệt
                          </span>
                        ) : (
                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", color: "#f97316", border: "1px solid #f97316", backgroundColor: "transparent", fontWeight: "600" }}>
                            Chờ duyệt
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "15px", fontSize: "13px", color: "#555", flexWrap: "wrap" }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {user.email || "--"}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {user.phone}</div>
                    </div>
                  </div>
                </div>

                {/* Nút mở rộng chi tiết */}
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => toggleExpand(user.id)} style={{ background: 'none', border: 'none', color: '#0066cc', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                    {expandedUserId === user.id ? "Thu gọn ▲" : "Xem chi tiết ▼"}
                  </button>

                  <div className="item-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {!(String(user.is_approved) === '1' || user.is_approved === true) && (
                      <button onClick={() => handleApprove(user.id, user.is_approved)} className="btn btn-sm" style={{ padding: '4px 8px', fontSize: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        <CheckCircle2 size={12} /> Duyệt
                      </button>
                    )}
                    <button onClick={() => handleEditClick(user)} className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '12px' }}><Edit size={12} /> Sửa</button>
                    <button onClick={() => handleDelete(user.id)} className="btn btn-danger btn-sm" style={{ padding: '4px 8px', fontSize: '12px' }}><Trash2 size={12} /> Xóa</button>
                  </div>
                </div>

                {/* Phần chi tiết (chỉ hiện khi expand) */}
                {expandedUserId === user.id && (
                  <div style={{ marginTop: '10px', background: '#f9fafb', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
                    {/* Thông tin cá nhân */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><CreditCard size={14} color="#666" /> <strong>CCCD:</strong> {user.identity_number || "Chưa cập nhật"}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Calendar size={14} color="#666" /> <strong>Ngày sinh:</strong> {user.birth_date ? new Date(user.birth_date).toLocaleDateString('vi-VN') : "--"}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><UserCircle size={14} color="#666" /> <strong>Giới tính:</strong> {displayGender(user.gender)}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Award size={14} color="#666" /> <strong>Hạng thi:</strong> {user.target_tier || "Chưa đăng ký"}</div>
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      
                      
                    </div>

                    {/* Nghề nghiệp và nơi làm việc */}
                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><span style={{ color: '#6b7280' }}><strong>Nghề:</strong> {user.job_title || "---"}</span></div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><span style={{ color: '#6b7280' }}><strong>Nơi làm:</strong> {user.work_place || "---"}</span></div>
                    </div>

                    {/* Địa chỉ hộ khẩu */}
                    {user.permanent_address && (
                      <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <strong style={{ fontSize: '13px', color: '#1f2937', display: 'block', marginBottom: '6px' }}>Địa chỉ hộ khẩu</strong>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          <div>{user.permanent_address}</div>
                          {user.permanent_ward_name && <div style={{ marginTop: '4px', fontSize: '11px', color: '#999' }}>{user.permanent_ward_name}</div>}
                          {user.permanent_city_name && <div style={{ fontSize: '11px', color: '#999' }}>{user.permanent_city_name}</div>}
                        </div>
                      </div>
                    )}

                    {/* Địa chỉ hiện tại */}
                    {user.current_address && (
                      <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <strong style={{ fontSize: '13px', color: '#1f2937', display: 'block', marginBottom: '6px' }}>Địa chỉ hiện tại</strong>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          <div>{user.current_address}</div>
                          {user.current_ward_name && <div style={{ marginTop: '4px', fontSize: '11px', color: '#999' }}>{user.current_ward_name}</div>}
                          {user.current_city_name && <div style={{ fontSize: '11px', color: '#999' }}>{user.current_city_name}</div>}
                        </div>
                      </div>
                    )}

                    {/* Liên hệ khẩn cấp */}
                    {(user.emergency_contact_name || user.emergency_contact_phone) && (
                      <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <strong style={{ fontSize: '13px', color: '#1f2937' }}>Liên hệ khẩn cấp</strong>
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
                          <div>Tên: {user.emergency_contact_name || "---"}</div>
                          <div>SĐT: {user.emergency_contact_phone || "---"}</div>
                          <div>Quan hệ: {user.emergency_contact_relation || "---"}</div>
                        </div>
                      </div>
                    )}

                    {/* Kinh nghiệm bay */}
                    {(user.usage_purpose || user.operation_area || user.uav_experience || user.tier_b_services) && (
                      <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <strong style={{ fontSize: '13px', color: '#1f2937', display: 'block', marginBottom: '6px' }}>Kinh nghiệm bay</strong>
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          { /* removed device list display per request */ }
                          {user.usage_purpose && <div>Mục đích: {user.usage_purpose}</div>}
                          {user.operation_area && (
                            <div>
                              Khu vực: {({
                                hanoi: 'Hà Nội & Miền Bắc',
                                danang: 'Đà Nẵng & Miền Trung',
                                hcm: 'TP.HCM & Miền Nam'
                              }[user.operation_area] || user.operation_area)}
                            </div>
                          )}
                          {user.uav_experience && <div>Kinh nghiệm: {user.uav_experience}</div>}
                          {user.tier_b_services && (
                            <div>
                              Nghiệp vụ đăng kí: {
                                (() => {
                                  try {
                                    const serviceIds = Array.isArray(user.tier_b_services) 
                                      ? user.tier_b_services 
                                      : typeof user.tier_b_services === 'string'
                                      ? JSON.parse(user.tier_b_services)
                                      : [];
                                    const serviceNames = serviceIds
                                      .map(id => tierBServices.find(s => s.id === id)?.title || `ID: ${id}`)
                                      .join(', ');
                                    return serviceNames || '---';
                                  } catch {
                                    return '---';
                                  }
                                })()
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CCCD Images */}
                    {(user.identity_image_front || user.identity_image_back) && (
                      <div style={{ marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <strong style={{ fontSize: '13px', color: '#1f2937', display: 'block', marginBottom: '8px' }}>Ảnh CCCD</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {user.identity_image_front && (
                            <div>
                              <img 
                                src={user.identity_image_front} 
                                alt="CCCD Front" 
                                style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '4px', border: '1px solid #e5e7eb', cursor: 'pointer' }} 
                                onClick={() => { setSelectedImage(user.identity_image_front); setSelectedImageAlt('CCCD Mặt Trước'); setShowImageModal(true); }}
                              />
                              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Mặt trước</div>
                            </div>
                          )}
                          {user.identity_image_back && (
                            <div>
                              <img 
                                src={user.identity_image_back} 
                                alt="CCCD Back" 
                                style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '4px', border: '1px solid #e5e7eb', cursor: 'pointer' }} 
                                onClick={() => { setSelectedImage(user.identity_image_back); setSelectedImageAlt('CCCD Mặt Sau'); setShowImageModal(true); }}
                              />
                              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Mặt sau</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Phần điểm số khóa học */}
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Điểm số khóa học
                      </h4>

                      {loadingScores[user.id] ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                          <RefreshCw size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                          <span style={{ marginLeft: '8px' }}>Đang tải...</span>
                        </div>
                      ) : userScores[user.id]?.courseScores?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {userScores[user.id].courseScores.map((course, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              background: '#fff',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>
                                  {course.course_title}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                                  <span>Tiến độ: <strong>{parseFloat(course.progress_percentage || 0).toFixed(0)}%</strong></span>
                                  <span>Quiz: <strong style={{ color: getScoreColor(course.quiz_score || 0) }}>{parseFloat(course.quiz_score || 0).toFixed(1)}</strong></span>
                                </div>
                              </div>
                              <div style={{
                                minWidth: '60px',
                                textAlign: 'center',
                                padding: '6px 12px',
                                background: getScoreColor(course.overall_score || 0),
                                color: '#fff',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '14px'
                              }}>
                                {parseFloat(course.overall_score || 0).toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>
                          Chưa có dữ liệu điểm số
                        </div>
                      )}

                      {/* Lịch sử Quiz gần đây */}
                      {userScores[user.id]?.quizResults?.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>
                            Quiz gần đây
                          </h5>
                          <div style={{ fontSize: '12px' }}>
                            {userScores[user.id].quizResults.slice(0, 5).map((quiz, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                                borderBottom: idx < 4 ? '1px dashed #e5e7eb' : 'none'
                              }}>
                                <span style={{ color: '#6b7280' }}>
                                  {quiz.lesson_title || quiz.course_title} - {new Date(quiz.created_at).toLocaleDateString('vi-VN')}
                                </span>
                                <span style={{
                                  fontWeight: '600',
                                  color: getScoreColor(quiz.score)
                                }}>
                                  {quiz.correct_answers}/{quiz.total_questions} ({parseFloat(quiz.score).toFixed(1)} điểm)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt={selectedImageAlt}
              className="rounded"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="image-modal-close"
            >
            
              ×
            </button>
          </div>
        </div>
      )}

    </div>
  );
}