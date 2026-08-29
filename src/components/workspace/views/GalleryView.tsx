import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Plus, Image as ImageIcon, Globe, Lock, Users } from 'lucide-react';
import type { Page } from '../../../types';

interface GalleryViewProps {
  workspaceId: string;
  pages: Page[];
  onCreatePage: () => void;
}

export default function GalleryView({ workspaceId, pages, onCreatePage }: GalleryViewProps) {
  const navigate = useNavigate();

  const getVisibilityIcon = (visibility: Page['visibility']) => {
    switch (visibility) {
      case 'public':
        return <span title="Công khai"><Globe className="w-3 h-3 text-emerald-400" /></span>;
      case 'friends':
        return <span title="Bạn bè"><Users className="w-3 h-3 text-blue-400" /></span>;
      default:
        return <span title="Riêng tư"><Lock className="w-3 h-3 text-amber-400" /></span>;
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-text-heading">Chế độ Thư viện (Gallery View)</h2>
          <p className="text-xs text-text-dim mt-0.5">
            Tổng cộng {pages.length} chuyến đi & địa điểm
          </p>
        </div>
        <button
          onClick={onCreatePage}
          className="flex items-center gap-2 px-3.5 py-2 bg-brand text-white rounded-xl hover:bg-brand/90 transition-all font-semibold text-xs shadow-md shadow-brand/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo trang mới</span>
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface/50 border border-border-dim rounded-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-3">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text-heading mb-1">Chưa có trang nào trong mục này</h3>
          <p className="text-xs text-text-dim max-w-sm mb-4">
            Tạo một trang mới để bắt đầu lưu trữ ký ức và nhật ký hành trình của bạn.
          </p>
          <button
            onClick={onCreatePage}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl hover:bg-brand/90 transition-all text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo trang đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {pages.map((page) => (
            <div
              key={page.id}
              onClick={() => navigate(`/workspace/${workspaceId}/page/${page.id}`)}
              className="group flex flex-col bg-surface/80 hover:bg-surface border border-border-dim hover:border-brand/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
            >
              {/* Cover Banner */}
              <div className="h-36 w-full bg-gradient-to-br from-brand/20 via-orange-950/20 to-surface relative overflow-hidden">
                {page.cover ? (
                  <img
                    src={page.cover}
                    alt={page.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-dim/30">
                    <ImageIcon className="w-10 h-10 stroke-1" />
                  </div>
                )}

                {/* Visibility Badge */}
                <div className="absolute top-2.5 right-2.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-1.5 text-[11px] text-white">
                  {getVisibilityIcon(page.visibility)}
                  <span className="capitalize">{page.visibility}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-2xl shrink-0 select-none">
                    {page.icon || '📄'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-text-heading text-sm group-hover:text-brand transition-colors line-clamp-1">
                      {page.title || 'Trang chưa có tiêu đề'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-text-dim mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(page.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                </div>

                {page.legacyFolderId && (
                  <div className="flex items-center gap-1 text-[10px] text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md w-fit">
                    <MapPin className="w-3 h-3" />
                    <span>Album di chuyển</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
