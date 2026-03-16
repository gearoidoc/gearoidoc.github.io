const SUITS = ['♠', '♦', '♣', '♥'];

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const VALUES = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14
};

let playBtn = null;


function createDeck() {
    const deck = [];
    for (let s = 0; s < SUITS.length; s++) {
        for (let r = 0; r < RANKS.length; r++) {
            
            const card = {
                suit: SUITS[s],
                rank: RANKS[r],
                value: VALUES[RANKS[r]],
                faceDown: false
            };

            deck.push(card);
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }
    return deck;
}

// defining game state
let gameState = {
    deck:[],
    wastePile: [],
    burnedCards: [],

    currentPlayer: 'player',
    phase: 'idle',  // 'idle', 'swap', 'play', 'gameover'

    player: {
        hand: [],
        upcards: [],
        downcards: []
    },

    ai: {
        hand: [],
        upcards: [],
        downcards: []
    },
    lastMessage: ''
};

let swapPhaseState = { selectedHandIndex: null };
let sessionStartTime = null;   // when the current session started
let gameStartTime = null;      // when the current game started
let timerInterval = null;      // reference to the running timer

function startSessionTimer() {
  sessionStartTime = Date.now();

  // Update the display every second
  timerInterval = setInterval(() => {
    renderStatsArea();
  }, 1000);
}

function startGameTimer() {
  gameStartTime = Date.now();
}

// Returns how many seconds have elapsed since the session started
function getSessionSeconds() {
  if (!sessionStartTime) return 0;
  return Math.floor((Date.now() - sessionStartTime) / 1000);
}

// Formats a number of seconds into h:mm:ss or m:ss
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function dealCards() {
  // Create and shuffle a fresh deck
  const freshDeck = shuffleDeck(createDeck());

  // Deal 3 face-down cards to each player
  // These are set face-down and can't be looked at
  gameState.player.downcards = freshDeck.splice(0, 3).map(card => {
    card.faceDown = true;
    return card;
  });

  gameState.ai.downcards = freshDeck.splice(0, 3).map(card => {
    card.faceDown = true;
    return card;
  });

  // Deal 3 face-up cards to each player
  gameState.player.upcards = freshDeck.splice(0, 3);
  gameState.ai.upcards = freshDeck.splice(0, 3);

  // Deal 3 hand cards to each player
  gameState.player.hand = freshDeck.splice(0, 3);
  gameState.ai.hand = freshDeck.splice(0, 3);

  // The rest becomes the draw pile
  gameState.deck = freshDeck;

  // Clear piles from any previous game
  gameState.wastePile = [];
  gameState.burnedCards = [];
}

function determineFirstPlayer() {
  const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

  for (let r = 0; r < rankOrder.length; r++) {
    const targetRank = rankOrder[r];

    const playerHasIt = gameState.player.hand.some(c => c.rank === targetRank) ||
                        gameState.player.upcards.some(c => c.rank === targetRank);

    const aiHasIt = gameState.ai.hand.some(c => c.rank === targetRank) ||
                    gameState.ai.upcards.some(c => c.rank === targetRank);

    if (playerHasIt) return 'player';
    if (aiHasIt) return 'ai';
  }

  // Fallback — shouldn't happen, but just in case
  return 'player';
}

function startGame() {
  dealCards();
  gameState.phase = 'swap';
  gameState.currentPlayer = 'player';
  startGameTimer();
  
  console.log('Game started!');
  console.log('Player hand:', gameState.player.hand);
  console.log('AI hand:', gameState.ai.hand);
  console.log('Draw pile size:', gameState.deck.length);
}

// Returns the current top card of the waste pile, or null if empty
function getTopCard() {
  if (gameState.wastePile.length === 0) return null;
  return gameState.wastePile[gameState.wastePile.length - 1];
}

// Returns true if the last card played was a 7
// (meaning the current player is under the lower-than rule)
function isUnder7Rule() {
  const top = getTopCard();
  if (!top) return false;
  return top.rank === '7';
}

// Returns true if a given rank is a special card
function isSpecialRank(rank) {
  return rank === '2' || rank === '7' || rank === '8' || rank === '10';
}

// Returns true if a single card is legally playable right now
function canPlayCard(card) {
  const top = getTopCard();

  // If the pile is empty, anything can be played
  if (!top) return true;

  // 2 is always playable
  if (card.rank === '2') return true;

  // 8 is always playable
  if (card.rank === '8') return true;

  // 10 is always playable
  if (card.rank === '10') return true;

  // If under the 7 rule, only 7-or-lower or special cards are allowed
  if (isUnder7Rule()) {
    return card.value <= 7 || isSpecialRank(card.rank);
  }

  // 7 can only be played if current top is 7 or lower
  if (card.rank === '7') {
    return top.value <= 7;
  }

  // Normal case: card must be equal to or higher than top card
  // But anything can follow a 2
  if (top.rank === '2') return true;

  return card.value >= top.value;
}

function swapCards(handIndex, upcardIndex) {
  // Only allowed during the swap phase
  if (gameState.phase !== 'swap') return;

  const handCard = gameState.player.hand[handIndex];
  const upcard = gameState.player.upcards[upcardIndex];

  // Swap the two cards
  gameState.player.hand[handIndex] = upcard;
  gameState.player.upcards[upcardIndex] = handCard;

  console.log('Swapped:', handCard.rank, '↔', upcard.rank);
}

function finishSwap() {
  aiSwapCards();
  gameState.phase = 'play';
  gameState.currentPlayer = determineFirstPlayer();
  console.log('Swap done. First player:', gameState.currentPlayer);

  if (gameState.currentPlayer === 'ai') {
    setTimeout(takingAITurn, 750);
  }
}

function playCards(cards, source, who) {
  // cards = array of card objects being played
  // source = 'hand', 'upcards', or 'downcards'
  // who = 'player' or 'ai'
  // Validate — all cards must be the same rank
  const firstRank = cards[0].rank;
  const allSameRank = cards.every(c => c.rank === firstRank);
  if (!allSameRank) {
    console.log('Invalid: all played cards must be the same rank');
    return false;
  }

  // Validate — the card must be legally playable
  if (!canPlayCard(cards[0])) {
    console.log('Invalid: card cannot be played on top of', getTopCard()?.rank);
    return false;
  }

  const playerState = gameState[who];

  // Remove cards from their source
  if (source === 'hand') {
    cards.forEach(card => {
      const index = playerState.hand.indexOf(card);
      playerState.hand.splice(index, 1);
    });
  } else if (source === 'upcards') {
    cards.forEach(card => {
      const index = playerState.upcards.indexOf(card);
      playerState.upcards.splice(index, 1);
    });
  } else if (source === 'downcards') {
    cards.forEach(card => {
      const index = playerState.downcards.indexOf(card);
      playerState.downcards.splice(index, 1);
    });
  }

  // Add cards to the waste pile
  cards.forEach(card => {
    card.faceDown = false;
    gameState.wastePile.push(card);
  });

  console.log('Played:', cards.map(c => c.rank + c.suit).join(', '));

  // Handle special effects
  handleSpecialCards(cards);

  return true;
}

function handleSpecialCards(playedCards) {
  const rank = playedCards[0].rank;
  const count = playedCards.length;

  // Check for 4-of-a-kind on the waste pile
  if (isFourOfAKind()) {
    burnPile();
    if (gameState.currentPlayer === 'ai') setTimeout(takingAITurn, 750);
    return;
  }

  // 10 burns the pile
  if (rank === '10') {
    burnPile();
    if (gameState.currentPlayer === 'ai') setTimeout(takingAITurn, 750);
    return;
  }

  // Two 8s played at once — same player goes again
  if (rank === '8' && count === 2) {
    console.log('Two 8s played — same player goes again!');
    drawBackUpToThree(gameState.currentPlayer);
    if (gameState.currentPlayer === 'ai') setTimeout(takingAITurn, 750);
    return;
  }

  // All other cases — switch to next player
  drawBackUpToThree(gameState.currentPlayer);
  switchTurn();
}

function isFourOfAKind() {
  if (gameState.wastePile.length < 4) return false;

  const topFour = gameState.wastePile.slice(-4);
  const rank = topFour[0].rank;
  return topFour.every(c => c.rank === rank);
}

function burnPile() {
  gameState.burnedCards.push(...gameState.wastePile);
  gameState.wastePile = [];
  console.log('Pile burned!');
  drawBackUpToThree(gameState.currentPlayer);
  // Same player goes again — no turn switch
}

function drawBackUpToThree(who) {
  const playerState = gameState[who];

  // Only draw up during the play phase and only from hand
  // (not when playing from upcards or downcards)
  while (playerState.hand.length < 3 && gameState.deck.length > 0) {
    const drawnCard = gameState.deck.splice(0, 1)[0];
    playerState.hand.push(drawnCard);
    console.log(who, 'drew a card. Hand size:', playerState.hand.length);
  }
}

function pickUpPile(who) {
  if (gameState.wastePile.length === 0) {
    console.log('Nothing to pick up');
    return;
  }

  // Add entire waste pile to the player's hand
  gameState[who].hand.push(...gameState.wastePile);
  gameState.wastePile = [];

  console.log(who, 'picked up the pile. Hand size:', gameState[who].hand.length);

  switchTurn();
}

function switchTurn() {
  // Check for a winner before switching
  if (checkWinCondition()) return;

  gameState.currentPlayer = gameState.currentPlayer === 'player' ? 'ai' : 'player';
  console.log('Now it is', gameState.currentPlayer, "'s turn");

  // If it's the AI's turn, trigger AI logic (we'll build this next phase)
  if (gameState.currentPlayer === 'ai') {
    setTimeout(takingAITurn, 750); // 0.75 second delay so it feels natural
  }
}

function checkWinCondition() {
  for (const who of ['player', 'ai']) {
    const p = gameState[who];
    const outOfCards = p.hand.length === 0 &&
                       p.upcards.length === 0 &&
                       p.downcards.length === 0;

    if (outOfCards && gameState.deck.length === 0) {
      gameState.phase = 'gameover';

      // Record the result
      const stats = loadStats();
      if (who === 'player') {
        stats.wins += 1;
      } else {
        stats.losses += 1;
      }

      // Add the time this game took to the total
      if (gameStartTime) {
        const gameSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
        stats.totalTimePlayed += gameSeconds;
      }

      saveStats(stats);
      console.log(who, 'wins!');
      return true;
    }
  }
  return false;
}

function takingAITurn() {
  if (gameState.phase !== 'play') return;
  if (gameState.currentPlayer !== 'ai') return;

  const decision = chooseAIPlay();

  if (decision === null) {
    gameState.lastMessage = 'Opponent picked up the pile.';
    console.log('AI picks up the pile');
    pickUpPile('ai');
  } else {
    const { cards, source } = decision;
    const cardNames = cards.map(c => c.rank + c.suit).join(', ');
    gameState.lastMessage = `Opponent played ${cardNames}`;
    console.log('AI plays:', cards.map(c => c.rank + c.suit).join(', '));
    const result = playCards(cards, source, 'ai');
    if (!result) {
      pickUpPile('ai');
    }
  }

  render();
}

function createCardElement(card, isPlayable = false) {
  const el = document.createElement('div');
  el.classList.add('card');

  if (card.faceDown) {
    el.classList.add('face-down');
  } else {
    // Add red or black colouring
    const isRed = card.suit === '♥' || card.suit === '♦';
    el.classList.add(isRed ? 'red' : 'black');

    // Display the rank and suit
    el.textContent = card.rank + card.suit;

    // Mark playable cards so the player knows what they can click
    if (isPlayable) {
      el.classList.add('playable');
    }
  }

  // Attach the card data directly to the element
  // This lets us identify which card was clicked later
  el._cardData = card;

  return el;
}

function render() {
  renderPlayerArea();
  renderAIArea();
  renderTableArea();
  renderMessageArea();
  renderStatsArea();
}

function renderPlayerArea() {
  const handEl = document.getElementById('player-hand');
  const upcardsEl = document.getElementById('player-upcards');
  const downcardsEl = document.getElementById('player-downcards');

  handEl.innerHTML = '';
  upcardsEl.innerHTML = '';
  downcardsEl.innerHTML = '';

  const p = gameState.player;
  const isMyTurn = gameState.currentPlayer === 'player' && gameState.phase === 'play';
  const isSwapPhase = gameState.phase === 'swap';

  // Render hand cards
  p.hand.forEach((card, index) => {
    const playable = isMyTurn && canPlayCard(card);
    const el = createCardElement(card, playable);

    // Add selected highlight if card is selected
    if (card._selected) el.classList.add('selected');

    if (isMyTurn) {
      el.addEventListener('click', () => onPlayerCardClick(card, 'hand'));
    }

    if (isSwapPhase) {
      el.style.cursor = 'pointer';
      if (swapPhaseState.selectedHandIndex === index) {
        el.classList.add('selected'); // highlight the chosen hand card
      }
      el.addEventListener('click', () => {
        swapPhaseState.selectedHandIndex = index;
        renderPlayerArea(); // re-render to show highlight
      });
    }

    handEl.appendChild(el);
  });

  // Render upcards
  p.upcards.forEach((card, index) => {
    const canUseUpcards = isMyTurn && p.hand.length === 0;
    const playable = canUseUpcards && canPlayCard(card);
    const el = createCardElement(card, playable);

    if (card._selected) el.classList.add('selected');

    if (canUseUpcards) {
      el.addEventListener('click', () => onPlayerCardClick(card, 'upcards'));
    }

    if (isSwapPhase) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        // Only complete the swap if a hand card was selected first
        if (swapPhaseState.selectedHandIndex !== null) {
          swapCards(swapPhaseState.selectedHandIndex, index);
          swapPhaseState.selectedHandIndex = null;
          render();
        }
      });
    }

    upcardsEl.appendChild(el);
  });

  // Render downcards
  p.downcards.forEach(card => {
    const canUseDowncards = isMyTurn && p.hand.length === 0 && p.upcards.length === 0;
    const el = createCardElement(card, canUseDowncards);
    if (canUseDowncards) {
      el.addEventListener('click', () => onPlayerCardClick(card, 'downcards'));
    }
    downcardsEl.appendChild(el);
  });
}

