import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Club, Diamond, Heart, Spade, Award, Play } from 'lucide-react';

export const Lobby: React.FC = () => {
  const { createRoom, joinRoom, error, clearError, setupMockRoom } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const enterFullscreen = () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if ((docEl as any).webkitRequestFullscreen) {
        (docEl as any).webkitRequestFullscreen();
      } else if ((docEl as any).mozRequestFullScreen) {
        (docEl as any).mozRequestFullScreen();
      } else if ((docEl as any).msRequestFullscreen) {
        (docEl as any).msRequestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request failed", e);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomName.trim()) return;
    createRoom(playerName, roomName);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomIdInput.trim()) return;
    joinRoom(roomIdInput, playerName);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Decorative Suit Backgrounds */}
      <div className="absolute top-10 left-10 text-gaming-green-light/5 rotate-12"><Spade size={180} /></div>
      <div className="absolute bottom-10 right-10 text-gaming-green-light/5 -rotate-12"><Heart size={180} /></div>
      <div className="absolute top-1/2 right-12 text-gaming-green-light/5 rotate-45"><Diamond size={120} /></div>
      <div className="absolute bottom-1/3 left-12 text-gaming-green-light/5 -rotate-45"><Club size={120} /></div>

      {/* Main card panel */}
      <div className="w-full max-w-md bg-gaming-slate-card border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Title / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gaming-green-felt border border-gaming-gold rounded-2xl mb-3 shadow-gold-glow">
            <Award className="text-gaming-gold" size={36} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider text-white">
            CÁT TÊ <span className="text-gaming-gold">ONLINE</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-semibold">
            Vietnamese Realtime Card Game
          </p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-500/50 text-red-200 text-sm rounded-xl p-3 mb-6 text-center animate-pulse">
            {error}
          </div>
        )}

        {mode === 'menu' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6">
              <label className="block text-xs font-semibold text-gaming-gold uppercase tracking-wider mb-2">
                Tên Người Chơi
              </label>
              <input
                type="text"
                placeholder="Nhập tên của bạn..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={14}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gaming-gold transition-colors font-medium"
              />
            </div>

            <button
              onClick={() => {
                if (!playerName.trim()) {
                  alert('Vui lòng nhập tên người chơi!');
                  return;
                }
                enterFullscreen();
                setMode('create');
                clearError();
              }}
              className="w-full bg-gradient-to-r from-gaming-gold-dark via-gaming-gold to-gaming-gold-light text-slate-950 py-3.5 rounded-xl font-bold uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Play size={18} fill="currentColor" /> Tạo Phòng Mới
            </button>

            <button
              onClick={() => {
                if (!playerName.trim()) {
                  alert('Vui lòng nhập tên người chơi!');
                  return;
                }
                enterFullscreen();
                setMode('join');
                clearError();
              }}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-850 hover:text-white active:scale-95 transition-all"
            >
              Tham Gia Bằng Mã
            </button>

            {/* UI Test Tool Section */}
            <div className="border-t border-slate-900/60 my-4 pt-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 text-center">
                Chạy Thử Nghiệm Giao Diện (UI)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map(count => (
                  <button
                    key={count}
                    onClick={() => {
                      enterFullscreen();
                      setupMockRoom(count);
                    }}
                    className="bg-slate-900 hover:bg-gaming-green-felt/35 border border-slate-800 text-slate-300 hover:text-gaming-gold py-2.5 rounded-xl font-black text-xs transition-all active:scale-90 flex flex-col items-center justify-center cursor-pointer"
                    title={`Xem bàn chơi ${count} người`}
                  >
                    <span>{count} Người</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gaming-gold uppercase tracking-wider mb-2">
                  Tên Phòng Chơi
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên phòng..."
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={20}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gaming-gold transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="w-1/3 bg-slate-900 border border-slate-800 text-slate-400 py-3 rounded-xl font-bold uppercase tracking-wider transition-colors hover:text-white"
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="w-2/3 bg-gradient-to-r from-gaming-gold-dark via-gaming-gold to-gaming-gold-light text-slate-950 py-3 rounded-xl font-bold uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                Xác Nhận
              </button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gaming-gold uppercase tracking-wider mb-2">
                  Mã Phòng (4 ký tự)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: ABCD"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  maxLength={4}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gaming-gold transition-colors uppercase font-bold tracking-widest text-center text-lg"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="w-1/3 bg-slate-900 border border-slate-800 text-slate-400 py-3 rounded-xl font-bold uppercase tracking-wider transition-colors hover:text-white"
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="w-2/3 bg-gradient-to-r from-gaming-gold-dark via-gaming-gold to-gaming-gold-light text-slate-950 py-3 rounded-xl font-bold uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                Vào Phòng
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
