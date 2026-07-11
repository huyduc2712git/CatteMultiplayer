import { Card } from './Card';
import { PlayerStatus, PlayerData } from '../types';

export class Player {
  public readonly id: string;
  public readonly name: string;
  public isReady: boolean = false;
  public isRoomMaster: boolean = false;
  public status: PlayerStatus = 'WAITING';
  public cards: Card[] = [];
  public roundsWon: number[] = []; // indices of rounds won (1-6)

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  public resetHand(): void {
    this.cards = [];
    this.roundsWon = [];
    this.status = 'WAITING';
    this.isReady = false;
  }

  public addCard(card: Card): void {
    this.cards.push(card);
  }

  public getCard(cardId: string): Card | null {
    return this.cards.find(c => c.id === cardId) || null;
  }

  public removeCard(cardId: string): Card {
    const idx = this.cards.findIndex(c => c.id === cardId);
    if (idx === -1) {
      throw new Error(`Card ${cardId} not found in player hand`);
    }
    const [card] = this.cards.splice(idx, 1);
    return card;
  }

  public winRound(roundIndex: number): void {
    this.roundsWon.push(roundIndex);
  }

  public hasTung(): boolean {
    // Check if player won any of the first 4 rounds
    return this.roundsWon.some(r => r >= 1 && r <= 4);
  }

  public toJSON(sendPrivateCards: boolean = false): PlayerData {
    return {
      id: this.id,
      name: this.name,
      isReady: this.isReady,
      isRoomMaster: this.isRoomMaster,
      status: this.status,
      cardsCount: this.cards.length,
      cards: sendPrivateCards ? this.cards.map(c => c.toJSON()) : undefined,
      roundsWon: this.roundsWon,
      hasTung: this.hasTung()
    };
  }
}
