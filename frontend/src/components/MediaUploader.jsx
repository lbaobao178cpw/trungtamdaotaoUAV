import React, { useState, useRef } from 'react';
import { uploadImage, uploadVideo, listImages } from '../lib/cloudinaryService';
import './MediaUploader.css';

function MediaUploader({ onUploadSuccess, type = 'both' }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryImages, setLibraryImages] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const fileInputRef = useRef(null);

  const acceptTypes = {
    image: 'image/*',
    video: 'video/*',
    both: 'image/*,video/*'
  }; 

  

  const getFolder = () => {
    if (type === 'image') return 'uav-training/images';
    if (type === 'video') return 'uav-training/videos';
    return 'uav-training';
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

  const handleShowLibrary = async () => {
    setShowLibrary(true);
    setLoadingLibrary(true);
    try {
      const result = await listImages(getFolder());
      if (result.success) {
        setLibraryImages(result.images);
      } else {
        alert('Failed to load images: ' + result.error);
      }
    } catch (err) {
      alert('Error loading images: ' + err.message);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleSelectFromLibrary = (image) => {
    setPreviewUrl(image.url);
    setShowLibrary(false);
    onUploadSuccess?.({
      success: true,
      url: image.url,
      publicId: image.publicId,
      resourceType: 'image',
      originalFilename: image.displayName,
      fromLibrary: true
    });
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

      {!showLibrary ? (
        <>
          <div 
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: 'pointer' }}
          >
            {previewUrl && !uploading ? (
              <div className="preview">
                {type === 'both' || type === 'image' ? (
                  <img src={previewUrl} alt="Xem trước tệp đã tải lên" />
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

          <button 
            type="button" 
            onClick={handleShowLibrary}
            className="library-button"
            disabled={uploading}
          >
            Chọn từ thư viện
          </button>

          {uploading && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="library-view">
          <div className="library-header">
            <h3>Chọn từ thư viện</h3>
            <button onClick={() => setShowLibrary(false)}>Đóng</button>
          </div>
          {loadingLibrary ? (
            <p>Đang tải...</p>
          ) : (
            <div className="image-grid">
              {libraryImages.map((image) => (
                <div 
                  key={image.publicId} 
                  className="image-item"
                  onClick={() => handleSelectFromLibrary(image)}
                >
                  <img src={image.url} alt={image.displayName} />
                  <p>{image.displayName}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MediaUploader;
