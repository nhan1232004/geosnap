import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Map, Compass, Palette } from 'lucide-react';
import type { Page } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  pages: Page[];
  onSelectPage: (id: string) => void;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  pages,
  onSelectPage,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(query.toLowerCase())
  );

  const actions = [
    { id: 'action-map', title: 'Mở Bản đồ', icon: <Map className="w-4 h-4" /> },
    { id: 'action-explore', title: 'Khám phá', icon: <Compass className="w-4 h-4" /> },
    { id: 'action-theme', title: 'Đổi giao diện', icon: <Palette className="w-4 h-4" /> },
  ].filter(a => a.title.toLowerCase().includes(query.toLowerCase()));

  const allItems = [...filteredPages.map(p => ({ ...p, type: 'page' })), ...actions.map(a => ({ ...a, type: 'action' }))];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[selectedIndex];
      if (item) {
        if (item.type === 'page') {
          onSelectPage(item.id);
        } else {
          // Handle action
          console.log('Action selected:', item.id);
        }
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#1f1f1f] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm trang, hành động... (Ví dụ: 'Đà Lạt')"
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-lg"
          />
          <div className="text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">ESC</div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {allItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              Không tìm thấy kết quả nào cho "{query}"
            </div>
          ) : (
            <>
              {filteredPages.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trang</div>
                  {filteredPages.map((page, idx) => {
                    const itemIndex = idx;
                    const isSelected = selectedIndex === itemIndex;
                    return (
                      <button
                        key={page.id}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        onClick={() => { onSelectPage(page.id); onClose(); }}
                        className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {page.icon ? (
                          <span className="w-5 h-5 flex items-center justify-center mr-3">{page.icon}</span>
                        ) : (
                          <FileText className={`w-5 h-5 mr-3 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                        )}
                        <span className="font-medium truncate">{page.title || 'Trang chưa có tiêu đề'}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {actions.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</div>
                  {actions.map((action, idx) => {
                    const itemIndex = filteredPages.length + idx;
                    const isSelected = selectedIndex === itemIndex;
                    return (
                      <button
                        key={action.id}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        onClick={() => { console.log('Action:', action.id); onClose(); }}
                        className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className={`w-5 h-5 flex items-center justify-center mr-3 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
                          {action.icon}
                        </div>
                        <span className="font-medium">{action.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
