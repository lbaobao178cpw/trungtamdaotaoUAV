import axios from 'axios';
import { API_BASE_URL, MEDIA_BASE_URL } from '../config/apiConfig.js';

export const api = {
  // POI APIs (Các điểm 3D)
  points: {
    getAll: () => axios.get(`${API_BASE_URL}/points`),
    create: (data) => axios.post(`${API_BASE_URL}/points`, data),
    update: (id, data) => axios.put(`${API_BASE_URL}/points/${id}`, data),
    delete: (id) => axios.delete(`${API_BASE_URL}/points/${id}`)
  },

  // Solution APIs (Các giải pháp - Mới thêm)
  solutions: {
    getAll: () => axios.get(`${API_BASE_URL}/solutions`),
    getOne: (id) => axios.get(`${API_BASE_URL}/solutions/${id}`),
    create: (data) => axios.post(`${API_BASE_URL}/solutions`, data),
    update: (id, data) => axios.put(`${API_BASE_URL}/solutions/${id}`, data),
    delete: (id) => axios.delete(`${API_BASE_URL}/solutions/${id}`)
  },

  // Media APIs (Quản lý file/ảnh)
  media: {
    // Lấy danh sách file trong thư mục (có hỗ trợ subfolder)
    getFiles: (folderPath = '') => axios.get(`${MEDIA_BASE_URL}/api/files`, { params: { folder: folderPath } }),

    // Tạo thư mục mới
    createFolder: (folderName, currentPath = '') => axios.post(`${MEDIA_BASE_URL}/api/create-folder`, { folderName, currentPath }),

    // Upload file
    upload: (formData) => axios.post(`${MEDIA_BASE_URL}/api/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

    // Xóa file/folder
    delete: (path) => axios.delete(`${MEDIA_BASE_URL}/api/files`, { params: { path } }),

    // Di chuyển/Đổi tên file
    move: (itemName, oldPath, newFolderPath) => axios.post(`${MEDIA_BASE_URL}/api/move`, { itemName, oldPath, newFolderPath })
  }
};