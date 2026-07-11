import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from './SocketContext';
import type { RoomData, ChatMessageData } from '../types';

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
      clearError
    }}>
      {children}
    </GameContext.Provider>
  );
};
