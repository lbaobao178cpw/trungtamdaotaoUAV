import React, { useState, useEffect, useCallback, memo } from 'react';

const MEDIA_API_URL = 'http://localhost:5001/api';

// === CSS ĐẸP & HIỆN ĐẠI ===
const CSS_STYLES = `
  .media-overlay {
    position: fixed; inset: 0; background-color: rgba(0,0,0,0.6);
    display: flex; justify-content: center; align-items: center; z-index: 9999;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease-out;
  }
  .media-modal {
    background: #fff; width: 90%; max-width: 900px; height: 85vh;
    border-radius: 16px; display: flex; flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .media-header {
    padding: 16px 24px; border-bottom: 1px solid #eee;
    display: flex; justify-content: space-between; align-items: center;
    background: #fff;
  }
  .media-title { font-size: 18px; font-weight: 700; color: #1a202c; margin: 0; }
  
  /* GRID ẢNH */
  .media-grid {
    flex: 1; overflow-y: auto; padding: 20px;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px; align-content: start;
    background-color: #f7fafc;
  }

  /* ITEM ẢNH: Card Style */
  .media-item {
    position: relative; aspect-ratio: 1/1; border-radius: 12px;
    overflow: hidden; cursor: pointer; background: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 3px solid transparent;
  }
  .media-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  
  /* TRẠNG THÁI ĐƯỢC CHỌN */
  .media-item.selected {
    border-color: #3182ce; /* Màu xanh dương chuyên nghiệp */
    box-shadow: 0 0 0 4px rgba(49, 130, 206, 0.2);
  }
  .media-item.selected::after {
    content: "✔"; position: absolute; top: 8px; right: 8px;
    background: #3182ce; color: white; width: 24px; height: 24px;
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .media-img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    pointer-events: none; /* Tối ưu hiệu năng */
  }

  /* Tên file: Gradient đẹp thay vì nền đen cục mịch */
  .media-name {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
    color: white; font-size: 11px; padding: 20px 8px 6px 8px;
    text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    opacity: 0.9; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }

  /* Nút xóa: Chỉ hiện khi hover */
  .media-del-btn {
    position: absolute; top: 8px; left: 8px;
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(255, 255, 255, 0.9); color: #e53e3e;
    border: none; cursor: pointer; display: flex;
    align-items: center; justify-content: center;
    opacity: 0; transition: all 0.2s; transform: scale(0.8);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    font-weight: bold; z-index: 10;
  }
  .media-del-btn:hover { background: #e53e3e; color: white; }
  .media-item:hover .media-del-btn { opacity: 1; transform: scale(1); }

  /* FOOTER */
  .media-footer {
    padding: 16px 24px; border-top: 1px solid #eee;
    display: flex; justify-content: space-between; align-items: center;
    background: #fff;
  }
  
  .btn-upload {
    padding: 10px 20px; background: #edf2f7; color: #2d3748;
    border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
    transition: background 0.2s;
  }
  .btn-upload:hover { background: #e2e8f0; }

  .btn-select {
    padding: 10px 28px; background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 100%);
    color: white; border: none; border-radius: 8px; cursor: pointer;
    font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px rgba(49, 130, 206, 0.3);
    transition: all 0.2s;
  }
  .btn-select:hover { transform: translateY(-1px); box-shadow: 0 6px 8px rgba(49, 130, 206, 0.4); }
  .btn-select:disabled { background: #cbd5e0; cursor: not-allowed; box-shadow: none; transform: none; }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

// === COMPONENT ITEM ẢNH ===
const MediaItem = memo(({ file, isSelected, onSelect, onDelete }) => {
    return (
        <div 
            className={`media-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(file)}
            title={file.filename} // Hover lâu sẽ hiện tên đầy đủ
        >
            <img 
                src={file.thumbUrl || file.url} // Ưu tiên Thumbnail
                alt={file.filename} 
                className="media-img"
                loading="lazy" 
                decoding="async"
                onError={(e) => { e.target.onerror = null; e.target.src = file.url; }}
            />
            <div className="media-name">{file.filename}</div>
            <button 
                className="media-del-btn"
                onClick={(e) => { e.stopPropagation(); onDelete(file.filename); }}
                title="Xóa ảnh này"
            >🗑</button>
        </div>
    );
}, (prev, next) => prev.isSelected === next.isSelected && prev.file === next.file);

// === COMPONENT CHÍNH ===
export default function MediaSelector({ onSelect, onClose }) {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetch(`${MEDIA_API_URL}/files`)
            .then(res => res.json())
            .then(data => setFiles(Array.isArray(data) ? data : []))
            .catch(e => console.error(e));
    }, []);

    const handleUpload = async (e) => {
        if (!e.target.files[0]) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('mediaFile', e.target.files[0]);
        try {
            await fetch(`${MEDIA_API_URL}/upload`, { method: 'POST', body: formData });
            const res = await fetch(`${MEDIA_API_URL}/files`);
            setFiles(await res.json());
        } catch (e) { alert("Lỗi upload"); } 
        finally { setUploading(false); }
    };

    const handleDelete = useCallback(async (filename) => {
        if (!confirm("Bạn có chắc muốn xóa ảnh này không?")) return;
        try {
            await fetch(`${MEDIA_API_URL}/files/${filename}`, { method: 'DELETE' });
            setFiles(prev => prev.filter(f => f.filename !== filename));
            setSelectedFile(prev => (prev && prev.filename === filename ? null : prev));
        } catch (e) { alert("Lỗi xóa"); }
    }, []);

    const handleSelect = useCallback((file) => {
        setSelectedFile(file);
    }, []);

    return (
        <>
            <style>{CSS_STYLES}</style>
            <div className="media-overlay">
                <div className="media-modal">
                    {/* HEADER */}
                    <div className="media-header">
                        <h3 className="media-title">Thư viện Media ({files.length})</h3>
                        <button onClick={onClose} style={{border:'none', background:'transparent', fontSize:24, cursor:'pointer', color:'#718096'}}>✕</button>
                    </div>

                    {/* GRID */}
                    <div className="media-grid">
                        {files.map(file => (
                            <MediaItem 
                                key={file.filename} 
                                file={file} 
                                isSelected={selectedFile?.filename === file.filename}
                                onSelect={handleSelect}
                                onDelete={handleDelete}
                            />
                        ))}
                        {files.length === 0 && <p style={{textAlign:'center', width:'100%', color:'#a0aec0', marginTop:50}}>Chưa có ảnh nào. Hãy tải lên!</p>}
                    </div>

                    {/* FOOTER */}
                    <div className="media-footer">
                        <div style={{display:'flex', alignItems:'center', gap:10}}>
                            <input type="file" id="upload-input" hidden onChange={handleUpload} accept="image/*" />
                            <label htmlFor="upload-input" className="btn-upload">
                                {uploading ? "⏳ Đang xử lý..." : "☁️ Tải ảnh lên"}
                            </label>
                        </div>

                        <div style={{display:'flex', alignItems:'center', gap:15}}>
                            {selectedFile && (
                                <span style={{fontSize:13, color:'#718096', maxWidth:200, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                    Đã chọn: <b>{selectedFile.filename}</b>
                                </span>
                            )}
                            <button 
                                className="btn-select"
                                disabled={!selectedFile}
                                onClick={() => { if(selectedFile) { onSelect(selectedFile.url); onClose(); }}}
                            >
                                CHỌN ẢNH NÀY
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}