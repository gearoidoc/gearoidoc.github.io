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

function createDeck() {
    const deck = [];
    for (let s = 0; s < SUITS.length; s++) {
        for (let r = 0; r < RANKS.length; r++) {
            
            const card = {
                suit: SUITS[s],
                rank: RANKS[r],
                value: VALUES[RANKS[r]],
                facedown: false
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

function isSpecialCard(rank) {
  return rank === '2' || rank === '10' || rank === '7';
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
    }
};

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
  gameState.phase = 'play';
  gameState.currentPlayer = determineFirstPlayer();
  console.log('Swap done. First player:', gameState.currentPlayer);
}

function playCards(cards, source) {
  // cards = array of card objects being played
  // source = 'hand', 'upcards', or 'downcards'

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

  // Remove cards from their source
  if (source === 'hand') {
    cards.forEach(card => {
      const index = gameState.player.hand.indexOf(card);
      gameState.player.hand.splice(index, 1);
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
    return; // Same player goes again — don't switch turns
  }

  // 10 burns the pile
  if (rank === '10') {
    burnPile();
    return; // Same player goes again
  }

  // Two 8s played at once — same player goes again
  if (rank === '8' && count === 2) {
    console.log('Two 8s played — same player goes again!');
    drawBackUpToThree(gameState.currentPlayer);
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
      console.log(who, 'wins!');
      return true;
    }
  }
  return false;
}

function takingAITurn() {
  console.log('AI is thinking...');
}

startGame();
finishSwap();
console.log('Can player play first hand card?', canPlayCard(gameState.player.hand[0]));
console.log('Top card:', getTopCard());