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

interface TrendLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
  color: string;
}

const ChartComponent: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartId, setChartId] = useState<string | null>(null);
  const [drawingTools, setDrawingTools] = useState<DrawingTool[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState(availableSymbols[0].full);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<{ start: { x: number; y: number } } | null>(null);

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
          trendLines.forEach((line) => {
            ctx.beginPath();
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
            ctx.strokeStyle = line.color;
            ctx.lineWidth = 1;
            ctx.stroke();
          });
          if (drawing && currentLine && chartRef.current) {
            ctx.beginPath();
            ctx.moveTo(currentLine.start.x, currentLine.start.y);
            const end = chartRef.current.priceToCoordinate(marketData[marketData.length - 1].close); // Einfache Endpunkt-Schätzung
            ctx.lineTo(currentLine.start.x + 100, currentLine.start.y); // Temporäre Linie
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          requestAnimationFrame(render);
        };
        render();

        canvas.addEventListener('mousedown', (event) => {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          if (activeTool === 'trendline' && !drawing) {
            setCurrentLine({ start: { x, y } });
            setDrawing(true);
          }
        });

        canvas.addEventListener('mouseup', (event) => {
          if (drawing && currentLine && activeTool === 'trendline') {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            setTrendLines((prev) => [...prev, { start: currentLine.start, end: { x, y }, color: '#ff0000' }]);
            setDrawing(false);
            setCurrentLine(null);
            const tool: DrawingTool = {
              id: crypto.randomUUID(),
              type: 'trendline',
              points: [{ x: currentLine.start.x, y: currentLine.start.y }, { x, y }],
              options: { color: '#ff0000', lineWidth: 1 },
              createdAt: Date.now(),
            };
            setDrawingTools((prev) => [...prev, tool]);
            if (chartId) ChartManager.saveChart(chartId, [...drawingTools, tool]);
          }
        });

        return () => {
          canvas.removeEventListener('mousedown', () => {});
          canvas.removeEventListener('mouseup', () => {});
        };
      }
    }
  }, [activeTool, chartId, drawing, currentLine, trendLines, drawingTools, marketData]);

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
      </div>
      <div ref={chartContainerRef} style={{ position: 'relative' }} />
    </div>
  );
};

export default ChartComponent;