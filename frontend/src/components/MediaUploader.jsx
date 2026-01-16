import React, { useState, useRef } from 'react';
import { uploadImage, uploadVideo } from '../lib/cloudinaryService';
import './MediaUploader.css';

function MediaUploader({ onUploadSuccess, type = 'both' }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const acceptTypes = {
    image: 'image/*',
    video: 'video/*',
    both: 'image/*,video/*'
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);

      // Upload based on file type
      let result;
      if (file.type.startsWith('image/')) {
        result = await uploadImage(file);
      } else if (file.type.startsWith('video/')) {
        result = await uploadVideo(file);
      } else {
        result = { success: false, error: 'File type not supported' };
      }

      if (result.success) {
        setUploadProgress(100);
        onUploadSuccess?.(result);
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUploading(false);
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="media-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes[type]}
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ display: 'none' }}
      />

      <div 
        className="upload-zone"
        onClick={() => fileInputRef.current?.click()}
        style={{ cursor: 'pointer' }}
      >
        {previewUrl && !uploading ? (
          <div className="preview">
            {type === 'both' || type === 'image' ? (
              <img src={previewUrl} alt="preview" />
            ) : (
              <video src={previewUrl} controls />
            )}
          </div>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <p className="upload-text">
              {uploading ? 'Đang upload...' : 'Click để chọn ảnh'}
            </p>
            <p className="upload-hint">
              {type === 'image' && 'Hỗ trợ: JPG, PNG, GIF, WebP'}
              {type === 'video' && 'Hỗ trợ: MP4, WebM, MOV'}
              {type === 'both' && 'Hỗ trợ ảnh và video'}
            </p>
          </>
        )}
      </div>

      {uploading && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default MediaUploader;