function renderAIArea() {
  const handEl = document.getElementById('ai-hand');
  const upcardsEl = document.getElementById('ai-upcards');
  const downcardsEl = document.getElementById('ai-downcards');

  handEl.innerHTML = '';
  upcardsEl.innerHTML = '';
  downcardsEl.innerHTML = '';

  const ai = gameState.ai;

  // AI hand is always face-down
  ai.hand.forEach(() => {
    const hiddenCard = { faceDown: true };
    handEl.appendChild(createCardElement(hiddenCard));
  });

  // AI upcards are visible
  ai.upcards.forEach(card => {
    upcardsEl.appendChild(createCardElement(card));
  });

  // AI downcards are face-down
  ai.downcards.forEach(card => {
    const hiddenCard = { ...card, faceDown: true };
    downcardsEl.appendChild(createCardElement(hiddenCard));
  });
}

function renderTableArea() {
  const drawEl = document.getElementById('draw-pile');
  const wasteEl = document.getElementById('waste-pile');

  // Show draw pile count
  drawEl.innerHTML = '';
  if (gameState.deck.length > 0) {
    const topOfDeck = { faceDown: true };
    const deckCard = createCardElement(topOfDeck);
    const countLabel = document.createElement('span');
    countLabel.textContent = gameState.deck.length;
    countLabel.style.cssText = 'position:absolute; bottom:4px; right:6px; font-size:0.7rem; color:white;';
    deckCard.style.position = 'relative';
    deckCard.appendChild(countLabel);
    drawEl.appendChild(deckCard);
  } else {
    drawEl.textContent = 'Empty';
  }

  // Show top of waste pile
  wasteEl.innerHTML = '';
  const topCard = getTopCard();
  if (topCard) {
    wasteEl.appendChild(createCardElement(topCard));
  } else {
    wasteEl.textContent = 'Empty';
  }
}

