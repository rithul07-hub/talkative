# ChatApp
================

A simple, open group chat web service built using Node.js and a plain HTML, CSS, and JS frontend.

## Table of Contents
-----------------

* [Overview](#overview)
* [Features](#features)
* [Getting Started](#getting-started)
* [Installation](#installation)
* [API Documentation](#api-documentation)
* [Frontend](#frontend)
* [Backend](#backend)
* [Contributing](#contributing)
* [License](#license)

## Overview
------------

ChatApp is a web service that allows users to join a single, public group chat. The application is built using Node.js on the backend and a simple HTML, CSS, and JS frontend.

## Features
------------

* **Public Group Chat**: Anyone can join the chat and participate in the conversation.
* **Real-time Messaging**: Messages are sent and received in real-time, allowing for a seamless conversation.
* **No Registration Required**: Users do not need to create an account to join the chat.
* **Plain HTML, CSS, and JS Frontend**: A simple and lightweight frontend that works on most devices.

## Getting Started
-----------------

To get started with ChatApp, follow these steps:

1. Install Node.js and npm on your machine if you haven't already.
2. Clone this repository using the command `git clone https://github.com/your-repo/chatapp.git`.
3. Navigate to the project directory using the command `cd chatapp`.
4. Install the required dependencies using the command `npm install`.
5. Start the server using the command `npm start`.
6. Open a web browser and navigate to `http://localhost:3000` to join the chat.

## Installation
---------------

To install the dependencies, run the following command:
```bash
npm install
```
This will install the required dependencies, including Express.js and Socket.IO.

## API Documentation
-------------------

The ChatApp API consists of a single endpoint:

* **`/chat`**: This endpoint handles WebSocket connections and allows users to join the chat.
* **`/send`**: This endpoint handles sending messages to the chat.

## Frontend
------------

The frontend is built using plain HTML, CSS, and JS. The chat interface is displayed in an `<iframe>` element, and messages are sent and received using WebSocket connections.

### index.html
```html
<!DOCTYPE html>
<html>
<head>
  <title>ChatApp</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>ChatApp</h1>
  <div id="chat-container">
    <iframe id="chat-iframe" src="chat.html" frameborder="0" width="100%" height="500"></iframe>
  </div>
  <script src="script.js"></script>
</body>
</html>
```

### chat.html
```html
<!DOCTYPE html>
<html>
<head>
  <title>Chat</title>
  <link rel="stylesheet" href="chat.css">
</head>
<body>
  <h1>Chat</h1>
  <div id="chat-log">
    <!-- chat log goes here -->
  </div>
  <form id="send-form">
    <input type="text" id="message-input" placeholder="Type a message...">
    <button id="send-button">Send</button>
  </form>
  <script src="chat.js"></script>
</body>
</html>
```

### script.js
```javascript
const socket = io();

// send message to server
document.getElementById('send-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const messageInput = document.getElementById('message-input');
  const message = messageInput.value;
  socket.emit('send', message);
  messageInput.value = '';
});
```

## Backend
------------

The backend is built using Node.js and Express.js. It handles WebSocket connections and sends and receives messages to and from the chat.

### server.js
```javascript
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// handle socket connections
io.on('connection', (socket) => {
  console.log('new connection');

  // send message to all connected clients
  socket.on('send', (message) => {
    io.emit('message', message);
  });
});

// start server
http.listen(3000, () => {
  console.log('server started on port 3000');
});
```

## Contributing
------------

Contributions are welcome! To contribute to ChatApp, please follow these steps:

1. Fork the repository on GitHub.
2. Make your changes and commit them.
3. Create a pull request on the main repository.

## License
-------

ChatApp is licensed under the MIT License. See [LICENSE](LICENSE) for more information.
