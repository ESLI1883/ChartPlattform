import React from 'react';

const SymbolSearch: React.FC<{ onSymbolSelect: (symbol: string, marketType: string) => void; currentMarketType: string; onClose: () => void }> = ({ onSymbolSelect, currentMarketType, onClose }) => {
  console.log('SymbolSearch rendering');
  return (
    <div>
      <input type="text" placeholder="Search symbol..." />
      <button onClick={() => onSymbolSelect('EURUSD', currentMarketType)}>EURUSD</button>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default SymbolSearch;