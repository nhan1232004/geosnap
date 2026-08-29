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
  const contentRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isEditing]);

  const handleInput = (e: React.FormEvent<HTMLHeadingElement>) => {
    const newText = e.currentTarget.textContent || '';
    onChange({ text: newText, level: data.level || 1 });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
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

  const commonClasses = "outline-none empty:before:content-['Tiêu_đề'] empty:before:text-text-dim text-text-heading";
  
  if (data.level === 1) {
    return (
      <h1
        ref={contentRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`text-2xl font-bold py-2 ${commonClasses}`}
      >{data.text || ''}</h1>
    );
  }
  
  if (data.level === 2) {
    return (
      <h2
        ref={contentRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`text-xl font-bold py-1.5 ${commonClasses}`}
      >{data.text || ''}</h2>
    );
  }
  
  return (
    <h3
      ref={contentRef}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      className={`text-lg font-semibold py-1 ${commonClasses}`}
    >{data.text || ''}</h3>
  );
}
