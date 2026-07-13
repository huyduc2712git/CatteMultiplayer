import { Card } from './Card';
import { Suit } from '../types';

export class RuleEngine {
  /**
   * Check if a player wins instantly after dealing (Thắng Trắng).
   * Returns the type of win, or null if no instant win.
   */
  public static checkInstantWin(cards: Card[]): 'INSTANT_TU_QUY' | 'INSTANT_DONG_CHAT' | 'INSTANT_SAU_NHO_6' | null {
    if (cards.length !== 6) return null;

    // 1. Tứ quý (Four of a Kind)
    const rankCounts: Record<string, number> = {};
    for (const card of cards) {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
      if (rankCounts[card.rank] === 4) {
        return 'INSTANT_TU_QUY';
      }
    }

    // 2. Đồng chất (6 cards of same suit)
    const firstSuit = cards[0].suit;
    if (cards.every(c => c.suit === firstSuit)) {
      return 'INSTANT_DONG_CHAT';
    }

    // 3. Sáu lá nhỏ hơn 6 (All cards < 6, i.e., values 2, 3, 4, 5)
    if (cards.every(c => c.getNumericValue() < 6)) {
      return 'INSTANT_SAU_NHO_6';
    }

    return null;
  }

  /**
   * Check if a card is valid to play in the current turn.
   *
   * @param card The card the player wants to play.
   * @param isFaceUp True if playing face up (chặn), false if face down (thiệp).
   * @param suitLed The suit led in the current round (null if this player leads).
   * @param highestCard The current highest card of the led suit played in this round (null if this player leads).
   */
  public static isValidPlay(
    card: Card,
    isFaceUp: boolean,
    suitLed: Suit | null,
    highestCard: Card | null
  ): boolean {
    // If leading the round, card must be played face up, and any card is valid
    if (!suitLed || !highestCard) {
      return isFaceUp;
    }

    if (isFaceUp) {
      // Must be same suit and higher value than current highest winning card
      return card.suit === suitLed && card.getNumericValue() > highestCard.getNumericValue();
    }

    // If playing face down (thiệp), any card is allowed
    return true;
  }

  /**
   * Determine the winner of a single round (rounds 1-4).
   * Returns the player ID of the winner.
   */
  public static determineRoundWinner(
    plays: { playerId: string; card: Card; isFaceUp: boolean }[],
    suitLed: Suit
  ): string {
    if (plays.length === 0) {
      throw new Error('No plays in round to determine winner');
    }

    let winningPlay = plays[0];

    for (let i = 1; i < plays.length; i++) {
      const currentPlay = plays[i];
      if (!currentPlay.isFaceUp) continue;

      if (!winningPlay.isFaceUp) {
        winningPlay = currentPlay;
        continue;
      }

      if (currentPlay.card.compareTo(winningPlay.card, suitLed) > 0) {
        winningPlay = currentPlay;
      }
    }

    return winningPlay.playerId;
  }

  /**
   * Determine the final winner of the game at Round 6 (Vòng xổ).
   * Compare all final 6th cards against the leader's Round 5 Chưng card.
   *
   * @param chưngPlayerId The player ID who chưng'd in Round 5.
   * @param chưngCard The card that was chưng'd face up in Round 5.
   * @param round6Cards Map of player ID -> their 6th card (revealed in Round 6).
   */
  public static determineGameWinner(
    chưngPlayerId: string,
    chưngCard: Card,
    round6Cards: Map<string, Card>
  ): string {
    const chưngSuit = chưngCard.suit;
    let winningPlayerId = chưngPlayerId;
    let winningCard: Card | null = null;

    // Find the player with the highest 6th card of the chưng suit
    for (const [playerId, card6] of round6Cards.entries()) {
      if (card6.suit === chưngSuit) {
        if (!winningCard || card6.getNumericValue() > winningCard.getNumericValue()) {
          winningPlayerId = playerId;
          winningCard = card6;
        }
      }
    }

    return winningPlayerId;
  }
}
