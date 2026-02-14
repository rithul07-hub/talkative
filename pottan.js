// pottan.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'ben.html')));

const users = {};      // socket.id -> name
const userRoom = {};   // socket.id -> room
const rooms = {};      // code -> Set(socket.id)
let activeAdmin = null;

// Helper: broadcast members in a room
function broadcastMembers(room) {
  const s = io.sockets.adapter.rooms.get(room);
  const names = [];
  if (s) {
    for (const sid of s) if (users[sid]) names.push(users[sid]);
  }
  io.to(room).emit('updateMembers', names);
}

io.on('connection', socket => {
  console.log('conn', socket.id);

  // ---------------- JOIN GLOBAL ----------------
  socket.on('joinGlobal', (name) => {
    users[socket.id] = name;
    userRoom[socket.id] = 'global';
    socket.join('global');
    console.log(`${name} joined global`);
    io.to('global').emit('message', { type: 'system', msg: `${name} joined the chat!` });
    broadcastMembers('global');
  });

  // ---------------- CHAT MESSAGE ----------------
  socket.on('chatMessage', ({ room, name, msg, replyTo, id }) => {
    const roomTo = room || userRoom[socket.id] || 'global';

    // ADMIN KEYWORD
    if (roomTo === 'global' && msg.trim().toLowerCase() === '>return(admin)' && activeAdmin === null) {
      activeAdmin = name;
      io.emit('adminAssigned', name);
      socket.emit('message', { type: 'system', msg: 'You are now admin.' });
      return;
    }

    // Use client-provided id if exists
    const msgId = id || Date.now() + Math.random();

    io.to(roomTo).emit('message', {
      type: 'chat',
      name,
      msg,
      replyTo: replyTo || null,
      id: msgId
    });
  });

  // ---------------- DELETE MESSAGE (ADMIN ONLY) ----------------
  socket.on('deleteMessage', ({ room, messageId }) => {
    const userName = users[socket.id];
    if (!userName || userName !== activeAdmin) return; // Only admin can delete

    const r = room || userRoom[socket.id] || 'global';

    // Optional: remove from server-side storage if you track messages
    // rooms[r].messages = rooms[r].messages.filter(m => m.id !== messageId);

    io.to(r).emit('messageDeleted', messageId);
  });

  // ---------------- CREATE ROOM ----------------
  socket.on('createRoom', (name) => {
    const code = (Math.floor(1000 + Math.random() * 9000)).toString();
    rooms[code] = new Set();
    const prev = userRoom[socket.id];
    if (prev) socket.leave(prev);
    socket.join(code);
    rooms[code].add(socket.id);
    userRoom[socket.id] = code;
    console.log(`${name} created room ${code}`);
    socket.emit('roomCreated', code);
    socket.emit('clearChat');
    broadcastMembers(code);
  });

  // ---------------- JOIN ROOM ----------------
  socket.on('joinRoom', ({ name, code }) => {
    if (!rooms[code]) { socket.emit('message', { type: 'system', msg: `Invalid room code: ${code}` }); return; }
    const prev = userRoom[socket.id];
    if (prev) socket.leave(prev);
    socket.join(code);
    rooms[code].add(socket.id);
    userRoom[socket.id] = code;
    io.to(code).emit('message', { type: 'system', msg: `${name} joined the room!` });
    socket.emit('roomJoined', code);
    socket.emit('clearChat');
    broadcastMembers(code);
  });

  // ---------------- LEAVE ROOM ----------------
  socket.on('leaveRoom', ({ name }) => {
    const prev = userRoom[socket.id];
    if (prev && prev !== 'global') {
      socket.leave(prev);
      if (rooms[prev]) rooms[prev].delete(socket.id);
      io.to(prev).emit('message', { type: 'system', msg: `${name} left the room.` });
      broadcastMembers(prev);
    }
    socket.join('global');
    userRoom[socket.id] = 'global';
    io.to('global').emit('message', { type: 'system', msg: `${name} returned to global chat.` });
    broadcastMembers('global');
    socket.emit('clearChat');
  });

  // ---------------- TYPING ----------------
  socket.on('typing', ({ name, room }) => {
    const r = room || userRoom[socket.id] || 'global';
    socket.to(r).emit('displayTyping', name);
  });
  socket.on('stopTyping', ({ name, room }) => {
    const r = room || userRoom[socket.id] || 'global';
    socket.to(r).emit('hideTyping');
  });

  // ---------------- REQUEST ACTIVE USERS ----------------
  socket.on('requestActive', (room) => broadcastMembers(room || userRoom[socket.id] || 'global'));
  socket.on('clearChat', () => socket.emit('clearChat'));

  // ---------------- VOICE MESSAGE ----------------
  socket.on("voiceMessage", ({ room, name, audio, id }) => {
    const r = room || userRoom[socket.id] || "global";
    io.to(r).emit("message", {
      type: "chat",
      name,
      audio,
      id: id || (Date.now() + Math.random())
    });
  });

  // ---------------- DISCONNECT ----------------
  socket.on('disconnect', () => {
    const name = users[socket.id];
    const room = userRoom[socket.id] || 'global';

    if (name && name === activeAdmin) {
      activeAdmin = null;
      io.emit('adminCleared');
    }

    if (name) {
      console.log('disconnect', name);
      io.to(room).emit('message', { type: 'system', msg: `${name} left the chat.` });
      delete users[socket.id];
      delete userRoom[socket.id];
      if (rooms[room]) rooms[room].delete(socket.id);
      broadcastMembers(room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));
