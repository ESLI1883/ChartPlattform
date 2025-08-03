import React, { useState } from 'react';
import SymbolSearch from '../SymbolSearch/SymbolSearch.tsx';
import DrawingTools from '../DrawingTools/DrawingTools.tsx';

interface ControlPanelProps {
  onChartUpdate: (marketType: string, symbol: string, timeframe: string) => void;
  onToolSelect: (tool: string | null) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onChartUpdate, onToolSelect }) => {
  const [marketType, setMarketType] = useState('forex');
  const [symbol, setSymbol] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('D1');
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);

  const handleSymbolSelect = (newSymbol: string, newMarketType: string) => {
    setSymbol(newSymbol);
    setMarketType(newMarketType);
    setShowSymbolSearch(false);
    onChartUpdate(newMarketType, newSymbol, timeframe);
  };

  const handleToolDeselect = () => {
    onToolSelect(null);
  };

  const timeframes = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1', 'W1', 'MN'];

  return (
    <div className="controls">
      <div className="market-selection">
        <label>Markt: </label>
        <select value={marketType} onChange={(e) => { setMarketType(e.target.value); onChartUpdate(e.target.value, symbol, timeframe); }}>
          <option value="forex">Forex</option>
          <option value="commodities">Rohstoffe</option>
        </select>
      </div>
      <div className="symbol-selection">
        <label>Symbol: </label>
        {marketType === 'forex' && (
          <select value={symbol} onChange={(e) => { setSymbol(e.target.value); onChartUpdate(marketType, e.target.value, timeframe); }}>
            <option value="AUDUSD">AUD/USD</option>
            <option value="EURUSD">EUR/USD</option>
            <option value="GBPUSD">GBP/USD</option>
            <option value="USDCHF">USD/CHF</option>
            <option value="USDJPY">USD/JPY</option>
          </select>
        )}
        {marketType === 'commodities' && (
          <select value={symbol} onChange={(e) => { setSymbol(e.target.value); onChartUpdate(marketType, e.target.value, timeframe); }}>
            <option value="SILBER">Silber</option>
            <option value="GOLD">Gold</option>
          </select>
        )}
        <button onClick={() => setShowSymbolSearch(true)}>Symbol Suche</button>
      </div>
      <div className="timeframe-selection">
        <label>Timeframe: </label>
        <div className="timeframe-buttons">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => { setTimeframe(tf); onChartUpdate(marketType, symbol, tf); }}
              className={timeframe === tf ? 'active' : ''}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      {showSymbolSearch && (
        <div className="symbol-search-modal">
          <SymbolSearch
            onSymbolSelect={handleSymbolSelect}
            currentMarketType={marketType}
            onClose={() => setShowSymbolSearch(false)}
          />
        </div>
      )}
      <div className="tools-section">
        <DrawingTools onToolSelect={onToolSelect} onCategoryClose={handleToolDeselect} />
      </div>
    </div>
  );
};

export default ControlPanel;