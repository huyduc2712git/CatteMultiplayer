import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import { Chat } from './Chat';
import { MessageSquare, LogOut, Shield, Clock, Eye, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import type { Suit, CardData, PlayerData, PlayedCardData } from '../types';

export const GameBoard: React.FC = () => {
  const { room, leaveRoom, playCard, setReady, setUnready, startGame } = useGame();
  const { socket } = useSocket();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!room || !room.gameState) return null;

  const game = room.gameState;
  const players = room.players;
  const myId = sessionStorage.getItem('catte_player_id') || socket?.id || '';
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

  const getCardValue = (card: CardData): number => {
    const valMap: Record<string, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'Jack': 11, 'Queen': 12, 'King': 13, 'Ace': 14
    };
    return valMap[card.rank] || 0;
  };

  // Helper to get SVG path for a card
  const getCardSvgPath = (card: CardData): string => {
    const rankMap: Record<string, string> = {
      'Ace': 'A', 'Jack': 'J', 'Queen': 'Q', 'King': 'K'
    };
    const suitMap: Record<string, string> = {
      'Clubs': 'C', 'Diamonds': 'D', 'Hearts': 'H', 'Spades': 'S'
    };
    const r = rankMap[card.rank] || card.rank;
    const s = suitMap[card.suit];
    return `/cards/${r}${s}.svg`;
  };

  // Get current highest winning card of the led suit in this round so far
  const getHighestWinningCard = (): CardData | null => {
    if (!currentRound || currentRound.plays.length === 0) return null;
    
    let highest: CardData | null = null;
    for (const play of currentRound.plays) {
      if (!play.isFaceUp || !play.card) continue;
      if (!highest) {
        highest = play.card;
        continue;
      }
      if (getCardValue(play.card) > getCardValue(highest)) {
        highest = play.card;
      }
    }
    return highest;
  };

  const highestCard = getHighestWinningCard();
  const suitLed = currentRound?.suitLed;

  // Check if a card is valid to play face up (chặn)
  const canPlayFaceUp = (card: CardData): boolean => {
    if (!suitLed) return true; // Leading can play any card face up
    return card.suit === suitLed && getCardValue(card) > (highestCard ? getCardValue(highestCard) : 0);
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
    0: 'bottom-2 left-1/2 -translate-x-1/2', // Current player (bottom center)
    1: 'top-1/2 left-2 -translate-y-1/2', // Middle left
    2: 'top-2 left-[18%]', // Top left
    3: 'top-2 left-1/2 -translate-x-1/2', // Top center
    4: 'top-2 right-[18%]', // Top right
    5: 'top-1/2 right-2 -translate-y-1/2', // Middle right
  };

  // Fetch all plays for a player to display their stack in front of their seat
  const getPlayerPlays = (playerId: string) => {
    const plays: { play: PlayedCardData; roundIndex: number }[] = [];
    for (let r = 1; r <= 6; r++) {
      const play = getPlayerPlayForRound(playerId, r);
      if (play) {
        plays.push({ play, roundIndex: r });
      }
    }
    return plays;
  };

  // Map seatIndex to absolute positions for the played card stacks (relative to Felt Table Oval container)
  const playedCardsPositions: Record<number, string> = {
    0: 'bottom-[28%] left-1/2 -translate-x-1/2',
    1: 'top-[48%] left-[20%] -translate-y-1/2',
    2: 'top-[25%] left-[24%]',
    3: 'top-[24%] left-1/2 -translate-x-1/2',
    4: 'top-[25%] right-[24%]',
    5: 'top-[48%] right-[20%] -translate-y-1/2',
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

  // Trigger physical vibration on mobile when it's the user's turn
  React.useEffect(() => {
    if (game && game.turnPlayerId === myId && game.status !== 'RESULT' && game.status !== 'WAITING') {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([300, 100, 300]);
      }
    }
  }, [game?.turnPlayerId, myId, game?.status]);

  return (
    <div className="min-h-screen bg-gaming-green-deep flex flex-col justify-between items-center relative overflow-hidden select-none">
      
      {/* Top HUD */}
      <div className="w-full bg-slate-950/80 border-b border-slate-900/60 px-4 py-3 flex justify-between items-center relative z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[10px] font-bold text-gaming-gold uppercase tracking-widest block">Phòng chơi</span>
            <span 
              onClick={handleCopyCode}
              className="text-sm font-black text-white tracking-wider flex items-center gap-1.5 cursor-pointer hover:text-gaming-gold transition-colors"
              title="Click để copy mã phòng"
            >
              {room.name} ({room.id})
              {copied ? (
                <Check size={11} className="text-emerald-500" />
              ) : (
                <Copy size={11} className="text-slate-500" />
              )}
            </span>
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
      <div className="flex-1 w-full relative flex items-center justify-center p-2 sm:p-4">
        
        {/* The Felt Table Oval */}
        <div className="felt-table-oval absolute w-[98%] h-[94%] bg-gradient-to-b from-gaming-green-felt to-gaming-green-deep border-[12px] sm:border-[16px] border-slate-900/90 rounded-[40px] sm:rounded-[100px] shadow-board flex flex-col justify-center items-center">
          
          {/* Decorative Table Felt Logo */}
          <div className="absolute opacity-5 pointer-events-none select-none text-center">
            <span className="text-8xl font-black text-white tracking-widest block">CATTE</span>
            <span className="text-sm font-bold text-white tracking-widest uppercase">Realtime Gaming Arena</span>
          </div>

          {/* Center Play Area */}
          <div className="center-play-area absolute w-[60%] h-[50%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center items-center bg-slate-950/20 border border-white/5 rounded-[50px] p-4">
            
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

            {(!currentRound || currentRound.plays.length === 0) && (
              <div className="text-slate-500/80 text-xs font-bold uppercase tracking-wider text-center p-4">
                Đang chờ ra quân...
              </div>
            )}

          </div>

          {/* Players Seats layout around the felt table (positioned relative to Felt Table borders) */}
          {posPlayers.map(({ player, seatIndex }) => {
            const isTurn = game.turnPlayerId === player.id;
            const posClass = seatPositions[seatIndex];
            const isPlayerMe = player.id === myId;
            const isEliminated = player.status === 'ELIMINATED';

            if (seatIndex === 0) return null; // Render bottom player info floating above hand cards instead

            return (
              <div
                key={player.id}
                className={`absolute ${posClass} z-10 flex flex-col items-center transition-all duration-300`}
              >
                {/* Player Avatar card */}
                <div
                  key={player.id + (isTurn ? '-turn' : '')}
                  className={`game-avatar-card relative flex items-center gap-2.5 p-2 rounded-2xl border bg-slate-950/90 shadow-lg ${
                    isTurn
                      ? 'border-gaming-gold animate-gold-pulse scale-105 animate-turn-shake'
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
                        ★ {player.roundsWon.length} Tùng
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-500 font-semibold block">
                        KHÔNG CÓ TÙNG
                      </span>
                    )}

                    {/* Player hand count display (below the player info) */}
                    {!isPlayerMe && !isEliminated && (
                      <div className="flex items-center gap-1 mt-0.5 text-red-400 font-bold text-[9px]">
                        <span>Còn: {player.cardsCount} lá</span>
                        <div className="w-2.5 h-3.5 bg-red-800 rounded-sm border border-white/30" />
                      </div>
                    )}
                  </div>

                  {isEliminated && (
                    <span className="text-[9px] font-extrabold text-red-400 bg-red-950/30 border border-red-500/20 px-2 py-0.5 rounded-lg ml-2 uppercase">
                      CHẾT TÙNG
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Played Cards Stacks near each seat */}
          {posPlayers.map(({ player, seatIndex }) => {
            const playerPlays = getPlayerPlays(player.id);
            const posClass = playedCardsPositions[seatIndex];
            if (playerPlays.length === 0) return null;

            return (
              <div
                key={`plays-${player.id}`}
                className={`absolute ${posClass} z-10 flex -space-x-4.5 sm:-space-x-6.5 justify-center items-center`}
              >
                {playerPlays.map(({ play, roundIndex }) => {
                  const isWinner = game.rounds[roundIndex - 1]?.winnerId === player.id;
                  
                  return (
                    <div
                      key={roundIndex}
                      className={`played-stack-card rounded-md relative shadow-md select-none border border-slate-950/20 hover:scale-110 active:scale-95 ${
                        isWinner ? 'ring-2 ring-gaming-gold shadow-gold-glow' : ''
                      }`}
                    >
                      {play.isFaceUp && play.card ? (
                        <img
                          src={getCardSvgPath(play.card)}
                          className="w-full h-full object-contain pointer-events-none select-none rounded-md"
                          alt={`${play.card.rank} of ${play.card.suit}`}
                        />
                      ) : (
                        <img
                          src="/cards/back.svg"
                          className="w-full h-full object-contain pointer-events-none select-none rounded-md"
                          alt="Face down card"
                        />
                      )}
                      
                      {/* Winner Star Badge */}
                      {isWinner && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gaming-gold rounded-full border border-slate-950 flex items-center justify-center text-[8px] text-slate-950 font-black shadow-md z-30">
                          ★
                        </div>
                      )}
                    </div>
                  );
                })}
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

        {/* User Hand and Controls Area (Floating transparently at the bottom) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center pointer-events-none w-full max-w-xl px-4">
          
          {/* Bottom Player Status Badge */}
          <div className="bg-slate-950/90 border border-gaming-gold/60 px-3.5 py-1 rounded-full text-center shadow-lg mb-2 pointer-events-auto flex items-center gap-2">
            <span className="font-extrabold text-[10px] text-white tracking-wide">{me.name} (Bạn)</span>
            <span className="w-px h-2.5 bg-slate-800" />
            {me.roundsWon.length > 0 ? (
              <span className="text-[10px] text-gaming-gold font-black flex items-center gap-0.5">
                ★ {me.roundsWon.length} Tùng
              </span>
            ) : (
              <span className="text-[9px] text-slate-500 font-semibold block">
                KHÔNG CÓ TÙNG
              </span>
            )}
            {me.status === 'ELIMINATED' && (
              <span className="text-[9px] font-extrabold text-red-400 bg-red-950/30 border border-red-500/20 px-2 py-0.5 rounded-lg ml-1 uppercase">
                CHẾT TÙNG
              </span>
            )}
          </div>
          
          {/* Selected Card Action Controls */}
          {selectedCardId && isMyTurn && game.status !== 'RESULT' && (
            <div className="flex gap-4 mb-3 animate-slide-up pointer-events-auto">
              {/* Check if is leading */}
              {suitLed ? (
                <>
                  <button
                    disabled={!canPlayFaceUp(me.cards!.find(c => c.id === selectedCardId)!)}
                    onClick={() => handlePlaySelected(true)}
                    className={`px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer ${
                      canPlayFaceUp(me.cards!.find(c => c.id === selectedCardId)!)
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-active-glow hover:brightness-110 active:scale-95'
                        : 'bg-slate-900 text-slate-500 border border-slate-850 cursor-not-allowed'
                    }`}
                  >
                    {game.currentRoundIndex === 5 ? 'BẮT ĐÈ' : 'ĐÁNH BÀI (CHẶN)'}
                  </button>
                  <button
                    onClick={() => handlePlaySelected(false)}
                    className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all active:scale-95 cursor-pointer"
                  >
                    ÚP BÀI (THIỆP)
                  </button>
                </>
              ) : (
                // Leading the round: must play face up
                <button
                  onClick={() => handlePlaySelected(true)}
                  className="bg-gradient-to-r from-gaming-gold-dark via-gaming-gold to-gaming-gold-light text-slate-950 px-8 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-gold-glow hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  {game.currentRoundIndex === 5 ? 'CHƯNG BÀI' : 'ĐÁNH BÀI (DẪN ĐẦU)'}
                </button>
              )}
            </div>
          )}

          {/* Selected card alert/helper message */}
          {selectedCardId && isMyTurn && game.status !== 'RESULT' && !suitLed && (
            <p className="text-[10px] text-gaming-gold/90 mb-2.5 font-bold uppercase tracking-wider flex items-center gap-1 bg-slate-950/85 px-3 py-1 rounded-full border border-slate-900/60 pointer-events-auto">
              <AlertCircle size={12} /> {game.currentRoundIndex === 5 ? 'Bạn là người chưng bài ở vòng này. Phải đi bài ngửa!' : 'Bạn đang dẫn đầu vòng chơi này. Phải đi bài ngửa!'}
            </p>
          )}

          {/* Selected card help in defense */}
          {selectedCardId && isMyTurn && game.status !== 'RESULT' && suitLed && (
            <p className="text-[10px] text-slate-300 mb-2.5 font-bold uppercase tracking-wider flex items-center gap-1 bg-slate-950/85 px-3 py-1 rounded-full border border-slate-900/60 pointer-events-auto">
              <Eye size={12} /> {game.currentRoundIndex === 5 ? 'Chọn Bắt đè (nếu muốn chặn bài Chưng) hoặc Úp bài (nhường lượt).' : 'Chọn Đánh bài (nếu muốn chặn) hoặc Úp bài (nhường lượt).'}
            </p>
          )}

          {/* Player card list */}
          <div className="flex justify-center items-center gap-2 max-w-full py-1 pointer-events-auto">
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
                    className={`hand-card w-16 h-24 bg-transparent border-0 relative transition-all duration-200 transform animate-deal ${
                      isSelected ? 'isSelected -translate-y-6 ring-2 ring-gaming-gold shadow-gold-glow rounded-xl' : ''
                    } ${isTurnPlayable ? 'hover:-translate-y-2 cursor-pointer' : 'opacity-85'}`}
                  >
                    <img 
                      src={getCardSvgPath(card)} 
                      className="w-full h-full object-contain pointer-events-none select-none rounded-xl" 
                      alt={`${card.rank} of ${card.suit}`} 
                    />
                  </button>
                );
              })
            ) : (
              <div className="text-slate-400 text-xs py-3.5 uppercase font-bold tracking-wider bg-slate-950/85 px-4 py-2 rounded-full border border-slate-900/60 pointer-events-auto">
                {me.status === 'ELIMINATED' ? 'BẠN ĐÃ BỊ LOẠI' : 'Không có bài trên tay'}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Slide-out Chat Sidebar */}
      <Chat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};
