import React, { useRef, useEffect } from 'react';
import { Block, ListItemData } from '../../../types';

interface Props {
  block: Block;
  isEditing: boolean;
  indexInList?: number;
  onChange: (data: ListItemData) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function ListBlock({ block, isEditing, indexInList = 0, onChange, onKeyDown }: Props) {
  const data = (block.data || {}) as unknown as ListItemData;
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isEditing]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || '';
    onChange({ text: newText });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' && (contentRef.current?.textContent || '') === '') {
      e.preventDefault();
      onKeyDown?.(e);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onKeyDown?.(e);
    } else {
      onKeyDown?.(e);
    }
  };

  return (
    <div className="flex items-start gap-2 py-1">
      <div className="mt-0.5 min-w-[1.5rem] text-text-dim select-none font-medium text-right pr-2">
        {block.type === 'bulleted_list' ? '•' : `${indexInList + 1}.`}
      </div>
      <div
        ref={contentRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="flex-1 outline-none min-h-[1.5rem] text-text-main empty:before:content-['Danh_sách'] empty:before:text-text-dim"
      >
        {data.text || ''}
      </div>
    </div>
  );
}
