const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// In-memory store for games
const games = new Map();

const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

const createDeck = () => {
  return suits.flatMap(suit => values.map(value => `${value}_of_${suit}`));
};

const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const determineWinningCard = (trick, trumpSuit) => {
  let winningCard = trick[0];
  let leadSuit = winningCard.card.split('_of_')[1];

  for (let i = 1; i < trick.length; i++) {
    let card = trick[i].card;
    let [value, suit] = card.split('_of_');

    if (suit === trumpSuit && winningCard.card.split('_of_')[1] !== trumpSuit) {
      winningCard = trick[i];
    } else if (suit === leadSuit && values.indexOf(value) > values.indexOf(winningCard.card.split('_of_')[0])) {
      winningCard = trick[i];
    }
  }

  return winningCard;
};

const compareContractBids = (bid1, bid2) => {
  if (!bid1) return -1;
  if (!bid2) return 1;
  const [level1, suit1] = bid1.split('');
  const [level2, suit2] = bid2.split('');
  if (level1 !== level2) return parseInt(level1) - parseInt(level2);
  const suitOrder = ['C', 'D', 'H', 'S', 'NT'];
  return suitOrder.indexOf(suit1) - suitOrder.indexOf(suit2);
};

app.post('/api/games', (req, res) => {
  const gameId = Math.random().toString(36).substr(2, 9);
  const newGame = {
    id: gameId,
    creator: req.body.creator,
    players: [req.body.creator],
    playerHands: [],
    gamePhase: 'waiting',
    currentPlayerIndex: 0,
    currentBid: null,
    contract: null,
    trumpSuit: null,
    currentTrick: [],
    passCount: 0,
    bidHistory: [],
    declarer: null,
    dummy: null,
    leader: null,
    scores: { NS: 0, EW: 0 },
    tricksWon: { NS: 0, EW: 0 },
    dealer: Math.floor(Math.random() * 4), // Randomly select the dealer
    doubleStatus: 'undoubled'
  };
  games.set(gameId, newGame);
  res.json(newGame);
});

app.post('/api/games/:id/join', (req, res) => {
  const game = games.get(req.params.id);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  if (game.players.length < 4) {
    game.players.push(req.body.playerName);
    io.to(req.params.id).emit('playerJoined', { players: game.players });
    if (game.players.length === 4) {
      io.to(req.params.id).emit('allPlayersJoined');
    }
    res.json(game);
  } else {
    res.status(400).json({ error: 'Game is full' });
  }
});

app.post('/api/games/:id/start', (req, res) => {
  const game = games.get(req.params.id);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  if (game.players.length !== 4) {
    return res.status(400).json({ error: 'Not enough players to start the game' });
  }
  if (req.body.playerName !== game.creator) {
    return res.status(403).json({ error: 'Only the game creator can start the game' });
  }
  game.gamePhase = 'bidding';
  game.currentPlayerIndex = (game.dealer + 1) % 4; // Start bidding with the player to the left of the dealer
  const deck = shuffleDeck(createDeck());
  game.playerHands = [
    deck.slice(0, 13),
    deck.slice(13, 26),
    deck.slice(26, 39),
    deck.slice(39, 52)
  ];
  io.to(req.params.id).emit('gameStarted', game);
  res.json(game);
});

app.get('/api/games/:id', (req, res) => {
  const game = games.get(req.params.id);
  if (game) {
    res.json(game);
  } else {
    res.status(404).json({ error: 'Game not found' });
  }
});