function renderMessageArea() {
  const msgEl = document.getElementById('message-text');
  const pickupBtn = document.getElementById('pickup-btn');
  const startBtn = document.getElementById('start-btn');

  // Hide both buttons by default
  pickupBtn.style.display = 'none';
  startBtn.style.display = 'none';

  if (gameState.lastMessage) {
  msgEl.textContent = gameState.lastMessage;
  gameState.lastMessage = ''; // Clear after showing once
  }

  if (gameState.phase === 'idle') {
    msgEl.textContent = 'Welcome to Shithead!';
    startBtn.style.display = 'inline-block';
  }

  else if (gameState.phase === 'swap') {
    msgEl.textContent = 'Swap any hand cards with your face-up cards, then click Done.';
    startBtn.textContent = 'Done — Start Game';
    startBtn.style.display = 'inline-block';
  }

  else if (gameState.phase === 'play') {
    if (gameState.currentPlayer === 'player') {
        const p = gameState.player;
        const onDowncards = p.hand.length === 0 && p.upcards.length === 0 && p.downcards.length > 0;

        const hasPlayableCard = p.hand.some(canPlayCard) ||
        (p.hand.length === 0 && p.upcards.some(canPlayCard)) ||
        onDowncards;

        if (onDowncards) {
        msgEl.textContent = 'Click any face-down card to play it blind.';
        } else if (hasPlayableCard) {
        msgEl.textContent = 'Your turn — select a card to play.';
        } else {
        msgEl.textContent = 'No playable cards — pick up the pile!';
        pickupBtn.style.display = 'inline-block';
        }

      if (hasPlayableCard) {
        msgEl.textContent = 'Your turn — select a card to play.';
      } else {
        msgEl.textContent = "No playable cards — pick up the pile!";
        pickupBtn.style.display = 'inline-block';
      }
      // Add this inside the 'play' phase / 'player' block in renderMessageArea:
        const selectedCount = [
        ...gameState.player.hand,
        ...gameState.player.upcards
        ].filter(c => c._selected).length;
      if (selectedCount > 0) {
      playBtn.style.display = 'inline-block';
      playBtn.textContent = `Play ${selectedCount} card${selectedCount > 1 ? 's' : ''}`;
} else {
  playBtn.style.display = 'none';
}
    } else {
      msgEl.textContent = 'Opponent is thinking...';
    }
  }

  else if (gameState.phase === 'gameover') {
    const winner = gameState.currentPlayer === 'player' ? 'You win! 🎉' : 'Opponent wins!';
    msgEl.textContent = winner;
    startBtn.textContent = 'Play Again';
    startBtn.style.display = 'inline-block';
  }
}

