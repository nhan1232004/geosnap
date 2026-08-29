import React from 'react';
import type { PageTreeNode } from '../../types';
import { PageTreeItem } from './PageTreeItem';

interface PageTreeProps {
  tree: PageTreeNode[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onCreateSubPage: (parentPageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onToggleFavorite: (pageId: string) => void;
}

export const PageTree: React.FC<PageTreeProps> = ({
  tree,
  activePageId,
  onSelectPage,
  onCreateSubPage,
  onDeletePage,
  onToggleFavorite,
}) => {
  if (!tree || tree.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-text-dim border-2 border-dashed border-border-dim/60 rounded-xl mx-2">
        <p className="mb-1 font-semibold">Chưa có trang nào</p>
        <p className="text-[11px]">Nhấn &apos;+&apos; để tạo trang mới</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {tree.map((node) => (
        <PageTreeItem
          key={node.page.id}
          node={node}
          activePageId={activePageId}
          depth={0}
          onSelectPage={onSelectPage}
          onCreateSubPage={onCreateSubPage}
          onDeletePage={onDeletePage}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
};
