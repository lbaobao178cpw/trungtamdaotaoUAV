/**
 * API Configuration for Admin Frontend
 * Uses environment variables with fallback to localhost for development
 */

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
    return window.__API_BASE_URL__;
  }
  
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
};

const getMediaBaseUrl = () => {
  if (typeof window !== 'undefined' && window.__MEDIA_BASE_URL__) {
    return window.__MEDIA_BASE_URL__;
  }
  
  return import.meta.env.VITE_MEDIA_BASE_URL || 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
export const MEDIA_BASE_URL = getMediaBaseUrl();

// Specific API endpoints
export const API_ENDPOINTS = {
  COURSES: `${API_BASE_URL}/courses`,
  AUTH: `${API_BASE_URL}/auth`,
  DISPLAY: `${API_BASE_URL}/display`,
  POINTS: `${API_BASE_URL}/points`,
  SETTINGS: `${API_BASE_URL}/settings`,
  STUDY_MATERIALS: `${API_BASE_URL}/study-materials`,
  CLOUDINARY: `${API_BASE_URL}/cloudinary`,
};

console.log('Admin API Config:', {
  API_BASE_URL,
  MEDIA_BASE_URL,
  ENV: import.meta.env.MODE
});
