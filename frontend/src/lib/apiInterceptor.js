import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig.js';

// Tạo instance axios độc lập
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// Flag để tránh gọi refresh token nhiều lần đồng thời
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    isRefreshing = false;
    failedQueue = [];
};

// === HELPER: Decode JWT để lấy exp ===
const decodeToken = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

// === HELPER: Kiểm tra token hết hạn ===
const isTokenExpired = (token) => {
    if (!token) return true;
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    // exp tính bằng giây, so với hiện tại + 10s buffer
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now + 10; // Refresh trước 10s
};

// === HELPER: Refresh access token (dùng axios mới, KHÔNG dùng apiClient để tránh infinite loop) ===
const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        throw new Error('Không có refresh token');
    }

    try {
        // Tạo instance axios mới để tránh interceptor infinite loop
        const freshAxios = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });
        const response = await freshAxios.post('/auth/refresh-token', { refreshToken });
        const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;

        // Cập nhật localStorage
        localStorage.setItem('user_token', newAccessToken);
        if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
        }

        return newAccessToken;
    } catch (error) {
        throw error;
    }
};

/**
 * Request Interceptor: Kiểm tra token hết hạn TRƯỚC khi gửi request
 */
apiClient.interceptors.request.use(
    async (config) => {
        const token = localStorage.getItem('user_token');

        // Nếu token hết hạn, refresh ngay trước khi gửi request
        if (token && isTokenExpired(token)) {
            try {
                const newToken = await refreshAccessToken();
                config.headers.Authorization = `Bearer ${newToken}`;
                return config;
            } catch (err) {
                // Nếu refresh thất bại, logout
                localStorage.removeItem('user_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                window.location.href = '/dang-nhap?expired=true';
                // Return rejected promise
                return Promise.reject(new Error('Token refresh failed'));
            }
        }

        // Token còn hợp lệ, thêm vào header
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor: Xử lý khi token hết hạn hoặc session invalid
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const originalRequest = error.config;
        const errorCode = error.response?.data?.code;
        const statusCode = error.response?.status;

        // === Kiểm tra SESSION_INVALID (đăng nhập từ thiết bị khác) ===
        if (errorCode === 'SESSION_INVALID') {
            localStorage.removeItem('user_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            localStorage.removeItem('deviceId');
            window.location.href = '/dang-nhap?session_invalid=true';
            return Promise.reject(error);
        }

        // CHỈ xử lý 401 hoặc TOKEN_EXPIRED nếu người dùng ĐÃ ĐĂNG NHẬP
        // Nếu người dùng chưa đăng nhập (không có token), không nên redirect
        const hasToken = !!localStorage.getItem('user_token');

        if ((statusCode === 401 || errorCode === 'TOKEN_EXPIRED') && !originalRequest._retry && hasToken) {
            // Nếu đang refresh, chờ trong queue
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refresh_token');

            // Nếu không có refresh token, logout
            if (!refreshToken) {
                localStorage.removeItem('user_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                localStorage.removeItem('deviceId');
                window.location.href = '/dang-nhap?expired=true';
                return Promise.reject(error);
            }

            // Gọi refresh token endpoint
            return axios
                .post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken })
                .then(({ data }) => {
                    const { token: newAccessToken, refreshToken: newRefreshToken } = data;

                    // Cập nhật token mới
                    localStorage.setItem('user_token', newAccessToken);
                    if (newRefreshToken) {
                        localStorage.setItem('refresh_token', newRefreshToken);
                    }

                    // Cập nhật header authorization
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

                    processQueue(null, newAccessToken);
                    return apiClient(originalRequest);
                })
                .catch((err) => {
                    // Refresh token cũng hết hạn → logout
                    localStorage.removeItem('user_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                    window.location.href = '/dang-nhap?expired=true';
                    processQueue(err, null);
                    return Promise.reject(err);
                });
        }

        return Promise.reject(error);
    }
);

export default apiClient;
