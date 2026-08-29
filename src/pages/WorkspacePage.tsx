import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  LayoutGrid,
  Map as MapIcon,
  Clock,
  Share2,
  Star,
  Plus,
  MoreHorizontal,
  Trash2,
  Eye,
  Globe,
  Lock,
  Users,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import {
  getOrCreateDefaultWorkspace,
  getUserWorkspaces,
  getPage,
  getPageTree,
  getPageBlocks,
  createPage,
  updatePage,
  deletePage,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
} from '../lib/workspaceService';
import type { Page, Block, BlockType, PageTreeNode, Workspace } from '../types';

import { WorkspaceSidebar } from '../components/workspace/WorkspaceSidebar';
import { Breadcrumbs } from '../components/workspace/Breadcrumbs';
import { BlockRenderer } from '../components/workspace/BlockRenderer';
import { SlashMenu } from '../components/workspace/SlashMenu';
import { IconPicker } from '../components/workspace/IconPicker';
import { CoverPicker } from '../components/workspace/CoverPicker';
import { ShareModal } from '../components/workspace/ShareModal';
import { MigrationModal } from '../components/workspace/MigrationModal';
import { CommandPalette } from '../components/workspace/CommandPalette';

import GalleryView from '../components/workspace/views/GalleryView';
import MapView from '../components/workspace/views/MapView';
import TimelineView from '../components/workspace/views/TimelineView';

type ViewMode = 'document' | 'gallery' | 'map' | 'timeline';

