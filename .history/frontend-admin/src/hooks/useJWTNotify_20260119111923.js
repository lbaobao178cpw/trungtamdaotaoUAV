import { toast } from 'sonner';

/**
 * JWT Notification Hook (Admin)
 * Hiển thị thông báo JWT trên giao diện quản trị
 */
export const useJWTNotify = () => {
  // === SUCCESS MESSAGES ===
  const notifyLoginSuccess = (userName) => {
    toast.success(`✓ Đăng nhập thành công`, {
      description: `Chào mừng ${userName}!`,
      duration: 3000,
    });
  };

  const notifyLogoutSuccess = () => {
    toast.success(`✓ Đăng xuất thành công`, {
      description: 'Hẹn gặp lại bạn lần sau!',
      duration: 2500,
    });
  };

  const notifyTokenRefreshed = () => {
    toast.success(`✓ Làm mới phiên làm việc`, {
      description: 'Phiên của bạn được gia hạn',
      duration: 2000,
    });
  };

  // === ERROR MESSAGES ===
  const notifyTokenExpired = () => {
    toast.error(`⚠ Phiên hết hạn`, {
      description: 'Vui lòng đăng nhập lại',
      duration: 4000,
    });
  };

  const notifyInvalidToken = () => {
    toast.error(`✗ Token không hợp lệ`, {
      description: 'Vui lòng đăng nhập lại',
      duration: 3000,
    });
  };

  const notifyLoginFailed = (reason = 'Sai tên đăng nhập hoặc mật khẩu') => {
    toast.error(`✗ Đăng nhập thất bại`, {
      description: reason,
      duration: 3000,
    });
  };

  const notifyUnauthorized = () => {
    toast.error(`✗ Không có quyền truy cập`, {
      description: 'Bạn không có quyền thực hiện hành động này',
      duration: 3000,
    });
  };

  const notifyNetworkError = () => {
    toast.error(`✗ Lỗi kết nối`, {
      description: 'Không thể kết nối đến máy chủ. Vui lòng thử lại',
      duration: 4000,
    });
  };

  const notifyInsufficientPermissions = () => {
    toast.error(`✗ Không đủ quyền hạn`, {
      description: 'Chỉ quản trị viên mới có thể truy cập tính năng này',
      duration: 3000,
    });
  };

  // === WARNING MESSAGES ===
  const notifySessionExpiring = (secondsLeft) => {
    toast.warning(`⏱ Phiên sắp hết hạn`, {
      description: `${secondsLeft} giây nữa sẽ cần đăng nhập lại`,
      duration: 4000,
    });
  };

  const notifyNoToken = () => {
    toast.warning(`⚠ Chưa đăng nhập`, {
      description: 'Vui lòng đăng nhập để tiếp tục',
      duration: 3000,
    });
  };

  // === INFO MESSAGES ===
  const notifyValidatingToken = () => {
    toast.loading('🔍 Đang xác thực...', {
      description: 'Vui lòng chờ',
      duration: 2000,
    });
  };

  const notifyAutoLogout = () => {
    toast.info(`ℹ Đã tự động đăng xuất`, {
      description: 'Phiên đã hết hạn do không hoạt động',
      duration: 3000,
    });
  };

  // === ADMIN SPECIFIC ===
  const notifyAdminLoginSuccess = (adminName) => {
    toast.success(`✓ Đăng nhập quản trị thành công`, {
      description: `Chào ${adminName}! Bạn có quyền quản trị viên`,
      duration: 3000,
      icon: '👨‍💼',
    });
  };

  const notifyActionSuccess = (action = 'Thao tác') => {
    toast.success(`✓ ${action} thành công`, {
      duration: 2000,
    });
  };

  const notifyActionFailed = (action = 'Thao tác') => {
    toast.error(`✗ ${action} thất bại`, {
      description: 'Vui lòng thử lại',
      duration: 2500,
    });
  };

  return {
    // Success
    notifyLoginSuccess,
    notifyLogoutSuccess,
    notifyTokenRefreshed,
    notifyAdminLoginSuccess,
    notifyActionSuccess,
    
    // Error
    notifyTokenExpired,
    notifyInvalidToken,
    notifyLoginFailed,
    notifyUnauthorized,
    notifyNetworkError,
    notifyInsufficientPermissions,
    notifyActionFailed,
    
    // Warning
    notifySessionExpiring,
    notifyNoToken,
    
    // Info
    notifyValidatingToken,
    notifyAutoLogout,
  };
};
