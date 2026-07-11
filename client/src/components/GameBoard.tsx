import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import { Chat } from './Chat';
import { MessageSquare, LogOut, Shield, Clock, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import type { Suit, CardData, PlayerData } from '../types';

export const GameBoard: React.FC = () => {
  const { room, leaveRoom, playCard, setReady, setUnready, startGame } = useGame();
  const { socket } = useSocket();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!room || !room.gameState) return null;

  const game = room.gameState;
  const players = room.players;
  const myId = socket?.id || '';
  const me = players.find(p => p.id === myId);

  if (!me) return null;

  const isMyTurn = game.turnPlayerId === myId;
  const currentRound = game.rounds[game.currentRoundIndex - 1];

  const getPlayerPlayForRound = (playerId: string, roundIndex: number) => {
    const round = game.rounds[roundIndex - 1];
    if (!round) return null;
    return round.plays.find(p => p.playerId === playerId) || null;
  };

  // Helper to map suits to symbols and colors
  const getSuitSymbol = (suit: Suit) => {
    switch (suit) {
      case 'Hearts': return '♥';
      case 'Diamonds': return '♦';
      case 'Clubs': return '♣';
      case 'Spades': return '♠';
    }
  };

  const getSuitColor = (suit: Suit) => {
    return suit === 'Hearts' || suit === 'Diamonds' ? 'text-red-500' : 'text-slate-300';
  };

  // Get current highest winning card of the led suit in this round
  const getHighestWinningCard = (): CardData | null => {
    if (!currentRound || !currentRound.winnerId || currentRound.plays.length === 0) return null;
    
    // Find the play of the winner
    const winningPlay = currentRound.plays.find(p => p.playerId === currentRound.winnerId && p.isFaceUp);
    return winningPlay ? winningPlay.card : null;
  };

  const highestCard = getHighestWinningCard();
  const suitLed = currentRound?.suitLed;

  // Check if a card is valid to play face up (chặn)
  const canPlayFaceUp = (card: CardData): boolean => {
    if (!suitLed) return true; // Leading can play any card face up
    return card.suit === suitLed && getCardValue(card) > (highestCard ? getCardValue(highestCard) : 0);
  };

  const getCardValue = (card: CardData): number => {
    const valMap: Record<string, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'Jack': 11, 'Queen': 12, 'King': 13, 'Ace': 14
    };
    return valMap[card.rank] || 0;
  };

  // Sort players to position them around the table
  // Current player (me) is always index 0 (bottom center)
  const getPositionedPlayers = (): { player: PlayerData; seatIndex: number }[] => {
    const myIndex = players.findIndex(p => p.id === myId);
    const result: { player: PlayerData; seatIndex: number }[] = [];

    // Order players starting from me
    const orderedPlayers: PlayerData[] = [];
    for (let i = 0; i < players.length; i++) {
      const idx = (myIndex + i) % players.length;
      orderedPlayers.push(players[idx]);
    }

    // Distribute players symmetrically to avoid crowding
    const count = players.length;
    let physicalSeatMapping: number[] = [0, 1, 2, 3, 4, 5]; // Default for 6
    
    if (count === 2) {
      physicalSeatMapping = [0, 3];
    } else if (count === 3) {
      physicalSeatMapping = [0, 2, 4];
    } else if (count === 4) {
      physicalSeatMapping = [0, 1, 3, 5];
    } else if (count === 5) {
      physicalSeatMapping = [0, 1, 2, 4, 5];
    }

    for (let i = 0; i < count; i++) {
      result.push({
        player: orderedPlayers[i],
        seatIndex: physicalSeatMapping[i]
      });
    }

    return result;
  };

  const posPlayers = getPositionedPlayers();

  // Map seatIndex to absolute positions (relative to the Felt Table Oval container)
  const seatPositions: Record<number, string> = {
    0: 'bottom-2 left-1/2 -translate-x-1/2', // Current player (bottom)
    1: 'bottom-[18%] left-2', // Bottom left
    2: 'top-[18%] left-2',    // Top left
    3: 'top-2 left-1/2 -translate-x-1/2',    // Top center
    4: 'top-[18%] right-2',   // Top right
    5: 'bottom-[18%] right-2', // Bottom right
  };

  // Format rank abbreviation
  const getRankShort = (rank: string) => {
    if (rank === 'Jack') return 'J';
    if (rank === 'Queen') return 'Q';
    if (rank === 'King') return 'K';
    if (rank === 'Ace') return 'A';
    return rank;
  };

  const handlePlaySelected = (isFaceUp: boolean) => {
    if (!selectedCardId) return;
    playCard(selectedCardId, isFaceUp);
    setSelectedCardId(null);
  };

  return (
    <div className="min-h-screen bg-gaming-green-deep flex flex-col justify-between items-center relative overflow-hidden select-none">
      
      {/* Top HUD */}
      <div className="w-full bg-slate-950/80 border-b border-slate-900/60 px-4 py-3 flex justify-between items-center relative z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[10px] font-bold text-gaming-gold uppercase tracking-widest block">Phòng chơi</span>
            <span className="text-sm font-black text-white tracking-wider">{room.name} ({room.id})</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800/80 px-3 py-1 rounded-xl text-center">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Vòng chơi</span>
            <span className="text-xs font-bold text-gaming-gold">
              {game.status === 'CHUNG' ? 'Vòng 5: CHƯNG' : game.status === 'LAT' ? 'Vòng 6: XỔ' : `Vòng ${game.currentRoundIndex}`}
            </span>
          </div>
        </div>

        {/* Turn HUD */}
        {game.status !== 'RESULT' && game.status !== 'WAITING' && (
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800/85 px-4 py-1.5 rounded-full shadow-gold-glow">
            <Clock size={14} className="text-gaming-gold" />
            <span className="text-xs font-bold text-slate-300">
              Lượt: <span className="text-white font-extrabold">{players.find(p => p.id === game.turnPlayerId)?.name || '...'}</span>
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-2.5 rounded-xl border border-slate-800 transition-colors"
          >
            <MessageSquare size={16} />
          </button>
          <button
            onClick={leaveRoom}
            className="bg-red-950/30 hover:bg-red-950/50 text-red-400 p-2.5 rounded-xl border border-red-950/40 transition-colors flex items-center gap-1.5 font-bold text-xs"
          >
            <LogOut size={16} /> Rời Bàn
          </button>
        </div>
      </div>

      {/* Poker Table Area */}
      <div className="flex-1 w-full max-w-4xl relative flex items-center justify-center py-6 px-4">
        
        {/* The Felt Table Oval */}
        <div className="absolute w-[95%] h-[80%] bg-gradient-to-b from-gaming-green-felt to-gaming-green-deep border-[16px] border-slate-900/90 rounded-[100px] shadow-board flex flex-col justify-center items-center">
          
          {/* Decorative Table Felt Logo */}
          <div className="absolute opacity-5 pointer-events-none select-none text-center">
            <span className="text-8xl font-black text-white tracking-widest block">CATTE</span>
            <span className="text-sm font-bold text-white tracking-widest uppercase">Realtime Gaming Arena</span>
          </div>

          {/* Center Play Area */}
          <div className="w-[60%] h-[50%] relative flex flex-col justify-center items-center bg-slate-950/20 border border-white/5 rounded-[50px] p-4">
            
            {/* Suit Led indicator */}
            {suitLed && (
              <div className="absolute top-3 bg-slate-950/90 border border-slate-800 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Chất dẫn:</span>
                <span className={`text-sm font-black ${getSuitColor(suitLed)}`}>
                  {getSuitSymbol(suitLed)} {suitLed === 'Hearts' ? 'Cơ' : suitLed === 'Diamonds' ? 'Rô' : suitLed === 'Clubs' ? 'Chuồn' : 'Bích'}
                </span>
              </div>
            )}

            {/* Winner of current round notification */}
            {currentRound?.winnerName && (
              <div className="absolute bottom-3 bg-gaming-green-felt/80 border border-gaming-green-light/40 px-3.5 py-1 rounded-full text-center shadow-lg">
                <span className="text-[10px] font-medium text-emerald-300">
                  Thắng vòng {game.currentRoundIndex}: <span className="font-extrabold text-white">{currentRound.winnerName}</span>
                </span>
              </div>
            )}

            {/* Display Played Cards in the Center */}
            <div className="flex flex-wrap justify-center items-center gap-4 max-w-full">
              {currentRound?.plays.map((play, index) => {
                return (
                  <div key={index} className="flex flex-col items-center relative animate-fade-in">
                    {/* Played card */}
                    <div className="w-12 h-18 bg-white border border-slate-200 rounded-lg shadow-lg flex flex-col justify-between p-1.5 relative overflow-hidden transition-all hover:scale-105">
                      {play.isFaceUp && play.card ? (
                        <>
                          <div className="flex flex-col items-start leading-none">
                            <span className={`text-sm font-black ${getSuitColor(play.card.suit)}`}>
                              {getRankShort(play.card.rank)}
                            </span>
                            <span className={`text-xs ${getSuitColor(play.card.suit)}`}>
                              {getSuitSymbol(play.card.suit)}
                            </span>
                          </div>
                          <div className={`text-xl self-center leading-none ${getSuitColor(play.card.suit)}`}>
                            {getSuitSymbol(play.card.suit)}
                          </div>
                          <div className="flex flex-col items-end leading-none rotate-180">
                            <span className={`text-sm font-black ${getSuitColor(play.card.suit)}`}>
                              {getRankShort(play.card.rank)}
                            </span>
                            <span className={`text-xs ${getSuitColor(play.card.suit)}`}>
                              {getSuitSymbol(play.card.suit)}
                            </span>
                          </div>
                        </>
                      ) : (
                        // Card back for face-down card (thiệp)
                        <div className="absolute inset-0 bg-red-800 border-[3px] border-white flex justify-center items-center">
                          <div className="w-[85%] h-[85%] border border-red-650 rounded bg-red-900 flex justify-center items-center">
                            <span className="text-white/20 font-black text-[10px]">CÁT TÊ</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold mt-1 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-900/60 max-w-[80px] truncate">
                      {play.playerName}
                    </span>
                  </div>
                );
              })}

              {currentRound?.plays.length === 0 && (
                <div className="text-slate-500 text-xs text-center p-4">
                  Đang chờ người đi đầu ra quân...
                </div>
              )}
            </div>

          </div>

          {/* Players Seats layout around the felt table (positioned relative to Felt Table borders) */}
          {posPlayers.map(({ player, seatIndex }) => {
            const isTurn = game.turnPlayerId === player.id;
            const posClass = seatPositions[seatIndex];
            const isPlayerMe = player.id === myId;
            const isEliminated = player.status === 'ELIMINATED';

            return (
              <div
                key={player.id}
                className={`absolute ${posClass} z-10 flex flex-col items-center transition-all duration-300`}
              >
                {/* Player Avatar card */}
                <div
                  className={`game-avatar-card relative flex items-center gap-2.5 p-2 rounded-2xl border bg-slate-950/90 shadow-lg ${
                    isTurn
                      ? 'border-gaming-gold animate-gold-pulse scale-105'
                      : isPlayerMe
                      ? 'border-gaming-green-light bg-gaming-green-deep/90'
                      : 'border-slate-800'
                  } ${isEliminated ? 'opacity-40 brightness-75' : ''}`}
                >
                  {/* Active Indicator */}
                  {isTurn && (
                    <div className="absolute -top-1 -right-1 bg-gaming-gold text-slate-950 p-1 rounded-full shadow-gold-glow animate-spin">
                      <RefreshCw size={10} />
                    </div>
                  )}

                  {/* Avatar Initial */}
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-sm font-bold text-slate-200 border border-slate-800">
                    {player.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <span className="font-extrabold text-xs text-white flex items-center gap-1">
                      {player.name}
                      {player.isRoomMaster && <Shield size={10} className="text-gaming-gold" fill="currentColor" />}
                    </span>
                    {player.roundsWon.length > 0 ? (
                      <span className="text-[9px] text-gaming-gold font-bold flex items-center gap-0.5">
                        ★ {player.roundsWon.length} Tồn
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-500 font-semibold block">
                        KHÔNG CÓ TÙNG
                      </span>
                    )}
                  </div>

                  {/* Player hand count display */}
                  {!isPlayerMe && !isEliminated && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-center flex items-center gap-1.5 ml-2.5">
                      <span className="text-[10px] text-slate-400 font-extrabold">{player.cardsCount}</span>
                      <div className="w-3 h-4 bg-red-800 rounded-sm border border-white/50" />
                    </div>
                  )}

                  {isEliminated && (
                    <span className="text-[9px] font-extrabold text-red-400 bg-red-950/30 border border-red-500/20 px-2 py-0.5 rounded-lg ml-2 uppercase">
                      CHẾT TÙNG
                    </span>
                  )}
                </div>

                {/* Round History Tray (Responsive Grid: 3 columns on mobile, 6 columns on tablet/desktop) */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mt-2 bg-slate-950/80 border border-slate-900/80 p-1.5 rounded-xl shadow-md">
                  {[1, 2, 3, 4, 5, 6].map((roundNum) => {
                    const play = getPlayerPlayForRound(player.id, roundNum);
                    const isCurrentRound = game.currentRoundIndex === roundNum;
                    const isWinner = game.rounds[roundNum - 1]?.winnerId === player.id;
                    
                    if (play) {
                      return (
                        <div
                          key={roundNum}
                          className={`game-history-slot w-7 h-10 rounded-md flex flex-col justify-between items-center p-0.5 relative text-[9px] font-bold ${
                            play.isFaceUp
                              ? `bg-white text-slate-950 border ${isWinner ? 'border-gaming-gold ring-1 ring-gaming-gold shadow-gold-glow' : 'border-slate-350'}`
                              : 'bg-red-800 border border-red-750 text-white'
                          }`}
                        >
                          {play.isFaceUp && play.card ? (
                            <>
                              <span className={getSuitColor(play.card.suit)}>
                                {getRankShort(play.card.rank)}
                              </span>
                              <span className={`text-[10px] leading-none ${getSuitColor(play.card.suit)}`}>
                                {getSuitSymbol(play.card.suit)}
                              </span>
                            </>
                          ) : (
                            // Mini card back for thiệp
                            <div className="w-full h-full bg-red-800 rounded flex items-center justify-center text-[7px] text-white/70">
                              Úp
                            </div>
                          )}
                          {/* Winner/Tồn Crown Indicator */}
                          {isWinner && (
                            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-gaming-gold rounded-full border border-slate-950 flex items-center justify-center text-[7px] text-slate-950 font-black">
                              ★
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // No play yet
                      const isPast = roundNum < game.currentRoundIndex;
                      return (
                        <div
                          key={roundNum}
                          className={`game-history-slot w-7 h-10 rounded-md border flex items-center justify-center text-[8px] font-bold ${
                            isCurrentRound
                              ? 'border-gaming-gold/60 border-dashed animate-pulse text-gaming-gold'
                              : isPast
                              ? 'border-slate-800 bg-slate-900/30 text-slate-600'
                              : 'border-slate-850 bg-slate-900/10 text-slate-700'
                          }`}
                        >
                          {isPast ? 'X' : roundNum}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}

        </div>

        {/* RESULTS OVERLAY ON TOP OF TABLE */}
        {game.status === 'RESULT' && (
          <div className="absolute inset-0 bg-slate-950/90 z-30 rounded-[100px] flex flex-col justify-center items-center p-6 text-center animate-fade-in border-4 border-gaming-gold/45 shadow-gold-glow m-4">
            <span className="text-gaming-gold font-black text-xs uppercase tracking-widest block mb-2">
              KẾT QUẢ VÁN ĐẤU
            </span>
            
            <h2 className="text-3xl font-black text-white tracking-wide">
              {players.find(p => p.id === game.winnerId)?.name} THẮNG CUỘC!
            </h2>
            
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
              Thể loại: {
                game.winType?.startsWith('INSTANT_') 
                  ? 'Thắng Trắng' 
                  : game.winType === 'WIN_TUNG' 
                  ? 'Thắng Tùng (Vòng 4)' 
                  : 'Thắng Vòng 6'
              }
            </p>

            {/* Round 6 Card Reveal (Xổ Bài) Info Panel */}
            {(() => {
              const round5 = game.rounds[4];
              const round6 = game.rounds[5];
              const chưngPlay = round5?.plays.find(p => p.isFaceUp);
              const chưngCard = chưngPlay?.card;
              const chưngPlayerName = chưngPlay?.playerName;

              if (game.winType === 'WIN_ROUND_6' && round6 && round6.plays.length > 0) {
                return (
                  <div className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl w-full max-w-sm my-4 shadow-xl">
                    <h3 className="text-xs font-black text-gaming-gold uppercase tracking-widest text-center mb-3">
                      Bảng So Bài Vòng 6 (Xổ Bài)
                    </h3>
                    
                    {/* Chưng card */}
                    {chưngCard && (
                      <div className="flex justify-between items-center border-b border-slate-800/60 pb-2 mb-3">
                        <span className="text-[11px] text-slate-400 font-medium">Lá bài Chưng (Vòng 5 - {chưngPlayerName}):</span>
                        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-extrabold text-xs text-white">
                          <span className={getSuitColor(chưngCard.suit)}>{getRankShort(chưngCard.rank)}</span>
                          <span className={getSuitColor(chưngCard.suit)}>{getSuitSymbol(chưngCard.suit)}</span>
                        </div>
                      </div>
                    )}

                    {/* Reveal cards list */}
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {round6.plays.map((play, idx) => {
                        const isChưngPlayer = play.playerId === round5?.winnerId;
                        const isFinalWinner = play.playerId === game.winnerId;
                        
                        return (
                          <div key={idx} className="flex justify-between items-center bg-slate-950/40 p-2 rounded-xl border border-slate-900/60">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                              {play.playerName}
                              {isChưngPlayer && <span className="text-[8px] bg-gaming-gold/20 text-gaming-gold px-1 rounded uppercase tracking-wider">Chưng</span>}
                            </span>
                            <div className="flex items-center gap-2">
                              {play.card && (
                                <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-850 font-bold text-xs text-white">
                                  <span className={getSuitColor(play.card.suit)}>{getRankShort(play.card.rank)}</span>
                                  <span className={getSuitColor(play.card.suit)}>{getSuitSymbol(play.card.suit)}</span>
                                </div>
                              )}
                              {isFinalWinner ? (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-black px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  THẮNG
                                </span>
                              ) : (
                                <span className="text-[9px] bg-red-500/10 text-red-400 font-medium px-1.5 py-0.5 rounded border border-red-500/15">
                                  THUA
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Replay Ready Section */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex gap-3">
                {me.isReady ? (
                  <button
                    onClick={setUnready}
                    className="bg-slate-900 hover:bg-slate-850 text-slate-300 px-8 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs border border-slate-800 transition-colors"
                  >
                    Hủy Sẵn Sàng
                  </button>
                ) : (
                  <button
                    onClick={setReady}
                    className="bg-gradient-to-r from-gaming-gold-dark via-gaming-gold to-gaming-gold-light text-slate-950 px-10 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs shadow-gold-glow hover:brightness-110 active:scale-95 transition-all"
                  >
                    Sẵn Sàng Chơi Tiếp
                  </button>
                )}
              </div>

              {/* Start Game for Room Master directly from result screen */}
              {me.isRoomMaster && (
                <div className="mt-2">
                  {(() => {
                    const otherPlayers = players.filter(p => p.id !== room.roomMasterId);
                    const allOthersReady = otherPlayers.length > 0 && otherPlayers.every(p => p.isReady);
                    
                    return (
                      <button
                        onClick={startGame}
                        disabled={!allOthersReady}
                        className={`px-10 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all ${
                          allOthersReady
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-active-glow hover:brightness-115 active:scale-95 cursor-pointer'
                            : 'bg-slate-900 text-slate-500 border border-slate-850 cursor-not-allowed'
                        }`}
                      >
                        Bắt Đầu Ván Mới
                      </button>
                    );
                  })()}
                </div>
              )}

              {me.isRoomMaster ? (
                (() => {
                  const otherPlayers = players.filter(p => p.id !== room.roomMasterId);
                  const allOthersReady = otherPlayers.length > 0 && otherPlayers.every(p => p.isReady);
                  if (!allOthersReady) {
                    return (
                      <p className="text-[10px] text-gaming-gold/70">
                        * Đang chờ những người chơi khác Sẵn Sàng để Bắt đầu Ván Mới...
                      </p>
                    );
                  }
                  return null;
                })()
              ) : (
                <p className="text-[10px] text-slate-500">
                  * Chờ chủ phòng Bắt đầu Ván Mới...
                </p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* User Hand and Controls Area */}
      <div className="w-full bg-slate-950/95 border-t border-slate-900/60 p-4 flex flex-col items-center relative z-20 backdrop-blur-md">
        
        {/* Selected Card Action Controls */}
        {selectedCardId && isMyTurn && game.status !== 'RESULT' && (
          <div className="flex gap-4 mb-4 animate-slide-up">
            {/* Check if is leading */}
            {suitLed ? (
              <>
                <button
                  disabled={!canPlayFaceUp(me.cards!.find(c => c.id === selectedCardId)!)}
                  onClick={() => handlePlaySelected(true)}
                  className={`px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
                    canPlayFaceUp(me.cards!.find(c => c.id === selectedCardId)!)
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-active-glow hover:brightness-110 active:scale-95'
                      : 'bg-slate-900 text-slate-500 border border-slate-850 cursor-not-allowed'
                  }`}
                >
                  ĐÁNH BÀI (CHẶN)
                </button>
                <button
                  onClick={() => handlePlaySelected(false)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all active:scale-95"
                >
                  ÚP BÀI (THIỆP)
                </button>
              </>
            ) : (
              // Leading the round: must play face up
              <button
                onClick={() => handlePlaySelected(true)}
                className="bg-gradient-to-r from-gaming-gold-dark via-gaming-gold to-gaming-gold-light text-slate-950 px-8 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-gold-glow hover:brightness-110 active:scale-95 transition-all"
              >
                ĐÁNH BÀI (DẪN ĐẦU)
              </button>
            )}
          </div>
        )}

        {/* Selected card alert/helper message */}
        {selectedCardId && isMyTurn && game.status !== 'RESULT' && !suitLed && (
          <p className="text-[10px] text-gaming-gold/80 mb-3 font-semibold uppercase tracking-wider flex items-center gap-1">
            <AlertCircle size={12} /> Bạn đang dẫn đầu vòng chơi này. Phải đi bài ngửa!
          </p>
        )}

        {/* Selected card help in defense */}
        {selectedCardId && isMyTurn && game.status !== 'RESULT' && suitLed && (
          <p className="text-[10px] text-slate-400 mb-3 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Eye size={12} /> Chọn Đánh bài (nếu muốn chặn) hoặc Úp bài (nhường lượt).
          </p>
        )}

        {/* Player card list */}
        <div className="flex justify-center items-center gap-2 max-w-full py-1">
          {me.cards && me.cards.length > 0 ? (
            me.cards.map((card, index) => {
              const isSelected = selectedCardId === card.id;
              const isTurnPlayable = isMyTurn && game.status !== 'RESULT';
              
              return (
                <button
                  key={card.id}
                  disabled={!isTurnPlayable}
                  onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className={`w-16 h-24 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col justify-between p-2 relative overflow-hidden transition-all duration-200 transform animate-deal ${
                    isSelected ? 'isSelected -translate-y-6 ring-2 ring-gaming-gold shadow-gold-glow' : ''
                  } ${isTurnPlayable ? 'hover:-translate-y-2 cursor-pointer' : 'opacity-85'}`}
                >
                  <div className="flex flex-col items-start leading-none">
                    <span className={`text-base font-black ${getSuitColor(card.suit)}`}>
                      {getRankShort(card.rank)}
                    </span>
                    <span className={`text-xs ${getSuitColor(card.suit)}`}>
                      {getSuitSymbol(card.suit)}
                    </span>
                  </div>
                  
                  <div className={`text-2xl self-center leading-none ${getSuitColor(card.suit)}`}>
                    {getSuitSymbol(card.suit)}
                  </div>
                  
                  <div className="flex flex-col items-end leading-none rotate-180">
                    <span className={`text-base font-black ${getSuitColor(card.suit)}`}>
                      {getRankShort(card.rank)}
                    </span>
                    <span className={`text-xs ${getSuitColor(card.suit)}`}>
                      {getSuitSymbol(card.suit)}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-slate-500 text-xs py-4 uppercase font-bold tracking-wider">
              {me.status === 'ELIMINATED' ? 'BẠN ĐÃ BỊ LOẠI' : 'Không có bài trên tay'}
            </div>
          )}
        </div>

      </div>

      {/* Slide-out Chat Sidebar */}
      <Chat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};