export default function WorkspacePage() {
  const { user } = useAppStore();
  const {
    activeWorkspaceId,
    activePageId,
    pageTree,
    favoritePageIds,
    setActiveWorkspace,
    setActivePage,
    setPageTree,
    addToFavorites,
    removeFromFavorites,
    addToRecent,
  } = useWorkspaceStore();

  const { workspaceId: paramWsId, pageId: paramPageId } = useParams<{
    workspaceId?: string;
    pageId?: string;
  }>();
  const navigate = useNavigate();

  // Component State
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [ancestors, setAncestors] = useState<Page[]>([]);
  const [childPages, setChildPages] = useState<Page[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('document');
  const [loading, setLoading] = useState(true);

  // Modals & Pickers
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Slash Menu State
  const [slashMenuState, setSlashMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number } | null;
    search: string;
    afterBlockId?: string;
  }>({
    isOpen: false,
    position: null,
    search: '',
  });

  // Global Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Initialize or Load Workspace
  useEffect(() => {
    if (!user) return;

    async function initWorkspace() {
      try {
        setLoading(true);
        const userWsList = await getUserWorkspaces(user!.uid);
        setWorkspaces(userWsList);

        let currentWs: Workspace;
        if (paramWsId) {
          const found = userWsList.find((w) => w.id === paramWsId);
          currentWs = found || (await getOrCreateDefaultWorkspace(user!.uid));
        } else {
          currentWs = userWsList[0] || (await getOrCreateDefaultWorkspace(user!.uid));
        }

        setWorkspace(currentWs);
        setActiveWorkspace(currentWs.id);

        // Load Page Tree
        const tree = await getPageTree(currentWs.id);
        setPageTree(tree);
      } catch (err) {
        console.error('Failed to initialize workspace:', err);
      } finally {
        setLoading(false);
      }
    }

    initWorkspace();
  }, [user, paramWsId, setActiveWorkspace, setPageTree]);

  // 2. Load Page and its Blocks
  const refreshPageData = useCallback(async (pageId: string) => {
    try {
      const page = await getPage(pageId);
      if (!page) {
        setCurrentPage(null);
        return;
      }

      setCurrentPage(page);
      setActivePage(page.id);
      addToRecent(page);

      // Load Blocks
      const pageBlocks = await getPageBlocks(page.id);
      setBlocks(pageBlocks);

      // Load Child Pages for this page
      if (workspace) {
        const tree = await getPageTree(workspace.id);
        setPageTree(tree);

        const findNode = (nodes: PageTreeNode[]): PageTreeNode | null => {
          for (const node of nodes) {
            if (node.page.id === pageId) return node;
            const found = findNode(node.children);
            if (found) return found;
          }
          return null;
        };

        const node = findNode(tree);
        setChildPages(node ? node.children.map((c) => c.page) : []);
      }
    } catch (err) {
      console.error('Failed to load page:', err);
    }
  }, [workspace, setActivePage, addToRecent, setPageTree]);

  useEffect(() => {
    if (paramPageId) {
      refreshPageData(paramPageId);
    } else {
      setCurrentPage(null);
      setActivePage(null);
    }
  }, [paramPageId, refreshPageData, setActivePage]);

  // Handle Page Title Change
  const handleTitleChange = async (newTitle: string) => {
    if (!currentPage) return;
    setCurrentPage((prev) => (prev ? { ...prev, title: newTitle } : null));
    try {
      await updatePage(currentPage.id, { title: newTitle });
      if (workspace) {
        const tree = await getPageTree(workspace.id);
        setPageTree(tree);
      }
    } catch (e) {
      console.error('Failed to update title:', e);
    }
  };

  // Handle Create Page
  const handleCreatePage = async (parentId: string | null = null) => {
    if (!workspace) return;
    try {
      const newPage = await createPage(workspace.id, parentId, 'Trang mới');
      // Create initial paragraph block
      await createBlock(newPage.id, 'paragraph', { text: '' });
      const tree = await getPageTree(workspace.id);
      setPageTree(tree);
      navigate(`/workspace/${workspace.id}/page/${newPage.id}`);
    } catch (e) {
      console.error('Failed to create page:', e);
    }
  };

  // Handle Delete Page
  const handleDeletePage = async (pageId: string) => {
    if (!workspace || !window.confirm('Bạn có chắc muốn xóa trang này cùng tất cả nội dung bên trong?')) return;
    try {
      await deletePage(pageId);
      const tree = await getPageTree(workspace.id);
      setPageTree(tree);
      if (currentPage?.id === pageId) {
        navigate(`/workspace/${workspace.id}`);
      }
    } catch (e) {
      console.error('Failed to delete page:', e);
    }
  };

  // Handle Add Block via Slash Menu
  const handleSelectBlockType = async (type: BlockType, extraData?: any) => {
    if (!currentPage) return;
    setSlashMenuState((prev) => ({ ...prev, isOpen: false }));

    const defaultDataMap: Record<BlockType, any> = {
      paragraph: { text: '' },
      heading_1: { text: '', level: 1 },
      heading_2: { text: '', level: 2 },
      heading_3: { text: '', level: 3 },
      todo: { text: '', checked: false },
      bulleted_list: { text: '' },
      numbered_list: { text: '' },
      quote: { text: '' },
      callout: { text: '', icon: '💡' },
      divider: {},
      image: { assetId: '', url: extraData?.url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800', caption: '' },
      gallery: { assetIds: [], layout: 'grid', columns: 3 },
      map: { centerLat: 16.0544, centerLng: 108.2022, zoom: 12 },
      child_page: { childPageId: '' },
    };

    try {
      const newBlock = await createBlock(
        currentPage.id,
        type,
        extraData || defaultDataMap[type],
        slashMenuState.afterBlockId
      );
      setBlocks((prev) => [...prev, newBlock]);
    } catch (e) {
      console.error('Failed to create block:', e);
    }
  };

  // Handle Block Update
  const handleUpdateBlock = async (blockId: string, updatedData: any) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, data: updatedData } : b))
    );
    try {
      await updateBlock(blockId, { data: updatedData });
    } catch (e) {
      console.error('Failed to update block:', e);
    }
  };

  // Handle Block Delete
  const handleDeleteBlock = async (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    try {
      await deleteBlock(blockId);
    } catch (e) {
      console.error('Failed to delete block:', e);
    }
  };

  const isFavorite = currentPage ? favoritePageIds.includes(currentPage.id) : false;

  if (loading && !workspace) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-deep">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-dim">Đang tải không gian làm việc...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-bg-deep text-text-main relative">
      {/* 1. Collapsible Sidebar */}
      <div className="hidden md:flex shrink-0 w-64 border-r border-border-dim bg-surface/50 backdrop-blur-md">
        <WorkspaceSidebar
          workspace={workspace}
          workspaces={workspaces}
          pageTree={pageTree}
          activePageId={currentPage?.id || null}
          onSelectWorkspace={(id) => navigate(`/workspace/${id}`)}
          onSelectPage={(id) => navigate(`/workspace/${workspace?.id}/page/${id}`)}
          onCreatePage={(parentId) => handleCreatePage(parentId)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenMigration={() => setIsMigrationModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-72 h-full bg-surface border-r border-border-dim z-10 shadow-2xl">
            <WorkspaceSidebar
              workspace={workspace}
              workspaces={workspaces}
              pageTree={pageTree}
              activePageId={currentPage?.id || null}
              onSelectWorkspace={(id) => {
                navigate(`/workspace/${id}`);
                setIsMobileSidebarOpen(false);
              }}
              onSelectPage={(id) => {
                navigate(`/workspace/${workspace?.id}/page/${id}`);
                setIsMobileSidebarOpen(false);
              }}
              onCreatePage={(parentId) => {
                handleCreatePage(parentId);
                setIsMobileSidebarOpen(false);
              }}
              onOpenCommandPalette={() => {
                setIsCommandPaletteOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenMigration={() => {
                setIsMigrationModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto relative">
        {/* Top Sticky Navigation Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-3 bg-surface/80 backdrop-blur-md border-b border-border-dim/60">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 md:hidden text-text-dim hover:text-text-main rounded-lg hover:bg-surface-hover"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Breadcrumbs
              workspace={workspace}
              ancestors={ancestors}
              currentPage={currentPage}
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-surface border border-border-dim rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('document')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'document'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-dim hover:text-text-main'
                }`}
                title="Tài liệu"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trang</span>
              </button>
              <button
                onClick={() => setViewMode('gallery')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'gallery'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-dim hover:text-text-main'
                }`}
                title="Thư viện"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thư viện</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'map'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-dim hover:text-text-main'
                }`}
                title="Bản đồ"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bản đồ</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-dim hover:text-text-main'
                }`}
                title="Dòng thời gian"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thời gian</span>
              </button>
            </div>

            {currentPage && (
              <>
                {/* Favorite Toggle */}
                <button
                  onClick={() =>
                    isFavorite
                      ? removeFromFavorites(currentPage.id)
                      : addToFavorites(currentPage.id)
                  }
                  className={`p-2 rounded-xl border transition-all ${
                    isFavorite
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'border-border-dim text-text-dim hover:text-text-main hover:bg-surface'
                  }`}
                  title={isFavorite ? 'Xóa khỏi Yêu thích' : 'Thêm vào Yêu thích'}
                >
                  <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
                </button>

                {/* Share Button */}
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border-dim rounded-xl text-xs font-semibold text-text-main transition-all"
                >
                  <Share2 className="w-3.5 h-3.5 text-brand" />
                  <span className="hidden sm:inline">Chia sẻ</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* View Routing */}
        {viewMode === 'gallery' && (
          <div className="p-6 sm:p-10 max-w-6xl mx-auto w-full">
            <GalleryView
              workspaceId={workspace?.id || ''}
              pages={currentPage ? childPages : pageTree.map((n) => n.page)}
              onCreatePage={() => handleCreatePage(currentPage?.id || null)}
            />
          </div>
        )}

        {viewMode === 'map' && (
          <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full">
            <MapView
              workspaceId={workspace?.id || ''}
              pages={currentPage ? [currentPage, ...childPages] : pageTree.map((n) => n.page)}
            />
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="p-6 sm:p-10 max-w-5xl mx-auto w-full">
            <TimelineView
              workspaceId={workspace?.id || ''}
              pages={currentPage ? childPages : pageTree.map((n) => n.page)}
              onCreatePage={() => handleCreatePage(currentPage?.id || null)}
            />
          </div>
        )}

        {viewMode === 'document' && (
          <>
            {currentPage ? (
              <div className="w-full max-w-4xl mx-auto pb-32">
                {/* 3. Cover Hero Banner */}
                <div className="relative group w-full h-48 sm:h-64 bg-gradient-to-r from-brand/20 via-orange-950/20 to-surface overflow-hidden">
                  {currentPage.cover ? (
                    <img
                      src={currentPage.cover}
                      alt={currentPage.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}

                  {/* Cover Action Buttons */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-1.5 rounded-xl">
                    <button
                      onClick={() => setIsCoverPickerOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-white hover:text-brand transition-colors flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{currentPage.cover ? 'Đổi ảnh bìa' : 'Thêm ảnh bìa'}</span>
                    </button>
                    {currentPage.cover && (
                      <button
                        onClick={() => updatePage(currentPage.id, { cover: undefined })}
                        className="px-2 py-1 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                      >
                        Gỡ
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Page Header Section */}
                <div className="px-6 sm:px-12 pt-6">
                  {/* Icon Button */}
                  <div className="relative -mt-16 mb-4">
                    <button
                      onClick={() => setIsIconPickerOpen(true)}
                      className="w-20 h-20 rounded-3xl bg-surface border-4 border-bg-deep shadow-2xl flex items-center justify-center text-4xl hover:scale-105 transition-all cursor-pointer group"
                      title="Đổi biểu tượng trang"
                    >
                      <span>{currentPage.icon || '📄'}</span>
                      <div className="absolute inset-0 rounded-3xl bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        Đổi
                      </div>
                    </button>
                  </div>

                  {/* Inline Editable Title */}
                  <input
                    type="text"
                    value={currentPage.title || ''}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Trang chưa có tiêu đề"
                    className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold text-text-heading outline-none placeholder:text-text-dim/40 border-none p-0 focus:ring-0 mb-6"
                  />

                  {/* Page Metadata / Properties Bar */}
                  <div className="flex flex-wrap items-center gap-3 py-3 border-y border-border-dim/50 text-xs text-text-dim mb-8">
                    <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-lg border border-border-dim">
                      {currentPage.visibility === 'public' ? (
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      ) : currentPage.visibility === 'friends' ? (
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span className="capitalize">{currentPage.visibility}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>Tạo ngày:</span>
                      <span className="font-semibold text-text-main">
                        {new Date(currentPage.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    {currentPage.legacyFolderId && (
                      <span className="px-2 py-0.5 bg-brand/10 text-brand border border-brand/20 rounded-md font-semibold text-[10px]">
                        Album di chuyển
                      </span>
                    )}
                  </div>

                  {/* 5. Block Content List */}
                  <div className="space-y-1">
                    {blocks.map((block, index) => (
                      <BlockRenderer
                        key={block.id}
                        block={block}
                        workspaceId={workspace?.id || ''}
                        indexInList={index + 1}
                        onUpdate={(updatedData) => handleUpdateBlock(block.id, updatedData)}
                        onDelete={() => handleDeleteBlock(block.id)}
                        onInsertBelow={() => {
                          setSlashMenuState({
                            isOpen: true,
                            position: null,
                            search: '',
                            afterBlockId: block.id,
                          });
                        }}
                      />
                    ))}
                  </div>

                  {/* Empty Block Creator Button */}
                  <button
                    onClick={() => {
                      setSlashMenuState({
                        isOpen: true,
                        position: null,
                        search: '',
                        afterBlockId: blocks[blocks.length - 1]?.id,
                      });
                    }}
                    className="w-full mt-4 py-3 border-2 border-dashed border-border-dim/60 hover:border-brand/40 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-text-dim hover:text-brand transition-all cursor-pointer group"
                  >
                    <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                    <span>Nhấn để thêm block mới (hoặc gõ &apos;/&apos;)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Root Workspace Welcome Screen */
              <div className="flex flex-col items-center justify-center p-8 sm:p-16 max-w-xl mx-auto text-center my-auto">
                <div className="w-16 h-16 rounded-3xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-6 shadow-xl shadow-brand/10">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-text-heading mb-2">
                  Chào mừng đến với {workspace?.name || 'GeoSnap Workspace'}
                </h1>
                <p className="text-sm text-text-dim mb-8 leading-relaxed">
                  Không gian làm việc trực quan giúp bạn lưu giữ nhật ký, sắp xếp chuyến đi, gắn tọa độ và chia sẻ ký ức theo phong cách Notion.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={() => handleCreatePage(null)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl hover:bg-brand/90 transition-all font-semibold text-sm shadow-lg shadow-brand/25"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo trang đầu tiên</span>
                  </button>
                  <button
                    onClick={() => setIsMigrationModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-surface-hover border border-border-dim rounded-xl font-semibold text-sm text-text-main transition-all"
                  >
                    <FileText className="w-4 h-4 text-brand" />
                    <span>Chuyển đổi Album cũ</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Slash Menu */}
      <SlashMenu
        isOpen={slashMenuState.isOpen}
        position={slashMenuState.position}
        search={slashMenuState.search}
        onSelect={handleSelectBlockType}
        onClose={() => setSlashMenuState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Icon Picker Popover */}
      {isIconPickerOpen && currentPage && (
        <IconPicker
          currentIcon={currentPage.icon}
          onSelect={(icon) => {
            setCurrentPage((p) => (p ? { ...p, icon } : null));
            updatePage(currentPage.id, { icon });
            setIsIconPickerOpen(false);
          }}
          onRemove={() => {
            setCurrentPage((p) => (p ? { ...p, icon: undefined } : null));
            updatePage(currentPage.id, { icon: undefined });
            setIsIconPickerOpen(false);
          }}
          onClose={() => setIsIconPickerOpen(false)}
        />
      )}

      {/* Cover Picker Modal */}
      {isCoverPickerOpen && currentPage && (
        <CoverPicker
          currentCover={currentPage.cover}
          onSelect={(url) => {
            setCurrentPage((p) => (p ? { ...p, cover: url } : null));
            updatePage(currentPage.id, { cover: url });
            setIsCoverPickerOpen(false);
          }}
          onRemove={() => {
            setCurrentPage((p) => (p ? { ...p, cover: undefined } : null));
            updatePage(currentPage.id, { cover: undefined });
            setIsCoverPickerOpen(false);
          }}
          onClose={() => setIsCoverPickerOpen(false)}
        />
      )}

      {/* Share Modal */}
      {isShareModalOpen && currentPage && (
        <ShareModal
          isOpen={isShareModalOpen}
          page={currentPage}
          onClose={() => setIsShareModalOpen(false)}
          onUpdateVisibility={(visibility) => {
            setCurrentPage((p) => (p ? { ...p, visibility } : null));
            updatePage(currentPage.id, { visibility });
          }}
        />
      )}

      {/* Migration Modal */}
      {isMigrationModalOpen && workspace && (
        <MigrationModal
          isOpen={isMigrationModalOpen}
          workspaceId={workspace.id}
          onClose={() => setIsMigrationModalOpen(false)}
          onSuccess={() => {
            if (workspace) {
              getPageTree(workspace.id).then(setPageTree);
            }
          }}
        />
      )}

      {/* Command Palette */}
      {isCommandPaletteOpen && (
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          pages={pageTree.map((n) => n.page)}
          onSelectPage={(id) => {
            navigate(`/workspace/${workspace?.id}/page/${id}`);
            setIsCommandPaletteOpen(false);
          }}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      )}
    </div>
  );
}
