import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPage, getPageBlocks } from '../lib/workspaceService';
import type { Page, Block } from '../types';
import { BlockRenderer } from '../components/workspace/BlockRenderer';
import { MapPin, Globe, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function PublicPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pageId) return;
    let isMounted = true;

    async function loadPublicPage() {
      try {
        setLoading(true);
        setError(null);
        const p = await getPage(pageId!);
        if (!p) {
          setError('Không tìm thấy trang hoặc trang đã bị xóa.');
          return;
        }

        if (p.visibility !== 'public') {
          setError('Trang này được đặt ở chế độ riêng tư bởi tác giả.');
          return;
        }

        const b = await getPageBlocks(pageId!);
        if (!isMounted) return;
        setPage(p);
        setBlocks(b);
      } catch (err: any) {
        console.error('Failed to load public page:', err);
        setError('Không thể tải trang. Vui lòng thử lại sau.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPublicPage();
    return () => { isMounted = false; };
  }, [pageId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep flex flex-col items-center justify-center text-text-main p-4">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-text-dim">Đang tải trang công khai...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-bg-deep flex flex-col items-center justify-center text-text-main p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-surface border border-border-dim flex items-center justify-center text-text-dim mb-4 shadow-xl">
          <Lock className="w-8 h-8 text-brand" />
        </div>
        <h1 className="text-2xl font-bold text-text-heading mb-2">Trang không khả dụng</h1>
        <p className="text-sm text-text-dim max-w-md mb-6">{error || 'Không thể xem nội dung trang này.'}</p>
        <Link
          to="/"
          className="px-5 py-2.5 bg-brand text-white rounded-xl font-semibold text-sm hover:bg-brand/90 transition-all flex items-center gap-2 shadow-lg shadow-brand/20"
        >
          <span>Về trang chủ GeoSnap</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep text-text-main flex flex-col">
      {/* Top Banner Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border-dim px-4 sm:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-black text-lg text-text-heading">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center text-white shadow-md shadow-brand/30">
            <MapPin className="w-4 h-4" />
          </div>
          <span>GeoSnap</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-text-dim bg-bg-card px-2.5 py-1 rounded-lg border border-border-dim">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trang công khai</span>
          </span>
          <Link
            to="/workspace"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand/90 transition-all shadow-md shadow-brand/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mở Workspace</span>
          </Link>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto pb-32">
        {/* Cover Hero Banner */}
        {page.cover && (
          <div className="w-full h-56 sm:h-72 bg-surface overflow-hidden">
            <img
              src={page.cover}
              alt={page.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="px-6 sm:px-12 pt-8">
          {/* Icon */}
          <div className="w-20 h-20 rounded-3xl bg-surface border-4 border-bg-deep shadow-2xl flex items-center justify-center text-4xl -mt-16 mb-4">
            <span>{page.icon || '📄'}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-heading mb-4 leading-tight">
            {page.title || 'Trang chưa có tiêu đề'}
          </h1>

          {/* Metadata */}
          <div className="flex items-center gap-3 py-3 border-y border-border-dim/50 text-xs text-text-dim mb-8">
            <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-lg border border-border-dim">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Public</span>
            </div>
            <span>Cập nhật ngày {new Date(page.updatedAt || page.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>

          {/* Blocks */}
          <div className="space-y-1">
            {blocks.map((block, index) => (
              <BlockRenderer
                key={block.id}
                block={block}
                workspaceId={page.workspaceId}
                isEditing={false}
                indexInList={index + 1}
                onUpdate={() => {}}
                onDelete={() => {}}
                onInsertBelow={() => {}}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
