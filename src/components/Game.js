import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import io from 'socket.io-client';
import './Game.css';

const GameContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Arial', sans-serif;
`;

const GameTable = styled.div`
  width: 95%;
  height: 95%;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const BiddingBox = styled.div`
  background-color: rgba(30, 41, 51, 0.9);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const BidButton = styled.button`
  background-color: ${props => props.selected ? '#2980b9' : '#3d4b5c'};
  border: 1px solid #3d4b5c;
  color: white;
  padding: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: #2c3e50;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionButton = styled(BidButton)`
  padding: 10px 20px;
  margin: 0 5px;
`;

const WaitingRoom = styled.div`
  background-color: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 10px;
  text-align: center;
`;

const Game = ({ gameData, playerName }) => {
  const [game, setGame] = useState(gameData);
  const [playerIndex, setPlayerIndex] = useState(-1);
  const [selectedBid, setSelectedBid] = useState(null);
  const [allPlayersJoined, setAllPlayersJoined] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.emit('joinGame', gameData.id);

    socket.on('playerJoined', (data) => {
      console.log('Player joined:', data);
      setGame(prevGame => ({ ...prevGame, players: data.players }));
    });

    socket.on('allPlayersJoined', () => {
      console.log('All players joined');
      setAllPlayersJoined(true);
    });

    socket.on('gameStarted', (updatedGame) => {
      console.log('Game started:', updatedGame);
      setGame(updatedGame);
    });

    socket.on('gameUpdated', (updatedGame) => {
      console.log('Game updated:', updatedGame);
      setGame(updatedGame);
    });

    return () => socket.close();
  }, [gameData.id]);

  useEffect(() => {
    const playerIndex = gameData.players.indexOf(playerName);
    setPlayerIndex(playerIndex);
    setGame(gameData);
    console.log('Game data updated:', gameData);
    console.log('Current player:', playerName);
    console.log('Game creator:', gameData.creator);
  }, [gameData, playerName]);

  const handleStartGame = async () => {
    try {
      const response = await axios.post(`/api/games/${game.id}/start`, { playerName });
      setGame(response.data);
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const handleBid = async (bid) => {
    try {
      const response = await axios.post(`/api/games/${game.id}/bid`, { playerName, bid });
      setGame(response.data);
      setSelectedBid(null);
    } catch (error) {
      console.error('Error making bid:', error);
    }
  };

  const handleCardPlay = async (card, cardIndex) => {
    try {
      const currentPlayerHand = game.playerHands[game.currentPlayerIndex];
      console.log('Current player hand:', currentPlayerHand);
      console.log('Playing card:', card, 'at index:', cardIndex);
      console.log('Card at index in hand:', currentPlayerHand[cardIndex]);
      
      if (currentPlayerHand[cardIndex] !== card) {
        console.error('Card mismatch:', currentPlayerHand[cardIndex], '!=', card);
        return;
      }

      const response = await axios.post(`/api/games/${game.id}/play`, { playerName, cardIndex, card });
      console.log('Server response:', response.data);
      setGame(response.data);
    } catch (error) {
      console.error('Error playing card:', error);
    }
  };

  const sortCards = (cards) => {
    const suitOrder = ['spades', 'hearts', 'diamonds', 'clubs'];
    const valueOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    
    return cards.sort((a, b) => {
      const [aValue, aSuit] = a.split('_of_');
      const [bValue, bSuit] = b.split('_of_');
      const suitDiff = suitOrder.indexOf(aSuit) - suitOrder.indexOf(bSuit);
      if (suitDiff !== 0) return suitDiff;
      return valueOrder.indexOf(aValue) - valueOrder.indexOf(bValue);
    });
  };

  const canPlayCard = (index, card) => {
    if (game.gamePhase !== 'playing') return false;
    if (game.currentPlayerIndex !== playerIndex && 
        (playerIndex !== game.declarer || game.currentPlayerIndex !== game.dummy)) {
      return false;
    }
    // Add any additional rules for card playing here
    return true;
  };

  const getPlayerPosition = (index) => {
    const positions = ['South', 'West', 'North', 'East'];
    return positions[(index - playerIndex + 4) % 4];
  };

  const renderPlayerHand = (index) => {
    const position = getPlayerPosition(index);
    const isCurrentPlayer = index === playerIndex;
    const isDummy = game.gamePhase === 'playing' && index === game.dummy;
    let cards = [];

    if (game.playerHands && game.playerHands[index]) {
      if (isDummy || isCurrentPlayer || game.gamePhase === 'finished') {
        cards = sortCards([...game.playerHands[index]]);
      } else {
        cards = Array(game.playerHands[index].length).fill('back');
      }
    } else {
      cards = Array(13).fill('back'); // Default to 13 face-down cards if hand is not available
    }

    const renderCards = () => {
      return (
        <div className={isDummy ? "dummy-hand" : "cards-container"}>
          {cards.map((card, cardIndex) => {
            let imagePath;
            try {
              imagePath = require(`../assets/card_images/${card}.png`);
            } catch (error) {
              console.error(`Error loading image for card: ${card}`, error);
              imagePath = require('../assets/card_images/back.png');
            }
            
            const actualIndex = game.playerHands && game.playerHands[index] ? game.playerHands[index].indexOf(card) : cardIndex;
            
            return (
              <img
                key={cardIndex}
                src={imagePath}
                alt={card}
                className={`card ${canPlayCard(index, card) ? 'playable' : ''} ${game.currentPlayerIndex === index ? 'current-turn' : ''}`}
                onClick={() => canPlayCard(index, card) && handleCardPlay(card, actualIndex)}
              />
            );
          })}
        </div>
      );
    };
    
    return (
      <div className={`player-hand ${position.toLowerCase()}-hand`}>
        <div className="player-info">
          <div className="player-name">{game.players[index]}</div>
          <div className="player-position">{position}</div>
        </div>
        {renderCards()}
      </div>
    );
  };

  const renderBiddingBox = () => {
    if (game.gamePhase !== 'bidding' || game.currentPlayerIndex !== playerIndex) return null;

    const suits = ['♣', '♦', '♥', '♠', 'NT'];
    const levels = ['1', '2', '3', '4', '5', '6', '7'];

    return (
      <BiddingBox>
        <div className="bidding-grid">
          {levels.map((level) => (
            <React.Fragment key={level}>
              <BidButton className="level">{level}</BidButton>
              {suits.map((suit) => (
                <BidButton
                  key={`${level}${suit}`}
                  selected={selectedBid === `${level}${suit}`}
                  onClick={() => setSelectedBid(`${level}${suit}`)}
                  disabled={game.currentBid && `${level}${suit}` <= game.currentBid}
                >
                  {suit}
                </BidButton>
              ))}
            </React.Fragment>
          ))}
        </div>
        <div className="bidding-actions">
          <ActionButton
            className="pass-button"
            onClick={() => handleBid('Pass')}
          >
            Pass
          </ActionButton>
          <ActionButton
            className="double-button"
            onClick={() => handleBid('Double')}
            disabled={!game.currentBid || game.doubleStatus !== 'undoubled' || game.currentPlayerIndex % 2 === game.bidHistory.lastIndexOf(game.currentBid) % 2}
          >
            Double
          </ActionButton>
          <ActionButton
            className="hint-button"
            onClick={() => console.log('Hint functionality not implemented')}
          >
            Hint
          </ActionButton>
          <ActionButton
            className="bid-button"
            onClick={() => selectedBid && handleBid(selectedBid)}
            disabled={!selectedBid}
          >
            Bid
          </ActionButton>
        </div>
      </BiddingBox>
    );
  };

  const renderBidHistory = () => {
    return (
      <div className="bid-history">
        <div className="bid-history-header">
          <div>East</div>
          <div>You</div>
          <div>West</div>
          <div>North</div>
        </div>
        <div className="bid-history-content">
          {game.bidHistory && game.bidHistory.map((bid, index) => (
            <div key={index} className="bid-history-item">
              {bid}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGameStatus = () => {
    const tricksNeeded = game.contract ? parseInt(game.contract[0]) + 6 : 0;
    const declarerTeam = game.declarer % 2 === 0 ? 'NS' : 'EW';

    return (
      <div className="game-status">
        <div className="tricks-won">
          <p>Tricks Won:</p>
          <p>NS: {game.tricksWon?.NS || 0}</p>
          <p>EW: {game.tricksWon?.EW || 0}</p>
        </div>
        {game.gamePhase === 'bidding' && (
          <p>Current Bidder: {game.players[game.currentPlayerIndex]}</p>
        )}
        {game.gamePhase === 'playing' && (
          <>
            <p>Contract: {game.contract}</p>
            <p>Declarer: {game.players[game.declarer]} ({getPlayerPosition(game.declarer)})</p>
            <p>Dummy: {game.players[game.dummy]} ({getPlayerPosition(game.dummy)})</p>
            <p>Leader: {game.players[game.leader]} ({getPlayerPosition(game.leader)})</p>
            <p>Current Player: {game.players[game.currentPlayerIndex]} ({getPlayerPosition(game.currentPlayerIndex)})</p>
            <p>Trump Suit: {game.trumpSuit || 'No Trump'}</p>
            <div className="tricks-needed">
              <p>Tricks needed to make the contract:</p>
              <p>{tricksNeeded - (game.tricksWon ? game.tricksWon[declarerTeam] : 0)}</p>
            </div>
          </>
        )}
        {game.gamePhase === 'finished' && (
          <>
            <h2>Game Finished</h2>
            <p>Final Scores:</p>
            <p>NS: {game.scores?.NS || 0}</p>
            <p>EW: {game.scores?.EW || 0}</p>
          </>
        )}
      </div>
    );
  };

  const renderCurrentTrick = () => {
    if (game.gamePhase !== 'playing' || !game.currentTrick || game.currentTrick.length === 0) return null;

    return (
      <div className="current-trick">
        {game.currentTrick.map((play, index) => {
          const position = getPlayerPosition(play.player);
          return (
            <div key={index} className={`trick-card ${position.toLowerCase()}-trick`}>
              <img
                src={require(`../assets/card_images/${play.card}.png`)}
                alt={play.card}
              />
              <div className="player-name">{game.players[play.player]}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWaitingRoom = () => {
    console.log('Rendering waiting room');
    console.log('All players joined:', allPlayersJoined);
    console.log('Player name:', playerName);
    console.log('Game creator:', game.creator);
    return (
      <WaitingRoom>
        <h2>Waiting for players to join...</h2>
        <p>Players joined: {game.players.length} / 4</p>
        {game.players.map((player, index) => (
          <p key={index}>{player}</p>
        ))}
        {allPlayersJoined && playerName === game.creator && (
          <ActionButton onClick={handleStartGame}>Start Game</ActionButton>
        )}
      </WaitingRoom>
    );
  };

  return (
    <GameContainer>
      <GameTable>
        {game.gamePhase === 'waiting' ? (
          renderWaitingRoom()
        ) : (
          <>
            {game.players && game.players.map((_, index) => renderPlayerHand(index))}
            {renderBidHistory()}
            {renderBiddingBox()}
            {renderCurrentTrick()}
            {renderGameStatus()}
          </>
        )}
      </GameTable>
    </GameContainer>
  );
};

export default Game;