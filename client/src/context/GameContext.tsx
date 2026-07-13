import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from './SocketContext';
import type { RoomData, ChatMessageData, PlayerData, PlayedCardData } from '../types';

interface GameContextType {
  room: RoomData | null;
  chatMessages: ChatMessageData[];
  error: string | null;
  createRoom: (playerName: string, roomName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  setReady: () => void;
  setUnready: () => void;
  startGame: () => void;
  playCard: (cardId: string, isFaceUp: boolean) => void;
  sendMessage: (message: string) => void;
  clearError: () => void;
  setupMockRoom: (playerCount: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    // Listeners
    socket.on('room-updated', (updatedRoom: RoomData) => {
      setRoom(updatedRoom);
      console.log('Room updated:', updatedRoom);
    });

    socket.on('chat-message', (msg: ChatMessageData) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('timer-ticked', ({ turnPlayerId, timeLeft }: { turnPlayerId: string; timeLeft: number }) => {
      setRoom(prev => {
        if (!prev || !prev.gameState) return prev;
        return {
          ...prev,
          gameState: {
            ...prev.gameState,
            turnPlayerId,
            turnTimeLeft: timeLeft
          }
        };
      });
    });

    socket.on('error', (errMsg: string) => {
      setError(errMsg);
      // Auto clear error after 4 seconds
      setTimeout(() => setError(null), 4000);
    });

    socket.on('player-joined', ({ playerName }: { playerName: string }) => {
      console.log(`Player joined: ${playerName}`);
    });

    socket.on('player-left', () => {
      console.log('Player left');
    });

    return () => {
      socket.off('room-updated');
      socket.off('chat-message');
      socket.off('timer-ticked');
      socket.off('error');
      socket.off('player-joined');
      socket.off('player-left');
    };
  }, [socket]);

  // Clean chat messages when leaving room
  useEffect(() => {
    if (!room) {
      setChatMessages([]);
    }
  }, [room]);

  // Actions
  const createRoom = (playerName: string, roomName: string) => {
    socket?.emit('create-room', { playerName, roomName });
  };

  const joinRoom = (roomId: string, playerName: string) => {
    socket?.emit('join-room', { roomId, playerName });
  };

  const leaveRoom = () => {
    socket?.emit('leave-room');
    setRoom(null);
  };

  const setReady = () => {
    socket?.emit('ready');
  };

  const setUnready = () => {
    socket?.emit('unready');
  };

  const startGame = () => {
    socket?.emit('start-game');
  };

  const playCard = (cardId: string, isFaceUp: boolean) => {
    socket?.emit('play-card', { cardId, isFaceUp });
  };

  const sendMessage = (message: string) => {
    socket?.emit('chat', message);
  };

  const clearError = () => {
    setError(null);
  };

  const setupMockRoom = (playerCount: number) => {
    sessionStorage.setItem('catte_player_id', 'p_me');
    
    const mockPlayers: PlayerData[] = [
      { id: 'p_me', name: 'Huy', isReady: true, isRoomMaster: true, status: 'PLAYING' as const, cardsCount: 2, cards: [
        { id: '9H', rank: '9' as const, suit: 'Hearts' as const },
        { id: 'AS', rank: 'Ace' as const, suit: 'Spades' as const }
      ], roundsWon: [1, 4], hasTung: true },
      { id: 'p_2', name: 'Anh', isReady: true, isRoomMaster: false, status: 'PLAYING' as const, cardsCount: 2, roundsWon: [2], hasTung: true },
      { id: 'p_3', name: 'Vy', isReady: true, isRoomMaster: false, status: 'PLAYING' as const, cardsCount: 2, roundsWon: [3], hasTung: true },
      { id: 'p_4', name: 'Minh', isReady: true, isRoomMaster: false, status: 'PLAYING' as const, cardsCount: 2, roundsWon: [], hasTung: false },
      { id: 'p_5', name: 'Lan', isReady: true, isRoomMaster: false, status: 'ELIMINATED' as const, cardsCount: 0, roundsWon: [], hasTung: false },
      { id: 'p_6', name: 'Bảo', isReady: true, isRoomMaster: false, status: 'ELIMINATED' as const, cardsCount: 0, roundsWon: [], hasTung: false }
    ].slice(0, playerCount);

    const activeMockPlayers = mockPlayers.map((player, idx) => {
      if (playerCount === 2) {
        return {
          ...player,
          status: 'PLAYING' as const,
          cardsCount: 2,
          roundsWon: idx === 0 ? [1, 3, 4] : [2]
        };
      }
      if (playerCount === 3) {
        return {
          ...player,
          status: 'PLAYING' as const,
          cardsCount: 2,
          roundsWon: idx === 0 ? [1, 4] : idx === 1 ? [2] : [3]
        };
      }
      if (playerCount === 4) {
        return {
          ...player,
          status: idx === 3 ? ('ELIMINATED' as const) : ('PLAYING' as const),
          cardsCount: idx === 3 ? 0 : 2,
          roundsWon: idx === 0 ? [1, 4] : idx === 1 ? [2] : idx === 2 ? [3] : []
        };
      }
      return player;
    });

    const generatePlaysForRound = (cards: Record<string, string>): PlayedCardData[] => {
      return activeMockPlayers.map(p => {
        const cardCode = cards[p.id];
        if (!cardCode) {
          return {
            playerId: p.id,
            playerName: p.name,
            card: null,
            isFaceUp: false
          };
        }
        const isFaceUp = cardCode.endsWith('F');
        const cleanCode = cardCode.replace('F', '').replace('D', '');
        
        let rankStr = cleanCode.slice(0, -1);
        const suitChar = cleanCode.slice(-1);
        
        let rank = rankStr as any;
        if (rankStr === 'A') rank = 'Ace';
        if (rankStr === 'K') rank = 'King';
        if (rankStr === 'Q') rank = 'Queen';
        if (rankStr === 'J') rank = 'Jack';

        const suitMap = { 'H': 'Hearts', 'D': 'Diamonds', 'C': 'Clubs', 'S': 'Spades' };
        const suit = (suitMap as any)[suitChar] || 'Hearts';

        return {
          playerId: p.id,
          playerName: p.name,
          card: { id: cleanCode, rank, suit },
          isFaceUp
        };
      });
    };

    const r1Plays = generatePlaysForRound({
      'p_me': '10HF', 'p_2': '8HF', 'p_3': '5HF', 'p_4': '3SD', 'p_5': '4DD', 'p_6': '2SD'
    });
    const r2Plays = generatePlaysForRound({
      'p_me': '2CD', 'p_2': 'ACF', 'p_3': 'JCF', 'p_4': '9CD', 'p_5': '8CD', 'p_6': '7CD'
    });
    const r3Plays = generatePlaysForRound({
      'p_me': 'KDF', 'p_2': 'QDF', 'p_3': 'ADF', 'p_4': '3DD', 'p_5': '2SD', 'p_6': '5SD'
    });
    const r4Plays = generatePlaysForRound({
      'p_me': 'ASF', 'p_2': 'JSD', 'p_3': '10SD', 'p_4': '9SD', 'p_5': '4SD', 'p_6': '3SD'
    });

    const mockRoom: RoomData = {
      id: `TEST`,
      name: `Phòng Test ${playerCount} Người`,
      roomMasterId: 'p_me',
      players: activeMockPlayers,
      gameState: {
        roomId: `TEST`,
        status: 'CHUNG',
        dealerId: 'p_me',
        turnPlayerId: 'p_me',
        turnTimeLeft: 30,
        currentRoundIndex: 5,
        survivingPlayerIds: activeMockPlayers.filter(p => p.status === 'PLAYING').map(p => p.id),
        winnerId: null,
        winType: null,
        rounds: [
          { roundIndex: 1, suitLed: 'Hearts', winnerId: 'p_me', winnerName: 'Huy', plays: r1Plays },
          { roundIndex: 2, suitLed: 'Clubs', winnerId: 'p_2', winnerName: 'Anh', plays: r2Plays },
          { roundIndex: 3, suitLed: 'Diamonds', winnerId: 'p_3', winnerName: 'Vy', plays: r3Plays },
          { roundIndex: 4, suitLed: 'Spades', winnerId: 'p_me', winnerName: 'Huy', plays: r4Plays },
          { roundIndex: 5, suitLed: null, winnerId: null, winnerName: null, plays: [] },
          { roundIndex: 6, suitLed: null, winnerId: null, winnerName: null, plays: [] }
        ]
      }
    };

    setRoom(mockRoom);
  };

  return (
    <GameContext.Provider value={{
      room,
      chatMessages,
      error,
      createRoom,
      joinRoom,
      leaveRoom,
      setReady,
      setUnready,
      startGame,
      playCard,
      sendMessage,
      clearError,
      setupMockRoom
    }}>
      {children}
    </GameContext.Provider>
  );
};
