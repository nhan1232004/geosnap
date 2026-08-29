import React, { useState } from 'react';
import { X, Globe, Users, Lock, Link as LinkIcon, Check, Copy } from 'lucide-react';
import type { Page } from '../../types';

interface ShareModalProps {
  isOpen: boolean;
  page: Page | null;
  onClose: () => void;
  onUpdateVisibility: (visibility: 'private' | 'friends' | 'public') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  page,
  onClose,
  onUpdateVisibility,
}) => {
  const [copied, setCopied] = useState(false);
  const visibility = page?.visibility || 'private';

  if (!isOpen || !page) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://geosnap.app/p/${page.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chia sẻ trang</h2>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Public Link Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Globe className="w-5 h-5 mr-3 text-blue-500" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Công khai lên web</h3>
                  <p className="text-xs text-gray-500">Bất kỳ ai có liên kết đều có thể xem</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={visibility === 'public'}
                  onChange={(e) => onUpdateVisibility(e.target.checked ? 'public' : 'private')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {visibility === 'public' && (
              <div className="flex items-center mt-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex-1 truncate text-sm text-gray-600 dark:text-gray-400 px-2">
                  https://geosnap.app/p/{page.id}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 mr-1 text-green-500" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>
            )}
          </div>

          <hr className="border-gray-200 dark:border-gray-800 my-4" />

          {/* Visibility Options */}
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">Quyền truy cập chung</h3>
            
            <button
              onClick={() => onUpdateVisibility('private')}
              className={`w-full flex items-center p-3 rounded-lg border ${visibility === 'private' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <Lock className="w-5 h-5 mr-3 text-gray-500" />
              <div className="flex-1 text-left">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Chỉ mình tôi</div>
                <div className="text-xs text-gray-500">Chỉ bạn mới có thể truy cập trang này</div>
              </div>
              {visibility === 'private' && <Check className="w-5 h-5 text-blue-600" />}
            </button>

            <button
              onClick={() => onUpdateVisibility('friends')}
              className={`w-full flex items-center p-3 rounded-lg border ${visibility === 'friends' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <Users className="w-5 h-5 mr-3 text-gray-500" />
              <div className="flex-1 text-left">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Bạn bè</div>
                <div className="text-xs text-gray-500">Người trong danh sách bạn bè có thể xem</div>
              </div>
              {visibility === 'friends' && <Check className="w-5 h-5 text-blue-600" />}
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center py-2 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-white/90 transition-colors"
          >
            <LinkIcon className="w-4 h-4 mr-2" /> Sao chép liên kết
          </button>
        </div>
      </div>
    </div>
  );
};
