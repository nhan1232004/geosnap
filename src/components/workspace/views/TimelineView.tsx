import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Plus, ArrowRight } from 'lucide-react';
import type { Page } from '../../../types';

interface TimelineViewProps {
  workspaceId: string;
  pages: Page[];
  onCreatePage: () => void;
}

export default function TimelineView({ workspaceId, pages, onCreatePage }: TimelineViewProps) {
  const navigate = useNavigate();

  // Sort pages chronologically (newest first)
  const sortedPages = [...pages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-bold text-text-heading flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand" />
            <span>Dòng thời gian hành trình (Timeline View)</span>
          </h2>
          <p className="text-xs text-text-dim mt-0.5">
            Sắp xếp theo thứ tự thời gian tạo và trải nghiệm
          </p>
        </div>
        <button
          onClick={onCreatePage}
          className="flex items-center gap-2 px-3.5 py-2 bg-brand text-white rounded-xl hover:bg-brand/90 transition-all font-semibold text-xs shadow-md shadow-brand/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm sự kiện</span>
        </button>
      </div>

      {sortedPages.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface/50 border border-border-dim rounded-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text-heading mb-1">Dòng thời gian trống</h3>
          <p className="text-xs text-text-dim max-w-sm mb-4">
            Tạo các trang hành trình để xây dựng cuốn nhật ký du lịch theo trình tự thời gian.
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
        <div className="relative pl-6 sm:pl-8 border-l-2 border-border-dim/60 space-y-8 my-4">
          {sortedPages.map((page) => {
            const date = new Date(page.createdAt);
            const dateFormatted = date.toLocaleDateString('vi-VN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <div key={page.id} className="relative group">
                {/* Timeline Node Icon */}
                <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full bg-surface border-2 border-brand flex items-center justify-center text-xs group-hover:scale-125 group-hover:bg-brand group-hover:text-white transition-all shadow-md">
                  <div className="w-2 h-2 rounded-full bg-brand group-hover:bg-white" />
                </div>

                {/* Content Card */}
                <div
                  onClick={() => navigate(`/workspace/${workspaceId}/page/${page.id}`)}
                  className="bg-surface/80 hover:bg-surface border border-border-dim hover:border-brand/40 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-2xl shrink-0">
                      {page.icon || '📍'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-brand font-semibold mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateFormatted}</span>
                      </div>
                      <h3 className="text-base font-bold text-text-heading group-hover:text-brand transition-colors truncate">
                        {page.title || 'Trang chưa có tiêu đề'}
                      </h3>
                      {page.legacyFolderId && (
                        <div className="flex items-center gap-1 text-[11px] text-text-dim mt-1">
                          <MapPin className="w-3 h-3 text-brand" />
                          <span>Album kỷ niệm</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {page.cover && (
                    <img
                      src={page.cover}
                      alt={page.title}
                      className="w-full sm:w-28 h-20 object-cover rounded-xl shrink-0"
                    />
                  )}

                  <div className="hidden sm:flex items-center text-text-dim group-hover:text-brand group-hover:translate-x-1 transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
