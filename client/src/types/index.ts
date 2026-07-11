export type Suit = 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs';

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'Jack' | 'Queen' | 'King' | 'Ace';

export interface CardData {
  id: string; // e.g., "AS", "2H", "10D"
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'WAITING' | 'READY' | 'PLAYING' | 'ELIMINATED';

export type GameState = 
  | 'WAITING' 
  | 'DEALING' 
  | 'ROUND_1' 
  | 'ROUND_2' 
  | 'ROUND_3' 
  | 'ROUND_4' 
  | 'CHUNG' // Round 5
  | 'LAT'   // Round 6
  | 'RESULT';

export interface PlayerData {
  id: string;
  name: string;
  isReady: boolean;
  isRoomMaster: boolean;
  status: PlayerStatus;
  cardsCount: number;
  cards?: CardData[]; // Only sent to the owner of the cards
  roundsWon: number[]; // e.g., [1, 3] indicating round indices
  hasTung: boolean;
}

export interface PlayedCardData {
  playerId: string;
  playerName: string;
  card: CardData | null; // null if played face down (thiệp) and not revealed yet
  isFaceUp: boolean;
}

export interface RoundData {
  roundIndex: number; // 1 to 6
  suitLed: Suit | null;
  plays: PlayedCardData[];
  winnerId: string | null;
  winnerName: string | null;
}

export interface GameStateData {
  roomId: string;
  status: GameState;
  dealerId: string;
  turnPlayerId: string | null;
  turnTimeLeft: number; // in seconds
  currentRoundIndex: number; // 1 to 6
  rounds: RoundData[];
  survivingPlayerIds: string[];
  winnerId: string | null;
  winType: 'INSTANT_TU_QUY' | 'INSTANT_DONG_CHAT' | 'INSTANT_SAU_NHO_6' | 'WIN_TUNG' | 'WIN_ROUND_6' | null;
}

export interface RoomData {
  id: string;
  name: string;
  roomMasterId: string;
  players: PlayerData[];
  gameState: GameStateData | null;
}

export interface ChatMessageData {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}
