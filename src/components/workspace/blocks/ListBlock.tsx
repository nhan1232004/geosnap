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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = data.text ?? '';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ text: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onKeyDown?.(e);
    } else if (e.key === 'Backspace' && text === '') {
      e.preventDefault();
      onKeyDown?.(e);
    } else {
      onKeyDown?.(e);
    }
  };

  return (
    <div className="flex items-start gap-2 py-1">
      <div className="mt-0.5 min-w-[1.25rem] text-brand select-none font-bold text-center">
        {block.type === 'bulleted_list' ? '•' : `${indexInList + 1}.`}
      </div>
      <textarea
        ref={textareaRef}
        rows={1}
        readOnly={!isEditing}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Danh sách..."
        className="flex-1 bg-transparent resize-none overflow-hidden outline-none border-none p-0 text-sm sm:text-base leading-relaxed text-text-main placeholder:text-text-dim/40 focus:ring-0"
      />
    </div>
  );
}
