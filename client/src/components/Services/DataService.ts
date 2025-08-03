import axios from 'axios';
// Typdefinition für Candlestick-Daten
interface CandlestickData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const fetchMarketData = async (marketType: string, symbol: string, timeframe: string): Promise<CandlestickData[]> => {
    try {
      console.log(`Fetching data for ${marketType}/${symbol}/${timeframe}`);
      const response = await axios.get(`http://localhost:3001/api/market-data/${marketType}/${symbol}`, {
        params: { timeframe },
      });
      console.log('API Response Status:', response.status);
      console.log('API Response Data:', response.data);
      if (!response.data || response.data.length === 0) {
        throw new Error('Keine Daten verfügbar');
      }
      return response.data;
    } catch (err) {
      console.error(`Fehler beim Abrufen der Daten: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
};