import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import Lobby from './components/Lobby';
import JoinGame from './components/JoinGame';
import Game from './components/Game';

const AppContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #2c3e50;
`;

function GameWrapper({ gameData, playerName, onGameStart }) {
  const { gameId } = useParams();
  const [loading, setLoading] = useState(!gameData);
  const [error, setError] = useState(null);
  const [gameState, setGameState] = useState(gameData);

  useEffect(() => {
    if (!gameData) {
      setLoading(true);
      axios.get(`/api/games/${gameId}`)
        .then(response => {
          setGameState(response.data);
          onGameStart(response.data, playerName);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching game data:', err);
          setError('Failed to load game data. Please try again.');
          setLoading(false);
        });
    }
  }, [gameData, gameId, onGameStart, playerName]);

  if (loading) {
    return <div>Loading game...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return <Game gameData={gameState} playerName={playerName} />;
}

function App() {
  const [gameData, setGameData] = useState(null);
  const [playerName, setPlayerName] = useState('');

  const handleGameStart = (data, name) => {
    setGameData(data);
    setPlayerName(name);
  };

  return (
    <Router>
      <AppContainer>
        <Routes>
          <Route path="/" element={<Lobby onGameStart={handleGameStart} />} />
          <Route path="/join/:gameId" element={<JoinGame onGameStart={handleGameStart} />} />
          <Route 
            path="/game/:gameId" 
            element={<GameWrapper gameData={gameData} playerName={playerName} onGameStart={handleGameStart} />}
          />
        </Routes>
      </AppContainer>
    </Router>
  );
}

export default App;
