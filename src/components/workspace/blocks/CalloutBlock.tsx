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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isEditing]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || '';
    onChange({ text: newText, icon: data.icon });
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
      <div className="bg-surface/80 border border-border-dim p-3.5 flex items-start gap-3 rounded-xl">
        <div className="text-xl leading-none mt-0.5">{data.icon || '💡'}</div>
        <div
          ref={contentRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="flex-1 outline-none min-h-[1.5rem] text-text-main empty:before:content-['Ghi_chú'] empty:before:text-text-dim"
        >
          {data.text || ''}
        </div>
      </div>
    </div>
  );
}
