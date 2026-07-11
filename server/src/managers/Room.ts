import { Player } from '../core/Player';
import { GameEngine } from '../core/GameEngine';
import { RoomData } from '../types';

export class Room {
  public readonly id: string;
  public readonly name: string;
  public roomMasterId: string;
  public players: Player[] = [];
  public gameEngine: GameEngine | null = null;

  constructor(id: string, name: string, roomMasterId: string) {
    this.id = id;
    this.name = name;
    this.roomMasterId = roomMasterId;
  }

  public addPlayer(player: Player): void {
    if (this.players.length >= 6) {
      throw new Error('Room is full (maximum 6 players)');
    }
    
    if (this.players.some(p => p.id === player.id)) {
      throw new Error('Player already in room');
    }

    // First player is room master
    if (this.players.length === 0) {
      player.isRoomMaster = true;
      this.roomMasterId = player.id;
    } else {
      player.isRoomMaster = false;
    }

    this.players.push(player);
  }

  public removePlayer(playerId: string): void {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx === -1) {
      throw new Error('Player not in room');
    }

    const [removedPlayer] = this.players.splice(idx, 1);
    removedPlayer.resetHand();

    // If game is active, handle player leaving (disconnect/forfeit)
    if (this.gameEngine) {
      // Eliminate player or handle forfeit
      const gamePlayer = this.gameEngine.players.find(p => p.id === playerId);
      if (gamePlayer) {
        gamePlayer.status = 'ELIMINATED';
      }
    }

    // If the room master left, assign a new room master
    if (this.roomMasterId === playerId && this.players.length > 0) {
      this.players[0].isRoomMaster = true;
      this.roomMasterId = this.players[0].id;
    }
  }

  public startGame(): void {
    if (this.players.length < 2) {
      throw new Error('Need at least 2 players to start game');
    }

    // Check if everyone (except room master) is ready
    const allReady = this.players.every(p => p.isRoomMaster || p.isReady);
    if (!allReady) {
      throw new Error('All players must be ready to start');
    }

    this.gameEngine = new GameEngine(this.id, this.players);
    this.gameEngine.start();
  }

  public resetGame(): void {
    this.gameEngine = null;
    for (const player of this.players) {
      player.resetHand();
    }
  }

  public isEmpty(): boolean {
    return this.players.length === 0;
  }

  public toJSON(sendToPlayerId?: string): RoomData {
    return {
      id: this.id,
      name: this.name,
      roomMasterId: this.roomMasterId,
      players: this.players.map(p => p.toJSON(p.id === sendToPlayerId)),
      gameState: this.gameEngine ? this.gameEngine.toJSON() : null
    };
  }
}
