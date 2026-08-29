import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';

interface IconPickerProps {
  currentIcon?: string;
  onSelect: (icon: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  { name: 'Phổ biến', emojis: ['⭐', '🔥', '✨', '💡', '📌', '🎉', '🚀', '❤️'] },
  { name: 'Du lịch & Địa điểm', emojis: ['✈️', '🏝️', '🏔️', '🏕️', '🗺️', '🗽', '🗼', '⛩️', '🏰', '🌅'] },
  { name: 'Đồ vật', emojis: ['📸', '🎒', '📱', '💻', '☕', '🍔', '🍕', '🎸', '🎨', '📚'] },
  { name: 'Thiên nhiên', emojis: ['🌿', '🌸', '🍂', '🍁', '🍄', '🌍', '🌙', '☀️', '⭐', '🌈'] },
  { name: 'Cảm xúc', emojis: ['😀', '🥰', '😎', '🤩', '🤔', '😴', '🤯', '🥳'] },
];

export const IconPicker: React.FC<IconPickerProps> = ({
  currentIcon,
  onSelect,
  onRemove,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState(EMOJI_CATEGORIES[0].name);

  return (
    <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-sm">Chọn biểu tượng</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex overflow-x-auto p-2 border-b border-gray-200 dark:border-gray-800 no-scrollbar">
        {EMOJI_CATEGORIES.map((category) => (
          <button
            key={category.name}
            onClick={() => setActiveTab(category.name)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs rounded-full mr-2 ${
              activeTab === category.name 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="p-3 h-48 overflow-y-auto">
        <div className="grid grid-cols-6 gap-2">
          {EMOJI_CATEGORIES.find((c) => c.name === activeTab)?.emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg flex items-center justify-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
        {currentIcon ? (
          <button
            onClick={onRemove}
            className="flex items-center text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa biểu tượng
          </button>
        ) : (
          <span className="text-xs text-gray-400">Không có biểu tượng</span>
        )}
      </div>
    </div>
  );
};
