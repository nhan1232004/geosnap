import React, { useState } from 'react';
import { Search, Plus, ChevronDown, FolderSync } from 'lucide-react';
import type { Workspace, PageTreeNode } from '../../types';
import { PageTree } from './PageTree';

interface WorkspaceSidebarProps {
  workspace: Workspace | null;
  workspaces: Workspace[];
  pageTree: PageTreeNode[];
  activePageId: string | null;
  onSelectWorkspace: (id: string) => void;
  onSelectPage: (id: string) => void;
  onCreatePage: (parentId: string | null) => void;
  onDeletePage?: (pageId: string) => void;
  onOpenCommandPalette: () => void;
  onOpenMigration: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspace,
  workspaces,
  pageTree,
  activePageId,
  onSelectWorkspace,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  onOpenCommandPalette,
  onOpenMigration,
}) => {
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

  return (
    <div className="w-full h-full flex flex-col bg-surface/70 border-r border-border-dim text-text-main select-none">
      {/* Header / Workspace Switcher */}
      <div className="p-3 border-b border-border-dim/60">
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="w-full flex items-center justify-between p-2 hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
          >
            <div className="flex items-center truncate gap-2">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-brand/15 text-brand text-xs font-bold shrink-0">
                {workspace?.icon || '🌍'}
              </span>
              <span className="font-bold text-xs truncate text-text-heading">
                {workspace?.name || 'Không gian của tôi'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-dim shrink-0" />
          </button>

          {showWorkspaceMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowWorkspaceMenu(false)} />
              <div className="absolute top-full left-0 w-full mt-1 bg-surface border border-border-dim rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      onSelectWorkspace(w.id);
                      setShowWorkspaceMenu(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-xs hover:bg-surface-hover gap-2 text-left transition-colors ${
                      w.id === workspace?.id ? 'text-brand font-semibold' : 'text-text-main'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-md flex items-center justify-center bg-surface-hover text-xs">
                      {w.icon || '🌍'}
                    </span>
                    <span className="truncate">{w.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quick Search Button */}
        <button
          onClick={onOpenCommandPalette}
          className="w-full mt-2 flex items-center justify-between px-2.5 py-1.5 bg-surface hover:bg-surface-hover border border-border-dim rounded-xl text-xs text-text-dim hover:text-text-main transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Tìm kiếm nhanh...</span>
          </div>
          <kbd className="px-1.5 py-0.5 bg-bg-deep rounded border border-border-dim text-[10px] font-mono text-text-dim">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Page Tree Section */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[11px] font-bold text-text-dim uppercase tracking-wider">
              Tất cả các trang
            </span>
            <button
              onClick={() => onCreatePage(null)}
              className="p-1 hover:bg-surface-hover text-text-dim hover:text-brand rounded-lg transition-colors cursor-pointer"
              title="Tạo trang mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <PageTree
            tree={pageTree}
            activePageId={activePageId}
            onSelectPage={onSelectPage}
            onCreateSubPage={(parentId) => onCreatePage(parentId)}
            onDeletePage={onDeletePage || (() => {})}
            onToggleFavorite={() => {}}
          />
        </div>
      </div>

      {/* Footer / Migration trigger */}
      <div className="p-3 border-t border-border-dim/60 bg-surface/40">
        <button
          onClick={onOpenMigration}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand/10 hover:bg-brand/20 border border-brand/25 text-brand rounded-xl text-xs font-semibold transition-all cursor-pointer"
        >
          <FolderSync className="w-3.5 h-3.5" />
          <span>Chuyển đổi Album cũ</span>
        </button>
      </div>
    </div>
  );
};
