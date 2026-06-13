import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/ToastContainer';
import { Send, Trash2, ArrowLeft, UserPlus } from 'lucide-react';
import { timeAgo } from '../lib/utils';
import { api } from '../lib/api';
import { getSocket, joinConversation, leaveConversation } from '../lib/socket';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

interface Friend {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export default function Messages() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations and available friends
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [friendsRes, convosRes] = await Promise.all([
          api.get<{ friendships: any[] }>('/api/v1/friendships'),
          api.get<{ conversations: any[] }>('/api/v1/messages/conversations')
        ]);

        const friendsList = friendsRes.friendships
          .filter(f => f.status === 'accepted')
          .map(f => {
            const other = f.requesterId === user.uid ? f.addressee : f.requester;
            return {
              id: other.id,
              displayName: other.displayName || 'User',
              avatarUrl: other.avatarUrl
            };
          });
        setAvailableFriends(friendsList);

        const convosList: Conversation[] = convosRes.conversations.map(c => ({
          id: c.otherUser?.id || '',
          userId: c.otherUser?.id || '',
          userName: c.otherUser?.displayName || 'User',
          userAvatar: c.otherUser?.avatarUrl,
          lastMessage: c.lastMessage || 'Bắt đầu cuộc trò chuyện',
          lastMessageTime: c.lastAt ? timeAgo(c.lastAt) : 'Vừa xong',
          unread: 0
        }));
        setConversations(convosList.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()));
      } catch (e: any) {
        console.error('Error fetching conversations:', e);
        toast('Lỗi tải hội thoại: ' + (e?.message || 'Unknown error'), 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  // Listen to messages for selected conversation
  useEffect(() => {
    if (!user || !selectedUserId) return;

    const conversationId = [user.uid, selectedUserId].sort().join('_');
    console.log('Setting up message listener for:', conversationId);

    let active = true;

    // Load message history
    const loadHistory = async () => {
      try {
        const res = await api.get<{ messages: any[] }>(`/api/v1/messages/${conversationId}`);
        if (!active) return;
        setMessages(
          res.messages.map(msg => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.sender?.displayName || 'User',
            senderAvatar: msg.sender?.avatarUrl,
            recipientId: msg.recipientId,
            content: msg.content,
            createdAt: msg.createdAt,
          }))
        );
      } catch (e: any) {
        console.error('Error fetching history:', e);
        toast('Lỗi tải lịch sử tin nhắn: ' + (e?.message || 'Unknown error'), 'error');
      }
    };

    loadHistory();

    // Join room & listen
    joinConversation(conversationId);
    
    const socket = getSocket();
    const handleNewMessage = (msg: any) => {
      if (msg.conversationId === conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [
            ...prev,
            {
              id: msg.id,
              senderId: msg.senderId,
              senderName: msg.sender?.displayName || 'User',
              senderAvatar: msg.sender?.avatarUrl,
              recipientId: msg.recipientId,
              content: msg.content,
              createdAt: msg.createdAt,
            }
          ];
        });

        // Also update conversations list with the last message
        setConversations(prev => {
          return prev.map(c => {
            if (c.userId === msg.senderId || c.userId === msg.recipientId) {
              return {
                ...c,
                lastMessage: msg.content,
                lastMessageTime: 'Vừa xong'
              };
            }
            return c;
          }).sort((a, b) => {
            if (a.userId === msg.senderId || a.userId === msg.recipientId) return -1;
            if (b.userId === msg.senderId || b.userId === msg.recipientId) return 1;
            return 0;
          });
        });
      }
    };

    if (socket) {
      socket.on('new-message', handleNewMessage);
    }

    return () => {
      active = false;
      leaveConversation(conversationId);
      if (socket) {
        socket.off('new-message', handleNewMessage);
      }
    };
  }, [user, selectedUserId, toast]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUserId) return;

    try {
      await api.post(`/api/v1/messages`, {
        recipientId: selectedUserId,
        content: newMessage.trim(),
      });
      setNewMessage('');
    } catch (e: any) {
      console.error('Error sending message:', e);
      toast('Không thể gửi tin nhắn: ' + (e?.message || 'Unknown error'), 'error');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await api.delete(`/api/v1/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast('Tin nhắn đã được xoá', 'success');
    } catch (e: any) {
      console.error('Error deleting message:', e);
      toast('Không thể xoá tin nhắn: ' + (e?.message || 'Unknown error'), 'error');
    }
  };

  const handleStartConversation = (friendId: string) => {
    setSelectedUserId(friendId);
    setShowFriendsList(false);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100dvh-53px-49px)] md:h-full w-full flex flex-col bg-bg-deep">
      {/* Header */}
      <div className={`px-4 py-3 md:px-6 md:py-6 border-b border-border-dim bg-bg-card ${selectedUserId ? 'hidden md:block' : 'block'} shrink-0`}>
        <h1 className="text-[20px] md:text-[30px] font-bold text-text-heading">Nhắn tin</h1>
        <p className="text-text-dim text-xs md:text-sm mt-0.5 md:mt-1">Trò chuyện với bạn bè</p>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden gap-4 px-4 md:px-6 py-4 md:py-6">
        {/* Conversations list */}
        <div className={`w-full md:w-[320px] border border-border-dim rounded-3xl bg-bg-card overflow-y-auto flex flex-col shrink-0 ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border-dim sticky top-0 bg-bg-card flex items-center justify-between">
            <h2 className="font-semibold text-text-heading">Hội thoại</h2>
            <button
              onClick={() => setShowFriendsList(!showFriendsList)}
              className="p-1.5 rounded-lg hover:bg-surface transition-colors text-text-dim hover:text-text-main"
              title="Thêm bạn"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-text-dim">Đang tải...</div>
            </div>
          ) : showFriendsList ? (
            <div className="flex-1 flex flex-col">
              {availableFriends.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <div className="text-3xl mb-2">👥</div>
                  <p className="text-text-dim text-sm">Chưa có bạn bè nào</p>
                </div>
              ) : (
                availableFriends.map(friend => (
                  <button
                    key={friend.id}
                    onClick={() => handleStartConversation(friend.id)}
                    className="p-3 text-left border-b border-border-dim/50 hover:bg-surface transition-colors flex gap-3 items-center"
                  >
                    {friend.avatarUrl ? (
                      <img src={friend.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                        {friend.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-text-heading text-sm">{friend.displayName}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-text-dim text-sm">Chưa có hội thoại nào</p>
              <button
                onClick={() => setShowFriendsList(true)}
                className="mt-4 px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90 transition-all"
              >
                Bắt đầu chat
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => handleStartConversation(convo.id)}
                  className={`p-3 text-left border-b border-border-dim/50 hover:bg-surface transition-colors ${
                    selectedUserId === convo.id ? 'bg-brand/10' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {convo.userAvatar ? (
                      <img src={convo.userAvatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                        {convo.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-text-heading text-sm">{convo.userName}</div>
                      <div className="text-text-dim text-xs truncate">{convo.lastMessage}</div>
                    </div>
                    <div className="text-text-dim text-xs whitespace-nowrap">{convo.lastMessageTime}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages panel */}
        {selectedUserId ? (
          <div className="flex-1 border border-border-dim rounded-3xl bg-bg-card overflow-hidden flex flex-col">
            {/* Chat header */}
            <div className="p-4 border-b border-border-dim flex items-center gap-3 bg-bg-card">
              <button
                onClick={() => setSelectedUserId(null)}
                className="md:hidden p-1.5 rounded-lg hover:bg-surface transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-text-dim" />
              </button>
              <div>
                <div className="font-semibold text-text-heading">
                  {conversations.find(c => c.id === selectedUserId)?.userName || availableFriends.find(f => f.id === selectedUserId)?.displayName}
                </div>
                <div className="text-xs text-text-dim">Đang hoạt động</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="text-text-dim">
                    <div className="text-4xl mb-2">👋</div>
                    <p>Bắt đầu cuộc trò chuyện</p>
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 group ${msg.senderId === user?.uid ? 'flex-row-reverse' : ''}`}
                  >
                    {msg.senderId !== user?.uid && (
                      <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                          msg.senderId === user?.uid
                            ? 'bg-brand text-white'
                            : 'bg-surface text-text-main'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-xs text-text-dim">{timeAgo(msg.createdAt)}</div>
                        {msg.senderId === user?.uid && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-text-dim hover:text-red-500 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border-dim bg-bg-card flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-surface rounded-full px-4 py-2 text-sm outline-none text-text-main placeholder:text-text-dim border border-border-dim focus:border-brand/40 transition-colors"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-brand text-white rounded-full hover:bg-brand/90 transition-all disabled:opacity-50 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 border border-border-dim rounded-3xl bg-bg-card hidden md:flex items-center justify-center">
            <div className="text-center text-text-dim">
              <div className="text-5xl mb-4">💬</div>
              <p>Chọn một hội thoại để bắt đầu</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
