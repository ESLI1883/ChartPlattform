// client/src/components/SymbolSearch.js
import React, { useState } from 'react';
import symbolData from '../market/SymbolData';
import './SymbolSearch.css';

const SymbolSearch = ({ onSymbolSelect, currentMarketType, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(currentMarketType);

  const categories = ['stock', 'forex', 'crypto'];

  // Filter Symbole basierend auf Kategorie und Suchbegriff
  const filteredSymbols = () => {
    let symbols = [];
    if (selectedCategory === 'all') {
      symbols = Object.values(symbolData).flat();
    } else {
      symbols = symbolData[selectedCategory] || [];
    }

    if (searchTerm) {
      return symbols.filter(
        (item) =>
          item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return symbols;
  };

  return (
    <div className="symbol-search">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3>Symbol Suche</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      <input
        type="text"
        placeholder="Suche"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="categories">
        {categories.map((category) => (
          <button
            key={category}
            className={selectedCategory === category ? 'active' : ''}
            onClick={() => setSelectedCategory(category)}
          >
            {category === 'stock'
              ? 'Aktien'
              : category === 'forex'
              ? 'Forex'
              : 'Krypto'}
          </button>
        ))}
      </div>
      <div className="symbol-list">
        {filteredSymbols().map((item) => (
          <div
            key={item.symbol}
            className="symbol-item"
            onClick={() => onSymbolSelect(item.symbol, item.marketType)}
          >
            <img src={item.icon} alt={item.symbol} className="symbol-icon" />
            <div className="symbol-info">
              <span className="symbol">{item.symbol}</span>
              <span className="description">{item.description}</span>
            </div>
            <span className="source">{item.source}</span>
          </div>
        ))}
      </div>
      <p>
        Beginnen Sie einfach zu tippen, während Sie auf dem Chart sind, um
        dieses Suchfeld aufzurufen.
      </p>
    </div>
  );
};

export default SymbolSearch;
