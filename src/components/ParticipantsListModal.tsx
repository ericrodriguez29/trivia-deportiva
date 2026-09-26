import React from 'react';
import { Users, X, Flame, HandMetal, Award, Shield } from 'lucide-react';
import { playSound } from '../utils/sound.ts';

export interface PlayerInfo {
  id: string;
  name: string;
  avatar: string;
  team: 'red' | 'blue' | 'green' | 'yellow';
  score: number;
  streak: number;
  connected: boolean;
  isBot?: boolean;
}

interface ParticipantsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Record<string, PlayerInfo>;
  currentUserId: string;
  onSendHighFive: (targetPlayerId: string) => void;
  isHost?: boolean;
  onKickPlayer?: (playerId: string) => void;
}

export const ParticipantsListModal: React.FC<ParticipantsListModalProps> = ({
  isOpen,
  onClose,
  players,
  currentUserId,
  onSendHighFive,
  isHost,
  onKickPlayer,
}) => {
  if (!isOpen) return null;

  const playerList = Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0));

  const handleHighFive = (targetId: string) => {
    onSendHighFive(targetId);
    playSound('shout');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-panel bg-[#1a073d] border border-white/20 rounded-3xl p-6 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center font-black">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-title text-xl font-black text-white">
                Participantes Conectados ({playerList.length})
              </h3>
              <p className="text-xs text-purple-200">
                Toca a un participante para chocar los 5 (High-Five 👏) o animarlo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-purple-200 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
          {playerList.length === 0 ? (
            <div className="text-center py-8 text-purple-300 text-sm">
              Aún no hay otros participantes en la sala.
            </div>
          ) : (
            playerList.map((p, idx) => {
              const isMe = p.id === currentUserId;
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                    isMe
                      ? 'bg-amber-400/20 border-amber-400'
                      : 'bg-white/10 hover:bg-white/15 border-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 text-center text-xs font-black text-amber-300">
                      #{idx + 1}
                    </span>
                    <span className="text-3xl">{p.avatar}</span>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-title font-bold text-white text-base">
                          {p.name}
                        </span>
                        {isMe && (
                          <span className="bg-amber-400 text-purple-950 text-[10px] font-black px-1.5 py-0.2 rounded-md">
                            TÚ
                          </span>
                        )}
                        {p.isBot && (
                          <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                            BOT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-purple-200 mt-0.5">
                        <span className="font-bold text-amber-300">{p.score} pts</span>
                        {p.streak > 1 && (
                          <span className="text-amber-400 font-extrabold flex items-center">
                            <Flame className="w-3 h-3 mr-0.5 text-rose-500 fill-rose-500" />
                            {p.streak} racha
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-black px-1.5 rounded-full ${
                            p.team === 'red' ? 'bg-rose-500/80 text-white' :
                            p.team === 'blue' ? 'bg-blue-500/80 text-white' :
                            p.team === 'green' ? 'bg-emerald-500/80 text-white' :
                            'bg-amber-500/80 text-purple-950'
                          }`}
                        >
                          Equipo {p.team}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!isMe && (
                      <button
                        onClick={() => handleHighFive(p.id)}
                        className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400 hover:text-purple-950 text-amber-300 rounded-xl text-xs font-bold transition flex items-center space-x-1 border border-amber-400/30 active:scale-90"
                        title="Chocar esos cinco"
                      >
                        <span>👏</span>
                        <span className="hidden sm:inline">¡Choca 5!</span>
                      </button>
                    )}
                    {isHost && !isMe && onKickPlayer && (
                      <button
                        onClick={() => onKickPlayer(p.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg text-xs transition"
                        title="Expulsar jugador"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-purple-300">
          <span>🎮 Modo Multijugador en tiempo real</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
