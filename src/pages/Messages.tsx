import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit, addDoc, deleteDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/ToastContainer';
import { Send, Trash2, ArrowLeft, UserPlus } from 'lucide-react';
import { timeAgo } from '../lib/utils';

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
        console.log('Fetching friendships for user:', user.uid);

        // Get all friends
        const [sentSnap, receivedSnap] = await Promise.all([
          getDocs(query(collection(db, 'friendships'), where('requesterId', '==', user.uid), where('status', '==', 'accepted'))),
          getDocs(query(collection(db, 'friendships'), where('addresseeId', '==', user.uid), where('status', '==', 'accepted')))
        ]);

        const friendIds = [
          ...sentSnap.docs.map(d => d.data().addresseeId),
          ...receivedSnap.docs.map(d => d.data().requesterId)
        ];

        console.log('Found friend IDs:', friendIds.length, friendIds);

        if (friendIds.length === 0) {
          console.log('No friends found');
          setAvailableFriends([]);
          setConversations([]);
          setLoading(false);
          return;
        }

        // Get friend details and conversations
        const friends: Friend[] = [];
        const convos: Conversation[] = [];

        for (const friendId of friendIds) {
          try {
            console.log('Fetching friend data for:', friendId);

            // Use getDoc directly instead of query
            const friendSnap = await getDoc(doc(db, 'users', friendId));
            const friendData = friendSnap.data();

            if (!friendData) {
              console.warn('Friend data not found for:', friendId);
              continue;
            }

            friends.push({
              id: friendId,
              displayName: friendData.displayName || 'User',
              avatarUrl: friendData.avatarUrl
            });

            const messagesSnap = await getDocs(
              query(
                collection(db, 'messages'),
                where('conversationId', '==', [user.uid, friendId].sort().join('_')),
                orderBy('createdAt', 'desc'),
                limit(1)
              )
            );

            const lastMsg = messagesSnap.docs[0]?.data();
            convos.push({
              id: friendId,
              userId: friendId,
              userName: friendData.displayName || 'User',
              userAvatar: friendData.avatarUrl,
              lastMessage: lastMsg?.content || 'Bắt đầu cuộc trò chuyện',
              lastMessageTime: lastMsg?.createdAt ? timeAgo(lastMsg.createdAt) : 'Vừa xong',
              unread: 0
            });
          } catch (e: any) {
            console.error('Error fetching friend:', friendId, e?.code, e?.message);
          }
        }

        console.log('Loaded friends:', friends.length);
        setAvailableFriends(friends);
        setConversations(convos.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()));
      } catch (e: any) {
        console.error('Error fetching conversations:', e);
        toast('Lỗi tải hội thoại: ' + (e?.message || e?.code || 'Unknown error'), 'error');
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

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = onSnapshot(
        query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId),
          orderBy('createdAt', 'asc')
        ),
        (snap) => {
          console.log('Messages received:', snap.docs.length);
          setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
        },
        (error: any) => {
          console.error('Error listening to messages:', error?.code, error?.message, error);
          toast('Lỗi tải tin nhắn: ' + (error?.message || error?.code || 'Unknown'), 'error');
          // Don't fail completely - show empty messages
          setMessages([]);
        }
      );
    } catch (e: any) {
      console.error('Error setting up listener:', e?.code, e?.message, e);
      toast('Không thể kết nối: ' + (e?.message || 'Unknown error'), 'error');
      setMessages([]);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, selectedUserId, toast]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUserId) return;

    try {
      const conversationId = [user.uid, selectedUserId].sort().join('_');
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: user.uid,
        senderName: user.displayName || user.email,
        senderAvatar: user.photoURL,
        recipientId: selectedUserId,
        content: newMessage.trim(),
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (e) {
      console.error('Error sending message:', e);
      toast('Không thể gửi tin nhắn', 'error');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
      toast('Tin nhắn đã được xoá', 'success');
    } catch (e) {
      console.error('Error deleting message:', e);
      toast('Không thể xoá tin nhắn', 'error');
    }
  };

  const handleStartConversation = (friendId: string) => {
    setSelectedUserId(friendId);
    setShowFriendsList(false);
  };

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col bg-bg-deep">
      {/* Header */}
      <div className="px-4 py-4 md:px-6 md:py-6 border-b border-border-dim bg-bg-card">
        <h1 className="text-[24px] md:text-[30px] font-bold text-text-heading">Nhắn tin</h1>
        <p className="text-text-dim text-sm mt-1">Trò chuyện với bạn bè</p>
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
