import React, { useState, useRef } from 'react';
import { Image as ImageIcon, MapPin, X, Send } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface CreatePostProps {
  onPostCreated: () => void;
  createPost: (content: string, files: File[]) => Promise<void>;
}

export function CreatePost({ onPostCreated, createPost }: CreatePostProps) {
  const { userProfile, user } = useAppStore();
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.slice(0, 5 - selectedImages.length); // Max 5 images
      
      const newPreviews = validFiles.map((file: File) => URL.createObjectURL(file));
      
      setSelectedImages(prev => [...prev, ...validFiles]);
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]); // Cleanup
      return newUrls;
    });
  };

  const handleSubmit = async () => {
    if ((!content.trim() && selectedImages.length === 0) || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await createPost(content, selectedImages);
      setContent('');
      setSelectedImages([]);
      setPreviewUrls([]);
      onPostCreated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initial = userProfile?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="bg-bg-card border border-border-dim rounded-3xl p-5 mb-8 shadow-lg shadow-black/5">
      <div className="flex gap-4">
        {userProfile?.avatarUrl ? (
          <img src={userProfile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-border-dim shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold shrink-0">
            {initial}
          </div>
        )}
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Hôm nay bạn đã đi đâu? Chia sẻ hành trình..."
            className="w-full bg-transparent resize-none outline-none text-text-main placeholder:text-text-dim min-h-[60px]"
          />
          
          {previewUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-2 custom-scrollbar">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-border-dim">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-border-dim">
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                multiple 
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedImages.length >= 5}
                className="p-2 text-text-dim hover:text-brand hover:bg-brand/10 rounded-xl transition-colors disabled:opacity-50"
                title="Thêm ảnh (Tối đa 5)"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button 
                className="p-2 text-text-dim hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors hidden"
                title="Gắn vị trí"
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && selectedImages.length === 0)}
              className="flex items-center gap-2 px-6 py-2 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-brand/20"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Đang đăng...' : 'Đăng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
