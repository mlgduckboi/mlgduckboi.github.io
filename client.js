// client.js

const socket = io('http://localhost:3000');

// DOM Elements
const homePage = document.getElementById('home-page');
const createRoomPage = document.getElementById('create-room-page');
const joinRoomPage = document.getElementById('join-room-page');
const inRoomPage = document.getElementById('in-room-page');
const gamePage = document.getElementById('game-page');

const usernameInput = document.getElementById('username-input');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const startGameBtn = document.getElementById('start-game-btn');
const joinRoomSubmitBtn = document.getElementById('join-room-submit-btn');

const roomIdSpan = document.getElementById('room-id');
const roomIdSpan2 = document.getElementById('room-id2');
const roomIdInput = document.getElementById('room-id-input');
const joinRoomError = document.createElement('p');
joinRoomError.className = 'text-red-500 font-bold mt-4';

const createRoomPlayers = document.getElementById('create-room-players');
const joinRoomPlayers = document.getElementById('join-room-players');

const promptDisplay = document.createElement('h2');
promptDisplay.className = 'text-2xl mb-4';
const wordBankDisplay = document.createElement('ul');
wordBankDisplay.className = 'button-grid';
const responseInput = document.createElement('textarea');
responseInput.className = 'text-black p-2 rounded w-full';
const submitResponseBtn = document.createElement('button');
submitResponseBtn.className = 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4';
submitResponseBtn.textContent = 'Submit Response';
const responseList = document.createElement('div'); // Container for response buttons

// State variables
let currentRoomId = ''; // Ensure this is updated for all players
let playerName = '';
let currentWordBank = [];
let currentResponses = [];

// Navigate to Create Room Page
createRoomBtn.addEventListener('click', () => {
    playerName = usernameInput.value.trim();
    if (playerName) {
        socket.emit('createRoom', playerName);
    } else {
        alert('Please enter your name.');
    }
});

// Navigate to Join Room Page
joinRoomBtn.addEventListener('click', () => {
    playerName = usernameInput.value.trim();
    if (playerName) {
        homePage.classList.add('hidden');
        joinRoomPage.classList.remove('hidden');
    } else {
        alert('Please enter your name.');
    }
});

// Submit Join Room
joinRoomSubmitBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim().toUpperCase();
    if (roomId) {
        currentRoomId = roomId; // Save the room ID for future use
        socket.emit('joinRoom', { roomId, playerName });
        roomIdSpan2.textContent = roomId;
        joinRoomPage.classList.add('hidden');
        inRoomPage.classList.remove('hidden');
    } else {
        alert('Please enter a valid Room ID.');
    }
});

// Start Game
startGameBtn.addEventListener('click', () => {
    socket.emit('startGame', currentRoomId);
});

// Submit response
submitResponseBtn.addEventListener('click', () => {
    const response = responseInput.value.trim();
    const responseWords = response.split(' ').filter(Boolean); // Split response into words

    // Check if each word is in the word bank and used only once
    const wordBankCopy = currentWordBank.slice();
    const isValid = responseWords.every(word => {
        const wordIndex = wordBankCopy.indexOf(word);
        if (wordIndex !== -1) {
            wordBankCopy.splice(wordIndex, 1); // Remove word from copy to prevent reuse
            return true;
        }
        return false;
    });

    if (isValid) {
        socket.emit('submitResponse', { roomId: currentRoomId, response });
        responseInput.value = '';

        // Show "Waiting for other players' responses..." screen
        gamePage.innerHTML = '';
        const waitingMessage = document.createElement('h2');
        waitingMessage.className = 'text-2xl';
        waitingMessage.textContent = "Waiting for other players' responses...";
        gamePage.appendChild(waitingMessage);
    } else {
        alert('Your response contains invalid or duplicate words.');
    }
});

// Handle vote selection directly via button
function handleVote(votedPlayerId) {
    socket.emit('submitVote', { roomId: currentRoomId, votedPlayerId });

    // Show "Waiting for other players' votes..." screen
    gamePage.innerHTML = '';
    const waitingMessage = document.createElement('h2');
    waitingMessage.className = 'text-2xl';
    waitingMessage.textContent = "Waiting for other players' votes...";
    gamePage.appendChild(waitingMessage);
}

// Socket Events
socket.on('roomCreated', (roomId) => {
    currentRoomId = roomId; // Save the room ID for future use
    roomIdSpan.textContent = roomId;
    homePage.classList.add('hidden');
    createRoomPage.classList.remove('hidden');
});

socket.on('playerJoined', (players) => {
    updatePlayerList(createRoomPlayers, players);
    updatePlayerList(joinRoomPlayers, players);
});

socket.on('startRound', ({ prompt, wordBank }) => {
    gamePage.innerHTML = '';
    inRoomPage.classList.add('hidden');
    gamePage.appendChild(promptDisplay);
    gamePage.appendChild(wordBankDisplay);
    gamePage.appendChild(responseInput);
    gamePage.appendChild(submitResponseBtn);
    promptDisplay.textContent = `Prompt: ${prompt}`;
    currentWordBank = wordBank.slice(); // Copy the word bank for validation

    gamePage.classList.remove('hidden'); // Ensure the game page is visible
    promptDisplay.textContent = `Prompt: ${prompt}`;
    currentWordBank = structuredClone(wordBank); // Copy the word bank for validation

    // Display word bank as buttons
    wordBankDisplay.innerHTML = ''; // Clear any previous buttons
    currentWordBank.forEach(word => {
        const wordButton = document.createElement('button');
        wordButton.className = 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4';
        wordButton.textContent = word;
        wordButton.addEventListener('click', () => {
            responseInput.value += word + ' ';
            wordButton.disabled = true; // Disable button after word is used
        });
        wordBankDisplay.appendChild(wordButton);
    });

    createRoomPage.classList.add('hidden');
    joinRoomPage.classList.add('hidden');
    gamePage.classList.remove('hidden');
});

socket.on('showResponses', (responses) => {
    gamePage.innerHTML = '';
    responseList.innerHTML = '';

    currentResponses = responses;
    currentResponses.forEach((resp) => {
        const responseButton = document.createElement('button');
        responseButton.className = 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4 block';
        responseButton.textContent = resp.response;
        responseButton.addEventListener('click', () => handleVote(resp.id));
        responseList.appendChild(responseButton);
    });

    gamePage.appendChild(responseList);
});

socket.on('showWinner', (winner) => {
    gamePage.innerHTML = '';
    const winnerDisplay = document.createElement('h2');
    winnerDisplay.className = 'text-2xl';
    winnerDisplay.textContent = `Winner: ${winner.name} with "${winner.response}"`;
    gamePage.appendChild(winnerDisplay);
});

socket.on('gameOver', (players) => {
    gamePage.innerHTML = '';
    const gameOverMessage = document.createElement('h2');
    gameOverMessage.className = 'text-2xl';
    gameOverMessage.textContent = 'Game Over! Thanks for playing!';
    gamePage.appendChild(gameOverMessage);
});

// Handle Room Not Found Error
socket.on('error', (message) => {
    joinRoomError.textContent = message;
    joinRoomPage.appendChild(joinRoomError);
});

// Update Player List
function updatePlayerList(listElement, players) {
    listElement.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        listElement.appendChild(li);
    });
}
