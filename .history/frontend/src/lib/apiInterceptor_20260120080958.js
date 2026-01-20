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

/**
 * Request Interceptor: Thêm Access Token vào header
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('user_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
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

            const refreshToken = localStorage.getItem('refresh_token');

            // Nếu không có refresh token, logout
            if (!refreshToken) {
                localStorage.removeItem('user_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                window.location.href = '/dang-nhap?expired=true';
                return Promise.reject(error);
            }

            // Gọi refresh token endpoint
            return axios
                .post(`${API_BASE}/auth/refresh-token`, { refreshToken })
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
