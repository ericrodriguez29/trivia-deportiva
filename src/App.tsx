/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Users,
  Gamepad2,
  Tv,
  Volume2,
  VolumeX,
  MessageSquare,
  Sparkles,
  Flame,
  CheckCircle2,
  ArrowRight,
  Plus,
  Play,
  Share2,
  Crown,
  Zap,
  Bot
} from 'lucide-react';
import { playSound, toggleSoundMute, isSoundMuted } from './utils/sound.ts';
import { DEFAULT_QUIZ_TEMPLATES, QuizTemplate } from './data/quizPresets.ts';
import { ReactionOverlay, FloatingReaction } from './components/ReactionOverlay.tsx';
import { LiveChatDrawer, ChatMessage } from './components/LiveChatDrawer.tsx';
import { ParticipantsListModal, PlayerInfo } from './components/ParticipantsListModal.tsx';
import { CustomQuizModal } from './components/CustomQuizModal.tsx';
import { realtime } from './utils/realtime.ts';

const AVATAR_OPTIONS = ['🐱', '🐶', '🦊', '🦁', '🚀', '🦄', '🐼', '⚡', '🥑', '🎮', '🏆', '🔥'];

const OPTION_STYLES = [
  {
    bg: 'bg-[#e21b3c] hover:bg-[#c91835] active:bg-[#b0152e]',
    border: 'border-red-400/60',
    symbol: '▲',
    colorName: 'Rojo',
    shapeBg: 'bg-red-900/40'
  },
  {
    bg: 'bg-[#1368ce] hover:bg-[#1059b0] active:bg-[#0d4a92]',
    border: 'border-blue-400/60',
    symbol: '◆',
    colorName: 'Azul',
    shapeBg: 'bg-blue-900/40'
  },
  {
    bg: 'bg-[#d88902] hover:bg-[#bf7902] active:bg-[#a66902]',
    border: 'border-yellow-300/60',
    symbol: '●',
    colorName: 'Amarillo',
    shapeBg: 'bg-amber-900/40'
  },
  {
    bg: 'bg-[#26890c] hover:bg-[#20740a] active:bg-[#1a5f08]',
    border: 'border-emerald-400/60',
    symbol: '■',
    colorName: 'Verde',
    shapeBg: 'bg-emerald-900/40'
  }
];

