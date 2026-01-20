// API Endpoints
export const API_BASE_URL = 'http://localhost:5000/api';

// Media Base URL - for image/file display (not /api)
export const MEDIA_BASE_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
    // Settings
    SETTINGS: `${API_BASE_URL}/settings`,
    MODEL_URL: `${API_BASE_URL}/settings/current_model_url`,
    CAMERA_VIEW: `${API_BASE_URL}/settings/default_camera_view`,

    // Points
    POINTS: `${API_BASE_URL}/points`,

    // Courses
    COURSES: `${API_BASE_URL}/courses`,

    // Exams
    EXAMS: `${API_BASE_URL}/exams`,

    // Solutions
    SOLUTIONS: `${API_BASE_URL}/solutions`,

    // Users
    USERS: `${API_BASE_URL}/users`,

    // FAQs
    FAQS: `${API_BASE_URL}/faqs`,

    // Forms
    FORMS: `${API_BASE_URL}/display/forms`,

    // Study Materials
    STUDY_MATERIALS: `${API_BASE_URL}/study-materials`,

    // Display Settings
    DISPLAY: `${API_BASE_URL}/display`,
    FOOTER_CONFIG: `${API_BASE_URL}/display/footer-config`,
    LEGAL_DOCUMENTS: `${API_BASE_URL}/display/legal-documents`,
    AUTHORITIES: `${API_BASE_URL}/display/authorities`,

    // Notifications
    NOTIFICATIONS: `${API_BASE_URL}/display/notifications`,
};

// Message templates
export const MESSAGES = {
    SUCCESS: {
        SAVE: 'Lưu thành công!',
        DELETE: 'Xóa thành công!',
        UPDATE: 'Cập nhật thành công!',
        UPLOAD: 'Tải lên thành công!',
    },
    ERROR: {
        SAVE: 'Lỗi khi lưu dữ liệu',
        DELETE: 'Lỗi khi xóa dữ liệu',
        UPDATE: 'Lỗi khi cập nhật dữ liệu',
        UPLOAD: 'Lỗi khi tải lên file',
        LOAD: 'Lỗi khi tải dữ liệu',
    },
};

// Validation rules
export const VALIDATION = {
    GLB_ONLY: (filename) => filename.toLowerCase().endsWith('.glb'),
    IMAGE_ONLY: (filename) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename),
    VIDEO_ONLY: (filename) => /\.(mp4|webm|ogg)$/i.test(filename),
};
