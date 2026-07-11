import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import { MessageSquare, Send, X } from 'lucide-react';

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Chat: React.FC<ChatProps> = ({ isOpen, onClose }) => {
  const { chatMessages, sendMessage } = useGame();
  const { socket } = useSocket();
  const [text, setText] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text);
    setText('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-50 shadow-2xl transition-all duration-300">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
        <div className="flex items-center gap-2 text-gaming-gold">
          <MessageSquare size={20} />
          <span className="font-bold tracking-wide">TRÒ CHUYỆN</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8">
            Chưa có tin nhắn nào. Trò chuyện vui vẻ!
          </div>
        ) : (
          chatMessages.map((msg, idx) => {
            const isMe = msg.playerId === (localStorage.getItem('catte_player_id') || socket?.id || '');
            return (
              <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-slate-500 mb-1 px-1">
                  {msg.playerName}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    isMe
                      ? 'bg-gaming-gold text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
        <input
          type="text"
          placeholder="Nhập tin nhắn..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={80}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-gaming-gold transition-colors"
        />
        <button
          type="submit"
          className="bg-gaming-gold hover:bg-gaming-gold-light text-slate-950 p-2.5 rounded-xl transition-all shadow-md active:scale-90"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
