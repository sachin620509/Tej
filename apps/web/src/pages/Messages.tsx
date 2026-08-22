import type { ConversationDto, CursorPage, MessageDto } from '@instaframe/contracts';
import { LoaderCircle, MessageCircle, Phone, Search, Send, UserPlus, Users, Video } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../lib/api';
import { getSocket } from '../lib/socket';

const normalizeConversation = (conversation: ConversationDto): ConversationDto => ({ ...conversation, members: conversation.members.map(member => ({ ...member, id: member.id ?? (member as typeof member & { _id?: string })._id ?? '' })) });

export function Messages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [active, setActive] = useState<string | undefined>(params.get('id') ?? undefined);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [typing, setTyping] = useState(false);
  const [filter, setFilter] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stream = useRef<HTMLDivElement>(null);

  const label = useCallback((conversation: ConversationDto) => conversation.type === 'group'
    ? conversation.name ?? 'Group'
    : conversation.members.find(member => member.id !== user?.id)?.name ?? 'Conversation', [user?.id]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api<{ items: ConversationDto[] }>('/api/conversations');
      const normalized = data.items.map(normalizeConversation);
      setConversations(normalized);
      setActive(current => current ?? params.get('id') ?? normalized[0]?.id);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not load conversations');
    } finally { setLoading(false); }
  }, [params]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => {
    const socket = getSocket();
    const receive = (message: MessageDto) => {
      setConversations(current => current.map(conversation => conversation.id === message.conversationId
        ? { ...conversation, lastMessage: message, lastMessageAt: message.createdAt, unreadCount: conversation.id === active ? 0 : (conversation.unreadCount ?? 0) + 1 }
        : conversation));
      if (message.conversationId === active) {
        setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
        void api(`/api/conversations/${active}/read`, { method: 'PATCH' });
      }
    };
    socket.on('message:new', receive);
    return () => { socket.off('message:new', receive); };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    setParams({ id: active }, { replace: true });
    setLoading(true); setError('');
    api<CursorPage<MessageDto>>(`/api/conversations/${active}/messages`).then(data => setMessages(data.items)).catch(cause => setError(cause instanceof ApiError ? cause.message : 'Could not load messages')).finally(() => setLoading(false));
    void api(`/api/conversations/${active}/read`, { method: 'PATCH' });
    const socket = getSocket(); socket.emit('conversation:join', active);
    const type = (data: { conversationId: string; active: boolean }) => { if (data.conversationId === active) setTyping(data.active); };
    socket.on('typing', type);
    return () => { socket.off('typing', type); };
  }, [active, setParams]);

  useEffect(() => { stream.current?.scrollTo({ top: stream.current.scrollHeight, behavior: 'smooth' }); }, [messages, typing]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!active || sending) return;
    const form = event.currentTarget, text = String(new FormData(form).get('text') ?? '').trim(); if (!text) return;
    setSending(true); setError('');
    try {
      const message = await api<MessageDto>(`/api/conversations/${active}/messages`, { method: 'POST', body: JSON.stringify({ text, type: 'text', clientMessageId: crypto.randomUUID() }) });
      setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]); form.reset();
      getSocket().emit('typing', { conversationId: active, active: false }); await loadConversations();
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Message could not be sent'); }
    finally { setSending(false); }
  };
  const onType = () => { if (!active) return; getSocket().emit('typing', { conversationId: active, active: true }); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => getSocket().emit('typing', { conversationId: active, active: false }), 1200); };

  const selected = conversations.find(conversation => conversation.id === active), other = selected?.members.find(member => member.id !== user?.id);
  const visible = useMemo(() => conversations.filter(conversation => label(conversation).toLowerCase().includes(filter.toLowerCase())), [conversations, filter, label]);
  return <div className="messages-page"><aside className="conversation-panel"><header><div><p className="eyebrow">DIRECT & GROUP</p><h1>Messages</h1></div><Link to="/groups" aria-label="Groups"><Users/></Link></header><div className="message-shortcuts"><Link to="/search"><UserPlus/> New chat</Link><Link to="/message-requests">Requests</Link></div><label className="conversation-search"><Search/><input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search conversations"/></label><div className="conversation-list">{visible.map(conversation => { const person = conversation.members.find(member => member.id !== user?.id); return <button className={conversation.id === active ? 'active' : ''} key={conversation.id} onClick={() => setActive(conversation.id)}><span className="chat-avatar">{person?.profilePhoto ? <img src={person.profilePhoto} alt=""/> : conversation.type === 'group' ? 'GR' : person?.name[0] ?? 'IF'}</span><span><b>{label(conversation)}</b><small>{conversation.lastMessage?.text ?? 'Start a conversation'}</small></span>{!!conversation.unreadCount && <em>{conversation.unreadCount}</em>}</button>; })}{!loading && !visible.length && <div className="no-conversations"><MessageCircle/><p>No conversations found</p><Link to="/search">Find a person</Link></div>}</div></aside><section className="chat-panel">{selected ? <><header><span className="chat-avatar">{other?.profilePhoto ? <img src={other.profilePhoto} alt=""/> : selected.type === 'group' ? 'GR' : label(selected)[0] ?? 'I'}</span><div><b>{label(selected)}</b><small>{selected.type === 'group' ? `${selected.members.length} members` : 'InstaFrame member'}</small></div><nav>{other && <><Link to={`/profile/${other.username}`}>Profile</Link><Link to="/calls" aria-label="Voice call"><Phone/></Link><Link to="/calls" aria-label="Video call"><Video/></Link></>}</nav></header><div className="message-stream" ref={stream}>{loading ? <LoaderCircle className="spin"/> : messages.map(message => <div key={message.id} className={message.sender.id === user?.id ? 'bubble mine' : 'bubble'}><p>{message.text || (message.attachment ? `Sent ${message.type}` : 'Message removed')}</p><small>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{message.sender.id === user?.id && message.readBy?.some(id => id !== user.id) ? ' · Seen' : ''}</small></div>)}{typing && <div className="typing"><i/><i/><i/></div>}</div><form className="message-composer" onSubmit={event => void send(event)}><input name="text" maxLength={5000} onChange={onType} placeholder="Write a message…" autoComplete="off"/><button disabled={sending} aria-label="Send message">{sending ? <LoaderCircle className="spin"/> : <Send/>}</button></form></> : <div className="select-chat"><MessageCircle/><h2>Your conversations</h2><p>Select a conversation or find a person to start messaging.</p><Link to="/search">Find people</Link></div>}{error && <p className="chat-error">{error}</p>}</section></div>;
}
