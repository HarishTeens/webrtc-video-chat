const https = require('https');
const express = require('express');
const socketio = require('socket.io');
const app = express();
app.use(express.static(__dirname))
const secureApp = https.createServer({
    key: require('fs').readFileSync('cert.key'),
    cert: require('fs').readFileSync('cert.crt')
}, app);

secureApp.listen(5500)

const io = socketio(secureApp);
const offers = []
const connectedObjects = []

io.on("connection", (socket) => {
    const userName = socket.handshake.auth.userName;
    const password = socket.handshake.auth.password;

    if (password !== 'x') {
        socket.disconnect(true);
        return;
    }
    connectedObjects.push({
        userName,
        socketId: socket.id
    })
    console.log('connection');

    // emit offers if already available
    if (offers.length > 0) {
        socket.emit('availableOffers', offers)
    }

    socket.on('offer', (newOfferData) => {
        const newOffer = {
            offerUserName: userName,
            offer: newOfferData,
            offerCandidates: [],
            answerUserName: null,
            answer: null,
            answerCandidates: []
        }
        console.log(newOfferData)
        offers.push(newOffer)

        socket.broadcast.emit('newOfferAwaiting', newOffer)
    })

    socket.on('answer', (answerData, ackFunction) => {
        const { offerUserName, answer } = answerData;
        const offer = offers.find(offer => offer.offerUserName === offerUserName)
        if (!offer) {
            return;
        }
        ackFunction(offer.offerCandidates)
        offer.answerUserName = userName;
        offer.answer = answer;
        const socketToAnswer = connectedObjects.find(obj => obj.userName === offer.offerUserName);
        if (!socketToAnswer) {
            return;
        }
        socket.to(socketToAnswer.socketId).emit('answerResponse', offer)
    })



    socket.on('sendIceCandidate', (iceCandidateOffer) => {
        const { iceCandidate, userName, didIOffer } = iceCandidateOffer;
        if (didIOffer) {
            const offer = offers.find(offer => offer.offerUserName === userName)
            if (!offer) return;
            offer.offerCandidates.push(iceCandidate)
            // push offerer ice candidate to answerer if exist
            if (offer.answerUserName) {
                const socketToAnswer = connectedObjects.find(obj => obj.userName === offer.answerUserName);
                if (!socketToAnswer) {
                    return;
                }
                // socket.to(socketToAnswer.socketId).emit('receivedIceCandidateFromServer', iceCandidate)
            }
        } else {
            const offer = offers.find(offer => offer.answerUserName === userName)
            if (!offer) return;
            offer.answerCandidates.push(iceCandidate)
            // push answerer ice candidate to offerer if exist
            const socketToAnswer = connectedObjects.find(obj => obj.userName === offer.offerUserName);
            if (!socketToAnswer) {
                return;
            }
            socket.to(socketToAnswer.socketId).emit('receivedIceCandidateFromServer', iceCandidate)

        }
    })
    // socket.on('answer', (answer, roomName) => {
    //     socket.to(roomName).broadcast.emit('answer', answer)
    // })
    // socket.on('candidate', (candidate, roomName) => {
    //     socket.to(roomName).broadcast.emit('candidate', candidate)
    // })
    // socket.on('join', (roomName) => {
    //     const room = io.sockets.adapter.rooms.get(roomName) || { size: 0 }
    //     if (room.size === 0) {
    //         socket.join(roomName)
    //         socket.emit('created')
    //     } else if (room.size === 1) {
    //         socket.join(roomName)
    //         socket.emit('joined')
    //     } else {
    //         socket.emit('full')
    //     }
    // })
})
