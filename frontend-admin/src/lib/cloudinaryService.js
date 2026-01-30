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

export const uploadSolutionImage = async (file) => {
  if (!file.type.startsWith("image/")) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file ảnh",
    };
  }
  return uploadToCloudinary(file, "uav-training/solutions");
};

export const uploadSolutionVideo = async (file) => {
  if (!file.type.startsWith("video/")) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file video",
    };
  }
  return uploadToCloudinary(file, "uav-training/solutions/videos");
};

export const uploadCourseImage = async (file) => {
  if (!file.type.startsWith("image/")) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file ảnh",
    };
  }
  return uploadToCloudinary(file, "uav-training/courses/thumbnails");
};

export const uploadCourseVideo = async (file) => {
  if (!file.type.startsWith("video/")) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file video",
    };
  }
  return uploadToCloudinary(file, "uav-training/courses/videos");
};

export const listVideos = async (folder = "uav-training/videos") => {
  try {
    const response = await apiClient.get('/cloudinary/list-images', { params: { folder, resource_type: 'video' } });
    return response.data;
  } catch (err) {
    console.error("List videos error:", err);
    return { success: false, error: err.message };
  }
};

export const uploadLicenseImage = async (file) => {
  if (!file.type.startsWith("image/")) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file ảnh",
    };
  }
  return uploadToCloudinary(file, "uav-training/licenses");
};

export const uploadDocument = async (file) => {
  return uploadToCloudinary(file, "uav-training/documents");
};

export const uploadPointImage = async (file) => {
  if (!file.type.startsWith("image/")) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file ảnh",
    };
  }
  return uploadToCloudinary(file, "uav-training/quản lí điểm 3D");
};

export const uploadPanoramaImage = async (file) => {
  if (!file.type.startsWith("image/")) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file ảnh",
    };
  }
  return uploadToCloudinary(file, "uav-training/quản lí điểm 3D/panoramas");
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

export const listImages = async (folder = "uav-training/images") => {
  try {
    const response = await apiClient.get('/cloudinary/list-images', { params: { folder } });
    return response.data;
  } catch (err) {
    console.error("List images error:", err);
    return { success: false, error: err.message };
  }
};

export const listDocuments = async (folder = "uav-training/documents") => {
  try {
    const response = await apiClient.get('/cloudinary/list-images', { params: { folder, resource_type: 'raw' } });
    return response.data;
  } catch (err) {
    console.error("List documents error:", err);
    return { success: false, error: err.message };
  }
};

export const uploadModel3D = async (file) => {
  if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
    return {
      success: false,
      error: "Chỉ hỗ trợ file .glb hoặc .gltf",
    };
  }
  return uploadToCloudinary(file, "uav-training/models");
};

export const listModel3Ds = async (folder = "uav-training/models") => {
  try {
    // First try to get from Cloudinary
    const cloudinaryResult = await apiClient.get('/cloudinary/list-images', { 
      params: { folder, resource_type: 'raw' } 
    });
    
    let allModels = cloudinaryResult.data.images || [];
    console.log("Cloudinary models:", allModels);
    
    // If no models from Cloudinary, try to get from local storage
    if (allModels.length === 0) {
      console.log("No Cloudinary models, trying local storage...");
      try {
        const localResult = await apiClient.get('/files/files', { 
          params: { folder: 'course-uploads' } 
        });
        console.log("Local API result:", localResult.data);
        
        if (Array.isArray(localResult.data)) {
          // Filter for .glb and .gltf files
          const modelFiles = localResult.data.filter(file => 
            file.filename && 
            (file.filename.toLowerCase().endsWith('.glb') || file.filename.toLowerCase().endsWith('.gltf'))
          );
          console.log("Filtered model files:", modelFiles);
          
          allModels = modelFiles.map(file => ({
            url: file.url,
            publicId: file.filename,
            displayName: file.filename.replace(/^\d+-/, '').replace(/-\d+$/, ''),
            createdAt: new Date().toISOString(), // Local files don't have creation date
            bytes: 0, // Local files don't have size info
            resourceType: 'raw'
          }));
          console.log("Mapped models:", allModels);
        }
      } catch (localError) {
        console.warn("Could not load local models:", localError.message);
      }
    }
    
    return { success: true, images: allModels };
  } catch (err) {
    console.error("List models error:", err);
    return { success: false, error: err.message };
  }
};
