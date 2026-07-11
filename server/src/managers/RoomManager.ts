import { Room } from './Room';
import { Player } from '../core/Player';

export class RoomManager {
  private static instance: RoomManager | null = null;
  private rooms: Map<string, Room> = new Map();
  private cleanupTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Cleanup delay: 2 minutes
  private readonly CLEANUP_DELAY = 2 * 60 * 1000;

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public createRoom(name: string, roomMasterId: string): Room {
    const roomId = this.generateRoomId();
    const room = new Room(roomId, name, roomMasterId);
    this.rooms.set(roomId, room);
    console.log(`Room created: ${roomId} by player ${roomMasterId}`);
    return room;
  }

  public getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId.toUpperCase()) || null;
  }

  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  public joinRoom(roomId: string, player: Player): Room {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Cancel cleanup timeout if this was an empty room
    this.cancelCleanup(room.id);

    room.addPlayer(player);
    return room;
  }

  public leaveRoom(roomId: string, playerId: string): Room | null {
    const room = this.getRoom(roomId);
    if (!room) return null;

    room.removePlayer(playerId);
    console.log(`Player ${playerId} left room ${room.id}`);

    // If room is empty, schedule cleanup
    if (room.isEmpty()) {
      this.scheduleCleanup(room.id);
    }

    return room;
  }

  public removeRoom(roomId: string): void {
    const id = roomId.toUpperCase();
    this.rooms.delete(id);
    this.cancelCleanup(id);
    console.log(`Room deleted: ${id}`);
  }

  private scheduleCleanup(roomId: string): void {
    this.cancelCleanup(roomId);
    
    const timeout = setTimeout(() => {
      this.removeRoom(roomId);
    }, this.CLEANUP_DELAY);
    
    this.cleanupTimeouts.set(roomId, timeout);
    console.log(`Scheduled cleanup for empty room: ${roomId}`);
  }

  private cancelCleanup(roomId: string): void {
    const timeout = this.cleanupTimeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.cleanupTimeouts.delete(roomId);
      console.log(`Cancelled cleanup for room: ${roomId}`);
    }
  }

  private generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Generate a unique 4-character code
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    
    return code;
  }

  public getActiveRoomsCount(): number {
    return this.rooms.size;
  }
}
