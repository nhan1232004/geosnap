import React, { useEffect, useState } from 'react';
import { Block, ChildPageData, Page } from '../../../types';
import { FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPage } from '../../../lib/workspaceService';

interface Props {
  block: Block;
  workspaceId: string;
}

export function ChildPageBlock({ block, workspaceId }: Props) {
  const data = (block.data || {}) as unknown as ChildPageData & { title?: string; icon?: string };
  const navigate = useNavigate();
  const [pageInfo, setPageInfo] = useState<Page | null>(null);

  useEffect(() => {
    if (data.childPageId) {
      getPage(data.childPageId).then(p => {
        if (p) setPageInfo(p);
      }).catch(console.error);
    }
  }, [data.childPageId]);

  const handleClick = () => {
    if (data.childPageId) {
      navigate(`/workspace/${workspaceId}/page/${data.childPageId}`);
    }
  };

  const title = pageInfo?.title || data.title || 'Trang con';
  const icon = pageInfo?.icon || data.icon;

  return (
    <div className="py-2">
      <div 
        onClick={handleClick}
        className="flex items-center justify-between p-3 rounded-xl border border-border-dim bg-surface hover:bg-surface-dim transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 text-brand rounded-lg flex items-center justify-center min-w-[34px] min-h-[34px]">
            {icon ? <span className="text-base leading-none">{icon}</span> : <FileText size={18} />}
          </div>
          <span className="font-medium text-text-main group-hover:text-brand transition-colors">
            {title}
          </span>
        </div>
        <ArrowRight size={18} className="text-text-dim group-hover:text-brand transition-colors transform group-hover:translate-x-1" />
      </div>
    </div>
  );
}
