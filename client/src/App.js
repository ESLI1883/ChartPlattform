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
  // Für die Saison-Daten
  const [seasonYears, setSeasonYears] = useState(5);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        setTimeframeWarning(null);

        const supportedTimeframes = [
          'M1',
          'M5',
          'M15',
          'H1',
          'H4',
          'D1',
          'W1',
          'MN',
        ];
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

  const timeframes = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1', 'W1', 'MN'];

  return (
    <div className="app-container">
      <h1>Market Simulation</h1>
      {error && <div className="error-message">{error}</div>}
      {timeframeWarning && (
        <div className="warning-message">{timeframeWarning}</div>
      )}
      <div className="controls">
        <div className="market-selection">
          <label>Markt: </label>
          <select
            value={marketType}
            onChange={(e) => setMarketType(e.target.value)}
          >
            <option value="forex">Forex</option>
            <option value="commodities">Rohstoffe</option>
          </select>
        </div>
        <div className="symbol-selection">
          <label>Symbol: </label>
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
          <button onClick={() => setShowSymbolSearch(true)}>
            Symbol Suche
          </button>
        </div>
        <div className="timeframe-selection">
          <label>Timeframe: </label>
          <div className="timeframe-buttons">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={timeframe === tf ? 'active' : ''}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tools-section">
        <DrawingTools
          onToolSelect={handleToolSelect}
          onCategoryClose={handleToolDeselect}
        />
        <IndicatorTools onAddIndicator={handleAddIndicator} />
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
      <div className="seasonality-selection">
        <label>Saison-Überblick (Jahre): </label>
        {[5, 10, 15, 20].map((y) => (
          <button
            key={y}
            className={seasonYears === y ? 'active' : ''}
            onClick={() => setSeasonYears(y)}
          >
            {y} Jahre
          </button>
        ))}
      </div>

      <div className="chart-section">
        <Chart
          data={data}
          marketType={marketType}
          symbol={symbol}
          seasonYears={seasonYears}
          selectedTool={selectedTool}
          onToolDeselect={handleToolDeselect}
          onAddIndicator={handleAddIndicator}
        />
      </div>
    </div>
  );
}

export default App;
