import React from 'react';
import { Block, ImageData } from '../../../types';

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: ImageData) => void;
}

export function ImageBlock({ block, isEditing, onChange }: Props) {
  const data = (block.data || {}) as unknown as ImageData;

  return (
    <div className="py-2 flex flex-col items-center">
      {data.url ? (
        <div className="relative group rounded-2xl overflow-hidden max-w-full">
          <img 
            src={data.url} 
            alt={data.caption || "Image"} 
            className="rounded-2xl max-h-[60vh] object-contain bg-surface-dim"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-surface-dim rounded-2xl flex items-center justify-center border border-dashed border-border-dim text-text-dim">
          <span>Đang tải ảnh...</span>
        </div>
      )}
      
      {(data.caption || isEditing) && (
        <div
          contentEditable={isEditing}
          suppressContentEditableWarning
          onInput={(e) => onChange({ ...data, caption: e.currentTarget.textContent || '' })}
          className="mt-2 text-sm text-text-dim outline-none text-center min-w-[200px] empty:before:content-['Thêm_chú_thích...']"
        >
          {data.caption || ''}
        </div>
      )}
    </div>
  );
}
