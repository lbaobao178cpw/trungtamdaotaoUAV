import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Tạo instance axios độc lập
export const apiClient = axios.create({
    baseURL: API_BASE,
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
    const refreshToken = localStorage.getItem('admin_refresh_token');
    if (!refreshToken) {
        throw new Error('Không có refresh token');
    }

    try {
        // Tạo instance axios mới để tránh interceptor infinite loop
        const freshAxios = axios.create({ baseURL: API_BASE, timeout: 10000 });
        const response = await freshAxios.post('/auth/refresh-token', { refreshToken });
        const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;

        // Cập nhật localStorage
        localStorage.setItem('admin_token', newAccessToken);
        if (newRefreshToken) {
            localStorage.setItem('admin_refresh_token', newRefreshToken);
        }
        return newAccessToken;
    } catch (error) {
        console.error('[Token Refresh] Failed:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Request Interceptor: Kiểm tra token hết hạn TRƯỚC khi gửi request
 */
apiClient.interceptors.request.use(
    async (config) => {
        const token = localStorage.getItem('admin_token');

        // Nếu token hết hạn, refresh ngay trước khi gửi request
        if (token && isTokenExpired(token)) {

            try {
                const newToken = await refreshAccessToken();
                config.headers.Authorization = `Bearer ${newToken}`;
                return config;
            } catch (err) {
                console.error('[API Request] Lỗi refresh token:', err.message);
                // Nếu refresh thất bại, logout
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_refresh_token');
                localStorage.removeItem('admin_user');
                window.location.href = '/login?expired=true';
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
        console.error('[API Request] Interceptor error:', error);
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor: Xử lý khi token hết hạn
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const originalRequest = error.config;
        const errorCode = error.response?.data?.code;

        // Nếu là lỗi 401 hoặc TOKEN_EXPIRED và chưa retry
        if ((error.response?.status === 401 || errorCode === 'TOKEN_EXPIRED') && !originalRequest._retry) {
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

            const refreshToken = localStorage.getItem('admin_refresh_token');

            // Nếu không có refresh token, logout
            if (!refreshToken) {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_refresh_token');
                localStorage.removeItem('admin_user');
                window.location.href = '/login?expired=true';
                return Promise.reject(error);
            }

            // Gọi refresh token endpoint
            return axios
                .post(`${API_BASE}/auth/refresh-token`, { refreshToken })
                .then(({ data }) => {
                    const { token: newAccessToken, refreshToken: newRefreshToken } = data;

                    // Cập nhật token mới
                    localStorage.setItem('admin_token', newAccessToken);
                    if (newRefreshToken) {
                        localStorage.setItem('admin_refresh_token', newRefreshToken);
                    }

                    // Cập nhật header authorization
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

                    processQueue(null, newAccessToken);
                    return apiClient(originalRequest);
                })
                .catch((err) => {
                    // Refresh token cũng hết hạn → logout
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('admin_refresh_token');
                    localStorage.removeItem('admin_user');
                    window.location.href = '/login?expired=true';
                    processQueue(err, null);
                    return Promise.reject(err);
                });
        }

        return Promise.reject(error);
    }
);

export default apiClient;