// Called when the player clicks one of their cards
function onPlayerCardClick(card, source) {
  if (gameState.phase !== 'play') return;
  if (gameState.currentPlayer !== 'player') return;

  // For downcards, play immediately without selection (flipped blind)
  if (source === 'downcards') {
    const result = playCards([card], source, 'player');
    if (!result) {
      pickUpPile('player');
    }
    render();
    return;
  }

  // For hand and upcards — toggle selection
  if (card._selected) {
    card._selected = false;
  } else {
    card._selected = true;
  }

  render(); // Re-render to show selection highlight
}

// Wire up the buttons once the page loads
document.addEventListener('DOMContentLoaded', () => {
  startSessionTimer();
  const startBtn = document.getElementById('start-btn');
  const pickupBtn = document.getElementById('pickup-btn');
  playBtn = document.getElementById('play-btn');    

  startBtn.addEventListener('click', () => {
    if (gameState.phase === 'idle') {
      startGame();
      render();
    } else if (gameState.phase === 'swap') {
      finishSwap();
      render();
    } else if (gameState.phase === 'gameover') {
      gameState.phase = 'idle';
      render();
    }
  });

  pickupBtn.addEventListener('click', () => {
    if (gameState.currentPlayer === 'player') {
      pickUpPile('player');
      render();
    }
  });

  playBtn.addEventListener('click', () => {
    const isUsingUpcards = gameState.player.hand.length === 0;
    const source = isUsingUpcards ? 'upcards' : 'hand';
    const pool = isUsingUpcards ? gameState.player.upcards : gameState.player.hand;
    const selected = pool.filter(c => c._selected);

    if (selected.length === 0) return;

    const result = playCards(selected, source, 'player');

    if (result) {
    // Clear selections
    gameState.player.hand.forEach(c => c._selected = false);
    gameState.player.upcards.forEach(c => c._selected = false);
    }

  render();
  });
});

