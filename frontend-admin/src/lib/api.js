import axios from 'axios';

// === CẬP NHẬT QUAN TRỌNG: Cả API và MEDIA đều dùng cổng 5000 ===
// Đảm bảo rằng bạn không còn dùng cổng 5001 nữa
const PROD_API_BASE_URL = 'https://api.uavtrainningcenter.vn/api';
const PROD_MEDIA_BASE_URL = 'https://api.uavtrainningcenter.vn/api';

const getApiBase = () => import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'production' ? PROD_API_BASE_URL : 'http://localhost:5000/api');
const getMediaBase = () => import.meta.env.VITE_MEDIA_BASE_URL || (import.meta.env.MODE === 'production' ? PROD_MEDIA_BASE_URL : 'http://localhost:5000/api');

const API_BASE = getApiBase();
const MEDIA_BASE = getMediaBase();

export const api = {
  // POI APIs (Các điểm 3D)
  points: {
    getAll: () => axios.get(`${API_BASE}/points`),
    create: (data) => axios.post(`${API_BASE}/points`, data),
    update: (id, data) => axios.put(`${API_BASE}/points/${id}`, data),
    delete: (id) => axios.delete(`${API_BASE}/points/${id}`)
  },

  // Solution APIs (Các giải pháp - Mới thêm)
  solutions: {
    getAll: () => axios.get(`${API_BASE}/solutions`),
    getOne: (id) => axios.get(`${API_BASE}/solutions/${id}`),
    create: (data) => axios.post(`${API_BASE}/solutions`, data),
    update: (id, data) => axios.put(`${API_BASE}/solutions/${id}`, data),
    delete: (id) => axios.delete(`${API_BASE}/solutions/${id}`)
  },

  // Media APIs (Quản lý file/ảnh)
  media: {
    // Lấy danh sách file trong thư mục (có hỗ trợ subfolder)
    getFiles: (folderPath = '') => axios.get(`${MEDIA_BASE}/files`, { params: { folder: folderPath } }),

    // Tạo thư mục mới
    createFolder: (folderName, currentPath = '') => axios.post(`${MEDIA_BASE}/create-folder`, { folderName, currentPath }),

    // Upload file
    upload: (formData) => axios.post(`${MEDIA_BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

    // Xóa file/folder
    delete: (path) => axios.delete(`${MEDIA_BASE}/files`, { params: { path } }),

    // Di chuyển/Đổi tên file
    move: (itemName, oldPath, newFolderPath) => axios.post(`${MEDIA_BASE}/move`, { itemName, oldPath, newFolderPath })
  }
};