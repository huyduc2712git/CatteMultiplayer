import { Player } from './Player';
import { Card } from './Card';
import { Deck } from './Deck';
import { Round } from './Round';
import { RuleEngine } from './RuleEngine';
import { GameState, GameStateData, Suit } from '../types';

export class GameEngine {
  public readonly roomId: string;
  public players: Player[] = [];
  public deck: Deck;
  public rounds: Round[] = [];
  public status: GameState = 'WAITING';
  
  public turnPlayerId: string | null = null;
  public turnTimeLeft: number = 30; // 30 seconds turn limit
  public currentRoundIndex: number = 1; // 1 to 6
  public dealerId: string = '';
  public winnerId: string | null = null;
  public winType: 'INSTANT_TU_QUY' | 'INSTANT_DONG_CHAT' | 'INSTANT_SAU_NHO_6' | 'WIN_TUNG' | 'WIN_ROUND_6' | null = null;

  constructor(roomId: string, players: Player[], initialDealerId?: string) {
    this.roomId = roomId;
    this.players = players;
    this.deck = new Deck();
    // Default dealer is the previous winner, or the first player in room
    if (initialDealerId && players.some(p => p.id === initialDealerId)) {
      this.dealerId = initialDealerId;
    } else if (players.length > 0) {
      this.dealerId = players[0].id;
    }
  }

  public start(): void {
    if (this.players.length < 2 || this.players.length > 6) {
      throw new Error('Game requires between 2 and 6 players to start');
    }

    this.status = 'DEALING';
    this.deck.reset();
    this.deck.shuffle();
    this.rounds = [];
    this.winnerId = null;
    this.winType = null;
    this.currentRoundIndex = 1;

    // Reset player hands and statuses
    for (const player of this.players) {
      player.resetHand();
      player.status = 'PLAYING';
      // Deal 6 cards
      const dealtCards = this.deck.deal(6);
      for (const card of dealtCards) {
        player.addCard(card);
      }
    }

    // Initialize 6 rounds
    for (let r = 1; r <= 6; r++) {
      this.rounds.push(new Round(r));
    }

    // Check for instant wins (Thắng Trắng)
    let instantWinner: Player | null = null;
    let instantWinType: 'INSTANT_TU_QUY' | 'INSTANT_DONG_CHAT' | 'INSTANT_SAU_NHO_6' | null = null;

    // Standard rule: Check players in turn order starting from dealer
    const startIdx = this.players.findIndex(p => p.id === this.dealerId);
    for (let i = 0; i < this.players.length; i++) {
      const idx = (startIdx + i) % this.players.length;
      const player = this.players[idx];
      const win = RuleEngine.checkInstantWin(player.cards);
      if (win) {
        instantWinner = player;
        instantWinType = win;
        break; // First one in turn order wins if multiple have it
      }
    }

    if (instantWinner && instantWinType) {
      this.winnerId = instantWinner.id;
      this.winType = instantWinType;
      this.status = 'RESULT';
      
      // Update players statuses
      for (const player of this.players) {
        player.status = 'WAITING';
      }
      return;
    }

    // No instant win, start Round 1
    this.status = 'ROUND_1';
    // First turn goes to the dealer
    this.turnPlayerId = this.dealerId;
    this.turnTimeLeft = 30;
  }

  public getSurvivingPlayers(): Player[] {
    return this.players.filter(p => p.status === 'PLAYING');
  }

  public getPlayerIndex(playerId: string): number {
    return this.players.findIndex(p => p.id === playerId);
  }

