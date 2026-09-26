import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Flame, Sparkles } from 'lucide-react';
import { playSound } from '../utils/sound.ts';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderTeam?: string;
  text: string;
  timestamp: number;
  isHost?: boolean;
  type?: 'text' | 'shoutout' | 'high_five';
}

interface LiveChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, type?: 'text' | 'shoutout') => void;
  onSendReaction: (emoji: string) => void;
  currentUserId: string;
  unreadCount?: number;
}

const QUICK_SHOUTOUTS = [
  '¡Buena suerte a todos! 🍀',
  '¡Vamos con todo! 💪',
  '¡Qué buena pregunta! 🧠',
  '¡Casi lo logro! 😅',
  '¡A por el podio! 🏆',
  '¡Gran jugada! 👏',
  '¡Excelente respuesta! ⚡',
  '¡Me equivoqué por un pelo! 🙈',
];

const QUICK_EMOJIS = ['🔥', '👏', '🚀', '💡', '❤️', '🎉', '😮', '😂', '🏆', '⭐'];

export const LiveChatDrawer: React.FC<LiveChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onSendReaction,
  currentUserId,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), 'text');
    setInputText('');
    playSound('shout');
  };

  const handleQuickShoutout = (shoutout: string) => {
    onSendMessage(shoutout, 'shoutout');
    playSound('shout');
  };

  const handleReactionClick = (emoji: string) => {
    onSendReaction(emoji);
    playSound('pop');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end">
      <div 
        className="w-full max-w-md bg-[#180838] border-l border-white/20 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-purple-950/70">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-purple-950 flex items-center justify-center font-black">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-title text-base font-black text-white">Chat & Interacción en Vivo</h3>
              <p className="text-[11px] text-purple-200">Interactúa en tiempo real con los demás jugadores</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-purple-200 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reaction Quick Bar */}
        <div className="p-2.5 bg-black/30 border-b border-white/10">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-300 flex items-center">
              <Sparkles className="w-3 h-3 mr-1" /> Reacciones Rápidas (Flotan en pantalla)
            </span>
          </div>
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 active:scale-90 text-lg flex items-center justify-center transition shrink-0 border border-white/10"
                title={`Enviar reacción ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Shoutout Pills */}
        <div className="p-2 bg-purple-900/30 border-b border-white/10 overflow-x-auto whitespace-nowrap scrollbar-none flex space-x-2">
          {QUICK_SHOUTOUTS.map((shout, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickShoutout(shout)}
              className="text-xs bg-white/10 hover:bg-amber-400 hover:text-purple-950 text-purple-100 font-bold px-3 py-1.5 rounded-full border border-white/15 transition shrink-0 active:scale-95"
            >
              {shout}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-purple-300 text-sm">
              <MessageSquare className="w-10 h-10 mx-auto text-purple-400/50 mb-2" />
              ¡Sé el primero en enviar un mensaje o un saludo a los participantes!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const isHighFive = msg.type === 'high_five';

              if (isHighFive) {
                return (
                  <div key={msg.id} className="bg-amber-400/20 border border-amber-400/40 rounded-2xl p-2.5 text-center text-xs font-bold text-amber-200 animate-pulse">
                    👏 <strong className="text-white">{msg.senderName}</strong> {msg.text}
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center space-x-1 text-[11px] text-purple-300 mb-1 px-1">
                    <span>{msg.senderAvatar}</span>
                    <span className="font-bold text-white">
                      {msg.senderName}
                      {msg.isHost && (
                        <span className="ml-1 bg-amber-400 text-purple-950 font-black text-[9px] px-1.5 py-0.2 rounded-full">
                          HOST
                        </span>
                      )}
                    </span>
                    {msg.senderTeam && (
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                        msg.senderTeam === 'red' ? 'bg-rose-500 text-white' :
                        msg.senderTeam === 'blue' ? 'bg-blue-500 text-white' :
                        msg.senderTeam === 'green' ? 'bg-emerald-500 text-white' :
                        'bg-amber-500 text-purple-950'
                      }`}>
                        {msg.senderTeam.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-md ${
                      isMe
                        ? 'bg-amber-400 text-purple-950 font-bold rounded-tr-none'
                        : msg.type === 'shoutout'
                        ? 'bg-purple-700/80 text-white font-bold border border-amber-400/40 rounded-tl-none'
                        : 'bg-white/15 text-white font-medium rounded-tl-none border border-white/10'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-white/10 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe a los participantes..."
            maxLength={140}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-400 transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-purple-950 font-black p-2.5 rounded-xl transition shadow-lg shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
