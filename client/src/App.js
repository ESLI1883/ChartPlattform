import { useState, useEffect } from 'react';
import './App.css';
import Chart from './components/Chart';
import MarketFactory from './market/MarketFactory';
import SymbolSearch from './components/SymbolSearch';
import DrawingTools from './components/DrawingTools';
import IndicatorTools from './components/IndicatorTools';

function App() {
  const [marketType, setMarketType] = useState('forex');
  const [symbol, setSymbol] = useState('EURUSD');
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [timeframe, setTimeframe] = useState('D1');
  const [timeframeWarning, setTimeframeWarning] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        setTimeframeWarning(null);

        const supportedTimeframes = ['M15', 'H1', 'H4', 'D1', 'W1', 'MN'];
        if (!supportedTimeframes.includes(timeframe)) {
          setTimeframeWarning(
            `Timeframe ${timeframe} wird nicht unterstützt. Fallback auf Daily (D1).`
          );
          setTimeframe('D1');
        }

        const chartData = await MarketFactory.fetchMarketData(
          marketType,
          symbol,
          timeframe
        );
        if (chartData.length === 0) {
          setError('Keine Daten verfügbar für ' + symbol);
        }
        setData(chartData);
      } catch (err) {
        setError('Fehler beim Laden der Daten: ' + err.message);
      }
    };
    loadData();
  }, [marketType, symbol, timeframe]);

  const handleSymbolSelect = (newSymbol, newMarketType) => {
    setSymbol(newSymbol);
    setMarketType(newMarketType);
    setShowSymbolSearch(false);
  };

  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
  };

  const handleToolDeselect = () => {
    setSelectedTool(null);
  };

  const handleAddIndicator = (indicator) => {
    // Diese Funktion wird an Chart weitergegeben
  };

  const timeframes = ['M15', 'H1', 'H4', 'D1', 'W1', 'MN'];

  return (
    <div style={{ padding: '20px', position: 'relative' }}>
      <h1>Market Simulation</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {timeframeWarning && (
        <div style={{ color: 'orange' }}>{timeframeWarning}</div>
      )}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Markt: </label>
        <select
          value={marketType}
          onChange={(e) => setMarketType(e.target.value)}
        >
          <option value="forex">Forex</option>
          <option value="commodities">Rohstoffe</option>
        </select>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Symbol: </label>
        {marketType === 'forex' && (
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            <option value="AUDUSD">AUD/USD</option>
            <option value="EURUSD">EUR/USD</option>
            <option value="GBPUSD">GBP/USD</option>
            <option value="USDCHF">USD/CHF</option>
            <option value="USDJPY">USD/JPY</option>
          </select>
        )}
        {marketType === 'commodities' && (
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            <option value="SILBER">Silber</option>
            <option value="GOLD">Gold</option>
          </select>
        )}
        <button
          onClick={() => setShowSymbolSearch(true)}
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          Symbol Suche
        </button>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Timeframe: </label>
        <div style={{ display: 'inline-flex', gap: '5px' }}>
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '5px 10px',
                backgroundColor: timeframe === tf ? '#666' : '#444',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <DrawingTools
        onToolSelect={handleToolSelect}
        onCategoryClose={handleToolDeselect}
      />
      <IndicatorTools onAddIndicator={handleAddIndicator} />
      {showSymbolSearch && (
        <div
          style={{ position: 'fixed', top: '20%', left: '20%', zIndex: 1000 }}
        >
          <SymbolSearch
            onSymbolSelect={handleSymbolSelect}
            currentMarketType={marketType}
            onClose={() => setShowSymbolSearch(false)}
          />
        </div>
      )}
      <Chart
        data={data}
        selectedTool={selectedTool}
        onToolDeselect={handleToolDeselect}
        onAddIndicator={handleAddIndicator}
      />
    </div>
  );
}

export default App;
