import React, { useRef, useState } from 'react';
import { Block, ImageData } from '../../../types';
import { Image as ImageIcon, UploadCloud, RefreshCw } from 'lucide-react';
import { uploadImageFile } from '../../../lib/firestoreService';
import { auth } from '../../../firebase';
import { useLightbox } from '../../Lightbox';

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: ImageData) => void;
}

export function ImageBlock({ block, isEditing, onChange }: Props) {
  const data = (block.data || {}) as unknown as ImageData;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { openAt, lightboxElement } = useLightbox(
    data.url ? [{ url: data.url, caption: data.caption }] : []
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const user = auth.currentUser;
    if (!user) return;

    setUploading(true);
    try {
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const url = await uploadImageFile(file, `workspaces/${block.pageId}/${filename}`);
      onChange({
        ...data,
        url,
      });
    } catch (err) {
      console.error('Image upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="py-2 flex flex-col items-center group">
      {lightboxElement}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {data.url ? (
        <div className="relative group rounded-2xl overflow-hidden max-w-full shadow-lg border border-border-dim">
          <img 
            src={data.url} 
            alt={data.caption || "Image"} 
            onClick={() => openAt(0)}
            className="rounded-2xl max-h-[60vh] object-contain bg-surface cursor-pointer hover:scale-[1.01] transition-transform"
            loading="lazy"
          />
          {isEditing && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-xs font-semibold backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
            >
              <RefreshCw size={12} className={uploading ? 'animate-spin' : ''} />
              <span>{uploading ? 'Đang tải...' : 'Đổi ảnh'}</span>
            </button>
          )}
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-44 bg-surface hover:bg-surface-hover rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-border-dim text-text-dim hover:text-brand gap-2 cursor-pointer transition-all"
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-brand animate-pulse">
              <UploadCloud className="w-5 h-5 animate-bounce" />
              <span>Đang tải ảnh lên...</span>
            </div>
          ) : (
            <>
              <ImageIcon size={28} />
              <span className="text-xs font-semibold">Nhấn để tải ảnh lên</span>
              <span className="text-[11px] text-text-dim/60">Hỗ trợ JPG, PNG, WEBP</span>
            </>
          )}
        </div>
      )}
      
      {isEditing ? (
        <input
          type="text"
          value={data.caption || ''}
          onChange={(e) => onChange({ ...data, caption: e.target.value })}
          placeholder="Thêm chú thích cho ảnh..."
          className="mt-2 text-xs text-center text-text-dim bg-transparent outline-none border-none placeholder:text-text-dim/40 max-w-md w-full"
        />
      ) : data.caption ? (
        <div className="mt-2 text-xs text-text-dim text-center">
          {data.caption}
        </div>
      ) : null}
    </div>
  );
}
