import { toast } from 'react-toastify';

/**
 * Thống nhất tất cả thông báo trong app
 * Loại bỏ localhost, stack traces, chỉ hiển thị thông báo người dùng
 */

// Thông báo thành công
export const notifySuccess = (message) => {
    toast.success(message || 'Thành công!', {
        position: 'top-right',
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
};

// Thông báo lỗi
export const notifyError = (message) => {
    // Lọc bỏ localhost và chi tiết kỹ thuật
    let cleanMessage = message;
    if (message && typeof message === 'string') {
        // Bỏ URLs
        cleanMessage = message.replace(/http:\/\/localhost:\d+\/api\/\S+/g, '');
        // Bỏ "details:", "Error:", stack traces
        cleanMessage = cleanMessage.replace(/details:|Error:|at \S+|\n.*$/gi, '').trim();
    }

    toast.error(cleanMessage || 'Có lỗi xảy ra!', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
};

// Thông báo cảnh báo
export const notifyWarning = (message) => {
    toast.warning(message || 'Cảnh báo!', {
        position: 'top-right',
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
};

// Thông báo thông tin
export const notifyInfo = (message) => {
    toast.info(message || 'Thông tin!', {
        position: 'top-right',
        autoClose: 2500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
};

// Xóa tất cả thông báo
export const clearNotifications = () => {
    toast.dismiss();
};

// Thông báo loading (không tự động đóng)
export const notifyLoading = (message) => {
    return toast.loading(message || 'Đang xử lý...', {
        position: 'top-right',
    });
};

// Update loading toast thành success
export const updateToastSuccess = (toastId, message) => {
    toast.update(toastId, {
        render: message || 'Thành công!',
        type: 'success',
        isLoading: false,
        autoClose: 2500,
    });
};

// Update loading toast thành error
export const updateToastError = (toastId, message) => {
    let cleanMessage = message;
    if (message && typeof message === 'string') {
        cleanMessage = message.replace(/http:\/\/localhost:\d+\/api\/\S+/g, '');
        cleanMessage = cleanMessage.replace(/details:|Error:|at \S+|\n.*$/gi, '').trim();
    }

    toast.update(toastId, {
        render: cleanMessage || 'Có lỗi xảy ra!',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
    });
};
