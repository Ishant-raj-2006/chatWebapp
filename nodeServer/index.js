// Node server Which will handle socket io connections 
const io = require('socket.io')(8000, {
    cors: {
        origin: "*",
    }
});
console.log('Server is running on port 8000...');

const users = {};

io.on('connection', socket => {
    // If any new user joins, let other users connected to the server know!
    socket.on('new-user-joined', name => {
        // console.log('New User', name);
        users[socket.id] = name;
        socket.broadcast.emit('user-joined', name);
    });

    // If someone sends a message, broadcast it to other people
    socket.on('send', message => {
        socket.broadcast.emit('receive', { message: message, name: users[socket.id] });
    });

    // Signaling for Video/Voice Calls
    socket.on('call-user', data => {
        socket.broadcast.emit('incoming-call', {
            from: socket.id,
            name: users[socket.id],
            offer: data.offer,
            type: data.type // 'video' or 'voice'
        });
    });

    socket.on('make-answer', data => {
        socket.to(data.to).emit('call-answered', {
            from: socket.id,
            answer: data.answer
        });
    });

    socket.on('ice-candidate', data => {
        socket.broadcast.emit('ice-candidate', {
            candidate: data.candidate,
            from: socket.id
        });
    });

    // If someone leaves the chat, let others know 
    socket.on('disconnect', message => {
        socket.broadcast.emit('left', users[socket.id]);
        delete users[socket.id];
    });

});