// Cloudinary Upload Service - Upload through Backend
import { apiClient } from './apiInterceptor';

const API_BASE = "http://localhost:5000/api";

export const uploadToCloudinary = async (file, folder = "uav-training") => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    

    // Dùng apiClient để có request interceptor tự động refresh token
    const response = await apiClient.post('/cloudinary/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    

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
