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
  React.useEffect(() => {
    const lockOrientation = async () => {
      try {
        if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
          await (screen.orientation as any).lock('landscape');
          console.log('Screen orientation locked to landscape');
        }
      } catch (error) {
        console.warn('Failed to lock screen orientation programmatically:', error);
      }
    };
    lockOrientation();
  }, []);

  return (
    <SocketProvider>
      <GameProvider>
        <AppContent />
        
        {/* Device orientation lock warning */}
        <div className="orientation-warning">
          <div className="orientation-warning-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-gaming-gold">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <path d="M12 18h.01" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Vui lòng xoay ngang màn hình</h2>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
            Trò chơi được tối ưu hóa để hiển thị tốt nhất ở chế độ màn hình ngang. Hãy bật tính năng tự động xoay màn hình trên thiết bị của bạn.
          </p>
        </div>
      </GameProvider>
    </SocketProvider>
  );
}

export default App;
