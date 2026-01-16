// Cloudinary Upload Service - Upload through Backend
const API_BASE = "http://localhost:5000/api";

export const uploadToCloudinary = async (file, folder = "uav-training") => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const token = localStorage.getItem("admin_token");
    console.log("Token from localStorage:", token?.substring(0, 20) + "...");
    
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    console.log("Uploading to:", `${API_BASE}/cloudinary/upload`);
    console.log("Headers:", headers);

    const response = await fetch(`${API_BASE}/cloudinary/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);

    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return {
      success: true,
      url: data.url,
      publicId: data.publicId,
      resourceType: data.resourceType,
      originalFilename: data.originalFilename,
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
    const token = localStorage.getItem("admin_token");
    const response = await fetch(`${API_BASE}/cloudinary/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ publicId }),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Delete error:", err);
    return { success: false, error: err.message };
  }
};
