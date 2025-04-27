import React, { useState } from 'react';
import './IndicatorTools.css';

const IndicatorTools = ({ onAddIndicator }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [period, setPeriod] = useState(14);
  const [color, setColor] = useState('#FF0000');

  const indicators = [
    { name: 'Moving Average', key: 'ma' },
    { name: 'RSI', key: 'rsi' },
    // Weitere Indikatoren können später hinzugefügt werden
  ];

  const handleAddIndicator = (key) => {
    onAddIndicator({ type: key, period, color });
    setShowMenu(false);
  };

  return (
    <div className="indicator-tools">
      <button onClick={() => setShowMenu(!showMenu)}>
        <span role="img" aria-label="Indikatoren">
          📈
        </span>{' '}
        Indikatoren
      </button>
      {showMenu && (
        <div className="indicator-menu">
          <div>
            <label>Periode: </label>
            <input
              type="number"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              min="1"
            />
          </div>
          <div>
            <label>Farbe: </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          {indicators.map((indicator) => (
            <button
              key={indicator.key}
              onClick={() => handleAddIndicator(indicator.key)}
            >
              {indicator.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default IndicatorTools;
