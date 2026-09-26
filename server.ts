import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  timeLimit?: number;
  explanation?: string;
  image?: string;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  team: 'red' | 'blue' | 'green' | 'yellow';
  score: number;
  streak: number;
  lastAnswer: number | null;
  lastAnswerTime: number;
  lastAnswerScore: number;
  isCorrect: boolean | null;
  connected: boolean;
  isBot?: boolean;
}

interface ChatMessage {
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

interface Room {
  pin: string;
  quizTitle: string;
  quizCategory: string;
  questions: Question[];
  mode: 'solo' | 'teams';
  allowChat: boolean;
  allowReactions: boolean;
  status: 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended';
  currentQuestionIndex: number;
  questionStartTime: number;
  timeLimit: number;
  players: Record<string, Player>;
  messages: ChatMessage[];
  createdAt: number;
}

const rooms: Record<string, Room> = {};
const clientRooms = new Map<WebSocket, { pin: string; playerId: string; isHost: boolean }>();
const sseClients: { pin: string; playerId: string; res: Response }[] = [];

function getPublicRoomState(room: Room) {
  return {
    pin: room.pin,
    quizTitle: room.quizTitle,
    quizCategory: room.quizCategory,
    mode: room.mode,
    allowChat: room.allowChat,
    allowReactions: room.allowReactions,
    status: room.status,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    questionStartTime: room.questionStartTime,
    timeLimit: room.timeLimit,
    currentQuestion: room.questions[room.currentQuestionIndex] ? {
      question: room.questions[room.currentQuestionIndex].question,
      options: room.questions[room.currentQuestionIndex].options,
      correctIndex: room.status === 'reveal' || room.status === 'leaderboard' || room.status === 'ended' 
        ? room.questions[room.currentQuestionIndex].correctIndex 
        : undefined,
      explanation: room.status === 'reveal' || room.status === 'leaderboard' || room.status === 'ended' 
        ? room.questions[room.currentQuestionIndex].explanation 
        : undefined,
    } : null,
    players: room.players,
    messages: room.messages.slice(-50),
  };
}

function broadcastToRoom(pin: string, payload: object) {
  const data = JSON.stringify(payload);

  // 1. Send to WebSocket clients
  for (const [ws, info] of clientRooms.entries()) {
    if (info.pin === pin && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
      } catch {
        // ignore
      }
    }
  }

  // 2. Send to SSE clients
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    if (client.pin === pin) {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch {
        sseClients.splice(i, 1);
      }
    }
  }
}

function broadcastRoomState(pin: string) {
  const room = rooms[pin];
  if (!room) return;

  broadcastToRoom(pin, {
    type: 'ROOM_STATE',
    room: getPublicRoomState(room)
  });
}

function simulateBotAnswers(room: Room, questionIndex: number) {
  const bots = Object.values(room.players).filter(p => p.isBot);
  const q = room.questions[questionIndex];
  if (!q) return;

  bots.forEach((bot) => {
    const delay = 1500 + Math.random() * Math.min(6000, ((q.timeLimit || 20) - 2) * 1000);
    setTimeout(() => {
      if (room.status !== 'question' || room.currentQuestionIndex !== questionIndex) return;
      if (!room.players[bot.id]) return;

      const willBeCorrect = Math.random() < 0.75;
      const chosenOption = willBeCorrect 
        ? q.correctIndex 
        : (q.correctIndex + 1 + Math.floor(Math.random() * 3)) % q.options.length;

      const answerTime = Date.now();
      const elapsedMs = answerTime - room.questionStartTime;
      const totalMs = (q.timeLimit || 20) * 1000;
      const speedRatio = Math.max(0, 1 - (elapsedMs / totalMs));
      
      const basePoints = willBeCorrect ? 1000 : 0;
      const speedBonus = willBeCorrect ? Math.round(speedRatio * 500) : 0;
      let streakBonus = 0;

      if (willBeCorrect) {
        bot.streak = (bot.streak || 0) + 1;
        streakBonus = Math.min(300, (bot.streak - 1) * 50);
      } else {
        bot.streak = 0;
      }

      const totalEarned = basePoints + speedBonus + streakBonus;
      bot.score += totalEarned;
      bot.lastAnswer = chosenOption;
      bot.lastAnswerTime = answerTime;
      bot.lastAnswerScore = totalEarned;
      bot.isCorrect = willBeCorrect;

      broadcastRoomState(room.pin);
    }, delay);
  });
}

