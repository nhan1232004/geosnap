import React, { useState } from 'react';
import { Block, BlockType } from '../../types';
import { Plus, GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { TodoBlock } from './blocks/TodoBlock';
import { ListBlock } from './blocks/ListBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { CalloutBlock } from './blocks/CalloutBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { GalleryBlock } from './blocks/GalleryBlock';
import { MapBlock } from './blocks/MapBlock';
import { ChildPageBlock } from './blocks/ChildPageBlock';
import { SlashMenu } from './SlashMenu';

interface Props {
  block: Block;
  workspaceId: string;
  isEditing?: boolean;
  indexInList?: number;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onInsertBelow: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onTransformType?: (type: BlockType, extraData?: any) => void;
}

export function BlockRenderer({
  block,
  workspaceId,
  isEditing = true,
  indexInList,
  onUpdate,
  onDelete,
  onInsertBelow,
  onMoveUp,
  onMoveDown,
  onTransformType,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [slashMenuState, setSlashMenuState] = useState<{
    isOpen: boolean;
    rect: DOMRect | null;
    search: string;
  }>({
    isOpen: false,
    rect: null,
    search: ''
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      onInsertBelow();
    } else if (e.key === 'Backspace') {
      onDelete();
    }
  };

  const handleOpenSlashMenu = (rect: DOMRect) => {
    setSlashMenuState({ isOpen: true, rect, search: '' });
  };

  const handleSelectSlashMenu = (type: BlockType, extraData?: any) => {
    setSlashMenuState(prev => ({ ...prev, isOpen: false }));
    if (onTransformType) {
      onTransformType(type, extraData);
    } else {
      onInsertBelow();
    }
  };

  const renderBlock = () => {
    switch (block.type) {
      case 'paragraph':
        return <ParagraphBlock block={block} isEditing={isEditing} onChange={onUpdate} onKeyDown={handleKeyDown} onOpenSlashMenu={handleOpenSlashMenu} />;
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return <HeadingBlock block={block} isEditing={isEditing} onChange={onUpdate} onKeyDown={handleKeyDown} />;
      case 'todo':
        return <TodoBlock block={block} isEditing={isEditing} onChange={onUpdate} onKeyDown={handleKeyDown} />;
      case 'bulleted_list':
      case 'numbered_list':
        return <ListBlock block={block} isEditing={isEditing} indexInList={indexInList} onChange={onUpdate} onKeyDown={handleKeyDown} />;
      case 'quote':
        return <QuoteBlock block={block} isEditing={isEditing} onChange={onUpdate} onKeyDown={handleKeyDown} />;
      case 'callout':
        return <CalloutBlock block={block} isEditing={isEditing} onChange={onUpdate} onKeyDown={handleKeyDown} />;
      case 'divider':
        return <DividerBlock />;
      case 'image':
        return <ImageBlock block={block} isEditing={isEditing} onChange={onUpdate} />;
      case 'gallery':
        return <GalleryBlock block={block} isEditing={isEditing} onChange={onUpdate} />;
      case 'map':
        return <MapBlock block={block} isEditing={isEditing} onChange={onUpdate} />;
      case 'child_page':
        return <ChildPageBlock block={block} workspaceId={workspaceId} />;
      default:
        return <div className="text-red-500 py-2">Unknown block type: {block.type}</div>;
    }
  };

  return (
    <div 
      className="relative group flex items-start -ml-12 pl-12"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isEditing && (
        <div className={`absolute left-0 top-1.5 flex items-center gap-1 opacity-0 transition-opacity ${isHovered ? 'opacity-100' : ''}`}>
          <button 
            onClick={onInsertBelow}
            className="p-1 text-text-dim hover:text-text-main hover:bg-surface-dim rounded-md"
            title="Thêm khối (Enter)"
          >
            <Plus size={16} />
          </button>
          <div className="flex flex-col">
             <div className="flex items-center">
                <button 
                  onClick={onMoveUp}
                  className="p-0.5 text-text-dim hover:text-text-main hover:bg-surface-dim rounded-sm"
                  title="Di chuyển lên"
                >
                  <ArrowUp size={12} />
                </button>
                <button 
                  onClick={onMoveDown}
                  className="p-0.5 text-text-dim hover:text-text-main hover:bg-surface-dim rounded-sm"
                  title="Di chuyển xuống"
                >
                  <ArrowDown size={12} />
                </button>
             </div>
             <button 
                className="p-1 cursor-grab text-text-dim hover:text-text-main hover:bg-surface-dim rounded-md"
                title="Kéo để di chuyển"
             >
                <GripVertical size={16} />
             </button>
          </div>
          <button 
            onClick={onDelete}
            className="p-1 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded-md"
            title="Xóa khối"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        {renderBlock()}
      </div>

      <SlashMenu 
        isOpen={slashMenuState.isOpen}
        position={slashMenuState.rect ? { x: slashMenuState.rect.left, y: slashMenuState.rect.bottom } : null}
        search={slashMenuState.search}
        onSelect={handleSelectSlashMenu}
        onClose={() => setSlashMenuState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
