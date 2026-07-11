import { Socket } from 'socket.io';
import { SocketManager } from '../managers/SocketManager';
import { RoomManager } from '../managers/RoomManager';
import { Player } from '../core/Player';

export function handleSocketEvents(socket: Socket, sm: SocketManager): void {
  const rm = RoomManager.getInstance();

  // Create room handler
  socket.on('create-room', ({ playerName, roomName }: { playerName: string; roomName: string }) => {
    try {
      if (!playerName || !roomName) {
        socket.emit('error', 'Player name and room name are required');
        return;
      }

      // Create new room and player
      const room = rm.createRoom(roomName, socket.id);
      const player = new Player(socket.id, playerName);
      
      room.addPlayer(player);
      socket.join(room.id);
      sm.setPlayerRoom(socket.id, room.id);

      socket.emit('room-created', room.id);
      sm.broadcastRoomUpdate(room.id);
    } catch (e: any) {
      socket.emit('error', e.message || 'Failed to create room');
    }
  });

  // Join room handler
  socket.on('join-room', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    try {
      if (!roomId || !playerName) {
        socket.emit('error', 'Room ID and player name are required');
        return;
      }

      const room = rm.getRoom(roomId);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      if (room.gameEngine && room.gameEngine.status !== 'WAITING' && room.gameEngine.status !== 'RESULT') {
        socket.emit('error', 'Game is already in progress');
        return;
      }

      const player = new Player(socket.id, playerName);
      rm.joinRoom(roomId, player);
      
      socket.join(room.id);
      sm.setPlayerRoom(socket.id, room.id);

      sm.broadcastRoomUpdate(room.id);
      
      // Notify other players
      socket.to(room.id).emit('player-joined', { playerId: socket.id, playerName });
    } catch (e: any) {
      socket.emit('error', e.message || 'Failed to join room');
    }
  });

  // Leave room handler
  socket.on('leave-room', () => {
    handlePlayerLeaving();
  });

  // Player ready handler
  socket.on('ready', () => {
    try {
      const roomId = sm.getPlayerRoomId(socket.id);
      if (!roomId) return;

      const room = rm.getRoom(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.isReady = true;
        player.status = 'READY';
        sm.broadcastRoomUpdate(room.id);
      }
    } catch (e: any) {
      socket.emit('error', e.message || 'Failed to set ready');
    }
  });

  // Player unready handler
  socket.on('unready', () => {
    try {
      const roomId = sm.getPlayerRoomId(socket.id);
      if (!roomId) return;

      const room = rm.getRoom(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.isReady = false;
        player.status = 'WAITING';
        sm.broadcastRoomUpdate(room.id);
      }
    } catch (e: any) {
      socket.emit('error', e.message || 'Failed to set unready');
    }
  });

  // Start game handler
  socket.on('start-game', () => {
    try {
      const roomId = sm.getPlayerRoomId(socket.id);
      if (!roomId) return;

      const room = rm.getRoom(roomId);
      if (!room) return;

      if (room.roomMasterId !== socket.id) {
        socket.emit('error', 'Only the room master can start the game');
        return;
      }

      room.startGame();
      
      // Notify all players that game started
      sm.broadcastToRoom(room.id, 'game-started', {
        dealerId: room.gameEngine!.dealerId
      });

      sm.broadcastRoomUpdate(room.id);
    } catch (e: any) {
      socket.emit('error', e.message || 'Failed to start game');
    }
  });

  // Play card handler
  socket.on('play-card', ({ cardId, isFaceUp }: { cardId: string; isFaceUp: boolean }) => {
    try {
      const roomId = sm.getPlayerRoomId(socket.id);
      if (!roomId) return;

      const room = rm.getRoom(roomId);
      if (!room || !room.gameEngine) return;

      const game = room.gameEngine;
      const turnIndex = game.currentRoundIndex - 1;
      
      // Play the card
      game.playCard(socket.id, cardId, isFaceUp);
      
      // Broadcast action to all clients (hiding card details if played face down)
      const currentRound = game.rounds[turnIndex];
      const latestPlay = currentRound.plays[currentRound.plays.length - 1];
      
      sm.broadcastToRoom(room.id, 'card-played', {
        playerId: socket.id,
        playerName: latestPlay.playerName,
        card: latestPlay.isFaceUp ? latestPlay.card.toJSON() : null,
        isFaceUp: latestPlay.isFaceUp
      });

      // Update room state
      sm.broadcastRoomUpdate(room.id);
    } catch (e: any) {
      socket.emit('error', e.message || 'Failed to play card');
    }
  });

  // Chat handler
  socket.on('chat', (message: string) => {
    try {
      const roomId = sm.getPlayerRoomId(socket.id);
      if (!roomId) return;

      const room = rm.getRoom(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      const chatMsg = {
        playerId: socket.id,
        playerName: player.name,
        message,
        timestamp: Date.now()
      };

      sm.broadcastToRoom(room.id, 'chat-message', chatMsg);
    } catch (e: any) {
      socket.emit('error', 'Failed to send chat message');
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    handlePlayerLeaving();
  });

  // Shared function to handle player leaving/disconnecting
  function handlePlayerLeaving(): void {
    const roomId = sm.getPlayerRoomId(socket.id);
    if (!roomId) return;

    try {
      const room = rm.getRoom(roomId);
      if (!room) return;

      // Remove player
      rm.leaveRoom(roomId, socket.id);
      sm.removePlayerRoom(socket.id);
      socket.leave(roomId);

      // Notify others
      socket.to(roomId).emit('player-left', { playerId: socket.id });

      // If room still exists, update state
      if (rm.getRoom(roomId)) {
        sm.broadcastRoomUpdate(roomId);
      }
    } catch (e: any) {
      console.error(`Error in handlePlayerLeaving for socket ${socket.id}:`, e);
    }
  }
}