app.post('/api/games/:id/bid', (req, res) => {
  const game = games.get(req.params.id);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  if (game.gamePhase !== 'bidding') {
    return res.status(400).json({ error: 'Game is not in bidding phase' });
  }
  if (game.players[game.currentPlayerIndex] !== req.body.playerName) {
    return res.status(400).json({ error: 'It\'s not your turn to bid' });
  }
  
  const bid = req.body.bid;
  game.bidHistory.push(bid);

  if (bid === 'Pass') {
    game.passCount++;
  } else if (bid === 'Double') {
    if (game.doubleStatus === 'undoubled' && game.currentBid && game.currentPlayerIndex % 2 !== game.bidHistory.lastIndexOf(game.currentBid) % 2) {
      game.doubleStatus = 'doubled';
      game.passCount = 0;
    } else {
      return res.status(400).json({ error: 'Invalid double' });
    }
  } else if (bid === 'Redouble') {
    if (game.doubleStatus === 'doubled' && game.currentPlayerIndex % 2 === game.bidHistory.lastIndexOf(game.currentBid) % 2) {
      game.doubleStatus = 'redoubled';
      game.passCount = 0;
    } else {
      return res.status(400).json({ error: 'Invalid redouble' });
    }
  } else {
    if (compareContractBids(bid, game.currentBid) > 0) {
      game.currentBid = bid;
      game.doubleStatus = 'undoubled';
      game.passCount = 0;
    } else {
      return res.status(400).json({ error: 'Bid must be higher than current bid' });
    }
  }

  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 4;
  
  if (game.passCount === 3 && game.currentBid) {
    game.gamePhase = 'playing';
    game.contract = `${game.currentBid}${game.doubleStatus !== 'undoubled' ? ' ' + game.doubleStatus : ''}`;
    game.trumpSuit = game.currentBid.slice(-2) === 'NT' ? null : game.currentBid.slice(-1).toLowerCase();
    game.passCount = 0;

    // Determine declarer, dummy, and leader
    const winningBidIndex = game.bidHistory.findIndex(bid => bid === game.currentBid);
    const declarerSide = (game.dealer + winningBidIndex) % 2;
    const lastBidOfSameSuit = game.bidHistory.findLastIndex((bid, index) => 
      index % 2 === declarerSide && bid.slice(-1) === game.currentBid.slice(-1)
    );
    game.declarer = (game.dealer + lastBidOfSameSuit) % 4;
    game.dummy = (game.declarer + 2) % 4;
    game.leader = (game.declarer + 1) % 4;
    game.currentPlayerIndex = game.leader;
  } else if (game.passCount === 4) {
    // All players passed, restart bidding
    game.gamePhase = 'bidding';
    game.currentBid = null;
    game.contract = null;
    game.passCount = 0;
    game.bidHistory = [];
    game.dealer = (game.dealer + 1) % 4; // Move the dealer to the next player
    game.currentPlayerIndex = (game.dealer + 1) % 4; // Start bidding with the player to the left of the new dealer
    game.doubleStatus = 'undoubled';
  }

  io.to(req.params.id).emit('gameUpdated', game);
  res.json(game);
});

app.post('/api/games/:id/play', (req, res) => {
  const game = games.get(req.params.id);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  if (game.gamePhase !== 'playing') {
    return res.status(400).json({ error: 'Game is not in playing phase' });
  }

  const { playerName, cardIndex, card } = req.body;
  const playerIndex = game.players.indexOf(playerName);

  console.log('Player:', playerName, 'Index:', playerIndex);
  console.log('Current Player Index:', game.currentPlayerIndex);
  console.log('Declarer:', game.declarer, 'Dummy:', game.dummy);
  console.log('Received card:', card, 'at index:', cardIndex);

  if (playerIndex !== game.currentPlayerIndex && 
      (playerIndex !== game.declarer || game.currentPlayerIndex !== game.dummy)) {
    return res.status(400).json({ error: 'It\'s not your turn to play' });
  }

  const actualPlayerIndex = (playerIndex === game.declarer && game.currentPlayerIndex === game.dummy) 
    ? game.dummy 
    : playerIndex;

  console.log('Actual Player Index:', actualPlayerIndex);
  console.log('Player Hand:', game.playerHands[actualPlayerIndex]);

  if (game.playerHands[actualPlayerIndex][cardIndex] !== card) {
    console.error('Card mismatch:', game.playerHands[actualPlayerIndex][cardIndex], '!=', card);
    return res.status(400).json({ error: 'Invalid card played' });
  }

  const playedCard = game.playerHands[actualPlayerIndex][cardIndex];
  console.log('Played Card:', playedCard);

  // Remove the played card from the player's hand
  game.playerHands[actualPlayerIndex] = game.playerHands[actualPlayerIndex].filter((_, index) => index !== cardIndex);

  // Add the played card to the current trick
  game.currentTrick.push({ card: playedCard, player: actualPlayerIndex });
  
  console.log('Current Trick:', game.currentTrick);

  if (game.currentTrick.length === 4) {
    const winningCard = determineWinningCard(game.currentTrick, game.trumpSuit);
    const trickWinner = winningCard.player;
    
    // Update trick count
    if (trickWinner % 2 === game.declarer % 2) {
      game.tricksWon[game.declarer % 2 === 0 ? 'NS' : 'EW']++;
    } else {
      game.tricksWon[game.declarer % 2 === 0 ? 'EW' : 'NS']++;
    }
    
    game.currentPlayerIndex = trickWinner;
    game.currentTrick = [];

    // Check if the game has ended
    if (game.playerHands.every(hand => hand.length === 0)) {
      game.gamePhase = 'finished';
      // Implement final scoring here
    }
  } else {
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 4;
  }
  
  console.log('Updated game state:', JSON.stringify(game, null, 2));
  io.to(req.params.id).emit('gameUpdated', game);
  res.json(game);
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('joinGame', (gameId) => {
    socket.join(gameId);
    console.log(`Client joined game: ${gameId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

http.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});