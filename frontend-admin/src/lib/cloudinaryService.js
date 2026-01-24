// Cloudinary Upload Service - Upload through Backend
import { apiClient } from './apiInterceptor';

const getApiBase = () => import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const API_BASE = getApiBase();

export const uploadToCloudinary = async (file, folder = "uav-training") => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("displayName", file.name); // Gửi tên file gốc

    console.log("Uploading to:", `${API_BASE}/cloudinary/upload`);
    console.log("File info:", {
      name: file.name,
      size: file.size,
      type: file.type,
      folder: folder
    });

    // Dùng apiClient để có request interceptor tự động refresh token
    // Ghi đè timeout mặc định để cho phép upload video lớn (mặc định axios timeout = 10000ms)
    const response = await apiClient.post('/cloudinary/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('Upload progress:', percentCompleted + '%');
        }
      }
    });

    console.log("Response data:", response.data);

    if (!response.data.success) {
      throw new Error(response.data.error || "Upload failed");
    }

    return {
      success: true,
      url: response.data.url,
      publicId: response.data.publicId,
      resourceType: response.data.resourceType,
      originalFilename: response.data.originalFilename,
    };
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return {
      success: false,
      error: err.message,
    };
  }
};

export const uploadImage = async (file) => {
  if (!file.type.startsWith("image/")) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file ảnh",
    };
  }
  return uploadToCloudinary(file, "uav-training/images");
};

export const uploadVideo = async (file) => {
  if (!file.type.startsWith("video/")) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file video",
    };
  }
  return uploadToCloudinary(file, "uav-training/videos");
};

export const uploadDocument = async (file) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file PDF, Word, Excel, PowerPoint",
    };
  }
  return uploadToCloudinary(file, "uav-training/documents");
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    // Dùng apiClient để có request interceptor
    const response = await apiClient.post('/cloudinary/delete', { publicId });
    return response.data;
  } catch (err) {
    console.error("Delete error:", err);
    return { success: false, error: err.message };
  }
};
