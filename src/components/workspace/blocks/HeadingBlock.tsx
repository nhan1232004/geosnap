import React, { useRef, useEffect } from 'react';
import { Block, HeadingData } from '../../../types';

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: HeadingData) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function HeadingBlock({ block, isEditing, onChange, onKeyDown }: Props) {
  const data = (block.data || { level: 1 }) as unknown as HeadingData;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = data.text ?? '';
  const level = data.level || 1;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ text: e.target.value, level });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onKeyDown?.(e);
    } else if (e.key === 'Backspace' && text === '') {
      e.preventDefault();
      onKeyDown?.(e);
    }
  };

  const levelStyles = 
    level === 1
      ? 'text-2xl sm:text-3xl font-extrabold text-text-heading py-2'
      : level === 2
      ? 'text-xl sm:text-2xl font-bold text-text-heading py-1.5'
      : 'text-lg sm:text-xl font-semibold text-text-heading py-1';

  return (
    <div className="py-1">
      <textarea
        ref={textareaRef}
        rows={1}
        readOnly={!isEditing}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={`Tiêu đề ${level === 1 ? 'lớn (H1)' : level === 2 ? 'vừa (H2)' : 'nhỏ (H3)'}...`}
        className={`w-full bg-transparent resize-none overflow-hidden outline-none border-none p-0 ${levelStyles} placeholder:text-text-dim/40 focus:ring-0`}
      />
    </div>
  );
}