render(); // Initial render to show welcome message and start button

function getPlayableCards(who) {
  const p = gameState[who];

  // Determine which zone the AI is currently playing from
  let sourceCards;
  let source;

  if (p.hand.length > 0) {
    sourceCards = p.hand;
    source = 'hand';
  } else if (p.upcards.length > 0) {
    sourceCards = p.upcards;
    source = 'upcards';
  } else {
    sourceCards = p.downcards;
    source = 'downcards';
  }

  // Filter to only legally playable cards
  const playable = sourceCards.filter(card => canPlayCard(card));

  return { playable, source, sourceCards };
}

function groupByRank(cards) {
  const groups = {};

  cards.forEach(card => {
    if (!groups[card.rank]) {
      groups[card.rank] = [];
    }
    groups[card.rank].push(card);
  });

  // Convert to an array of groups, sorted by value (lowest first)
  return Object.values(groups).sort((a, b) => a[0].value - b[0].value);
}

function chooseAIPlay() {
  const { playable, source, sourceCards } = getPlayableCards('ai');

  // If playing from downcards, pick one at random (they're face-down, AI can't see them)
  if (source === 'downcards') {
    const randomIndex = Math.floor(Math.random() * sourceCards.length);
    return { cards: [sourceCards[randomIndex]], source };
  }

  // No playable cards — must pick up
  if (playable.length === 0) {
    return null;
  }

  const groups = groupByRank(playable);

  // Priority 1: Play a 10 to burn the pile
  const tens = groups.find(g => g[0].rank === '10');
  if (tens) return { cards: tens, source };

  // Priority 2: Check if playing completes a 4-of-a-kind on the waste pile
  for (const group of groups) {
    const topFourCount = gameState.wastePile
      .filter(c => c.rank === group[0].rank).length;
    const wouldComplete = topFourCount + group.length >= 4;
    if (wouldComplete) return { cards: group, source };
  }

  // Priority 3: Play a 2 (wild — resets the pile)
  const twos = groups.find(g => g[0].rank === '2');
  if (twos) return { cards: twos, source };

  // Priority 4: Play exactly two 8s if possible (grants extra turn)
  const eights = groups.find(g => g[0].rank === '8');
  if (eights && eights.length >= 2) {
    return { cards: eights.slice(0, 2), source };
  }

  // Priority 5: Play the largest valid set of the lowest rank
  return { cards: groups[0], source };
}

