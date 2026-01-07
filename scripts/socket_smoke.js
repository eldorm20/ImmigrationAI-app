import { io } from 'socket.io-client';

const BASE = 'https://immigrationai-app-production-b994.up.railway.app';

async function main() {
  console.log('Connecting to', BASE);
  const socket = io(BASE, { transports: ['websocket'], autoConnect: false, reconnectionAttempts: 2 });

  socket.on('connect', () => {
    console.log('connected', socket.id);
    socket.emit('ping', { hello: 'world' });
  });

  socket.on('connect_error', (err) => {
    console.error('connect_error', err.message);
  });

  socket.on('message', (m) => console.log('message', m));
  socket.on('online_users', (u) => console.log('online_users', u));
  socket.on('disconnect', (r) => console.log('disconnect', r));

  socket.connect();

  // Wait 6s then exit
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 6000);
}

main();
