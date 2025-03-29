// market/SymbolData.js
const symbolData = {
  stock: [
    {
      symbol: 'AAPL',
      description: 'Apple Inc.',
      source: 'Yahoo Finance',
      icon: 'apple-icon.png',
      marketType: 'stock',
    },
    {
      symbol: 'MSFT',
      description: 'Microsoft Corp.',
      source: 'Yahoo Finance',
      icon: 'msft-icon.png',
      marketType: 'stock',
    },
    {
      symbol: 'GOOGL',
      description: 'Alphabet Inc.',
      source: 'Yahoo Finance',
      icon: 'googl-icon.png',
      marketType: 'stock',
    },
  ],
  forex: [
    {
      symbol: 'EURUSD',
      description: 'Euro/US Dollar',
      source: 'FXCM',
      icon: 'eur-usd.png',
      marketType: 'forex',
    },
    {
      symbol: 'GBPUSD',
      description: 'British Pound/US Dollar',
      source: 'FXCM',
      icon: 'gbp-usd.png',
      marketType: 'forex',
    },
  ],
  crypto: [
    {
      symbol: 'BTC',
      description: 'Bitcoin',
      source: 'Binance',
      icon: 'btc-icon.png',
      marketType: 'crypto',
    },
    {
      symbol: 'ETH',
      description: 'Ethereum',
      source: 'Binance',
      icon: 'eth-icon.png',
      marketType: 'crypto',
    },
  ],
};

export default symbolData;
