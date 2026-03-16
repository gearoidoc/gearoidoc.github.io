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