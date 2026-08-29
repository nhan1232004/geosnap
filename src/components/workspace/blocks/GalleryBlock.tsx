import React, { useRef, useState } from 'react';
import { Block, GalleryData } from '../../../types';
import { Image as ImageIcon, Plus, X, UploadCloud } from 'lucide-react';
import { uploadImageFile } from '../../../lib/firestoreService';
import { auth } from '../../../firebase';
import { useLightbox } from '../../Lightbox';

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: GalleryData) => void;
}

export function GalleryBlock({ block, isEditing, onChange }: Props) {
  const data = (block.data || { assetIds: [] }) as unknown as GalleryData;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const photos = data.assetIds || [];
  const { openAt, lightboxElement } = useLightbox(
    photos.map((p, i) => ({ url: p, caption: `Ảnh ${i + 1}` }))
  );
  const cols = data.columns || Math.min(Math.max(photos.length, 2), 4);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const user = auth.currentUser;
    if (!user) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const url = await uploadImageFile(file, `workspaces/${block.pageId}/${filename}`);
        uploadedUrls.push(url);
      }
      onChange({
        ...data,
        assetIds: [...photos, ...uploadedUrls],
      });
    } catch (err) {
      console.error('Gallery upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = photos.filter((_, i) => i !== idx);
    onChange({ ...data, assetIds: updated });
  };

  if (photos.length === 0) {
    return (
      <div className="py-4">
        {lightboxElement}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-36 bg-surface hover:bg-surface-hover border-2 border-dashed border-border-dim rounded-2xl flex flex-col items-center justify-center text-text-dim hover:text-brand gap-2 cursor-pointer transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          {uploading ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-brand animate-pulse">
              <UploadCloud className="w-5 h-5 animate-bounce" />
              <span>Đang tải ảnh lên...</span>
            </div>
          ) : (
            <>
              <ImageIcon size={28} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">Nhấn để thêm ảnh vào bộ sưu tập</span>
              <span className="text-[11px] text-text-dim/60">Hỗ trợ JPG, PNG, WEBP</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-3">
      {lightboxElement}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      <div
        className="grid gap-2.5 rounded-2xl overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {photos.map((url, index) => (
          <div
            key={`${url}-${index}`}
            onClick={() => openAt(index)}
            className="aspect-square bg-surface border border-border-dim rounded-xl overflow-hidden relative group cursor-pointer"
          >
            <img
              src={url}
              alt={`Ảnh ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

            {isEditing && (
              <button
                type="button"
                onClick={(e) => handleRemovePhoto(index, e)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                title="Gỡ ảnh"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs text-text-dim">
        <span>{photos.length} bức ảnh</span>
        {isEditing && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1 bg-surface hover:bg-surface-hover border border-border-dim rounded-lg font-semibold text-text-main hover:text-brand transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>{uploading ? 'Đang tải...' : 'Thêm ảnh'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
