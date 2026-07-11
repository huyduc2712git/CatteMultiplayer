import { Card } from './Card';
import { Suit, PlayedCardData, RoundData } from '../types';

export interface RoundPlay {
  playerId: string;
  playerName: string;
  card: Card;
  isFaceUp: boolean;
}

export class Round {
  public readonly roundIndex: number; // 1 to 6
  public suitLed: Suit | null = null;
  public plays: RoundPlay[] = [];
  public winnerId: string | null = null;
  public winnerName: string | null = null;

  constructor(roundIndex: number) {
    this.roundIndex = roundIndex;
  }

  public addPlay(playerId: string, playerName: string, card: Card, isFaceUp: boolean): void {
    if (this.plays.length === 0) {
      // First card played in this round sets the suit
      this.suitLed = card.suit;
    }
    this.plays.push({
      playerId,
      playerName,
      card,
      isFaceUp
    });
  }

  public determineWinner(): string {
    if (this.plays.length === 0 || !this.suitLed) {
      throw new Error('Cannot determine winner: no plays in this round');
    }

    // Find the play with the highest card of the led suit
    let winningPlay = this.plays[0];

    for (let i = 1; i < this.plays.length; i++) {
      const currentPlay = this.plays[i];
      // Only compare face-up cards, face-down (thiệp) can't win!
      if (!currentPlay.isFaceUp) continue;
      
      if (!winningPlay.isFaceUp) {
        winningPlay = currentPlay;
        continue;
      }

      if (currentPlay.card.compareTo(winningPlay.card, this.suitLed) > 0) {
        winningPlay = currentPlay;
      }
    }

    this.winnerId = winningPlay.playerId;
    this.winnerName = winningPlay.playerName;
    return winningPlay.playerId;
  }

  public getWinningCard(): Card | null {
    if (!this.winnerId) return null;
    const winningPlay = this.plays.find(p => p.playerId === this.winnerId);
    return winningPlay ? winningPlay.card : null;
  }

  public getCurrentHighestCard(): Card | null {
    if (this.plays.length === 0 || !this.suitLed) return null;
    
    let highestPlay = null;
    for (const play of this.plays) {
      if (!play.isFaceUp) continue;
      if (!highestPlay) {
        highestPlay = play;
        continue;
      }
      if (play.card.compareTo(highestPlay.card, this.suitLed) > 0) {
        highestPlay = play;
      }
    }
    
    return highestPlay ? highestPlay.card : null;
  }

  public toJSON(): RoundData {
    return {
      roundIndex: this.roundIndex,
      suitLed: this.suitLed,
      plays: this.plays.map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        // Hide card details if it was played face down
        card: p.isFaceUp ? p.card.toJSON() : null,
        isFaceUp: p.isFaceUp
      })),
      winnerId: this.winnerId,
      winnerName: this.winnerName
    };
  }
}
