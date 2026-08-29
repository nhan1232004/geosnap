import React, { useEffect, useRef } from 'react';
import { BlockType } from '../../types';
import { 
  Type, Heading1, Heading2, Heading3, 
  CheckSquare, List, ListOrdered, Quote, 
  MessageSquare, Minus, Image as ImageIcon, 
  Map as MapIcon, FileText 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  search: string;
  onSelect: (type: BlockType, extraData?: any) => void;
  onClose: () => void;
}

const MENU_ITEMS = [
  { id: 'paragraph', icon: Type, label: 'Đoạn văn' },
  { id: 'heading_1', icon: Heading1, label: 'Tiêu đề lớn' },
  { id: 'heading_2', icon: Heading2, label: 'Tiêu đề vừa' },
  { id: 'heading_3', icon: Heading3, label: 'Tiêu đề nhỏ' },
  { id: 'todo', icon: CheckSquare, label: 'Danh sách việc cần làm' },
  { id: 'bulleted_list', icon: List, label: 'Danh sách dấu đầu dòng' },
  { id: 'numbered_list', icon: ListOrdered, label: 'Danh sách số' },
  { id: 'quote', icon: Quote, label: 'Trích dẫn' },
  { id: 'callout', icon: MessageSquare, label: 'Hộp ghi chú nổi bật' },
  { id: 'divider', icon: Minus, label: 'Đường phân cách' },
  { id: 'gallery', icon: ImageIcon, label: 'Thư viện ảnh' },
  { id: 'map', icon: MapIcon, label: 'Bản đồ địa điểm' },
  { id: 'child_page', icon: FileText, label: 'Trang con' },
] as const;

export function SlashMenu({ isOpen, position, search, onSelect, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const filteredItems = MENU_ITEMS.filter(item => 
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
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

  if (!isOpen || !position) return null;

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 w-64 bg-surface border border-border-dim rounded-xl shadow-xl overflow-hidden py-2"
      style={{ top: position.y + 24, left: position.x }}
    >
      <div className="px-3 pb-2 text-xs font-medium text-text-dim uppercase tracking-wider">
        Khối cơ bản
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {filteredItems.map((item, index) => {
          const Icon = item.icon;
          const isSelected = index === selectedIndex;
          
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id as BlockType)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                isSelected ? 'bg-surface-dim' : 'hover:bg-surface-dim/50'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-brand/10 text-brand' : 'text-text-dim'}`}>
                <Icon size={16} />
              </div>
              <span className={`text-sm ${isSelected ? 'text-text-main font-medium' : 'text-text-main/80'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="px-4 py-3 text-sm text-text-dim text-center">
            Không tìm thấy kết quả
          </div>
        )}
      </div>
    </div>
  );
}
