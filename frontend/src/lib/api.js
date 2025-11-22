import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';
const MEDIA_BASE = 'http://localhost:5001/api';

export const api = {
  // POI APIs
  points: {
    getAll: () => axios.get(`${API_BASE}/points`),
    create: (data) => axios.post(`${API_BASE}/points`, data),
    update: (id, data) => axios.put(`${API_BASE}/points/${id}`, data),
    delete: (id) => axios.delete(`${API_BASE}/points/${id}`)
  },
  
  // Media APIs
  media: {
    getFiles: () => axios.get(`${MEDIA_BASE}/files`),
    upload: (formData) => axios.post(`${MEDIA_BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    delete: (filename) => axios.delete(`${MEDIA_BASE}/files/${filename}`)
  }
};