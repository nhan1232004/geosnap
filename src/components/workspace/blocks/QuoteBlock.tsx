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
    <div className="py-2 pl-4 border-l-4 border-brand/80 bg-brand/5 rounded-r-xl">
      <textarea
        ref={textareaRef}
        rows={1}
        readOnly={!isEditing}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Trích dẫn cảm xúc..."
        className="w-full bg-transparent resize-none overflow-hidden outline-none border-none p-0 italic text-sm sm:text-base leading-relaxed text-text-main placeholder:text-text-dim/40 focus:ring-0"
      />
    </div>
  );
}
