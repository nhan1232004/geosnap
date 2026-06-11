import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBox({ onSearch, placeholder = 'Search locations...' }: SearchProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface border border-border-dim rounded-xl pl-10 pr-10 py-2.5 text-sm text-text-main placeholder-text-dim focus:outline-none focus:border-brand/50 transition-colors"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-main transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function FolderSearchFilter(folders: any[], query: string) {
  if (!query) return folders;

  const lower = query.toLowerCase();
  return folders.filter(folder =>
    folder.name?.toLowerCase().includes(lower) ||
    folder.city?.toLowerCase().includes(lower) ||
    folder.country?.toLowerCase().includes(lower)
  );
}
