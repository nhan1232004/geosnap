import React, { useRef, useEffect } from 'react';
import { Block, TodoData } from '../../../types';
import { CheckSquare, Square } from 'lucide-react';

interface Props {
  block: Block;
  isEditing: boolean;
  onChange: (data: TodoData) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function TodoBlock({ block, isEditing, onChange, onKeyDown }: Props) {
  const data = (block.data || {}) as unknown as TodoData;
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isEditing]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || '';
    onChange({ text: newText, checked: data.checked });
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

  const toggleCheck = () => {
    onChange({ text: data.text || '', checked: !data.checked });
  };

  return (
    <div className="flex items-start gap-2 py-1">
      <button 
        onClick={toggleCheck}
        className="mt-1 text-text-dim hover:text-brand transition-colors"
      >
        {data.checked ? <CheckSquare size={18} className="text-brand" /> : <Square size={18} />}
      </button>
      <div
        ref={contentRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`flex-1 outline-none min-h-[1.5rem] ${data.checked ? 'line-through text-text-dim' : 'text-text-main'} empty:before:content-['Việc_cần_làm'] empty:before:text-text-dim`}
      >
        {data.text || ''}
      </div>
    </div>
  );
}
