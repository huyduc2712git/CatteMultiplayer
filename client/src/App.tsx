import React from 'react';
import { SocketProvider } from './context/SocketContext';
import { GameProvider, useGame } from './context/GameContext';
import { Lobby } from './components/Lobby';
import { RoomLobby } from './components/RoomLobby';
import { GameBoard } from './components/GameBoard';

const AppContent: React.FC = () => {
  const { room } = useGame();

  if (!room) {
    return <Lobby />;
  }

  if (!room.gameState || room.gameState.status === 'WAITING') {
    return <RoomLobby />;
  }

  return <GameBoard />;
};

function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </SocketProvider>
  );
}

export default App;
