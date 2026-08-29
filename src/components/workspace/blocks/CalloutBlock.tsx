import React, { useRef, useEffect } from 'react';
import { Block, CalloutData } from '../../../types';

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: CalloutData) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function CalloutBlock({ block, isEditing, onChange, onKeyDown }: Props) {
  const data = (block.data || {}) as unknown as CalloutData;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = data.text ?? '';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ text: e.target.value, icon: data.icon });
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
    <div className="py-2">
      <div className="bg-surface/80 border border-border-dim p-3.5 flex items-start gap-3 rounded-2xl shadow-xs">
        <div className="text-xl leading-none mt-0.5 select-none">{data.icon || '💡'}</div>
        <textarea
          ref={textareaRef}
          rows={1}
          readOnly={!isEditing}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ghi chú nổi bật..."
          className="flex-1 bg-transparent resize-none overflow-hidden outline-none border-none p-0 text-sm sm:text-base leading-relaxed text-text-main placeholder:text-text-dim/40 focus:ring-0"
        />
      </div>
    </div>
  );
}
