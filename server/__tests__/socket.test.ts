import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

describe('Socket.IO Integration Tests', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;

  beforeEach((done) => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });

    // Setup socket event handlers (simplified version of actual socket.ts)
    const userSockets = new Map<string, Set<string>>();
    const userMeta = new Map<string, any>();

    io.on('connection', (socket: Socket) => {
      const user = socket.data.user as any;
      const userId = user?.id || `guest:${socket.id}`;

      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId)!.add(socket.id);

      if (user && user.email) {
        userMeta.set(userId, { userName: user.email.split('@')[0], email: user.email, role: user.role });
      } else {
        userMeta.set(userId, { userName: `guest_${socket.id.slice(0, 6)}`, email: '', role: 'guest' });
      }

      socket.emit('connect:success', { message: 'Connected to messaging server', userId });

      const currentOnline = Array.from(userMeta.entries()).map(([id, meta]) => ({
        userId: id,
        userName: meta.userName,
        role: meta.role,
        lastSeen: meta.lastSeen || null,
      }));
      socket.emit('online_users', currentOnline);

      socket.on('user_online', (meta: any) => {
        const m = { userName: meta.name || meta.userName || user?.email?.split('@')[0], email: meta.email || user?.email, role: meta.role || user?.role };
        (m as any).lastSeen = Date.now();
        userMeta.set(userId, m);
        io.emit('user_status_changed', { userId, userName: m.userName, status: 'online', role: m.role, lastSeen: (m as any).lastSeen });
        const list = Array.from(userMeta.entries()).map(([id, mm]) => ({
          userId: id,
          userName: mm.userName,
          role: mm.role,
          lastSeen: mm.lastSeen || null,
        }));
        io.emit('online_users', list);
      });

      socket.on('user_typing', (data) => {
        const rid = data && (data.recipientId || data.receiverId);
        if (rid) io.to(`user:${rid}`).emit('user_typing', { senderId: userId, timestamp: Date.now() });
      });

      socket.on('user_stop_typing', (data) => {
        const rid = data && (data.recipientId || data.receiverId);
        if (rid) io.to(`user:${rid}`).emit('user_stop_typing', { senderId: userId, timestamp: Date.now() });
      });

      socket.on('disconnect', () => {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userId);
            const meta = userMeta.get(userId) || { userName: user?.email?.split('@')[0] || 'unknown', role: user?.role || 'guest' };
            (meta as any).lastSeen = Date.now();
            userMeta.set(userId, meta as any);
            io.emit('user_status_changed', { userId, status: 'offline', lastSeen: (meta as any).lastSeen });
            const list = Array.from(userMeta.entries()).map(([id, mm]) => ({
              userId: id,
              userName: mm.userName,
              role: mm.role,
              lastSeen: mm.lastSeen || null,
            }));
            io.emit('online_users', list);
          }
        }
      });
    });

    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocket1 = ioClient(`http://localhost:${port}`, {
        reconnection: true,
      });
      clientSocket2 = ioClient(`http://localhost:${port}`, {
        reconnection: true,
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('user_online', { name: 'User 1', email: 'user1@test.com', role: 'lawyer' });
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('user_online', { name: 'User 2', email: 'user2@test.com', role: 'applicant' });
        done();
      });
    });
  });

  afterEach(() => {
    clientSocket1?.disconnect();
    clientSocket2?.disconnect();
    io.close();
    httpServer.close();
  });

  it('should connect clients and emit online_users event', (done) => {
    clientSocket1.on('online_users', (users: any[]) => {
      expect(users).toHaveLength(2);
      const user1 = users.find((u) => u.userName === 'User 1');
      const user2 = users.find((u) => u.userName === 'User 2');
      expect(user1).toBeDefined();
      expect(user2).toBeDefined();
      expect(user1?.role).toBe('lawyer');
      expect(user2?.role).toBe('applicant');
      expect(user1?.lastSeen).toBeNull();
      expect(user2?.lastSeen).toBeNull();
      done();
    });
  });

  it('should track user typing events with timestamps', (done) => {
    const typingData: any[] = [];

    clientSocket2.on('user_typing', (data) => {
      typingData.push(data);
      expect(data).toHaveProperty('senderId');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('number');
      done();
    });

    setTimeout(() => {
      clientSocket1.emit('user_typing', { recipientId: clientSocket2.id });
    }, 100);
  });

  it('should handle user_stop_typing events', (done) => {
    let receivedTyping = false;
    let receivedStopTyping = false;

    clientSocket2.on('user_typing', () => {
      receivedTyping = true;
    });

    clientSocket2.on('user_stop_typing', (data) => {
      expect(receivedTyping).toBe(true);
      expect(data).toHaveProperty('timestamp');
      receivedStopTyping = true;
      done();
    });

    setTimeout(() => {
      clientSocket1.emit('user_typing', { recipientId: clientSocket2.id });
    }, 50);

    setTimeout(() => {
      clientSocket1.emit('user_stop_typing', { recipientId: clientSocket2.id });
    }, 150);
  });

  it('should handle user_status_changed with lastSeen timestamps', (done) => {
    const statusEvents: any[] = [];

    clientSocket1.on('user_status_changed', (data) => {
      statusEvents.push(data);
      if (statusEvents.length >= 1) {
        const lastEvent = statusEvents[statusEvents.length - 1];
        expect(lastEvent).toHaveProperty('userId');
        expect(lastEvent).toHaveProperty('status');
        expect(lastEvent).toHaveProperty('lastSeen');
        done();
      }
    });

    setTimeout(() => {
      clientSocket2.disconnect();
    }, 100);
  });

  it('should gracefully handle guest connections', (done) => {
    const guestSocket = ioClient(`http://localhost:${(httpServer.address() as any).port}`, {
      reconnection: true,
    });

    guestSocket.on('connect:success', (data) => {
      expect(data).toHaveProperty('userId');
      expect(data.userId.startsWith('guest:')).toBe(true);
      guestSocket.disconnect();
      done();
    });
  });

  it('should emit online_users with all users after status change', (done) => {
    let userListCount = 0;

    clientSocket1.on('online_users', (users: any[]) => {
      userListCount++;
      if (userListCount === 1) {
        // Skip initial list
        return;
      }

      expect(Array.isArray(users)).toBe(true);
      const hasValidUsers = users.every((u) => u.hasOwnProperty('userId') && u.hasOwnProperty('userName') && u.hasOwnProperty('role'));
      expect(hasValidUsers).toBe(true);
      done();
    });

    setTimeout(() => {
      clientSocket2.emit('user_online', { name: 'Updated User 2', email: 'user2@test.com', role: 'lawyer' });
    }, 100);
  });
});
