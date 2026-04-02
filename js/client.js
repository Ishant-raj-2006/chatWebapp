const socket = io('http://172.16.138.120:8000');

const form = document.getElementById('send-container')
const messageInput = document.getElementById('messageInp')
const messageContainer = document.querySelector(".container")
var audio = new Audio('chat-sound.mp3');

const append = (message, position) => {
    const messageElement = document.createElement('div');
    messageElement.innerText = message;
    messageElement.classList.add('message');
    messageElement.classList.add(position);
    messageContainer.append(messageElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;
    if(position == 'left'){
        audio.play();
    }
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value;
    if (message.trim()) {
        append(`You: ${message}`, 'right');
        socket.emit('send', message);
        messageInput.value = '';
    }
})

let name = prompt("Enter your name to join");
if (!name) {
    name = 'Guest';
}

socket.emit('new-user-joined', name);

socket.on('user-joined', name => {
    append(`${name} joined the chat`, 'center');
});

// --- Calling Logic ---
const videoOverlay = document.getElementById('videoOverlay');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const voiceCallBtn = document.getElementById('voiceCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const endCallBtn = document.getElementById('endCallBtn');
const muteBtn = document.getElementById('muteBtn');
const cameraBtn = document.getElementById('cameraBtn');

let localStream;
let remoteStream;
let peerConnection;
let isMuted = false;
let isCameraOff = false;

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
};

const startCall = async (type) => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: type === 'video',
            audio: true
        });
        localVideo.srcObject = localStream;
        videoOverlay.classList.remove('hidden');

        peerConnection = new RTCPeerConnection(servers);
        
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { candidate: event.candidate });
            }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('call-user', { offer, type });
        append(`Calling for a ${type} call...`, 'center');
    } catch (err) {
        console.error('Error starting call:', err);
        alert('Could not access camera/microphone');
    }
};

const endCall = () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    videoOverlay.classList.add('hidden');
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    append('Call ended', 'center');
};

videoCallBtn.addEventListener('click', () => startCall('video'));
voiceCallBtn.addEventListener('click', () => startCall('voice'));
endCallBtn.addEventListener('click', endCall);

socket.on('incoming-call', async (data) => {
    const accept = confirm(`Incoming ${data.type} call from ${data.name}. Accept?`);
    if (accept) {
        try {
            videoOverlay.classList.remove('hidden');
            localStream = await navigator.mediaDevices.getUserMedia({
                video: data.type === 'video',
                audio: true
            });
            localVideo.srcObject = localStream;

            peerConnection = new RTCPeerConnection(servers);

            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            peerConnection.ontrack = (event) => {
                remoteVideo.srcObject = event.streams[0];
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', { candidate: event.candidate });
                }
            };

            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.emit('make-answer', { to: data.from, answer });
        } catch (err) {
            console.error('Error accepting call:', err);
        }
    }
});

socket.on('call-answered', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('ice-candidate', async (data) => {
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
            console.error('Error adding ice candidate:', err);
        }
    }
});

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;
    muteBtn.innerHTML = isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
    muteBtn.style.color = isMuted ? '#ef4444' : 'white';
});

cameraBtn.addEventListener('click', () => {
    isCameraOff = !isCameraOff;
    if (localStream.getVideoTracks().length > 0) {
        localStream.getVideoTracks()[0].enabled = !isCameraOff;
    }
    cameraBtn.innerHTML = isCameraOff ? '<i class="fas fa-video-slash"></i>' : '<i class="fas fa-video"></i>';
    cameraBtn.style.color = isCameraOff ? '#ef4444' : 'white';
});

// --- Existing Chat Logic ---
socket.on('receive', data => {
    append(`${data.name}: ${data.message}`, 'left');
});

socket.on('left', name => {
    append(`${name} left the chat`, 'center');
});