  public playCard(playerId: string, cardId: string, isFaceUp: boolean): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found in this game');
    }

    if (this.turnPlayerId !== playerId) {
      throw new Error('It is not your turn');
    }

    const card = player.getCard(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found in hand`);
    }

    const currentRound = this.rounds[this.currentRoundIndex - 1];
    
    // Validate play via RuleEngine
    let highestCard: Card | null = null;
    if (currentRound.plays.length > 0 && currentRound.suitLed) {
      const winningCard = currentRound.getCurrentHighestCard();
      highestCard = winningCard;
    }

    const isValid = RuleEngine.isValidPlay(
      card,
      isFaceUp,
      currentRound.suitLed,
      highestCard
    );

    if (!isValid) {
      throw new Error('Invalid move under Catte rules');
    }

    // Remove card from player hand and add to round
    player.removeCard(cardId);
    
    // If playing face up (blocking), turn all previous face-up cards in this round to face down (beaten)
    if (isFaceUp) {
      for (const play of currentRound.plays) {
        play.isFaceUp = false;
      }
    }
    
    currentRound.addPlay(playerId, player.name, card, isFaceUp);

    // Advance turn
    this.advanceTurn();
  }

  private advanceTurn(): void {
    const currentRound = this.rounds[this.currentRoundIndex - 1];
    const survivors = this.getSurvivingPlayers();

    // The round is complete when all surviving players have made a play
    const roundComplete = survivors.every(p => currentRound.plays.some(play => play.playerId === p.id));

    if (roundComplete) {
      // Round complete, resolve it
      this.endRound();
    } else {
      // Find the next player in clockwise order who is active (status === 'PLAYING')
      // and has NOT played yet in this round
      const currentIdx = this.getPlayerIndex(this.turnPlayerId!);
      let nextIdx = (currentIdx + 1) % this.players.length;
      
      let safetyCounter = 0;
      while (
        (this.players[nextIdx].status !== 'PLAYING' || 
         currentRound.plays.some(play => play.playerId === this.players[nextIdx].id)) &&
        safetyCounter < this.players.length
      ) {
        nextIdx = (nextIdx + 1) % this.players.length;
        safetyCounter++;
      }

      this.turnPlayerId = this.players[nextIdx].id;
      this.turnTimeLeft = 30;
    }
  }

  public handlePlayerLeft(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    player.status = 'ELIMINATED';
    console.log(`Player ${player.name} left the game and was ELIMINATED.`);

    // If only one survivor remains, they win the game immediately
    const survivors = this.getSurvivingPlayers();
    if (survivors.length === 1 && this.status !== 'RESULT' && this.status !== 'WAITING') {
      console.log(`Only one survivor left: ${survivors[0].name}. Ending game.`);
      this.endGame(survivors[0].id, 'WIN_TUNG');
      return;
    }

    // If it was their turn, advance the turn to the next player
    if (this.status !== 'WAITING' && this.status !== 'RESULT' && this.turnPlayerId === playerId) {
      console.log(`Advancing turn because active player ${player.name} left.`);
      this.advanceTurn();
    }
  }

  private endRound(): void {
    const currentRound = this.rounds[this.currentRoundIndex - 1];
    
    // Determine winner of this round
    const roundWinnerId = currentRound.determineWinner();
    const winner = this.players.find(p => p.id === roundWinnerId)!;
    
    // Add win to player
    winner.winRound(this.currentRoundIndex);

    console.log(`Round ${this.currentRoundIndex} ended. Winner: ${winner.name}`);

    if (this.currentRoundIndex < 4) {
      // Advance to next round (ROUND_2, ROUND_3, ROUND_4)
      this.currentRoundIndex++;
      this.status = `ROUND_${this.currentRoundIndex}` as GameState;
      // Winner of the previous round leads the next round
      this.turnPlayerId = roundWinnerId;
      this.turnTimeLeft = 30;
    } else if (this.currentRoundIndex === 4) {
      // End of Round 4: Eliminate players who have no "Tùng" (0 rounds won)
      for (const player of this.players) {
        if (!player.hasTung()) {
          player.status = 'ELIMINATED';
          console.log(`Player ${player.name} is ELIMINATED (Chết tùng).`);
        }
      }

      const survivors = this.getSurvivingPlayers();
      if (survivors.length === 0) {
        // Extreme edge case: no one has tùng? Winner is the winner of Round 4
        this.endGame(roundWinnerId, 'WIN_TUNG');
      } else if (survivors.length === 1) {
        // Only 1 player has tùng, they win the game immediately (Thắng Tùng)!
        this.endGame(survivors[0].id, 'WIN_TUNG');
      } else {
        // Multiple survivors, advance to Round 5 (CHUNG)
        this.currentRoundIndex = 5;
        this.status = 'CHUNG';
        // Winner of Round 4 leads the Chưng round
        this.turnPlayerId = roundWinnerId;
        this.turnTimeLeft = 30;
      }
    } else if (this.currentRoundIndex === 5) {
      // End of Round 5 (CHUNG): All survivors have played.
      // Transition immediately to Round 6 (LAT/Xổ)
      this.currentRoundIndex = 6;
      this.status = 'LAT';
      this.turnPlayerId = null; // No active turns in Round 6
      this.resolveRound6();
    }
  }

  private resolveRound6(): void {
    // Vòng 6: Xổ bài
    const round5 = this.rounds[4];
    const round6 = this.rounds[5];
    
    const chưngPlay = round5.plays.find(p => p.playerId === round5.winnerId);
    if (!chưngPlay) {
      throw new Error('Chưng play not found for Round 5');
    }

    const chưngCard = chưngPlay.card;
    const survivors = this.getSurvivingPlayers();

    // In Round 6, everyone reveals their final (6th) card.
    // The server adds these plays to the Round 6 history.
    const round6CardsMap = new Map<string, Card>();

    for (const player of survivors) {
      if (player.cards.length > 0) {
        const lastCard = player.cards[0]; // Exactly 1 card left
        round6.addPlay(player.id, player.name, lastCard, true);
        round6CardsMap.set(player.id, lastCard);
        
        // Remove it from their hand
        player.cards = [];
      }
    }

    // Determine the final winner using RuleEngine
    const finalWinnerId = RuleEngine.determineGameWinner(
      round5.winnerId!,
      chưngCard,
      round6CardsMap
    );

    // Save winner details in Round 6 object for display
    round6.winnerId = finalWinnerId;
    const finalWinner = this.players.find(p => p.id === finalWinnerId)!;
    round6.winnerName = finalWinner.name;

    this.endGame(finalWinnerId, 'WIN_ROUND_6');
  }

  private endGame(winnerId: string, type: 'WIN_TUNG' | 'WIN_ROUND_6'): void {
    this.winnerId = winnerId;
    this.winType = type;
    this.status = 'RESULT';
    this.turnPlayerId = null;

    // Reset player statuses for lobby
    for (const player of this.players) {
      player.status = 'WAITING';
    }

    // Winner of the previous game becomes the dealer for the next game
    this.dealerId = winnerId;
    
    console.log(`Game ended. Winner: ${winnerId} by ${type}`);
  }

  public toJSON(): GameStateData {
    return {
      roomId: this.roomId,
      status: this.status,
      dealerId: this.dealerId,
      turnPlayerId: this.turnPlayerId,
      turnTimeLeft: this.turnTimeLeft,
      currentRoundIndex: this.currentRoundIndex,
      rounds: this.rounds.map(r => r.toJSON()),
      survivingPlayerIds: this.getSurvivingPlayers().map(p => p.id),
      winnerId: this.winnerId,
      winType: this.winType
    };
  }
}
