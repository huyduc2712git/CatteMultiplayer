import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import { Chat } from './Chat';
import { MessageSquare, LogOut, CheckCircle, Shield, Play, HelpCircle, Copy, Check } from 'lucide-react';

export const RoomLobby: React.FC = () => {
  const { room, leaveRoom, setReady, setUnready, startGame } = useGame();
  const { socket } = useSocket();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!room) return null;

  const myId = sessionStorage.getItem('catte_player_id') || socket?.id || '';
  const me = room.players.find(p => p.id === myId);
  const isRoomMaster = me?.isRoomMaster || false;

  // Determine if start game is possible
  const otherPlayers = room.players.filter(p => p.id !== room.roomMasterId);
  const allOthersReady = otherPlayers.length > 0 && otherPlayers.every(p => p.isReady);
  const canStart = isRoomMaster && allOthersReady;

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-gaming-green-felt/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-10 w-96 h-96 bg-gaming-gold/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-xl bg-gaming-slate-card border border-slate-800 rounded-3xl p-6 shadow-2xl">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-850 pb-5 mb-5">
            <div>
              <span className="text-[10px] font-bold text-gaming-gold uppercase tracking-widest bg-gaming-gold/10 px-2 py-0.5 rounded-full border border-gaming-gold/25">
                Phòng Chờ
              </span>
              <h2 className="text-2xl font-bold text-white mt-1.5">{room.name}</h2>
            </div>
            <button 
              onClick={handleCopyCode}
              className="text-right hover:opacity-80 active:scale-95 transition-all group flex flex-col items-end cursor-pointer bg-transparent border-0 p-0"
              title="Copy mã phòng"
            >
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                Mã Phòng
                {copied ? (
                  <Check size={10} className="text-emerald-500 animate-bounce" />
                ) : (
                  <Copy size={10} className="text-slate-500 group-hover:text-gaming-gold transition-colors" />
                )}
              </span>
              <span className="text-2xl font-black text-gaming-gold tracking-widest">
                {room.id}
              </span>
              {copied && <span className="text-[9px] text-emerald-500 font-bold -mt-0.5">Đã copy!</span>}
            </button>
          </div>

          {/* Player List */}
          <div className="space-y-3 mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Người chơi ({room.players.length}/6)
            </h3>
            {room.players.map((player) => {
              const isCurrentMe = player.id === myId;
              return (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-3.5 rounded-2xl border transition-all ${
                    isCurrentMe
                      ? 'bg-gaming-green-felt/20 border-gaming-green-light/45 shadow-board'
                      : 'bg-slate-900/50 border-slate-850 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-850 flex items-center justify-center text-lg font-bold text-white border border-slate-700">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-white flex items-center gap-1.5">
                        {player.name}
                        {isCurrentMe && (
                          <span className="text-[9px] bg-gaming-green-light/25 text-emerald-300 border border-emerald-500/25 px-1.5 py-0.5 rounded font-bold">
                            BẠN
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        {player.isRoomMaster ? (
                          <span className="text-gaming-gold flex items-center gap-1 text-[10px] font-semibold">
                            <Shield size={10} fill="currentColor" /> Chủ phòng
                          </span>
                        ) : (
                          'Thành viên'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Ready Status indicator */}
                  <div>
                    {player.isRoomMaster ? (
                      <span className="text-xs font-bold text-gaming-gold uppercase tracking-wider bg-gaming-gold/10 px-3 py-1.5 border border-gaming-gold/20 rounded-xl">
                        HOST
                      </span>
                    ) : player.isReady ? (
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20 rounded-xl flex items-center gap-1.5">
                        <CheckCircle size={14} fill="currentColor" className="text-emerald-500" /> Sẵn Sàng
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-850 px-3 py-1.5 border border-slate-800 rounded-xl">
                        Đang Chờ
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {isRoomMaster ? (
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  canStart
                    ? 'bg-gradient-to-r from-gaming-gold-dark via-gaming-gold to-gaming-gold-light text-slate-950 shadow-gold-glow hover:brightness-110 active:scale-98 cursor-pointer'
                    : 'bg-slate-900 text-slate-500 border border-slate-850 cursor-not-allowed'
                }`}
              >
                <Play size={18} fill="currentColor" /> Bắt Đầu Trò Chơi
              </button>
            ) : me?.isReady ? (
              <button
                onClick={setUnready}
                className="w-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white py-4 rounded-2xl font-bold uppercase tracking-wider transition-all active:scale-98"
              >
                Hủy Sẵn Sàng
              </button>
            ) : (
              <button
                onClick={setReady}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-4 rounded-2xl font-bold uppercase tracking-wider shadow-active-glow hover:brightness-115 transition-all active:scale-98"
              >
                Sẵn Sàng
              </button>
            )}

            {isRoomMaster && !allOthersReady && otherPlayers.length > 0 && (
              <p className="text-center text-[10px] text-gaming-gold/70 font-medium">
                * Đang chờ tất cả thành viên bấm Sẵn Sàng...
              </p>
            )}

            {isRoomMaster && otherPlayers.length === 0 && (
              <p className="text-center text-[10px] text-gaming-gold/70 font-medium">
                * Cần thêm ít nhất 1 người chơi để bắt đầu game...
              </p>
            )}

            <div className="flex gap-3 border-t border-slate-850 pt-4 mt-2">
              <button
                onClick={leaveRoom}
                className="flex-1 bg-red-950/20 hover:bg-red-950/30 text-red-400 border border-red-950/50 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut size={14} /> Thoát Phòng
              </button>
              <button
                onClick={() => setIsChatOpen(true)}
                className="flex-1 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <MessageSquare size={14} /> Trò Chuyện
              </button>
            </div>
          </div>
        </div>

        {/* Cát Tê Quick Guide */}
        <div className="w-full max-w-xl bg-slate-900/30 border border-slate-850/60 rounded-3xl p-4 mt-4 flex items-start gap-3">
          <HelpCircle className="text-gaming-gold flex-shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-slate-400 leading-relaxed">
            <span className="font-semibold text-white block mb-0.5">Mẹo chơi Cát Tê:</span>
            Mỗi người được chia 6 lá. Game trải qua 4 vòng đầu đấu chất so bài giành Tùng. Phải thắng ít nhất 1 vòng mới được vào Vòng 5 Chưng và Vòng 6 Xổ để tìm người chiến thắng chung cuộc. Hãy tính toán giữ lại quân bài cao (A, K, Q) để giành thắng lợi cuối ván!
          </div>
        </div>
      </div>

      {/* Slide-out Chat */}
      <Chat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};
