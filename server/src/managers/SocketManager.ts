import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Room } from './Room';
import { RoomManager } from './RoomManager';

export class SocketManager {
  private static instance: SocketManager | null = null;
  private io!: SocketServer;
  private roomManager = RoomManager.getInstance();
  
  // Maps socket ID -> room ID to keep track of players location
  private playerRooms: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public init(httpServer: HttpServer): SocketServer {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*', // For development, customize in production
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);
      this.registerHandlers(socket);
    });

    // Start turn timer tick loop
    this.startTimerLoop();

    return this.io;
  }

  public setPlayerRoom(playerId: string, roomId: string): void {
    this.playerRooms.set(playerId, roomId);
  }

  public getPlayerRoomId(playerId: string): string | null {
    return this.playerRooms.get(playerId) || null;
  }

  public removePlayerRoom(playerId: string): void {
    this.playerRooms.delete(playerId);
  }

  public broadcastToRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  public sendToPlayer(playerId: string, event: string, data: any): void {
    this.io.to(playerId).emit(event, data);
  }

  public broadcastRoomUpdate(roomId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    // Send customized room updates to each player (hiding private cards of others)
    for (const player of room.players) {
      this.sendToPlayer(player.id, 'room-updated', room.toJSON(player.id));
    }
  }

  private startTimerLoop(): void {
    // Disabled as requested: players have unlimited time per turn
  }

  public autoPlayForPlayer(room: Room, playerId: string): void {
    const game = room.gameEngine;
    if (!game) return;

    const player = game.players.find(p => p.id === playerId);
    if (!player || player.cards.length === 0) return;

    const cardToPlay = player.cards[0];
    const currentRound = game.rounds[game.currentRoundIndex - 1];
    const isLeading = !currentRound.suitLed;
    
    // In Catte, the leader MUST play face up. Others can play face down.
    const isFaceUp = isLeading;

    console.log(`Auto-playing card ${cardToPlay.id} for player ${player.name} in room ${room.id} (isFaceUp=${isFaceUp}) due to timeout`);
    game.playCard(playerId, cardToPlay.id, isFaceUp);
    
    // Broadcast the update
    this.broadcastRoomUpdate(room.id);
  }

  private registerHandlers(socket: Socket): void {
    // We will bind handlers dynamically from eventHandlers.ts
    // to keep SocketManager generic
    const { handleSocketEvents } = require('../socket/eventHandlers');
    handleSocketEvents(socket, this);
  }
}
