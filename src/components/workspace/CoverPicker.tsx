import React, { useState } from 'react';
import { X, Image as ImageIcon, Link, Trash2 } from 'lucide-react';

interface CoverPickerProps {
  currentCover?: string;
  onSelect: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

const PRESET_COVERS = [
  { id: 'sunset', url: 'https://images.unsplash.com/photo-1616036740257-9449ea1f6605?auto=format&fit=crop&w=1200&q=80', label: 'Sunset' },
  { id: 'mountain', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', label: 'Mountain' },
  { id: 'beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', label: 'Beach' },
  { id: 'cityscape', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80', label: 'Cityscape' },
  { id: 'forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db8855?auto=format&fit=crop&w=1200&q=80', label: 'Forest' },
  { id: 'dark-gradient', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1200&q=80', label: 'Dark Gradient' },
  { id: 'light-gradient', url: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&w=1200&q=80', label: 'Light Gradient' },
];

export const CoverPicker: React.FC<CoverPickerProps> = ({
  currentCover,
  onSelect,
  onRemove,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'link'>('gallery');
  const [customUrl, setCustomUrl] = useState('');

  return (
    <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex-1 py-3 text-sm font-medium flex justify-center items-center ${activeTab === 'gallery' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Thư viện
        </button>
        <button
          onClick={() => setActiveTab('link')}
          className={`flex-1 py-3 text-sm font-medium flex justify-center items-center ${activeTab === 'link' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Link className="w-4 h-4 mr-2" />
          Liên kết
        </button>
      </div>

      <div className="p-4 h-64 overflow-y-auto">
        {activeTab === 'gallery' ? (
          <div className="grid grid-cols-2 gap-2">
            {PRESET_COVERS.map((cover) => (
              <button
                key={cover.id}
                onClick={() => onSelect(cover.url)}
                className="relative h-20 rounded-md overflow-hidden group border border-gray-200 dark:border-gray-700"
              >
                <img src={cover.url} alt={cover.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-3 mt-4">
            <label className="text-sm text-gray-600 dark:text-gray-400">Dán liên kết hình ảnh</label>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => customUrl && onSelect(customUrl)}
              disabled={!customUrl}
              className="w-full py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              Áp dụng
            </button>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
        {currentCover ? (
          <button
            onClick={onRemove}
            className="flex items-center text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa ảnh bìa
          </button>
        ) : (
          <span className="text-xs text-gray-400">Không có ảnh bìa</span>
        )}
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
          Đóng
        </button>
      </div>
    </div>
  );
};
