/**
 * API Configuration for Frontend
 * Uses environment variables with fallback to localhost for development
 */

// Get the base URL from environment or use localhost
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
    BASE_URL: API_BASE_URL,
    COURSES: `${API_BASE_URL}/courses`,
    COMMENTS: `${API_BASE_URL}/comments`,
    USERS: `${API_BASE_URL}/users`,
    AUTH: `${API_BASE_URL}/auth`,
    LOCATION: `${API_BASE_URL}/location`,
    DISPLAY: `${API_BASE_URL}/display`,
    FAQS: `${API_BASE_URL}/faqs`,
    EXAMS: `${API_BASE_URL}/exams`,
    SOLUTIONS: `${API_BASE_URL}/solutions`,
    STUDY_MATERIALS: `${API_BASE_URL}/study-materials`,
    POINTS: `${API_BASE_URL}/points`,
    CLOUDINARY: `${API_BASE_URL}/cloudinary`,
};
