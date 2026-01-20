import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    DndContext, useDraggable, useDroppable, useSensor, useSensors,
    PointerSensor, MouseSensor, TouchSensor
} from '@dnd-kit/core';
import "../admin/Admin/Admin.css";

const MEDIA_API_URL = 'http://localhost:5000/api';

// --- ICONS SVG (Dùng thay thế cho Emoji) ---
const Icons = {
    Folder: () => (
        <svg width="60" height="60" viewBox="0 0 24 24" fill="#fcd34d" stroke="#d97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
    ),
    Video: () => (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
            <line x1="7" y1="2" x2="7" y2="22"></line>
            <line x1="17" y1="2" x2="17" y2="22"></line>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="2" y1="7" x2="7" y2="7"></line>
            <line x1="2" y1="17" x2="7" y2="17"></line>
            <line x1="17" y1="17" x2="22" y2="17"></line>
            <line x1="17" y1="7" x2="22" y2="7"></line>
        </svg>
    ),
    Image: () => (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
    ),
    More: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
        </svg>
    ),
    Back: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
    )
};

// --- COMPONENT: Nút Quay Lại ---
const ParentDropZone = memo(({ onBack }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'PARENT_DROP_ZONE',
        data: { type: 'parent_nav' }
    });
    return (
        <div ref={setNodeRef} style={{
            border: isOver ? '2px dashed #22c55e' : '1px solid transparent',
            backgroundColor: isOver ? '#dcfce7' : 'transparent',
            borderRadius: '4px', padding: '4px', transition: 'all 0.2s', display: 'inline-block'
        }}>
            <button onClick={onBack} className="btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icons.Back />
                {isOver ? "Thả để ra ngoài" : "Quay lại"}
            </button>
        </div>
    );
});

// --- COMPONENT: MEDIA ITEM ---
const MediaItem = memo(({ item, isSelected, onItemClick, onNavigate, onOpenMenu, isMenuOpen }) => {
    const isFolder = item.type === 'folder';
    const isPano = useMemo(() => !isFolder && (item.filename.toLowerCase().includes('pano') || item.filename.toLowerCase().includes('360')), [item.filename, isFolder]);

    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
        id: item.path,
        data: { type: item.type, name: item.filename, path: item.path },
        disabled: isMenuOpen
    });

    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: item.path,
        disabled: !isFolder,
        data: { type: 'folder', path: item.path }
    });

    const setRefs = (node) => { setDragRef(node); setDropRef(node); };

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: transform ? 999 : 'auto',
        opacity: isDragging ? 0.5 : (transform ? 0.8 : 1),
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
    };

    const folderActiveStyle = (isFolder && isOver) ? {
        border: '2px dashed #22c55e', backgroundColor: '#dcfce7', transform: 'scale(1.05)'
    } : {};

    const [imgError, setImgError] = useState(false);

    return (
        <div
            ref={setRefs}
            style={{ ...style, ...folderActiveStyle }}
            {...listeners}
            {...attributes}
            className={`media-item ${isSelected ? 'selected' : ''} ${isFolder ? 'media-folder' : ''} ${isMenuOpen ? 'menu-open' : ''}`}
            title={item.filename}
            onClick={(e) => onItemClick(item, e)}
            onDoubleClick={(e) => { e.stopPropagation(); if (isFolder) onNavigate(item.filename); }}
        >
            <div className="media-preview">
                {isFolder ? <Icons.Folder /> : (
                    <>
                        {item.type === 'video' ? (
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Icons.Video />
                                <span style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>VIDEO</span>
                            </div>
                        ) : (
                            (!imgError && item.thumbUrl) ? (
                                <img src={item.thumbUrl} alt={item.filename} loading="lazy" onError={() => setImgError(true)} />
                            ) : (
                                <div style={{ textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Icons.Image />
                                    <span style={{ fontSize: 10, marginTop: 4 }}>{item.filename.split('.').pop()}</span>
                                </div>
                            )
                        )}
                        {isPano && <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 4px', fontSize: 10 }}>360°</div>}
                    </>
                )}
            </div>

            <div className="media-name">{item.filename}</div>

            {/* Nút 3 chấm */}
            <button
                className="btn-more"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenMenu(item, e);
                }}
                title="Tùy chọn"
            >
                <Icons.More />
            </button>
        </div>
    );
}, (prev, next) => {
    return prev.item.path === next.item.path &&
        prev.isSelected === next.isSelected &&
        prev.isOver === next.isOver &&
        prev.isMenuOpen === next.isMenuOpen;
});