// Process action for both HTTP and WebSocket
function processAction(type: string, payload: any): { success: boolean; data?: any; error?: string } {
  switch (type) {
    case 'CREATE_ROOM': {
      const { pin, quizTitle, quizCategory, questions, mode, allowChat, allowReactions } = payload;
      rooms[pin] = {
        pin,
        quizTitle: quizTitle || 'Trivia en Vivo',
        quizCategory: quizCategory || 'General',
        questions: questions || [],
        mode: mode || 'solo',
        allowChat: allowChat !== false,
        allowReactions: allowReactions !== false,
        status: 'lobby',
        currentQuestionIndex: 0,
        questionStartTime: 0,
        timeLimit: 20,
        players: {},
        messages: [
          {
            id: 'sys_' + Date.now(),
            senderId: 'system',
            senderName: 'Sala de Juego',
            senderAvatar: '🎉',
            text: '¡Bienvenidos a la sala interactiva! Pueden reaccionar y chatear mientras esperamos al anfitrión.',
            timestamp: Date.now(),
            isHost: false,
            type: 'text'
          }
        ],
        createdAt: Date.now(),
      };

      broadcastRoomState(pin);
      return { success: true, data: { pin, room: getPublicRoomState(rooms[pin]) } };
    }

    case 'JOIN_ROOM': {
      const { pin, playerId, playerName, playerAvatar, playerTeam } = payload;
      const room = rooms[pin];
      if (!room) {
        return { success: false, error: 'No se encontró la sala con el código PIN ingresado.' };
      }

      const pid = playerId || ('p_' + Math.random().toString(36).substring(2, 9));
      const existingPlayer = room.players[pid];

      if (existingPlayer) {
        existingPlayer.connected = true;
        existingPlayer.name = playerName || existingPlayer.name;
        existingPlayer.avatar = playerAvatar || existingPlayer.avatar;
        if (playerTeam) existingPlayer.team = playerTeam;
      } else {
        room.players[pid] = {
          id: pid,
          name: playerName || 'Jugador',
          avatar: playerAvatar || '🐱',
          team: playerTeam || 'red',
          score: 0,
          streak: 0,
          lastAnswer: null,
          lastAnswerTime: 0,
          lastAnswerScore: 0,
          isCorrect: null,
          connected: true,
        };

        room.messages.push({
          id: 'join_' + Date.now() + '_' + Math.random(),
          senderId: pid,
          senderName: room.players[pid].name,
          senderAvatar: room.players[pid].avatar,
          senderTeam: room.players[pid].team,
          text: 'se ha unido a la sala 🎉',
          timestamp: Date.now(),
          type: 'text'
        });
      }

      broadcastRoomState(pin);
      return { success: true, data: { playerId: pid, pin, room: getPublicRoomState(room) } };
    }

    case 'START_GAME': {
      const { pin } = payload;
      const room = rooms[pin];
      if (!room) return { success: false, error: 'Sala no encontrada' };

      room.status = 'question';
      room.currentQuestionIndex = 0;
      room.questionStartTime = Date.now();
      const q = room.questions[0];
      room.timeLimit = q ? (q.timeLimit || 20) : 20;

      for (const p of Object.values(room.players)) {
        p.lastAnswer = null;
        p.lastAnswerScore = 0;
        p.isCorrect = null;
      }

      broadcastRoomState(pin);
      simulateBotAnswers(room, 0);
      return { success: true };
    }

    case 'NEXT_QUESTION': {
      const { pin } = payload;
      const room = rooms[pin];
      if (!room) return { success: false, error: 'Sala no encontrada' };

      const nextIdx = room.currentQuestionIndex + 1;
      if (nextIdx < room.questions.length) {
        room.status = 'question';
        room.currentQuestionIndex = nextIdx;
        room.questionStartTime = Date.now();
        const q = room.questions[nextIdx];
        room.timeLimit = q ? (q.timeLimit || 20) : 20;

        for (const p of Object.values(room.players)) {
          p.lastAnswer = null;
          p.lastAnswerScore = 0;
          p.isCorrect = null;
        }

        broadcastRoomState(pin);
        simulateBotAnswers(room, nextIdx);
      } else {
        room.status = 'ended';
        broadcastRoomState(pin);
      }
      return { success: true };
    }

    case 'REVEAL_QUESTION': {
      const { pin } = payload;
      const room = rooms[pin];
      if (!room) return { success: false, error: 'Sala no encontrada' };

      room.status = 'reveal';
      broadcastRoomState(pin);
      return { success: true };
    }

    case 'SHOW_LEADERBOARD': {
      const { pin } = payload;
      const room = rooms[pin];
      if (!room) return { success: false, error: 'Sala no encontrada' };

      room.status = 'leaderboard';
      broadcastRoomState(pin);
      return { success: true };
    }

    case 'SUBMIT_ANSWER': {
      const { pin, playerId, optionIndex } = payload;
      const room = rooms[pin];
      if (!room || room.status !== 'question') return { success: false, error: 'Pregunta inactiva' };

      const player = room.players[playerId];
      if (!player || player.lastAnswer !== null) return { success: false, error: 'Ya respondido' };

      const q = room.questions[room.currentQuestionIndex];
      if (!q) return { success: false, error: 'Pregunta no encontrada' };

      const isCorrect = optionIndex === q.correctIndex;
      const elapsedMs = Date.now() - room.questionStartTime;
      const totalMs = (q.timeLimit || 20) * 1000;
      const speedRatio = Math.max(0, 1 - (elapsedMs / totalMs));

      const basePoints = isCorrect ? 1000 : 0;
      const speedBonus = isCorrect ? Math.round(speedRatio * 500) : 0;
      let streakBonus = 0;

      if (isCorrect) {
        player.streak = (player.streak || 0) + 1;
        streakBonus = Math.min(300, (player.streak - 1) * 50);
      } else {
        player.streak = 0;
      }

      const totalEarned = basePoints + speedBonus + streakBonus;
      player.score += totalEarned;
      player.lastAnswer = optionIndex;
      player.lastAnswerTime = Date.now();
      player.lastAnswerScore = totalEarned;
      player.isCorrect = isCorrect;

      broadcastRoomState(pin);
      return { success: true };
    }

    case 'SEND_CHAT': {
      const { pin, playerId, text, type: msgType } = payload;
      const room = rooms[pin];
      if (!room || !room.allowChat) return { success: false, error: 'Chat no permitido' };

      const player = room.players[playerId] || (playerId === 'host' ? { name: 'Anfitrión ⭐', avatar: '🎙️', team: undefined } : null);
      if (!player) return { success: false, error: 'Jugador no encontrado' };

      const newMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        senderId: playerId,
        senderName: player.name,
        senderAvatar: player.avatar,
        senderTeam: player.team,
        text: text.trim().slice(0, 150),
        timestamp: Date.now(),
        isHost: playerId === 'host',
        type: msgType || 'text'
      };

      room.messages.push(newMsg);
      if (room.messages.length > 100) room.messages.shift();

      broadcastToRoom(pin, {
        type: 'NEW_CHAT_MESSAGE',
        message: newMsg,
      });
      return { success: true };
    }

    case 'SEND_REACTION': {
      const { pin, playerId, emoji } = payload;
      const room = rooms[pin];
      if (!room || !room.allowReactions) return { success: false, error: 'Reacciones desactivadas' };

      const player = room.players[playerId] || (playerId === 'host' ? { name: 'Anfitrión', avatar: '🎙️' } : null);

      broadcastToRoom(pin, {
        type: 'FLOATING_REACTION',
        reaction: {
          id: 'rx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          emoji: emoji || '🔥',
          senderName: player ? player.name : 'Participante',
          senderAvatar: player ? player.avatar : '✨',
          x: 10 + Math.random() * 80,
        }
      });
      return { success: true };
    }

    case 'SEND_HIGH_FIVE': {
      const { pin, fromPlayerId, toPlayerId } = payload;
      const room = rooms[pin];
      if (!room) return { success: false, error: 'Sala no encontrada' };

      const fromP = room.players[fromPlayerId] || (fromPlayerId === 'host' ? { name: 'Anfitrión', avatar: '🎙️' } : null);
      const toP = room.players[toPlayerId];
      if (!fromP || !toP) return { success: false, error: 'Participante no encontrado' };

      const shoutMsg: ChatMessage = {
        id: 'hf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        senderId: fromPlayerId,
        senderName: fromP.name,
        senderAvatar: fromP.avatar,
        text: `le dio un choca esos cinco / aplauso 👏 a ${toP.name}!`,
        timestamp: Date.now(),
        type: 'high_five'
      };

      room.messages.push(shoutMsg);

      broadcastToRoom(pin, {
        type: 'HIGH_FIVE_EVENT',
        from: fromP.name,
        to: toP.name,
        avatar: fromP.avatar,
        targetId: toPlayerId,
        message: shoutMsg
      });
      return { success: true };
    }

    case 'ADD_BOTS': {
      const { pin, count } = payload;
      const room = rooms[pin];
      if (!room) return { success: false, error: 'Sala no encontrada' };

      const botAvatars = ['🦊', '🐶', '🦁', '🚀', '🦄', '🐼', '⚡', '🥑', '🎮', '🏆', '⭐', '🐯'];
      const botNames = [
        'Sofi_Gamer', 'Mateo99', 'Valen_Crack', 'Lucas_Veloz',
        'Camila_Star', 'Nico_Master', 'Daniela_Pro', 'Alejo_Fast',
        'Emma_Genius', 'Santi_Hero', 'Lucía_Flash', 'Thiago_Win'
      ];
      const teams: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];

      const botsToAdd = Math.min(count || 3, 6);
      for (let i = 0; i < botsToAdd; i++) {
        const botId = 'bot_' + Math.random().toString(36).substring(2, 9);
        const name = botNames[Math.floor(Math.random() * botNames.length)] + '_' + Math.floor(Math.random() * 90 + 10);
        const avatar = botAvatars[Math.floor(Math.random() * botAvatars.length)];
        const team = teams[Math.floor(Math.random() * teams.length)];

        room.players[botId] = {
          id: botId,
          name,
          avatar,
          team,
          score: 0,
          streak: 0,
          lastAnswer: null,
          lastAnswerTime: 0,
          lastAnswerScore: 0,
          isCorrect: null,
          connected: true,
          isBot: true,
        };

        room.messages.push({
          id: 'join_bot_' + Date.now() + '_' + i,
          senderId: botId,
          senderName: name,
          senderAvatar: avatar,
          senderTeam: team,
          text: '¡Hola a todos! ¡Listo para jugar! 🚀',
          timestamp: Date.now(),
          type: 'text'
        });
      }

      broadcastRoomState(pin);
      return { success: true };
    }

    case 'KICK_PLAYER': {
      const { pin, playerId } = payload;
      const room = rooms[pin];
      if (!room) return { success: false, error: 'Sala no encontrada' };

      if (room.players[playerId]) {
        delete room.players[playerId];
        broadcastRoomState(pin);
      }
      return { success: true };
    }

    default:
      return { success: false, error: 'Acción desconocida' };
  }
}

