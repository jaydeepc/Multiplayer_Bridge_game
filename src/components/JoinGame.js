import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

const JoinGameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Arial', sans-serif;
`;

const JoinGameCard = styled.div`
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
`;

const Title = styled.h1`
  font-size: 2.5em;
  margin-bottom: 30px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
`;

const Input = styled.input`
  margin: 10px 0;
  padding: 15px;
  width: 100%;
  border-radius: 25px;
  border: none;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 16px;
  transition: all 0.3s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }

  &:focus {
    outline: none;
    background-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
  }
`;

const Button = styled.button`
  margin: 10px 0;
  padding: 15px 30px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 25px;
  font-size: 18px;
  transition: all 0.3s ease;
  width: 100%;

  &:hover {
    background-color: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
    box-shadow: none;
  }
`;

const JoinGame = ({ onGameStart }) => {
  const [playerName, setPlayerName] = useState('');
  const { gameId } = useParams();
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!playerName) {
      alert("Please enter your name before joining the game.");
      return;
    }
    try {
      const response = await axios.post(`/api/games/${gameId}/join`, { playerName });
      onGameStart(response.data, playerName);
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('Error joining game:', error);
      alert("Error joining game. Please try again.");
    }
  };

  return (
    <JoinGameContainer>
      <JoinGameCard>
        <Title>Join Bridge Game</Title>
        <Input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <Button onClick={handleJoin}>Join Game</Button>
      </JoinGameCard>
    </JoinGameContainer>
  );
};

export default JoinGame;