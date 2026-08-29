import React from 'react';
import { Block, ChildPageData } from '../../../types';
import { FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  block: Block;
  workspaceId: string;
}

export function ChildPageBlock({ block, workspaceId }: Props) {
  const data = (block.data || {}) as unknown as ChildPageData;
  const navigate = useNavigate();

  const handleClick = () => {
    if (data.childPageId) {
      navigate(`/workspace/${workspaceId}/page/${data.childPageId}`);
    }
  };

  return (
    <div className="py-2">
      <div 
        onClick={handleClick}
        className="flex items-center justify-between p-3 rounded-xl border border-border-dim bg-surface hover:bg-surface-dim transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 text-brand rounded-lg">
            <FileText size={18} />
          </div>
          <span className="font-medium text-text-main group-hover:text-brand transition-colors">
            Trang con
          </span>
        </div>
        <ArrowRight size={18} className="text-text-dim group-hover:text-brand transition-colors transform group-hover:translate-x-1" />
      </div>
    </div>
  );
}