// --- MAIN COMPONENT ---
export default function MediaSelector({ onSelect, onClose }) {
    const [files, setFiles] = useState([]);
    const [selectedPaths, setSelectedPaths] = useState(new Set());
    const [uploading, setUploading] = useState(false);
    const [currentPath, setCurrentPath] = useState("");

    // --- STATE MENU & CLIPBOARD ---
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const [clipboard, setClipboard] = useState({ items: [], action: null });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        window.addEventListener('scroll', handleClickOutside, true);
        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleClickOutside, true);
        };
    }, []);

    const fetchFiles = useCallback((pathStr = "") => {
        const encodedPath = encodeURIComponent(pathStr);
        fetch(`${MEDIA_API_URL}/files?folder=${encodedPath}`)
            .then(res => res.json())
            .then(data => {
                setFiles(Array.isArray(data) ? data : []);
                setSelectedPaths(new Set());
                setActiveMenuId(null);
            })
            .catch(e => console.error(e));
    }, []);

    useEffect(() => { fetchFiles(currentPath); }, [currentPath, fetchFiles]);

    // --- LOGIC XỬ LÝ VỊ TRÍ MENU ---
    const handleOpenMenu = useCallback((item, event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        let left = rect.right - 180;
        let top = rect.bottom + 5;
        if (left < 10) left = rect.left;
        if (top + 150 > window.innerHeight) top = rect.top - 150;

        setMenuPos({ top, left });
        setActiveMenuId(item.path);
    }, []);

    const handleMenuAction = (action) => {
        const item = files.find(f => f.path === activeMenuId);
        if (!item) return;

        setActiveMenuId(null);
        switch (action) {
            case 'copy': setClipboard({ items: [item], action: 'copy' }); break;
            case 'cut': setClipboard({ items: [item], action: 'cut' }); break;
            case 'rename': handleRename(item); break;
            case 'delete': handleDelete(item.path); break;
            default: break;
        }
    };

    // --- CÁC HÀM XỬ LÝ LOGIC ---
    const handlePaste = useCallback(async () => {
        if (!clipboard.items.length || !clipboard.action) return;
        const promises = clipboard.items.map(async (item) => {
            const body = { itemName: item.filename, oldPath: item.path, newFolderPath: currentPath, isCopy: clipboard.action === 'copy' };
            const endpoint = clipboard.action === 'copy' ? `${MEDIA_API_URL}/copy` : `${MEDIA_API_URL}/move`;
            try { await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (e) { console.error(e); }
        });
        await Promise.all(promises);
        if (clipboard.action === 'cut') setClipboard({ items: [], action: null });
        fetchFiles(currentPath);
    }, [clipboard, currentPath, fetchFiles]);

    const handleRename = useCallback(async (item) => {
        const newName = prompt("Nhập tên mới:", item.filename);
        if (!newName || newName === item.filename) return;
        try { await fetch(`${MEDIA_API_URL}/rename`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPath: item.path, newName: newName }) }); fetchFiles(currentPath); } catch (e) { console.error(e); }
    }, [currentPath, fetchFiles]);

    const handleDelete = useCallback(async (pathToDelete) => {
        if (!confirm("Bạn chắc chắn muốn xóa?")) return;
        const paths = pathToDelete ? [pathToDelete] : Array.from(selectedPaths);
        await Promise.all(paths.map(p => fetch(`${MEDIA_API_URL}/files?path=${encodeURIComponent(p)}`, { method: 'DELETE' })));
        fetchFiles(currentPath);
        setSelectedPaths(new Set());
    }, [currentPath, fetchFiles, selectedPaths]);

    const handleItemClick = useCallback((item, event) => {
        if (event.ctrlKey || event.metaKey) {
            setSelectedPaths(prev => {
                const newSet = new Set(prev);
                if (newSet.has(item.path)) newSet.delete(item.path); else newSet.add(item.path); return newSet;
            });
        } else setSelectedPaths(new Set([item.path]));
    }, []);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;
        setUploading(true);
        

        try {
            await Promise.all(acceptedFiles.map(async (file) => {
                const formData = new FormData();
                formData.append('folderPath', currentPath || "");
                formData.append('mediaFile', file);

                try {
                    const response = await fetch(`${MEDIA_API_URL}/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    
                } catch (e) {
                    console.error("❌ Upload error:", e);
                }
            }));
        } finally {
            setUploading(false);
            
            fetchFiles(currentPath);
        }
    }, [currentPath, fetchFiles]);

    // Handler riêng cho input file upload (hỗ trợ await)
    const handleFileInputUpload = useCallback(async (e) => {
        const files = Array.from(e.target.files);
        
        await onDrop(files);
        // Reset input để có thể upload file cùng tên lần khác
        e.target.value = '';
    }, [onDrop]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true, noKeyboard: true, noDrag: true });

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        let targetPath = null;
        if (over.data.current?.type === 'folder') targetPath = over.data.current.path;
        else if (over.id === 'PARENT_DROP_ZONE') {
            if (!currentPath) return;
            const parts = currentPath.split('/'); parts.pop(); targetPath = parts.join('/');
        }
        if (targetPath === null && targetPath !== "") return;
        try {
            await fetch(`${MEDIA_API_URL}/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemName: active.data.current.name, oldPath: active.id, newFolderPath: targetPath }) });
            fetchFiles(currentPath);
        } catch (e) { }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
            if (isInput) return;

            if (isCtrl && e.key === 'a') { e.preventDefault(); setSelectedPaths(new Set(files.map(f => f.path))); return; }
            if (isCtrl && e.key === 'c' && selectedPaths.size > 0) { e.preventDefault(); setClipboard({ items: files.filter(f => selectedPaths.has(f.path)), action: 'copy' }); return; }
            if (isCtrl && e.key === 'x' && selectedPaths.size > 0) { e.preventDefault(); setClipboard({ items: files.filter(f => selectedPaths.has(f.path)), action: 'cut' }); return; }
            if (isCtrl && e.key === 'v') { e.preventDefault(); handlePaste(); return; }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPaths.size > 0) { handleDelete(null); return; }
            if (e.key === 'F2' && selectedPaths.size === 1) { const item = files.find(f => f.path === Array.from(selectedPaths)[0]); if (item) handleRename(item); return; }
            if (e.key === 'Escape') { if (activeMenuId) setActiveMenuId(null); else if (selectedPaths.size > 0) setSelectedPaths(new Set()); else onClose(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [files, selectedPaths, clipboard, handlePaste, handleDelete, handleRename, onClose, activeMenuId]);

    return (
        <div className="media-overlay">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="media-modal-content">
                    {/* --- HEADER --- */}
                    <div className="media-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h3 style={{ fontSize: 18, margin: 0, fontWeight: 700 }}> {currentPath ? `/${currentPath}` : "/ Thư mục gốc"} </h3>
                            {currentPath && <ParentDropZone onBack={() => { const parts = currentPath.split('/'); parts.pop(); setCurrentPath(parts.join('/')); }} />}
                        </div>
                        <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>

                    {/* --- TOOLBAR --- */}
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 10, alignItems: 'center', background: 'white' }}>
                        <button onClick={() => { const name = prompt("Tên thư mục:"); if (name) fetch(`${MEDIA_API_URL}/create-folder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderName: name, currentPath }) }).then(() => fetchFiles(currentPath)); }} className="btn btn-warning btn-sm"> + Thư mục </button>
                        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', margin: 0 }}> {uploading ? "Đang tải..." : "Tải lên"} <input type="file" hidden multiple onChange={handleFileInputUpload} /> </label>
                        {clipboard.items.length > 0 && (<button onClick={handlePaste} className="btn btn-secondary btn-sm" style={{ display: 'flex', gap: 5, alignItems: 'center', border: '1px solid var(--primary)', color: 'var(--primary)' }}> Dán ({clipboard.items.length}) </button>)}
                        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#666' }}> {selectedPaths.size > 0 ? <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{selectedPaths.size} mục đã chọn</span> : ""} </div>
                    </div>

                    {/* --- MEDIA GRID --- */}
                    <div {...getRootProps()} style={{ flex: 1, overflowY: 'auto', position: 'relative', minHeight: 300, outline: 'none', background: '#f8f9fa' }}>
                        <input {...getInputProps()} />
                        <div className="media-grid">
                            {files.map(item => (
                                <div key={item.path} onClick={(e) => e.stopPropagation()}>
                                    <MediaItem
                                        item={item}
                                        isSelected={selectedPaths.has(item.path)}
                                        onItemClick={handleItemClick}
                                        onNavigate={(n) => setCurrentPath(p => p ? `${p}/${n}` : n)}
                                        onOpenMenu={handleOpenMenu}
                                        isMenuOpen={activeMenuId === item.path}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* --- FOOTER --- */}
                    <div className="media-footer">
                        <button className="btn-select-confirm" disabled={selectedPaths.size === 0} onClick={() => { const last = Array.from(selectedPaths).pop(); const file = files.find(f => f.path === last); if (file && file.type !== 'folder') { onSelect(file.url); onClose(); } }}> Xác nhận chọn ({selectedPaths.size}) </button>
                    </div>

                    {/* --- GLOBAL DROPDOWN MENU (NO EMOJI) --- */}
                    {activeMenuId && (
                        <div
                            className="dropdown-menu"
                            style={{ top: menuPos.top, left: menuPos.left }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="dropdown-item" onClick={() => handleMenuAction('copy')}>Sao chép</button>
                            <button className="dropdown-item" onClick={() => handleMenuAction('cut')}>Di chuyển</button>
                            <button className="dropdown-item" onClick={() => handleMenuAction('rename')}>Đổi tên</button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item delete" onClick={() => handleMenuAction('delete')}>Xóa</button>
                        </div>
                    )}
                </div>
            </DndContext>
        </div>
    );
}