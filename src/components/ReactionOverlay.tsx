import React from 'react';

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  senderAvatar: string;
  x: number; // percentage across screen (10% - 90%)
}

interface ReactionOverlayProps {
  reactions: FloatingReaction[];
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({ reactions }) => {
  if (reactions.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-12 animate-float-reaction flex flex-col items-center select-none"
          style={{ left: `${r.x}%` }}
        >
          <div className="text-4xl sm:text-5xl drop-shadow-xl transform hover:scale-125 transition">
            {r.emoji}
          </div>
          <div className="bg-black/60 backdrop-blur-md text-amber-300 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap shadow-md mt-1">
            <span className="mr-1">{r.senderAvatar}</span>
            {r.senderName}
          </div>
        </div>
      ))}
    </div>
  );
};
