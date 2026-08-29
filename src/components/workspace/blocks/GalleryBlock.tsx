import React from 'react';
import { Block, GalleryData } from '../../../types';
import { Image as ImageIcon } from 'lucide-react';

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: GalleryData) => void;
}

export function GalleryBlock({ block, isEditing, onChange }: Props) {
  const data = (block.data || { assetIds: [] }) as unknown as GalleryData;
  const cols = data.columns || 3;

  if (!data.assetIds || data.assetIds.length === 0) {
    return (
      <div className="py-4 w-full h-32 bg-surface-dim rounded-2xl flex flex-col items-center justify-center border border-dashed border-border-dim text-text-dim gap-2">
        <ImageIcon size={24} />
        <span>Thư viện ảnh trống</span>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className={`grid grid-cols-${cols} gap-2`}>
        {data.assetIds.map((id, index) => (
          <div key={id} className="aspect-square bg-surface-dim rounded-lg flex items-center justify-center overflow-hidden relative group">
            <div className="text-text-dim text-xs">Ảnh {index + 1}</div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors cursor-pointer" />
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-text-dim flex justify-end">
        {data.assetIds.length} ảnh
      </div>
    </div>
  );
}
