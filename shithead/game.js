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

const testDeck = shuffleDeck(createDeck());
console.log(testDeck);