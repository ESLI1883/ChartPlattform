import axios from 'axios';

export interface SeasonalityData {
  years_back: number;
  trading_day_index: number;
  avg_pct: number;
}

export const fetchSeasonalityData = async (symbol: string): Promise<SeasonalityData[]> => {
  try {
    const response = await axios.get(`http://localhost:3001/api/raw-history?symbol=${symbol}`);
    console.log(response);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Abrufen der Seasonality-Daten:', error);
    return [];
  }
};