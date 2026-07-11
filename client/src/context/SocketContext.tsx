import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Generate or retrieve persistent player ID (isolated per tab using sessionStorage)
    let persistentId = sessionStorage.getItem('catte_player_id');
    if (!persistentId) {
      persistentId = 'p_' + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem('catte_player_id', persistentId);
    }

    const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      auth: {
        playerId: persistentId
      }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to game server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from game server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
