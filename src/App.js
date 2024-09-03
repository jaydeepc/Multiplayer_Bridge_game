import React, { useState } from 'react';
import styled from 'styled-components';
import Lobby from './components/Lobby';
import Game from './components/Game';

const AppContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #2c3e50;
`;

function App() {
  const [gameData, setGameData] = useState(null);
  const [playerName, setPlayerName] = useState('');

  const handleGameStart = (data, name) => {
    setGameData(data);
    setPlayerName(name);
  };

  return (
    <AppContainer>
      {gameData ? (
        <Game gameData={gameData} playerName={playerName} />
      ) : (
        <Lobby onGameStart={handleGameStart} />
      )}
    </AppContainer>
  );
}

export default App;
