socket.on('availableOffers', offers => {
    console.log('available offers: ', offers)
    showOffers(offers)
})

socket.on('newOfferAwaiting', newOffer => {
    console.log('new offer: ', newOffer)
    showOffers([newOffer])
})

const showOffers = (offers) => {
    const answerEl = document.querySelector('#answer');
    answerEl.innerHTML = '';
    offers.forEach(offer => {
        const offerEl = document.createElement('div');
        offerEl.innerHTML = `<button class="btn btn-success col-1">Answer ${offer.offerUserName}</button>`
        offerEl.addEventListener('click', () => answerOffer(offer))
        answerEl.appendChild(offerEl);
    })
}


socket.on('answerResponse', answer => {
    console.log('answer response: ', answer)
    addAnswer(answer)
})


socket.on('receivedIceCandidateFromServer', iceCandidate => {
    addNewIceCandidate(iceCandidate)
})