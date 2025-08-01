import { ChartData, DrawingTool } from './types';

const API_BASE_URL = 'http://localhost:3001/api';

export class ChartManager {
  static async createChart(symbol_timeframe: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol_timeframe }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Fehler beim Erstellen des Charts');
    return data.id;
  }

  static async saveChart(chartId: string, drawingTools: DrawingTool[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/charts/${chartId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drawingTools }),
    });
    if (!response.ok) throw new Error('Fehler beim Speichern des Charts');
  }

  static async getChart(chartId: string): Promise<ChartData> {
    const response = await fetch(`${API_BASE_URL}/charts/${chartId}`);
    if (!response.ok) throw new Error('Chart nicht gefunden');
    return response.json();
  }

  static async getSavedCharts(): Promise<ChartData[]> {
    const response = await fetch(`${API_BASE_URL}/charts`);
    if (!response.ok) throw new Error('Fehler beim Laden der Charts');
    return response.json();
  }

  static async getMarketData(marketType: string, symbol: string, timeframe: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/market-data/${marketType}/${symbol}?timeframe=${timeframe}`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Marktdaten');
    return response.json();
  }
}