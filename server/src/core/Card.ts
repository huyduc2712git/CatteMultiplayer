import { Suit, Rank, CardData } from '../types';

export class Card implements CardData {
  public readonly id: string;
  public readonly suit: Suit;
  public readonly rank: Rank;

  private static rankValues: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'Jack': 11, 'Queen': 12, 'King': 13, 'Ace': 14
  };

  private static suitShort: Record<Suit, string> = {
    'Spades': 'S', 'Hearts': 'H', 'Diamonds': 'D', 'Clubs': 'C'
  };

  constructor(suit: Suit, rank: Rank) {
    this.suit = suit;
    this.rank = rank;
    this.id = `${Card.getRankShort(rank)}${Card.suitShort[suit]}`;
  }

  public getNumericValue(): number {
    return Card.rankValues[this.rank];
  }

  public static getRankShort(rank: Rank): string {
    if (rank === 'Jack') return 'J';
    if (rank === 'Queen') return 'Q';
    if (rank === 'King') return 'K';
    if (rank === 'Ace') return 'A';
    return rank;
  }

  public toJSON(): CardData {
    return {
      id: this.id,
      suit: this.suit,
      rank: this.rank
    };
  }

  public toString(): string {
    return `${this.rank} of ${this.suit}`;
  }

  /**
   * Compare two cards under a led suit.
   * Returns positive if this > other, negative if this < other, 0 if equal.
   */
  public compareTo(other: Card, suitLed: Suit): number {
    // If both have the led suit, compare values
    if (this.suit === suitLed && other.suit === suitLed) {
      return this.getNumericValue() - other.getNumericValue();
    }
    // If only this has the led suit, this is greater
    if (this.suit === suitLed) {
      return 1;
    }
    // If only other has the led suit, other is greater
    if (other.suit === suitLed) {
      return -1;
    }
    // If neither has the led suit, they don't count towards winning (standard Catte)
    // but for internal sorting, we can compare values
    return this.getNumericValue() - other.getNumericValue();
  }
}
