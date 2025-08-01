import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';
import { ChartManager } from '../utils/ChartManager';
import { ChartData, DrawingTool } from '../types';

// Verfügbare Symbols mit Zeiteinheiten
const availableSymbols = [
  'BTCUSD_1D', 'BTCUSD_1H', 'EURUSD_1D', 'EURUSD_1H', 'XAUUSD_1D',
].map(s => {
  const [symbol, timeframe] = s.split('_');
  return { symbol, timeframe, full: s };
});

const ChartComponent: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartId, setChartId] = useState<string | null>(null);
  const [drawingTools, setDrawingTools] = useState<DrawingTool[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState(availableSymbols[0].full);
  const [marketData, setMarketData] = useState<any[]>([]);

  useEffect(() => {
    const initializeChart = async () => {
      if (chartContainerRef.current && !chartRef.current) {
        chartRef.current = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 400,
        });
        const series = chartRef.current.addCandlestickSeries();
        const [symbol, timeframe] = selectedSymbol.split('_');
        const data = await ChartManager.getMarketData('crypto', symbol, timeframe); // Passe marketType an
        setMarketData(data);
        series.setData(data);

        if (!chartId) {
          const newChartId = await ChartManager.createChart(selectedSymbol);
          setChartId(newChartId);
        } else {
          const data = await ChartManager.getChart(chartId);
          // Aktualisiere Daten basierend auf symbol_timeframe
          const [sym, tf] = data.symbol_timeframe.split('_');
          const newData = await ChartManager.getMarketData('crypto', sym, tf);
          setMarketData(newData);
          series.setData(newData);
        }
      }
    };
    initializeChart();
  }, [chartId, selectedSymbol]);

  useEffect(() => {
    const canvas = chartContainerRef.current?.querySelector('canvas');
    if (canvas && chartRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const render = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          requestAnimationFrame(render);
        };
        render();

        canvas.addEventListener('click', async (event) => {
          const rect = canvas.getBoundingClientRect();
          const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
          if (activeTool && chartId) {
            const tool: DrawingTool = {
              id: crypto.randomUUID(),
              type: activeTool,
              points: [point],
              options: { color: '#000000', lineWidth: 2 },
              createdAt: Date.now(),
            };
            setDrawingTools((prev) => [...prev, tool]);
            await ChartManager.saveChart(chartId, [...drawingTools, tool]);
          }
        });
      }
    }
  }, [activeTool, chartId, drawingTools]);

  if (!chartId) return <div>Laden...</div>;

  return (
    <div>
      <div>
        <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
          {availableSymbols.map(({ full }) => (
            <option key={full} value={full}>{full}</option>
          ))}
        </select>
        <button onClick={() => setChartId(null)}>Neues Chart</button>
        <button onClick={() => setActiveTool('trendline')}>Trendlinie</button>
        <button onClick={() => setActiveTool('fibonacci')}>Fibonacci</button>
      </div>
      <div ref={chartContainerRef} style={{ position: 'relative' }} />
    </div>
  );
};

export default ChartComponent;