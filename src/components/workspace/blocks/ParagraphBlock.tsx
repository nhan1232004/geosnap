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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      if (sel) {
        range.selectNodeContents(contentRef.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [isEditing]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || '';
    onChange({ text: newText });
    
    if (newText === '/' && onOpenSlashMenu && contentRef.current) {
      onOpenSlashMenu(contentRef.current.getBoundingClientRect());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' && (contentRef.current?.textContent || '') === '') {
      e.preventDefault();
      onKeyDown?.(e);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onKeyDown?.(e);
    } else {
      onKeyDown?.(e);
    }
  };

  return (
    <div className="py-1">
      <div
        ref={contentRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="outline-none min-h-[1.5rem] text-text-main empty:before:content-[attr(data-placeholder)] empty:before:text-text-dim"
        data-placeholder="Nhập nội dung hoặc gõ '/' để chọn lệnh..."
      >
        {data.text || ''}
      </div>
    </div>
  );
}
