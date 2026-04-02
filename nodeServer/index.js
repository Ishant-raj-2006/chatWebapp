const { Socket } = require('socket.io');

// Node server Which will handle socket io connections 
const io = require('socket.io')(8000)
const users ={};
io.on('connection', Socket =>{
    Socket.on('user-joined',name =>{
        
    })
})