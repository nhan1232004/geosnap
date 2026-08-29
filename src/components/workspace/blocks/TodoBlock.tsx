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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = data.text ?? '';
  const checked = !!data.checked;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ text: e.target.value, checked });
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

  const toggleCheck = () => {
    onChange({ text, checked: !checked });
  };

  return (
    <div className="flex items-start gap-2.5 py-1">
      <button 
        type="button"
        onClick={toggleCheck}
        className="mt-1 text-text-dim hover:text-brand transition-colors cursor-pointer shrink-0"
      >
        {checked ? (
          <CheckSquare size={18} className="text-brand fill-brand/10" />
        ) : (
          <Square size={18} className="hover:text-brand" />
        )}
      </button>
      <textarea
        ref={textareaRef}
        rows={1}
        readOnly={!isEditing}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Việc cần làm..."
        className={`flex-1 bg-transparent resize-none overflow-hidden outline-none border-none p-0 text-sm sm:text-base leading-relaxed ${
          checked ? 'line-through text-text-dim/60' : 'text-text-main'
        } placeholder:text-text-dim/40 focus:ring-0`}
      />
    </div>
  );
}
