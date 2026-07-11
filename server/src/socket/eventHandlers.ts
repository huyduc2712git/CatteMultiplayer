import { Socket } from 'socket.io';
import { SocketManager } from '../managers/SocketManager';
import { RoomManager } from '../managers/RoomManager';
import { Player } from '../core/Player';

// Module-level maps to track active socket connections and disconnect timeouts
const activePlayerSockets = new Map<string, string>();
const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

export function handleSocketEvents(socket: Socket, sm: SocketManager): void {
  const rm = RoomManager.getInstance();

  // Retrieve persistent playerId from handshake auth payload, default to socket.id
  const playerId = socket.handshake.auth.playerId || socket.id;

  // Make the socket join its own playerId room so sm.sendToPlayer can send direct messages to it
  socket.join(playerId);

  // Register this socket as the active connection for the player
  activePlayerSockets.set(playerId, socket.id);
  console.log(`Socket associated: ${socket.id} -> Player: ${playerId} (Active)`);

  // If this player was recently disconnected, clear the removal timeout
  const existingTimeout = disconnectTimeouts.get(playerId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    disconnectTimeouts.delete(playerId);
    console.log(`Player ${playerId} reconnected within grace period. Cancelled removal.`);

    const roomId = sm.getPlayerRoomId(playerId);
    if (roomId) {
      socket.join(roomId);
      // Notify other players they returned
      socket.to(roomId).emit('player-reconnected', { playerId });
      sm.broadcastRoomUpdate(roomId);
    }
  }

  // Create room handler
  socket.on('create-room', ({ playerName, roomName }: { playerName: string; roomName: string }) => {
    try {
      if (!playerName || !roomName) {
        socket.emit('error', 'Player name and room name are required');
        return;
      }

      // Create new room and player
      const room = rm.createRoom(roomName, playerId);
      const player = new Player(playerId, playerName);
      
      room.addPlayer(player);
      socket.join(room.id);
      sm.setPlayerRoom(playerId, room.id);

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

      const player = new Player(playerId, playerName);
      rm.joinRoom(roomId, player);
      
      socket.join(room.id);
      sm.setPlayerRoom(playerId, room.id);

      sm.broadcastRoomUpdate(room.id);
      
      // Notify other players
      socket.to(room.id).emit('player-joined', { playerId, playerName });
    } catch (e: any) {
      socket.emit('error', e.message || 'Failed to join room');
    }
  });

  // Leave room handler
  socket.on('leave-room', () => {
    handlePlayerLeaving(playerId);
  });

  // Player ready handler
  socket.on('ready', () => {
    try {
      const roomId = sm.getPlayerRoomId(playerId);
      if (!roomId) return;

      const room = rm.getRoom(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
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
      const roomId = sm.getPlayerRoomId(playerId);
      if (!roomId) return;

      const room = rm.getRoom(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
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
      const roomId = sm.getPlayerRoomId(playerId);
      if (!roomId) return;

      const room = rm.getRoom(roomId);
      if (!room) return;

      if (room.roomMasterId !== playerId) {
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
      const roomId = sm.getPlayerRoomId(playerId);
      if (!roomId) return;

      const room = rm.getRoom(roomId);
      if (!room || !room.gameEngine) return;

      const game = room.gameEngine;
      const turnIndex = game.currentRoundIndex - 1;
      
      // Play the card
      game.playCard(playerId, cardId, isFaceUp);
      
      // Broadcast action to all clients (hiding card details if played face down)
      const currentRound = game.rounds[turnIndex];
      const latestPlay = currentRound.plays[currentRound.plays.length - 1];
      
      sm.broadcastToRoom(room.id, 'card-played', {
        playerId,
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
      const roomId = sm.getPlayerRoomId(playerId);
      if (!roomId) return;

      const room = rm.getRoom(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (!player) return;

      const chatMsg = {
        playerId,
        playerName: player.name,
        message,
        timestamp: Date.now()
      };

      sm.broadcastToRoom(room.id, 'chat-message', chatMsg);
    } catch (e: any) {
      socket.emit('error', 'Failed to send chat message');
    }
  });

  // Disconnect handler with 15-second grace period and race-condition checks
  socket.on('disconnect', () => {
    // Only schedule cleanup if the disconnecting socket is the one currently registered as active!
    const currentActiveSocketId = activePlayerSockets.get(playerId);
    if (currentActiveSocketId === socket.id) {
      console.log(`Socket disconnected: ${socket.id} (Player: ${playerId}). Scheduling cleanup...`);
      
      // Set a timeout to clean up player from the room after 15 seconds
      const timeout = setTimeout(() => {
        disconnectTimeouts.delete(playerId);
        activePlayerSockets.delete(playerId);
        console.log(`Player ${playerId} grace period expired. Removing from room.`);
        handlePlayerLeaving(playerId);
      }, 15000);

      disconnectTimeouts.set(playerId, timeout);
    } else {
      console.log(`Ignored disconnect for stale socket: ${socket.id} (Player: ${playerId})`);
    }
  });

  // Shared function to handle player leaving/disconnecting
  function handlePlayerLeaving(playerIdToLeave: string): void {
    const roomId = sm.getPlayerRoomId(playerIdToLeave);
    if (!roomId) return;

    try {
      const room = rm.getRoom(roomId);
      if (!room) return;

      // Remove player
      rm.leaveRoom(roomId, playerIdToLeave);
      sm.removePlayerRoom(playerIdToLeave);

      // Notify others
      sm.broadcastToRoom(roomId, 'player-left', { playerId: playerIdToLeave });

      // If room still exists, update state
      if (rm.getRoom(roomId)) {
        sm.broadcastRoomUpdate(roomId);
      }
    } catch (e: any) {
      console.error(`Error in handlePlayerLeaving for player ${playerIdToLeave}:`, e);
    }
  }
}