function aiSwapCards() {
  const ai = gameState.ai;

  // For each upcard position, check if the AI has a better card in hand
  for (let i = 0; i < ai.upcards.length; i++) {
    const upcard = ai.upcards[i];

    // Find the highest value hand card that's better than the current upcard
    let bestHandIndex = -1;
    let bestValue = upcard.value;

    for (let j = 0; j < ai.hand.length; j++) {
      const handCard = ai.hand[j];
      if (handCard.value > bestValue || isSpecialRank(handCard.rank)) {
        bestHandIndex = j;
        bestValue = handCard.value;
      }
    }

    // If a better card was found, swap them
    if (bestHandIndex !== -1) {
      const temp = ai.upcards[i];
      ai.upcards[i] = ai.hand[bestHandIndex];
      ai.hand[bestHandIndex] = temp;
    }
  }
}

// Default stats structure
function getDefaultStats() {
  return {
    wins: 0,
    losses: 0,
    totalTimePlayed: 0  // stored in seconds
  };
}

// Load stats from localStorage, or return defaults if none exist
function loadStats() {
  try {
    const saved = localStorage.getItem('shitheadStats');
    return saved ? JSON.parse(saved) : getDefaultStats();
  } catch (e) {
    return getDefaultStats();
  }
}

// Save stats back to localStorage
function saveStats(stats) {
  localStorage.setItem('shitheadStats', JSON.stringify(stats));
}

function renderStatsArea() {
  const stats = loadStats();

  const total = stats.wins + stats.losses;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 100) + '%' : '—';
  const sessionSeconds = getSessionSeconds();

  document.getElementById('stat-wins').textContent = stats.wins;
  document.getElementById('stat-losses').textContent = stats.losses;
  document.getElementById('stat-winrate').textContent = winRate;
  document.getElementById('stat-session').textContent = formatTime(sessionSeconds);
  document.getElementById('stat-total').textContent = formatTime(stats.totalTimePlayed + sessionSeconds);
}