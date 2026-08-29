import React, { useRef, useEffect } from 'react';
import { Block, ParagraphData } from '../../../types';

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: ParagraphData) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onOpenSlashMenu?: (rect: DOMRect) => void;
}

export function ParagraphBlock({ block, isEditing, onChange, onKeyDown, onOpenSlashMenu }: Props) {
  const data = (block.data || {}) as unknown as ParagraphData;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = data.text ?? '';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange({ text: val });
    if (val === '/' && onOpenSlashMenu && textareaRef.current) {
      onOpenSlashMenu(textareaRef.current.getBoundingClientRect());
    }
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
    <div className="py-1">
      <textarea
        ref={textareaRef}
        rows={1}
        readOnly={!isEditing}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Nhập nội dung hoặc gõ '/' để chọn lệnh..."
        className="w-full bg-transparent resize-none overflow-hidden outline-none border-none p-0 text-sm sm:text-base leading-relaxed text-text-main placeholder:text-text-dim/50 focus:ring-0"
      />
    </div>
  );
}
