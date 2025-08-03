import React, { useRef, useEffect } from 'react';
import { createChart, ISeriesApi, CandlestickData, CandlestickSeries } from 'lightweight-charts';

interface ChartProps {
  chartId: number; // Neue Prop für eindeutige ID
  data: CandlestickData[];
  marketType: string;
  symbol: string;
  timeframe: string;
  selectedTool: string | null;
  onToolDeselect: () => void;
  onAddIndicator: (indicator: any) => void;
  onChartUpdate: (marketType: string, symbol: string, timeframe: string) => void;
}

const Chart: React.FC<ChartProps> = ({ chartId, data: initialData, marketType, symbol, timeframe, selectedTool, onToolDeselect, onAddIndicator, onChartUpdate }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (chartContainerRef.current) {
      if (!chartRef.current) {
        // Initialisiere den Chart
        chartRef.current = createChart(chartContainerRef.current, {
          width: 800,
          height: 400,
          layout: { background: { color: '#ffffff' }, textColor: '#333' },
          grid: { vertLines: { color: '#e0e0e0' }, horzLines: { color: '#e0e0e0' } },
          timeScale: { timeVisible: true, secondsVisible: false },
        });

        candlestickSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
      }

      // Aktualisiere die Daten
      if (candlestickSeriesRef.current) {
        console.log(`Chart ${chartId} updating with data:`, { marketType, symbol, timeframe, initialData });
        candlestickSeriesRef.current.setData(initialData);
      }

      // Cleanup beim Unmount
      return () => {
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          candlestickSeriesRef.current = null;
        }
      };
    }
  }, [chartId, initialData, marketType, symbol, timeframe]); // Abhängigkeiten aktualisieren

  // Manuelle Aktualisierung über Button (optional)
  const handleUpdateData = () => {
    onChartUpdate(marketType, symbol, timeframe);
  };

  return (
    <div>
      <h2>{symbol} - {timeframe} ({marketType})</h2>
      <button onClick={handleUpdateData}>Daten aktualisieren</button>
      <div ref={chartContainerRef} />
    </div>
  );
};

export default Chart;