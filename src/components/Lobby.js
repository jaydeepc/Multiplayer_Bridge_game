import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const LobbyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #34495e;
  border-radius: 10px;
  color: white;
`;

const Input = styled.input`
  margin: 10px;
  padding: 10px;
  width: 200px;
  border-radius: 5px;
  border: none;
`;

const Button = styled.button`
  margin: 10px;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  font-size: 16px;

  &:hover {
    background-color: #45a049;
  }
`;

const GameInfo = styled.div`
  margin-top: 20px;
  text-align: center;
`;

const Lobby = ({ onGameStart }) => {
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [currentGame, setCurrentGame] = useState(null);

  useEffect(() => {
    const pollGameStatus = setInterval(async () => {
      if (currentGame) {
        try {
          const response = await axios.get(`/api/games/${currentGame.id}`);
          setCurrentGame(response.data);
          if (response.data.players.length === 4) {
            clearInterval(pollGameStatus);
            onGameStart(response.data, playerName);
          }
        } catch (error) {
          console.error('Error polling game status:', error);
        }
      }
    }, 5000);

    return () => clearInterval(pollGameStatus);
  }, [currentGame, onGameStart, playerName]);

  const createGame = async () => {
    if (!playerName) {
      alert("Please enter your name before creating a game.");
      return;
    }
    try {
      const response = await axios.post('/api/games', { creator: playerName });
      setCurrentGame(response.data);
    } catch (error) {
      console.error('Error creating game:', error);
      alert("Error creating game. Please try again.");
    }
  };

  const joinGame = async () => {
    if (!playerName || !gameId) {
      alert("Please enter your name and the game ID before joining.");
      return;
    }
    try {
      const response = await axios.post(`/api/games/${gameId}/join`, { playerName });
      setCurrentGame(response.data);
    } catch (error) {
      console.error('Error joining game:', error);
      alert("Error joining game. Please check the game ID and try again.");
    }
  };

  return (
    <LobbyContainer>
      <h1>Bridge Card Game Lobby</h1>
      <Input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <Button onClick={createGame}>Create Game</Button>
      <Input
        type="text"
        placeholder="Enter game ID"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
      />
      <Button onClick={joinGame}>Join Game</Button>
      {currentGame && (
        <GameInfo>
          <h2>Game ID: {currentGame.id}</h2>
          <h3>Players:</h3>
          <ul>
            {currentGame.players.map((player, index) => (
              <li key={index}>{player}</li>
            ))}
          </ul>
          <p>Waiting for {4 - currentGame.players.length} more players...</p>
        </GameInfo>
      )}
    </LobbyContainer>
  );
};

export default Lobby;