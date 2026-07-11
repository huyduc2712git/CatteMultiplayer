import { Card } from './Card';
import { Suit, Rank } from '../types';

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.cards = [];
    const suits: Suit[] = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
    const ranks: Rank[] = [
      '2', '3', '4', '5', '6', '7', '8', '9', '10',
      'Jack', 'Queen', 'King', 'Ace'
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push(new Card(suit, rank));
      }
    }
  }

  public shuffle(): void {
    // Fisher-Yates shuffle algorithm
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  public deal(numCards: number): Card[] {
    if (this.cards.length < numCards) {
      throw new Error('Not enough cards in the deck');
    }
    return this.cards.splice(0, numCards);
  }

  public getRemainingCount(): number {
    return this.cards.length;
  }
}
