const userName = 'user' + Math.floor(Math.random() * 1000);
const password = "x";
let didIOffer = false;
document.querySelector('#user-name').innerHTML = userName;

const socket = io.connect('https://192.168.1.27:5500', {
    auth: {
        userName,
        password
    }
});
const localVideoEl = document.querySelector('#local-video');
const remoteVideoEl = document.querySelector('#remote-video');


let localStream = null;
let remoteStream = null;
let peerConnection = null;

const fetchUserMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    localVideoEl.srcObject = stream;
    localStream = stream;
}
const call = async (e) => {
    await fetchUserMedia();

    await createPeerConnection();

    // creating offer
    try {
        const offer = await peerConnection.createOffer();
        console.log('offer created', offer);
        didIOffer = true;
        peerConnection.setLocalDescription(offer);

        // emit offer
        socket.emit('offer', offer);
    } catch (error) {
        console.error('Error creating offer: ', error);
    }
}

const createPeerConnection = async () => {
    peerConnection = new RTCPeerConnection(peerConfiguration);
    remoteStream = new MediaStream();
    remoteVideoEl.srcObject = remoteStream;

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Fetching ICE candidates
    peerConnection.addEventListener('icecandidate', (e) => {
        if (e.candidate) {
            console.log('ice candidate', e.candidate);
            socket.emit('sendIceCandidate', {
                iceCandidate: e.candidate,
                userName: userName,
                didIOffer
            });
        }
    })

    // signalling state change
    peerConnection.addEventListener('signalingstatechange', () => {
        console.log('signalling state change: ', peerConnection.signalingState);
    })

    // track event
    peerConnection.addEventListener('track', (e) => {
        console.log('track event: ', e);
        e.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        })
    })
}

const answerOffer = async (offer) => {
    console.log('answer offer', offer);
    await fetchUserMedia();
    await createPeerConnection();

    try {
        // set remote description
        peerConnection.setRemoteDescription(offer.offer);
        // create answer
        const answer = await peerConnection.createAnswer(offer);
        // set local description
        peerConnection.setLocalDescription(answer);
        // emit answer
        const offerIceCandidates = await socket.emitWithAck('answer', {
            answer,
            offerUserName: offer.offerUserName
        });
        if (offerIceCandidates && offerIceCandidates.length > 0) {
            offerIceCandidates.forEach(iceCandidate => {
                peerConnection.addIceCandidate(iceCandidate);
                console.log("===ice candidate added===");
            })
        }
    } catch (error) {
        console.error('Error answering offer: ', error);
    }
}

const addAnswer = async (offerObj) => {
    console.log('add answer', offerObj);
    await peerConnection.setRemoteDescription(offerObj.answer);
}

const addNewIceCandidate = async (iceCandidate) => {
    console.log("===ice candidate added===");
    await peerConnection.addIceCandidate(iceCandidate);
}


document.querySelector('#call').addEventListener('click', call);