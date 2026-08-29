import React, { useEffect, useRef, useState } from 'react';
import { BlockType } from '../../types';
import { 
  Type, Heading1, Heading2, Heading3, 
  CheckSquare, List, ListOrdered, Quote, 
  MessageSquare, Minus, Image as ImageIcon, 
  Map as MapIcon, FileText, Search, X
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  search: string;
  onSelect: (type: BlockType, extraData?: any) => void;
  onClose: () => void;
}

const MENU_ITEMS = [
  { id: 'paragraph', icon: Type, label: 'Đoạn văn', desc: 'Văn bản thường không định dạng' },
  { id: 'heading_1', icon: Heading1, label: 'Tiêu đề lớn (H1)', desc: 'Tiêu đề chính cỡ lớn' },
  { id: 'heading_2', icon: Heading2, label: 'Tiêu đề vừa (H2)', desc: 'Tiêu đề phần' },
  { id: 'heading_3', icon: Heading3, label: 'Tiêu đề nhỏ (H3)', desc: 'Tiêu đề mục con' },
  { id: 'todo', icon: CheckSquare, label: 'Danh sách việc cần làm', desc: 'Checklist công việc có checkbox' },
  { id: 'bulleted_list', icon: List, label: 'Danh sách dấu đầu dòng', desc: 'Gạch đầu dòng đơn giản' },
  { id: 'numbered_list', icon: ListOrdered, label: 'Danh sách số', desc: 'Danh sách theo thứ tự 1, 2, 3' },
  { id: 'quote', icon: Quote, label: 'Trích dẫn', desc: 'Khối trích dẫn cảm xúc' },
  { id: 'callout', icon: MessageSquare, label: 'Hộp ghi chú nổi bật', desc: 'Ghi chú nổi bật có biểu tượng' },
  { id: 'divider', icon: Minus, label: 'Đường phân cách', desc: 'Đường kẻ chia tách nội dung' },
  { id: 'gallery', icon: ImageIcon, label: 'Thư viện ảnh', desc: 'Lưới ảnh chuyến đi' },
  { id: 'map', icon: MapIcon, label: 'Bản đồ địa điểm', desc: 'Bản đồ tương tác kèm tọa độ ghim' },
  { id: 'child_page', icon: FileText, label: 'Trang con', desc: 'Trang lồng nhau bên trong trang hiện tại' },
] as const;

export function SlashMenu({ isOpen, position, search: initialSearch, onSelect, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localSearch, setLocalSearch] = useState(initialSearch || '');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setLocalSearch(initialSearch || '');
  }, [initialSearch, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = MENU_ITEMS.filter(item => 
    item.label.toLowerCase().includes(localSearch.toLowerCase()) ||
    item.desc.toLowerCase().includes(localSearch.toLowerCase()) ||
    item.id.toLowerCase().includes(localSearch.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [localSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex].id as BlockType);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isFloating = position !== null;

  return (
    <div 
      className={isFloating ? 'fixed inset-0 z-50 pointer-events-none' : 'fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'}
    >
      <div 
        ref={menuRef}
        className="pointer-events-auto z-50 w-80 bg-surface border border-border-dim rounded-2xl shadow-2xl overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-100"
        style={
          isFloating
            ? {
                position: 'fixed',
                top: Math.min(position.y + 28, window.innerHeight - 380),
                left: Math.min(Math.max(16, position.x), window.innerWidth - 340),
              }
            : undefined
        }
      >
        <div className="px-3 pt-1 pb-2 border-b border-border-dim/60 flex items-center gap-2">
          <Search className="w-4 h-4 text-text-dim shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm kiếm khối hoặc gõ lệnh..."
            className="flex-1 bg-transparent text-xs text-text-main placeholder:text-text-dim outline-none border-none p-0"
          />
          {localSearch && (
            <button onClick={() => setLocalSearch('')} className="p-0.5 text-text-dim hover:text-text-main">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="px-3 py-1.5 text-[10px] font-bold text-text-dim uppercase tracking-wider">
          Chọn loại khối
        </div>

        <div className="max-h-[280px] overflow-y-auto px-1 space-y-0.5">
          {filteredItems.map((item, index) => {
            const Icon = item.icon;
            const isSelected = index === selectedIndex;
            
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id as BlockType)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-brand/10 text-brand' : 'hover:bg-surface-hover text-text-main'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-brand text-white' : 'bg-surface border border-border-dim text-text-dim'}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold truncate ${isSelected ? 'text-brand' : 'text-text-heading'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-text-dim truncate">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredItems.length === 0 && (
            <div className="px-4 py-6 text-xs text-text-dim text-center">
              Không tìm thấy khối nào phù hợp
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
