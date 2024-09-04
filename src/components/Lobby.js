import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const LobbyContainer = styled.div`
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

const LobbyCard = styled.div`
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
  animation: ${fadeIn} 0.5s ease-out;
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

const GameInfo = styled.div`
  margin-top: 30px;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  animation: ${fadeIn} 0.5s ease-out;
`;

const PlayerList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const PlayerItem = styled.li`
  margin: 10px 0;
  font-size: 18px;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ModalContent = styled.div`
  background-color: white;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  color: #333;
  max-width: 80%;
`;

const GameLink = styled(Input)`
  background-color: #f0f0f0;
  color: #333;
  font-weight: bold;
`;

const Lobby = ({ onGameStart }) => {
  const [playerName, setPlayerName] = useState('');
  const [currentGame, setCurrentGame] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
      setShowModal(true);
    } catch (error) {
      console.error('Error creating game:', error);
      alert("Error creating game. Please try again.");
    }
  };

  return (
    <LobbyContainer>
      <LobbyCard>
        <Title>Bridge Card Game Lobby</Title>
        <Input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <Button onClick={createGame}>Create Game</Button>
        {currentGame && (
          <GameInfo>
            <h3>Players:</h3>
            <PlayerList>
              {currentGame.players.map((player, index) => (
                <PlayerItem key={index}>{player}</PlayerItem>
              ))}
            </PlayerList>
            <p>Waiting for {4 - currentGame.players.length} more players...</p>
          </GameInfo>
        )}
      </LobbyCard>
      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h2>Game Created!</h2>
            <p>Share this link with your friends to join:</p>
            <GameLink
              type="text"
              value={`${window.location.origin}/join/${currentGame.id}`}
              readOnly
            />
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </ModalContent>
        </Modal>
      )}
    </LobbyContainer>
  );
};

export default Lobby;