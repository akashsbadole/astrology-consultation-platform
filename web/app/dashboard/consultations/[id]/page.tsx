'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, getAccessToken } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

type ChatMessage = { sender: string; text: string; timestamp: string };

export default function ConsultationChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  const consultation = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => api.getConsultation(id),
    refetchInterval: (query) => query.state.data?.status === 'active' ? 5000 : false,
  });

  const balance = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: () => api.getWalletBalance(),
  });

  const endMutation = useMutation({
    mutationFn: () => api.endConsultation(id),
    onSuccess: () => router.push('/consultations'),
  });

  // Server-authoritative timer
  useEffect(() => {
    const data = consultation.data;
    if (!data) return;

    if (data.ended_at && data.started_at) {
      const finalMs = new Date(data.ended_at).getTime() - new Date(data.started_at).getTime();
      setElapsed(Math.floor(finalMs / 1000));
      return;
    }

    if (data.started_at && data.status === 'active') {
      const update = () => {
        const elapsedMs = Date.now() - new Date(data.started_at!).getTime();
        setElapsed(Math.floor(elapsedMs / 1000));
      };
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [consultation.data?.started_at, consultation.data?.ended_at, consultation.data?.status]);

  // Socket.io
  useEffect(() => {
    if (consultation.data?.status !== 'active') return;

    const init = async () => {
      const { io } = await import('socket.io-client');
      const socket = io(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000', {
        auth: { token: getAccessToken() },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        socket.emit('join-room', { consultation_id: id });
      });

      socket.on('message', (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
      });

      socketRef.current = socket;
    };

    init();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [id, consultation.data?.status, user?.id]);

  // Scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    socketRef.current?.emit('message', { consultation_id: id, text: input.trim() });
    setMessages((prev) => [...prev, { sender: user?.id ?? '', text: input.trim(), timestamp: new Date().toISOString() }]);
    setInput('');
  };

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  if (consultation.isLoading) {
    return (
      <div className="min-h-screen bg-midnight-deep p-6 space-y-4">
        <div className="h-16 bg-midnight rounded-panel animate-pulse" />
        <div className="flex-1 bg-midnight rounded-panel animate-pulse" style={{ minHeight: '400px' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight-deep flex flex-col">
      {/* Top Bar */}
      <div className="bg-midnight border-b border-mist-faint p-4 flex items-center justify-between">
        <div>
          <p className="text-parchment font-medium">Consultation</p>
          <p className="text-mist text-sm capitalize">{consultation.data?.mode} session</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-mist text-xs uppercase">Timer</p>
            <p className="text-brass font-mono text-lg">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-mist text-xs uppercase">Balance</p>
            <p className="text-parchment">{formatPaise(balance.data?.balance_paise ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-xs rounded-lg p-3 ${
              m.sender === user?.id
                ? 'bg-brass/20 border border-brass/30 ml-auto'
                : 'bg-midnight border border-mist-faint mr-auto'
            }`}
          >
            <p className="text-parchment text-sm">{m.text}</p>
            <p className="text-mist text-xs mt-1">{new Date(m.timestamp).toLocaleTimeString()}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {consultation.data?.status === 'active' ? (
        <div className="bg-midnight border-t border-mist-faint p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-midnight-deep border border-mist-faint rounded-lg px-4 py-2 text-parchment text-sm placeholder:text-mist-faint"
            />
            <button
              onClick={sendMessage}
              className="bg-brass text-midnight-deep px-4 py-2 rounded-lg font-medium hover:bg-brass-dim transition-colors"
            >
              Send
            </button>
            <button
              onClick={() => endMutation.mutate()}
              disabled={endMutation.isPending}
              className="bg-error text-parchment px-4 py-2 rounded-lg font-medium hover:opacity-80 transition-colors disabled:opacity-50"
            >
              End Call
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-midnight border-t border-mist-faint p-4 text-center">
          <p className="text-mist">Session {consultation.data?.status}</p>
        </div>
      )}
    </div>
  );
}