// REST Endpoints
app.post('/api/action', (req: Request, res: Response) => {
  const { type, payload } = req.body;
  const result = processAction(type, payload);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

app.get('/api/room/:pin', (req: Request, res: Response) => {
  const { pin } = req.params;
  const room = rooms[pin];
  if (!room) {
    res.status(404).json({ error: 'Sala no encontrada' });
    return;
  }
  res.json({ room: getPublicRoomState(room) });
});

// SSE Endpoint for resilient real-time push
app.get('/api/events', (req: Request, res: Response) => {
  const pin = req.query.pin as string;
  const playerId = (req.query.playerId as string) || 'guest';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = { pin, playerId, res };
  sseClients.push(client);

  if (pin && rooms[pin]) {
    res.write(`data: ${JSON.stringify({ type: 'ROOM_STATE', room: getPublicRoomState(rooms[pin]) })}\n\n`);
  }

  req.on('close', () => {
    const idx = sseClients.indexOf(client);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// WebSocket Handler
wss.on('connection', (ws) => {
  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type, payload } = data;

      if (type === 'CREATE_ROOM') {
        clientRooms.set(ws, { pin: payload.pin, playerId: 'host', isHost: true });
      } else if (type === 'JOIN_ROOM') {
        const pid = payload.playerId || ('p_' + Math.random().toString(36).substring(2, 9));
        clientRooms.set(ws, { pin: payload.pin, playerId: pid, isHost: false });
      } else if (type === 'RECONNECT') {
        clientRooms.set(ws, { pin: payload.pin, playerId: payload.playerId || 'guest', isHost: !!payload.isHost });
        if (payload.pin && rooms[payload.pin]) {
          broadcastRoomState(payload.pin);
        }
      }

      const res = processAction(type, payload);
      if (!res.success && res.error) {
        ws.send(JSON.stringify({ type: 'ERROR', message: res.error }));
      }
    } catch {
      // ignore
    }
  });

  ws.on('close', () => {
    const info = clientRooms.get(ws);
    if (info) {
      const room = rooms[info.pin];
      if (room && info.playerId && room.players[info.playerId]) {
        room.players[info.playerId].connected = false;
        broadcastRoomState(info.pin);
      }
      clientRooms.delete(ws);
    }
  });
});

// Setup Vite dev server or static files
async function start() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

start();
