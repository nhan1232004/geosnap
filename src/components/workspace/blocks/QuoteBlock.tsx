import React, { useRef, useEffect } from 'react';
import { Block, QuoteData } from '../../../types';

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: QuoteData) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function QuoteBlock({ block, isEditing, onChange, onKeyDown }: Props) {
  const data = (block.data || {}) as unknown as QuoteData;
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
    <div className="py-2">
      <div
        ref={contentRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="border-l-4 border-brand/80 pl-4 py-1 italic text-text-main/90 outline-none min-h-[1.5rem] empty:before:content-['Trích_dẫn'] empty:before:text-text-dim"
      >
        {data.text || ''}
      </div>
    </div>
  );
}
