import React, { useState } from 'react';
import './App.css';
import ChartManager from './components/Chart/ChartManager.tsx';
import ControlPanel from './components/ControlPanel/ControlPanel.tsx';

function App() {
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const handleChartUpdate = (marketType: string, symbol: string, timeframe: string) => {
    console.log(`Chart Update triggered: ${marketType}, ${symbol}, ${timeframe}`);
    setUpdateTrigger((prev) => prev + 1); // Trigger für Re-Render
  };

  const handleToolSelect = (tool: string | null) => {
    console.log(`Tool Select triggered: ${tool}`);
  };

  return (
    <div className="app-container">
      <h1>Market Simulation</h1>
      <ControlPanel onChartUpdate={handleChartUpdate} onToolSelect={handleToolSelect} />
      <ChartManager key={updateTrigger} onChartUpdate={handleChartUpdate} onToolSelect={handleToolSelect} />
    </div>
  );
}

export default App;