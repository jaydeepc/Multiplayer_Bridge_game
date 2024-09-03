import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Game.css';

const Game = ({ gameData, playerName }) => {
  const [game, setGame] = useState(gameData);
  const [playerIndex, setPlayerIndex] = useState(-1);
  const [selectedBid, setSelectedBid] = useState(null);

  useEffect(() => {
    const playerIndex = gameData.players.indexOf(playerName);
    setPlayerIndex(playerIndex);
    setGame(gameData);

    const pollGameStatus = setInterval(async () => {
      try {
        const response = await axios.get(`/api/games/${gameData.id}`);
        setGame(response.data);
      } catch (error) {
        console.error('Error polling game status:', error);
      }
    }, 1000);

    return () => clearInterval(pollGameStatus);
  }, [gameData, playerName]);

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
    let cards;

    if (isDummy || isCurrentPlayer || game.gamePhase === 'finished') {
      cards = game.playerHands && game.playerHands[index] ? sortCards([...game.playerHands[index]]) : [];
    } else {
      cards = Array(game.playerHands && game.playerHands[index] ? game.playerHands[index].length : 13).fill('back');
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
            
            const actualIndex = game.playerHands[index].indexOf(card);
            
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
      <div className="bidding-box">
        <div className="bidding-grid">
          {levels.map((level) => (
            <React.Fragment key={level}>
              <div className="bid-button level">{level}</div>
              {suits.map((suit) => (
                <button
                  key={`${level}${suit}`}
                  className={`bid-button ${selectedBid === `${level}${suit}` ? 'selected' : ''}`}
                  onClick={() => setSelectedBid(`${level}${suit}`)}
                  disabled={game.currentBid && `${level}${suit}` <= game.currentBid}
                >
                  {suit}
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>
        <div className="bidding-actions">
          <button
            className="action-button pass-button"
            onClick={() => handleBid('Pass')}
          >
            Pass
          </button>
          <button
            className="action-button double-button"
            onClick={() => handleBid('Double')}
            disabled={!game.currentBid || game.doubleStatus !== 'undoubled' || game.currentPlayerIndex % 2 === game.bidHistory.lastIndexOf(game.currentBid) % 2}
          >
            Double
          </button>
          <button
            className="action-button hint-button"
            onClick={() => console.log('Hint functionality not implemented')}
          >
            Hint
          </button>
          <button
            className="action-button bid-button"
            onClick={() => selectedBid && handleBid(selectedBid)}
            disabled={!selectedBid}
          >
            Bid
          </button>
        </div>
      </div>
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
          <p>NS: {game.tricksWon.NS}</p>
          <p>EW: {game.tricksWon.EW}</p>
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
              <p>{tricksNeeded - game.tricksWon[declarerTeam]}</p>
            </div>
          </>
        )}
        {game.gamePhase === 'finished' && (
          <>
            <h2>Game Finished</h2>
            <p>Final Scores:</p>
            <p>NS: {game.scores.NS}</p>
            <p>EW: {game.scores.EW}</p>
          </>
        )}
      </div>
    );
  };

  const renderCurrentTrick = () => {
    if (game.gamePhase !== 'playing' || game.currentTrick.length === 0) return null;

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

  return (
    <div className="game-container">
      <div className="game-table">
        {game.players.map((_, index) => renderPlayerHand(index))}
        {renderBidHistory()}
        {renderBiddingBox()}
        {renderCurrentTrick()}
        {renderGameStatus()}
      </div>
    </div>
  );
};

export default Game;