export default function App() {
  // Navigation & Role State
  const [role, setRole] = useState<'home' | 'host' | 'player'>('home');
  const [hostStep, setHostStep] = useState<'setup' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended'>('setup');
  
  // Connection & Room Data
  const [pin, setPin] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🐱');
  const [selectedTeam, setSelectedTeam] = useState<'red' | 'blue' | 'green' | 'yellow'>('red');
  const [joinError, setJoinError] = useState('');

  // Quiz Management
  const [quizTemplates, setQuizTemplates] = useState<QuizTemplate[]>(DEFAULT_QUIZ_TEMPLATES);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [gameMode, setGameMode] = useState<'solo' | 'teams'>('solo');
  const [allowChat, setAllowChat] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);

  // Synchronized Room State from Realtime Server
  const [roomState, setRoomState] = useState<{
    pin: string;
    quizTitle: string;
    quizCategory: string;
    mode: 'solo' | 'teams';
    allowChat: boolean;
    allowReactions: boolean;
    status: 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended';
    currentQuestionIndex: number;
    totalQuestions: number;
    questionStartTime: number;
    timeLimit: number;
    currentQuestion: {
      question: string;
      options: string[];
      correctIndex?: number;
      explanation?: string;
    } | null;
    players: Record<string, PlayerInfo & { lastAnswer?: number | null; lastAnswerScore?: number; isCorrect?: boolean | null }>;
    messages: ChatMessage[];
  } | null>(null);

  // Local Timers & Floating items
  const [timeLeft, setTimeLeft] = useState(20);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isCustomQuizOpen, setIsCustomQuizOpen] = useState(false);
  const [muted, setMuted] = useState(isSoundMuted());
  const [copiedLink, setCopiedLink] = useState(false);

  // Connect to realtime manager when pin or player changes
  useEffect(() => {
    if (!pin) return;

    realtime.connect(pin, playerId, role === 'host' ? 'host' : 'player');

    const unsubscribe = realtime.subscribe((msg: any) => {
      if (!msg) return;

      if (msg.type === 'ROOM_STATE') {
        setRoomState(msg.room);
      } else if (msg.type === 'JOIN_SUCCESS') {
        setPlayerId(msg.playerId);
        setPin(msg.pin);
        setRole('player');
        setJoinError('');
        playSound('join');
      } else if (msg.type === 'ERROR') {
        setJoinError(msg.message);
      } else if (msg.type === 'NEW_CHAT_MESSAGE') {
        setRoomState((prev) => {
          if (!prev) return prev;
          const exists = prev.messages.some(m => m.id === msg.message.id);
          if (exists) return prev;
          return {
            ...prev,
            messages: [...prev.messages, msg.message]
          };
        });
        if (!isChatOpen) {
          playSound('shout');
        }
      } else if (msg.type === 'FLOATING_REACTION') {
        const reaction = msg.reaction;
        setFloatingReactions((prev) => [...prev.slice(-15), reaction]);
        playSound('pop');
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter(r => r.id !== reaction.id));
        }, 3000);
      } else if (msg.type === 'HIGH_FIVE_EVENT') {
        playSound('shout');
        setFloatingReactions((prev) => [
          ...prev,
          {
            id: 'hf_' + Date.now() + '_' + Math.random(),
            emoji: '👏',
            senderName: `${msg.from} ➔ ${msg.to}`,
            senderAvatar: msg.avatar,
            x: 30 + Math.random() * 40
          }
        ]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [pin, playerId, role, isChatOpen]);

  // Timer countdown synced
  useEffect(() => {
    if (!roomState || roomState.status !== 'question') return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - roomState.questionStartTime) / 1000);
      const remaining = Math.max(0, (roomState.timeLimit || 20) - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 5 && remaining > 0) {
        playSound('tick');
      }

      if (remaining === 0 && role === 'host') {
        clearInterval(interval);
        handleHostReveal();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [roomState?.status, roomState?.questionStartTime, roomState?.timeLimit, role]);

  // Current Player info helper
  const myPlayer = useMemo(() => {
    if (!roomState || !playerId) return null;
    return roomState.players[playerId] || null;
  }, [roomState, playerId]);

  // Total answered players count
  const answeredStats = useMemo(() => {
    if (!roomState) return { answered: 0, total: 0, counts: [0, 0, 0, 0] };
    const players = Object.values(roomState.players || {});
    const counts = [0, 0, 0, 0];
    let answered = 0;
    players.forEach(p => {
      if (p.lastAnswer !== null && p.lastAnswer !== undefined) {
        answered++;
        if (p.lastAnswer >= 0 && p.lastAnswer < 4) {
          counts[p.lastAnswer]++;
        }
      }
    });
    return { answered, total: players.length, counts };
  }, [roomState]);

  // Sorted Leaderboard
  const sortedPlayers = useMemo(() => {
    if (!roomState) return [];
    return Object.values(roomState.players || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [roomState]);

  // Actions
  const handleToggleSound = () => {
    const isMutedNow = toggleSoundMute();
    setMuted(isMutedNow);
  };

  const handleCreateHostRoom = async () => {
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const quiz = quizTemplates[selectedTemplateIndex];
    setPin(newPin);
    setRole('host');
    setHostStep('lobby');

    await realtime.sendAction('CREATE_ROOM', {
      pin: newPin,
      quizTitle: quiz.title,
      quizCategory: quiz.category,
      questions: quiz.questions,
      mode: gameMode,
      allowChat,
      allowReactions,
    });
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 6) {
      setJoinError('Por favor ingresa un código PIN de 6 dígitos.');
      return;
    }
    if (!playerName.trim()) {
      setJoinError('Por favor ingresa tu apodo o nombre.');
      return;
    }

    const res = await realtime.sendAction('JOIN_ROOM', {
      pin: pin.trim(),
      playerId: playerId || undefined,
      playerName: playerName.trim(),
      playerAvatar: selectedAvatar,
      playerTeam: selectedTeam,
    });

    if (res.success && res.data) {
      setPlayerId(res.data.playerId);
      setPin(res.data.pin);
      setRole('player');
      setJoinError('');
      playSound('join');
    } else if (res.error) {
      setJoinError(res.error);
    }
  };

  const handleHostStartGame = () => {
    playSound('fanfare');
    realtime.sendAction('START_GAME', { pin });
  };

  const handleHostReveal = () => {
    realtime.sendAction('REVEAL_QUESTION', { pin });
  };

  const handleHostShowLeaderboard = () => {
    realtime.sendAction('SHOW_LEADERBOARD', { pin });
  };

  const handleHostNextQuestion = () => {
    realtime.sendAction('NEXT_QUESTION', { pin });
  };

  const handlePlayerSubmitAnswer = (optIndex: number) => {
    if (!myPlayer || myPlayer.lastAnswer !== null || roomState?.status !== 'question') return;
    playSound('tick');
    realtime.sendAction('SUBMIT_ANSWER', {
      pin,
      playerId,
      optionIndex: optIndex,
    });
  };

  const handleSendMessage = (text: string, type: 'text' | 'shoutout' = 'text') => {
    realtime.sendAction('SEND_CHAT', {
      pin,
      playerId: role === 'host' ? 'host' : playerId,
      text,
      type
    });
  };

  const handleSendReaction = (emoji: string) => {
    realtime.sendAction('SEND_REACTION', {
      pin,
      playerId: role === 'host' ? 'host' : playerId,
      playerName: myPlayer?.name || (role === 'host' ? 'Anfitrión' : 'Participante'),
      playerAvatar: myPlayer?.avatar || (role === 'host' ? '🎙️' : selectedAvatar),
      emoji
    });
  };

  const handleSendHighFive = (targetId: string) => {
    realtime.sendAction('SEND_HIGH_FIVE', {
      pin,
      fromPlayerId: role === 'host' ? 'host' : playerId,
      toPlayerId: targetId
    });
  };

  const handleAddBots = (count: number = 3) => {
    playSound('pop');
    realtime.sendAction('ADD_BOTS', { pin, count });
  };

  const handleKickPlayer = (targetId: string) => {
    realtime.sendAction('KICK_PLAYER', { pin, playerId: targetId });
  };

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}/?pin=${pin}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    playSound('join');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // URL Query param auto-fill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam) {
      setPin(pinParam);
      setRole('player');
    }
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden text-white">
      {/* Floating Reaction Animation Overlay */}
      <ReactionOverlay reactions={floatingReactions} />

      {/* Top Navbar */}
      <header className="relative z-20 w-full p-3 sm:p-4 max-w-6xl mx-auto flex items-center justify-between">
        <div
          onClick={() => {
            setRole('home');
            setRoomState(null);
            realtime.disconnect();
          }}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-11 h-11 bg-amber-400 text-purple-950 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg transform -rotate-3 group-hover:rotate-0 transition">
            ⚡
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-title text-amber-300 tracking-wide drop-shadow-md">
              TRIVIA INTERACTIVA
            </h1>
            <p className="text-[10px] sm:text-xs text-purple-200 font-bold uppercase tracking-wider">
              En Vivo & Multijugador Simultáneo
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="glass-panel px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/20 transition flex items-center space-x-1.5"
            title={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
            <span className="hidden sm:inline">{muted ? 'Mudo' : 'Audio'}</span>
          </button>

          {/* Connected Participants Button */}
          {roomState && (
            <button
              onClick={() => setIsParticipantsOpen(true)}
              className="glass-panel px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/20 transition flex items-center space-x-1.5 text-emerald-300 border border-emerald-400/40"
            >
              <Users className="w-4 h-4" />
              <span>{sortedPlayers.length}</span>
              <span className="hidden sm:inline">Jugadores</span>
            </button>
          )}

          {/* Live Chat Trigger */}
          {roomState && roomState.allowChat && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="glass-panel bg-amber-400/20 text-amber-300 px-3 py-2 rounded-xl text-xs font-black hover:bg-amber-400 hover:text-purple-950 transition flex items-center space-x-1.5 border border-amber-400/50 relative"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
              {roomState.messages.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5 animate-ping" />
              )}
            </button>
          )}

          {role !== 'home' && (
            <button
              onClick={() => {
                setRole('home');
                setRoomState(null);
                realtime.disconnect();
              }}
              className="glass-panel px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/20 transition text-purple-200"
            >
              Salir
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-6">
        {/* ========================================================================= */}
        {/* SCREEN 1: HOME / ROLE SELECT */}
        {/* ========================================================================= */}
        {role === 'home' && (
          <div className="w-full max-w-4xl text-center space-y-8 py-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="space-y-3">
              <span className="inline-flex items-center space-x-1 bg-amber-400/20 text-amber-300 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full border border-amber-400/30 uppercase tracking-widest">
                <Sparkles className="w-4 h-4 mr-1" />
                Interacción Total entre Participantes
              </span>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-black font-title text-white leading-tight">
                ¡Aprende, Compite y <br className="hidden sm:inline" />
                <span className="text-amber-400 drop-shadow-md">Reacciona en Tiempo Real!</span>
              </h2>
              <p className="text-sm sm:text-base text-purple-200 max-w-2xl mx-auto">
                Únete con tu celular o computadora usando un PIN para responder preguntas, chatear, reaccionar con emojis y chocar los cinco con tus compañeros.
              </p>
            </div>

            {/* Role Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-2">
              {/* Player Card */}
              <div
                onClick={() => setRole('player')}
                className="glass-panel p-6 sm:p-8 rounded-3xl hover:bg-white/15 transition cursor-pointer border-2 border-emerald-400/40 shadow-2xl group flex flex-col justify-between text-center transform hover:-translate-y-1"
              >
                <div>
                  <div className="w-20 h-20 bg-emerald-500 rounded-3xl mx-auto flex items-center justify-center text-4xl text-white mb-4 shadow-xl group-hover:scale-110 transition">
                    <Gamepad2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black font-title text-emerald-300 mb-2">
                    Entrar a una Sala
                  </h3>
                  <p className="text-xs sm:text-sm text-purple-100 mb-6">
                    Soy Jugador / Estudiante. Tengo un código PIN para responder preguntas y competir con los demás.
                  </p>
                </div>
                <button className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-lg flex items-center justify-center space-x-2 pulse-glow">
                  <span>¡UNIRME CON PIN!</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Host Card */}
              <div
                onClick={() => {
                  setRole('host');
                  setHostStep('setup');
                }}
                className="glass-panel p-6 sm:p-8 rounded-3xl hover:bg-white/15 transition cursor-pointer border-2 border-amber-400/40 shadow-2xl group flex flex-col justify-between text-center transform hover:-translate-y-1"
              >
                <div>
                  <div className="w-20 h-20 bg-amber-500 rounded-3xl mx-auto flex items-center justify-center text-4xl text-purple-950 mb-4 shadow-xl group-hover:scale-110 transition">
                    <Tv className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black font-title text-amber-300 mb-2">
                    Crear Sala (Anfitrión)
                  </h3>
                  <p className="text-xs sm:text-sm text-purple-100 mb-6">
                    Soy Docente / Presentador. Quiero proyectar las preguntas en pantalla grande y liderar la trivia interactiva.
                  </p>
                </div>
                <button className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-lg rounded-2xl shadow-lg flex items-center justify-center space-x-2">
                  <span>CREAR SALA & PROYECTAR</span>
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Custom Trivia trigger */}
            <div className="pt-2">
              <button
                onClick={() => setIsCustomQuizOpen(true)}
                className="text-xs sm:text-sm text-amber-300 hover:text-white font-bold underline underline-offset-4 transition"
              >
                ✨ ¿Deseas crear o personalizar tu propia trivia con preguntas a medida? Haz clic aquí
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: HOST SETUP (SELECT QUIZ & OPTIONS) */}
        {/* ========================================================================= */}
        {role === 'host' && hostStep === 'setup' && (
          <div className="w-full max-w-3xl glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <span className="bg-amber-400/20 text-amber-300 text-xs font-black px-3 py-1 rounded-full border border-amber-400/30 uppercase">
                Panel del Anfitrión
              </span>
              <h3 className="text-2xl sm:text-3xl font-black font-title text-white">
                Selecciona la Trivia para la Campaña
              </h3>
              <p className="text-xs sm:text-sm text-purple-200">
                Elige el tema de preguntas o crea un cuestionario nuevo para tus participantes
              </p>
            </div>

            {/* Quiz Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quizTemplates.map((t, idx) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplateIndex(idx)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedTemplateIndex === idx
                      ? 'bg-purple-900/60 border-amber-400 shadow-xl'
                      : 'bg-white/5 hover:bg-white/10 border-white/15'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="text-3xl">{t.icon}</div>
                    <h4 className="text-base font-black font-title text-white">{t.title}</h4>
                    <p className="text-[11px] text-purple-200 line-clamp-2">{t.description}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center text-xs font-black text-amber-300">
                    <span>{t.questions.length} Preguntas</span>
                    {selectedTemplateIndex === idx && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Settings */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowChat}
                  onChange={(e) => setAllowChat(e.target.checked)}
                  className="accent-amber-400 w-4 h-4 rounded"
                />
                <span className="font-bold text-white">Permitir Chat en Vivo</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowReactions}
                  onChange={(e) => setAllowReactions(e.target.checked)}
                  className="accent-amber-400 w-4 h-4 rounded"
                />
                <span className="font-bold text-white">Lluvia de Emojis Flotantes</span>
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-purple-200 font-bold">Modo:</span>
                <select
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value as 'solo' | 'teams')}
                  className="bg-purple-950 text-white font-bold px-2 py-1 rounded-lg border border-white/20"
                >
                  <option value="solo">Individual (Todos vs Todos)</option>
                  <option value="teams">Por Equipos (4 Colores)</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-white/10">
              <button
                onClick={() => setIsCustomQuizOpen(true)}
                className="text-xs font-bold text-amber-300 hover:text-white flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Cuestionario Personalizado</span>
              </button>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => setRole('home')}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs"
                >
                  Volver
                </button>
                <button
                  onClick={handleCreateHostRoom}
                  className="flex-1 sm:flex-none px-8 py-3 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-base rounded-xl shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>Crear Sala & Generar PIN</span>
                  <Zap className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: HOST LOBBY (WAITING PARTICIPANTS) */}
        {/* ========================================================================= */}
        {role === 'host' && roomState?.status === 'lobby' && (
          <div className="w-full max-w-4xl glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="text-left space-y-1">
                <span className="text-[11px] font-black text-purple-200 uppercase tracking-widest">
                  Sala de Juego Activa
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-title text-amber-300">
                  {roomState.quizTitle}
                </h3>
                <p className="text-xs text-purple-200">
                  {roomState.totalQuestions} Preguntas &bull; Categoría: {roomState.quizCategory}
                </p>
              </div>

              {/* Big PIN Box */}
              <div className="bg-amber-400 text-purple-950 px-8 py-3.5 rounded-3xl text-center shadow-2xl border-4 border-amber-300">
                <span className="block text-[11px] font-black uppercase tracking-widest">
                  CÓDIGO PIN PARA UNIRSE
                </span>
                <span className="text-4xl sm:text-5xl font-black font-title tracking-widest">
                  {roomState.pin.slice(0, 3)} {roomState.pin.slice(3)}
                </span>
              </div>
            </div>

            {/* Quick Share Link & Bot Simulator */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleCopyInviteLink}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl flex items-center space-x-1.5 border border-white/15 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace Directo'}</span>
              </button>

              <button
                onClick={() => handleAddBots(3)}
                className="px-4 py-2 bg-purple-600/80 hover:bg-purple-600 text-xs font-black text-white rounded-xl flex items-center space-x-1.5 border border-purple-400/40 transition shadow-md"
                title="Agrega participantes simulados para probar la interacción grupal"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>+ Agregar 3 Bots de Prueba</span>
              </button>
            </div>

            {/* Players Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-lg font-black font-title text-white flex items-center">
                  <Users className="w-5 h-5 text-emerald-400 mr-2" />
                  Participantes Conectados ({sortedPlayers.length})
                </h4>
                <span className="text-xs text-emerald-300 font-bold flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-ping" />
                  Esperando jugadores...
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto p-3 bg-black/25 rounded-2xl border border-white/10 min-h-[100px] items-center justify-center">
                {sortedPlayers.length === 0 ? (
                  <p className="col-span-full text-purple-300 text-xs font-semibold italic">
                    Diles a los participantes que ingresen el código PIN <strong className="text-amber-300">{roomState.pin}</strong> o presiona "+ Agregar Bots de Prueba" para probar ahora mismo.
                  </p>
                ) : (
                  sortedPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white/10 border border-white/15 p-2 rounded-2xl flex items-center space-x-2 animate-in zoom-in-90"
                    >
                      <span className="text-2xl">{p.avatar}</span>
                      <div className="text-left overflow-hidden">
                        <span className="text-xs font-black text-white truncate block">{p.name}</span>
                        {p.isBot && <span className="text-[9px] text-purple-300 font-bold">Bot</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Start Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleHostStartGame}
                disabled={sortedPlayers.length === 0}
                className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xl rounded-2xl shadow-2xl pulse-glow flex items-center space-x-3 transition transform active:scale-95"
              >
                <Play className="w-6 h-6 fill-current" />
                <span>¡EMPEZAR LA TRIVIA AHORA!</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 4: HOST QUESTION (PROJECTION VIEW) */}
        {/* ========================================================================= */}
        {role === 'host' && roomState?.status === 'question' && roomState.currentQuestion && (
          <div className="w-full max-w-5xl glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header bar */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <span className="bg-amber-400 text-purple-950 px-3 py-1 rounded-xl font-black text-xs sm:text-sm">
                  Pregunta {roomState.currentQuestionIndex + 1} de {roomState.totalQuestions}
                </span>
                <span className="text-xs font-bold text-purple-200 uppercase tracking-wider hidden sm:inline">
                  {roomState.quizCategory}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-emerald-400 fill-current" />
                  <span className="text-xs font-bold text-purple-200">Respuestas:</span>
                  <span className="text-base font-black text-amber-300">
                    {answeredStats.answered} / {answeredStats.total}
                  </span>
                </div>

                <button
                  onClick={handleHostReveal}
                  className="px-3.5 py-1.5 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition"
                >
                  Saltar ➔
                </button>
              </div>
            </div>

            {/* Question Text & Timer */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-400 text-purple-950 font-black text-2xl font-title shadow-xl border-4 border-amber-300">
                {timeLeft}
              </div>

              <h2 className="text-2xl sm:text-4xl font-black font-title text-white leading-tight max-w-3xl mx-auto px-2">
                {roomState.currentQuestion.question}
              </h2>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / (roomState.timeLimit || 20)) * 100}%` }}
              />
            </div>

            {/* Options 4 Grid (Host Display) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {roomState.currentQuestion.options.map((optText, oIdx) => {
                const style = OPTION_STYLES[oIdx % OPTION_STYLES.length];
                return (
                  <div
                    key={oIdx}
                    className={`p-4 sm:p-5 rounded-2xl ${style.bg} border-2 ${style.border} flex items-center space-x-4 text-white shadow-xl`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-black/25 flex items-center justify-center text-xl font-black shrink-0">
                      {style.symbol}
                    </div>
                    <span className="text-lg sm:text-xl font-bold font-title leading-snug">
                      {optText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 5: HOST REVEAL (ANSWER STATS) */}
        {/* ========================================================================= */}
        {role === 'host' && roomState?.status === 'reveal' && roomState.currentQuestion && (
          <div className="w-full max-w-4xl glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <span className="bg-amber-400/20 text-amber-300 text-xs font-black px-3 py-1 rounded-full border border-amber-400/30 uppercase">
              Resultados de la Ronda
            </span>

            <h2 className="text-xl sm:text-3xl font-black font-title text-white">
              {roomState.currentQuestion.question}
            </h2>

            {/* Bar chart */}
            <div className="grid grid-cols-4 gap-3 sm:gap-4 h-52 items-end p-4 bg-black/25 rounded-2xl border border-white/10">
              {OPTION_STYLES.map((style, idx) => {
                const count = answeredStats.counts[idx] || 0;
                const total = answeredStats.answered || 1;
                const pct = Math.max((count / total) * 100, 10);
                const isCorrect = roomState.currentQuestion?.correctIndex === idx;

                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end">
                    <span className="text-xs sm:text-sm font-black text-white mb-1">
                      {count} {isCorrect && '⭐'}
                    </span>
                    <div
                      className={`w-full ${style.bg} rounded-t-xl transition-all duration-700 min-h-[14px] ${
                        isCorrect ? 'ring-4 ring-amber-300' : 'opacity-70'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                    <span className="text-xs font-black text-white mt-2 flex items-center space-x-1">
                      <span>{style.symbol}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Correct Answer Explanation Box */}
            <div className="p-4 bg-emerald-500/20 border-2 border-emerald-400 rounded-2xl flex flex-col items-center justify-center space-y-1 text-emerald-200">
              <div className="flex items-center space-x-2 text-base sm:text-lg font-black text-emerald-300">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span>
                  Respuesta Correcta:{' '}
                  <strong className="text-white font-title">
                    {roomState.currentQuestion.options[roomState.currentQuestion.correctIndex || 0]}
                  </strong>
                </span>
              </div>
              {roomState.currentQuestion.explanation && (
                <p className="text-xs text-purple-100 font-medium">
                  {roomState.currentQuestion.explanation}
                </p>
              )}
            </div>

            {/* Advance to Leaderboard */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleHostShowLeaderboard}
                className="px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-lg rounded-xl shadow-xl flex items-center space-x-2"
              >
                <span>Ver Tabla de Posiciones</span>
                <Trophy className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 6: HOST LEADERBOARD */}
        {/* ========================================================================= */}
        {role === 'host' && roomState?.status === 'leaderboard' && (
          <div className="w-full max-w-3xl glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-1 border-b border-white/10 pb-4">
              <span className="bg-amber-400/20 text-amber-300 text-xs font-black px-3 py-1 rounded-full border border-amber-400/30 uppercase">
                Clasificación
              </span>
              <h3 className="text-3xl font-black font-title text-white">Tabla de Posiciones</h3>
            </div>

            {/* Standings list */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto p-1">
              {sortedPlayers.slice(0, 5).map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-white/10 p-3.5 rounded-2xl border border-white/20 flex justify-between items-center animate-in slide-in-from-left"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center ${
                        idx === 0
                          ? 'bg-amber-400 text-purple-950 shadow-md'
                          : idx === 1
                          ? 'bg-slate-300 text-purple-950'
                          : idx === 2
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-white/15 text-white'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-2xl">{p.avatar}</span>
                    <div>
                      <span className="font-title font-bold text-white text-base block">{p.name}</span>
                      {p.streak > 1 && (
                        <span className="text-[10px] text-amber-400 font-extrabold flex items-center">
                          <Flame className="w-3 h-3 mr-0.5 text-rose-500 fill-rose-500" />
                          {p.streak} aciertos seguidos
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="font-title font-black text-amber-300 text-xl">
                    {p.score} pts
                  </span>
                </div>
              ))}
            </div>

            {/* Next question or Podium */}
            <div className="flex justify-center pt-3 border-t border-white/10">
              <button
                onClick={handleHostNextQuestion}
                className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xl rounded-2xl shadow-xl flex items-center space-x-2 pulse-glow"
              >
                <span>
                  {roomState.currentQuestionIndex + 1 >= roomState.totalQuestions
                    ? 'Ver Podio Final 🎉'
                    : 'Siguiente Pregunta ➔'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 7: PODIUM / GAME ENDED (HOST & PLAYER) */}
        {/* ========================================================================= */}
        {roomState?.status === 'ended' && (
          <div className="w-full max-w-4xl glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="space-y-1">
              <span className="bg-amber-400/20 text-amber-300 text-xs font-black px-4 py-1.5 rounded-full border border-amber-400/30 uppercase">
                ¡Gran Final de la Trivia!
              </span>
              <h2 className="text-3xl sm:text-5xl font-black font-title text-amber-300">
                ¡Ganadores del Podio!
              </h2>
            </div>

            {/* 3D-styled Podium */}
            <div className="flex justify-center items-end space-x-3 sm:space-x-6 h-64 pt-6">
              {/* 2nd Place */}
              <div className="w-24 sm:w-32 flex flex-col items-center">
                <span className="text-3xl mb-1">{sortedPlayers[1]?.avatar || '🐶'}</span>
                <span className="text-xs font-black text-purple-200 truncate w-full text-center">
                  {sortedPlayers[1]?.name || 'Jugador 2'}
                </span>
                <span className="text-xs font-bold text-amber-300 mb-2">
                  {sortedPlayers[1]?.score || 0} pts
                </span>
                <div className="w-full bg-slate-400 rounded-t-2xl h-36 flex items-center justify-center text-3xl font-black font-title text-slate-800 shadow-xl border-t-2 border-slate-200">
                  2
                </div>
              </div>

              {/* 1st Place */}
              <div className="w-28 sm:w-36 flex flex-col items-center">
                <Crown className="w-8 h-8 text-amber-300 fill-amber-300 animate-bounce mb-1" />
                <span className="text-4xl mb-1">{sortedPlayers[0]?.avatar || '🐱'}</span>
                <span className="text-sm font-black text-amber-300 truncate w-full text-center">
                  {sortedPlayers[0]?.name || 'Jugador 1'}
                </span>
                <span className="text-xs font-bold text-amber-300 mb-2">
                  {sortedPlayers[0]?.score || 0} pts
                </span>
                <div className="w-full bg-amber-400 rounded-t-2xl h-48 flex items-center justify-center text-4xl font-black font-title text-purple-950 shadow-2xl border-t-4 border-amber-200">
                  1
                </div>
              </div>

              {/* 3rd Place */}
              <div className="w-24 sm:w-32 flex flex-col items-center">
                <span className="text-3xl mb-1">{sortedPlayers[2]?.avatar || '🦁'}</span>
                <span className="text-xs font-black text-purple-200 truncate w-full text-center">
                  {sortedPlayers[2]?.name || 'Jugador 3'}
                </span>
                <span className="text-xs font-bold text-amber-300 mb-2">
                  {sortedPlayers[2]?.score || 0} pts
                </span>
                <div className="w-full bg-amber-800 rounded-t-2xl h-28 flex items-center justify-center text-3xl font-black font-title text-amber-200 shadow-lg border-t-2 border-amber-600">
                  3
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setRole('home');
                  setRoomState(null);
                  realtime.disconnect();
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-sm rounded-xl transition"
              >
                Volver al Menú Principal
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 8: PLAYER JOIN SCREEN */}
        {/* ========================================================================= */}
        {role === 'player' && !roomState && (
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 text-center border-2 border-emerald-400/50 animate-in zoom-in-95 duration-300">
            <div className="space-y-1">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center text-2xl text-white shadow-md">
                <Gamepad2 className="w-7 h-7" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black font-title text-white">
                Únete a la Sala
              </h3>
              <p className="text-xs text-purple-200">
                Ingresa el código PIN que proyecta el anfitrión
              </p>
            </div>

            <form onSubmit={handleJoinGame} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-left text-purple-200 uppercase mb-1">
                  CÓDIGO PIN (6 DÍGITOS)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej. 123456"
                  className="w-full py-3 px-4 bg-white/10 border-2 border-white/20 rounded-2xl text-center text-3xl font-black tracking-widest text-amber-300 focus:outline-none focus:border-amber-400 placeholder-white/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-left text-purple-200 uppercase mb-1">
                  TU APODO O NOMBRE
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ej: Sofia_Crack"
                  className="w-full py-2.5 px-4 bg-white/10 border-2 border-white/20 rounded-2xl text-center text-lg font-bold text-white focus:outline-none focus:border-emerald-400 placeholder-white/30"
                />
              </div>

              {/* Avatar Picker */}
              <div>
                <label className="block text-[11px] font-bold text-left text-purple-200 uppercase mb-1.5">
                  ELIGE TU AVATAR
                </label>
                <div className="grid grid-cols-6 gap-2 text-2xl">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      type="button"
                      key={av}
                      onClick={() => setSelectedAvatar(av)}
                      className={`p-2 rounded-xl transition transform active:scale-90 ${
                        selectedAvatar === av
                          ? 'bg-amber-400/40 border-2 border-amber-400 scale-110 shadow-md'
                          : 'bg-white/10 hover:bg-white/20 border border-transparent'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {joinError && (
                <div className="text-rose-300 font-bold text-xs bg-rose-500/20 p-2.5 rounded-xl border border-rose-500/30">
                  {joinError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl transition transform active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>¡ENTRAR AHORA!</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 9: PLAYER LOBBY WAITING */}
        {/* ========================================================================= */}
        {role === 'player' && roomState?.status === 'lobby' && (
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-6 animate-in zoom-in-95">
            <div className="w-24 h-24 bg-purple-600 rounded-full mx-auto flex items-center justify-center text-5xl shadow-xl border-4 border-amber-400 animate-bounce">
              {myPlayer?.avatar || selectedAvatar}
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black font-title text-white">
                ¡Estás Dentro!
              </h3>
              <p className="text-lg font-bold text-amber-300">
                {myPlayer?.name || playerName}
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl border border-white/20 space-y-2">
              <p className="text-xs text-purple-100 font-medium">
                Mira la pantalla principal del anfitrión. La trivia comenzará en breve.
              </p>
              <div className="inline-flex items-center space-x-2 text-emerald-300 text-xs font-black uppercase bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Esperando que el anfitrión inicie</span>
              </div>
            </div>

            {/* Quick interactive triggers */}
            <div className="pt-2 flex justify-center space-x-2">
              <button
                onClick={() => setIsChatOpen(true)}
                className="px-4 py-2 bg-amber-400/20 hover:bg-amber-400 hover:text-purple-950 text-amber-300 text-xs font-black rounded-xl border border-amber-400/30 flex items-center space-x-1.5 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Saludar en el Chat</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 10: PLAYER QUESTION (4 BIG TACTILE BUTTONS) */}
        {/* ========================================================================= */}
        {role === 'player' && roomState?.status === 'question' && (
          <div className="w-full max-w-md space-y-3 animate-in zoom-in-95">
            {/* Status bar */}
            <div className="glass-panel p-3.5 rounded-2xl flex justify-between items-center shadow-lg">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{myPlayer?.avatar || '🐱'}</span>
                <div>
                  <span className="font-bold text-white text-xs block">{myPlayer?.name}</span>
                  <span className="font-black text-amber-300 text-sm">{myPlayer?.score || 0} pts</span>
                </div>
              </div>

              {myPlayer?.streak && myPlayer.streak > 1 ? (
                <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black px-2.5 py-1 rounded-xl flex items-center">
                  <Flame className="w-3.5 h-3.5 mr-1 fill-rose-500 text-rose-500 animate-pulse" />
                  Racha x{myPlayer.streak}
                </div>
              ) : null}

              <div className="text-xs font-bold text-purple-200 bg-white/10 px-3 py-1 rounded-xl">
                Tiempo: <span className="text-amber-300 font-black">{timeLeft}</span>s
              </div>
            </div>

            {/* If player already answered this question */}
            {myPlayer?.lastAnswer !== null && myPlayer?.lastAnswer !== undefined ? (
              <div className="glass-panel p-8 rounded-3xl text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 bg-amber-400 text-purple-950 rounded-full mx-auto flex items-center justify-center text-3xl font-black animate-pulse">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black font-title text-white">
                  ¡Respuesta Enviada!
                </h3>
                <p className="text-xs text-purple-200">
                  Esperando que los demás participantes terminen de responder...
                </p>
                <div className="text-xs font-bold text-amber-300 bg-white/10 p-2.5 rounded-xl border border-white/20">
                  ⚡ ¡La velocidad otorga puntos adicionales!
                </div>
              </div>
            ) : (
              /* 4 Large Color Buttons */
              <div className="grid grid-cols-2 gap-3 h-72">
                {OPTION_STYLES.map((style, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePlayerSubmitAnswer(idx)}
                    className={`${style.bg} rounded-3xl p-4 flex flex-col items-center justify-center text-white shadow-xl border-4 ${style.border} transition transform active:scale-95`}
                  >
                    <span className="text-4xl mb-1">{style.symbol}</span>
                    <span className="text-xs font-black opacity-90">
                      {roomState.currentQuestion?.options[idx] || `Opción ${idx + 1}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 11: PLAYER ROUND REVEAL */}
        {/* ========================================================================= */}
        {role === 'player' && (roomState?.status === 'reveal' || roomState?.status === 'leaderboard') && (
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            {myPlayer?.isCorrect ? (
              <div className="p-6 rounded-3xl space-y-2 shadow-xl bg-emerald-500/25 border-2 border-emerald-400 text-emerald-200">
                <div className="text-5xl">🎉</div>
                <h3 className="text-3xl font-black font-title text-white">¡Correcto!</h3>
                <p className="text-lg font-black text-amber-300">
                  +{myPlayer.lastAnswerScore || 1000} Puntos
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-3xl space-y-2 shadow-xl bg-rose-500/25 border-2 border-rose-400 text-rose-200">
                <div className="text-5xl">😅</div>
                <h3 className="text-3xl font-black font-title text-white">¡Casi lo logras!</h3>
                <p className="text-sm font-bold text-rose-300">+0 Puntos esta ronda</p>
              </div>
            )}

            <div className="bg-white/10 p-4 rounded-2xl border border-white/20 flex justify-between items-center">
              <span className="text-xs font-bold text-purple-200">Tu Puntaje Total:</span>
              <span className="text-2xl font-black text-amber-300">{myPlayer?.score || 0} pts</span>
            </div>

            <p className="text-xs text-purple-300 animate-pulse">
              Mira la pantalla principal para ver la clasificación.
            </p>
          </div>
        )}
      </main>

      {/* Persistent Bottom Floating Action Pill for Participants */}
      {roomState && (
        <div className="relative z-20 max-w-md mx-auto w-full px-4 pb-3">
          <div className="glass-panel-dark rounded-2xl p-2 px-3 flex items-center justify-between shadow-2xl border border-white/20">
            <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
              {['🔥', '👏', '🚀', '💡', '❤️', '🎉'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/25 active:scale-90 flex items-center justify-center text-base transition shrink-0"
                  title={`Reaccionar con ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5 pl-2 border-l border-white/15">
              <button
                onClick={() => setIsChatOpen(true)}
                className="p-2 rounded-xl bg-amber-400 text-purple-950 font-black hover:bg-amber-300 transition"
                title="Abrir Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full py-2.5 text-center text-[11px] text-purple-300/60 border-t border-white/5">
        Campaña Interactiva &copy; 2026 &bull; Aprendizaje y Competición Simultánea en Vivo
      </footer>

      {/* Live Chat Drawer */}
      <LiveChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={roomState?.messages || []}
        onSendMessage={handleSendMessage}
        onSendReaction={handleSendReaction}
        currentUserId={role === 'host' ? 'host' : playerId}
      />

      {/* Connected Participants Modal */}
      <ParticipantsListModal
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        players={roomState?.players || {}}
        currentUserId={role === 'host' ? 'host' : playerId}
        onSendHighFive={handleSendHighFive}
        isHost={role === 'host'}
        onKickPlayer={handleKickPlayer}
      />

      {/* Custom Quiz Creator Modal */}
      <CustomQuizModal
        isOpen={isCustomQuizOpen}
        onClose={() => setIsCustomQuizOpen(false)}
        onSaveQuiz={(newQuiz) => {
          setQuizTemplates([newQuiz, ...quizTemplates]);
          setSelectedTemplateIndex(0);
          playSound('join');
        }}
      />
    </div>
  );
}
