import React, { useState, useEffect } from 'react';
import { Sparkles, Key, CheckCircle, AlertCircle, RefreshCw, X, FileText, Compass } from 'lucide-react';
import {
  isGeminiAvailable,
  setCustomGeminiApiKey,
  generateTripSummary,
  generateItineraryDraft,
} from '../../lib/geminiService';
import type { Page, Block } from '../../types';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: Page | null;
  currentBlocks: Block[];
  onInsertBlocks: (blocks: Partial<Block>[]) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentPage,
  currentBlocks,
  onInsertBlocks,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'assistant' | 'settings'>('assistant');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Assistant generator form
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState('Khám phá, Ẩm thực, Nhiếp ảnh');

  useEffect(() => {
    const saved = localStorage.getItem('geosnap_gemini_api_key') || '';
    setApiKey(saved);
    setHasKey(isGeminiAvailable());
    if (currentPage?.title) {
      setDestination(currentPage.title);
    }
  }, [isOpen, currentPage]);

  if (!isOpen) return null;

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      setCustomGeminiApiKey('');
      setHasKey(isGeminiAvailable());
      setStatusMessage({ text: 'Đã xóa API key tùy chỉnh.', type: 'info' });
      return;
    }

    setCustomGeminiApiKey(apiKey.trim());
    setHasKey(isGeminiAvailable());
    setStatusMessage({ text: 'Đã lưu Google Gemini API Key thành công!', type: 'success' });
    setTimeout(() => {
      setActiveTab('assistant');
      setStatusMessage(null);
    }, 1000);
  };

  const handleGenerateSummary = async () => {
    if (!currentPage) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const summaryResult = await generateTripSummary(
        currentPage.title || 'Hành trình du lịch',
        undefined,
        undefined,
        currentBlocks.length
      );
      const newBlock: Partial<Block> = {
        type: 'callout',
        data: {
          text: `**${summaryResult.title}**\n\n${summaryResult.summary}\n\n${summaryResult.tags.map((t) => `#${t}`).join(' ')}`,
          icon: '✨',
          color: 'indigo',
        },
      };
      onInsertBlocks([newBlock]);
      setStatusMessage({ text: 'Đã tạo bản tóm tắt và chèn vào trang!', type: 'success' });
      setTimeout(onClose, 1200);
    } catch (e: any) {
      setStatusMessage({ text: e.message || 'Lỗi khi gọi Gemini API', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateItinerary = async () => {
    if (!destination.trim()) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const draftMarkdown = await generateItineraryDraft(destination, days);

      const createdBlocks: Partial<Block>[] = [
        {
          type: 'heading_2',
          data: { text: `Lịch trình gợi ý bởi Gemini: ${destination} (${days} ngày)` },
        },
        {
          type: 'callout',
          data: {
            text: `🎯 Sở thích: ${interests} | Thời lượng: ${days} ngày`,
            icon: '🧭',
            color: 'teal',
          },
        },
        {
          type: 'paragraph',
          data: { text: draftMarkdown },
        },
      ];

      onInsertBlocks(createdBlocks);
      setStatusMessage({ text: `Đã chèn lịch trình ${days} ngày vào trang!`, type: 'success' });
      setTimeout(onClose, 1200);
    } catch (e: any) {
      setStatusMessage({ text: e.message || 'Lỗi khi tạo lịch trình với Gemini', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border-dim rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-dim bg-surface/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand/15 text-brand flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-text-heading">Trợ lý du lịch Gemini AI</h2>
              <p className="text-[11px] text-text-dim">Tự động lập lịch trình và tóm tắt chuyến đi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-dim hover:text-text-main transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border-dim/60 px-4 pt-2 gap-2 bg-surface/30">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'assistant'
                ? 'border-brand text-brand'
                : 'border-transparent text-text-dim hover:text-text-main'
            }`}
          >
            Tính năng AI
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-brand text-brand'
                : 'border-transparent text-text-dim hover:text-text-main'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Cài đặt API Key</span>
            {hasKey && <CheckCircle className="w-3 h-3 text-emerald-400" />}
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div
            className={`px-4 py-2.5 text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20'
                : statusMessage.type === 'error'
                ? 'bg-rose-500/10 text-rose-400 border-b border-rose-500/20'
                : 'bg-blue-500/10 text-blue-400 border-b border-blue-500/20'
            }`}
          >
            {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'settings' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-heading mb-1">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-bg-deep border border-border-dim rounded-xl text-xs text-text-main placeholder:text-text-dim/50 focus:outline-none focus:border-brand font-mono"
                />
                <p className="text-[11px] text-text-dim mt-1.5">
                  Lấy khóa API miễn phí từ Google AI Studio tại{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand hover:underline"
                  >
                    aistudio.google.com
                  </a>
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-text-dim">
                  Trạng thái:{' '}
                  <strong className={hasKey ? 'text-emerald-400' : 'text-amber-400'}>
                    {hasKey ? 'Đã sẵn sàng' : 'Chưa cấu hình API Key'}
                  </strong>
                </span>
                <button
                  onClick={handleSaveKey}
                  className="px-4 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md shadow-brand/20"
                >
                  Lưu khóa API
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Option 1: Generate Summary */}
              <div className="p-3.5 bg-bg-deep/70 border border-border-dim rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand" />
                    <span className="text-xs font-bold text-text-heading">
                      Tóm tắt nội dung trang hiện tại
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-text-dim leading-relaxed">
                  Gemini sẽ quét các khối ghi chú, hình ảnh và địa điểm trong trang để tạo một bản
                  tóm tắt súc tích và nêu bật cảm xúc hành trình.
                </p>
                <button
                  onClick={handleGenerateSummary}
                  disabled={loading || !hasKey}
                  className="w-full mt-2 py-2 bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{loading ? 'Đang phân tích...' : 'Tạo tóm tắt trang'}</span>
                </button>
              </div>

              {/* Option 2: Generate Itinerary */}
              <div className="p-3.5 bg-bg-deep/70 border border-border-dim rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold text-text-heading">
                    Lên lịch trình du lịch tự động
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">
                      Điểm đến
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Ví dụ: Đà Lạt, Kyoto..."
                      className="w-full px-2.5 py-1.5 bg-surface border border-border-dim rounded-lg text-xs text-text-main focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">
                      Số ngày
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={days}
                      onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border-dim rounded-lg text-xs text-text-main focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">
                    Sở thích & Phong cách
                  </label>
                  <input
                    type="text"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="Ẩm thực, leo núi, nghỉ dưỡng..."
                    className="w-full px-2.5 py-1.5 bg-surface border border-border-dim rounded-lg text-xs text-text-main focus:outline-none focus:border-brand"
                  />
                </div>

                <button
                  onClick={handleGenerateItinerary}
                  disabled={loading || !hasKey || !destination.trim()}
                  className="w-full py-2 bg-gradient-to-r from-teal-500/20 to-brand/20 hover:from-teal-500/30 hover:to-brand/30 border border-teal-500/30 text-text-heading rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-teal-400" />}
                  <span>{loading ? 'Đang tạo lịch trình...' : 'Tạo lịch trình bằng Gemini'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
