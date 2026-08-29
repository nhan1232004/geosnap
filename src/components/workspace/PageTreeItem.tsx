import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal, FileText, Trash2, Star } from 'lucide-react';
import type { PageTreeNode } from '../../types';

interface PageTreeItemProps {
  node: PageTreeNode;
  activePageId: string | null;
  depth: number;
  onSelectPage: (pageId: string) => void;
  onCreateSubPage: (parentPageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onToggleFavorite: (pageId: string) => void;
}

export const PageTreeItem: React.FC<PageTreeItemProps> = ({
  node,
  activePageId,
  depth,
  onSelectPage,
  onCreateSubPage,
  onDeletePage,
  onToggleFavorite,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = activePageId === node.page.id;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <div
        className={`group flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
          isActive 
            ? 'bg-brand/15 text-brand font-semibold' 
            : 'text-text-main/80 hover:bg-surface-hover hover:text-text-main'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelectPage(node.page.id)}
      >
        <div className="flex items-center flex-1 min-w-0">
          <div 
            className="w-4 h-4 flex items-center justify-center mr-1 text-text-dim hover:bg-surface rounded-sm"
            onClick={toggleExpand}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <span className="w-3.5 h-3.5" />
            )}
          </div>
          
          <div className="flex items-center flex-1 min-w-0">
            {node.page.icon ? (
              <span className="mr-1.5 text-sm">{node.page.icon}</span>
            ) : (
              <FileText className="w-3.5 h-3.5 mr-1.5 text-text-dim" />
            )}
            <span className="truncate">{node.page.title || 'Trang chưa có tiêu đề'}</span>
          </div>
        </div>

        {/* Action icons on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubPage(node.page.id);
            }}
            className="p-1 hover:bg-surface rounded text-text-dim hover:text-text-main"
            title="Thêm trang con"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-surface rounded text-text-dim hover:text-text-main"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }} 
                />
                <div className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border-dim rounded-xl shadow-xl z-50 py-1 text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(node.page.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center px-3 py-1.5 hover:bg-surface-hover text-left gap-2 text-text-main"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>Yêu thích</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(node.page.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center px-3 py-1.5 hover:bg-surface-hover text-left gap-2 text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa trang</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Render children recursively */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <PageTreeItem
              key={child.page.id}
              node={child}
              activePageId={activePageId}
              depth={depth + 1}
              onSelectPage={onSelectPage}
              onCreateSubPage={onCreateSubPage}
              onDeletePage={onDeletePage}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};
