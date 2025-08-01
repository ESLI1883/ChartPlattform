class MarketFactory {
  static async fetchMarketData(marketType, symbol, timeframe) {
    try {
      const response = await fetch(
        `http://localhost:3001/api/market-data/${marketType}/${symbol}?timeframe=${timeframe}`
      );
      const data = await response.json();
      console.log('Daten vom Backend:', data); // Debugging
      return data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Daten vom Backend:', error);
      return [];
    }
  }
}

export default MarketFactory;
