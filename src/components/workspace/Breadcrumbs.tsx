import React from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import type { Page, Workspace } from '../../types';

interface BreadcrumbsProps {
  workspace: Workspace | null;
  ancestors: Page[];
  currentPage: Page | null;
  onNavigateWorkspace?: () => void;
  onNavigatePage?: (pageId: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  workspace,
  ancestors,
  currentPage,
  onNavigateWorkspace,
  onNavigatePage,
}) => {
  return (
    <nav className="flex items-center space-x-1 text-xs text-text-dim overflow-hidden whitespace-nowrap">
      {workspace && (
        <button
          onClick={onNavigateWorkspace}
          className="flex items-center hover:bg-surface px-2 py-1 rounded-lg transition-colors cursor-pointer text-text-main font-semibold"
        >
          {workspace.icon ? (
            <span className="mr-1.5">{workspace.icon}</span>
          ) : (
            <span className="mr-1.5 text-xs">🌍</span>
          )}
          <span className="truncate max-w-[120px]">{workspace.name}</span>
        </button>
      )}

      {ancestors.map((ancestor) => (
        <React.Fragment key={ancestor.id}>
          <ChevronRight className="w-3.5 h-3.5 text-text-dim/60 shrink-0" />
          <button
            onClick={() => onNavigatePage?.(ancestor.id)}
            className="flex items-center hover:bg-surface px-2 py-1 rounded-lg transition-colors text-text-main/80 cursor-pointer"
          >
            {ancestor.icon ? (
              <span className="mr-1.5">{ancestor.icon}</span>
            ) : (
              <FileText className="w-3.5 h-3.5 mr-1.5 text-text-dim" />
            )}
            <span className="truncate max-w-[100px]">{ancestor.title || 'Trang'}</span>
          </button>
        </React.Fragment>
      ))}

      {currentPage && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-text-dim/60 shrink-0" />
          <div className="flex items-center px-2 py-1 font-semibold text-text-heading">
            {currentPage.icon ? (
              <span className="mr-1.5">{currentPage.icon}</span>
            ) : (
              <FileText className="w-3.5 h-3.5 mr-1.5 text-brand" />
            )}
            <span className="truncate max-w-[150px]">
              {currentPage.title || 'Trang chưa có tiêu đề'}
            </span>
          </div>
        </>
      )}
    </nav>
  );
};
