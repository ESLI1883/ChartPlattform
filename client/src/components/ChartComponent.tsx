import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';
import { ChartManager } from '../utils/ChartManager';
import { DrawingTool } from '../types';
import DrawingTools from './DrawingTools';
import DrawingToolMenu from './DrawingToolMenu';

interface TrendLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
  color: string;
  lineWidth: number;
  transparency: number;
  priority: string;
  visible: boolean;
}

const ChartComponent: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartId, setChartId] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<{ start: { x: number; y: number } } | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedToolSettings, setSelectedToolSettings] = useState({ color: '#000000', lineWidth: 2, transparency: 1, priority: 'foreground', visible: true });
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const initializeChart = async () => {
      if (chartContainerRef.current && !chartRef.current) {
        chartRef.current = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 400,
        });
        const series = chartRef.current.addCandlestickSeries();
        // Annahme: Deine Logik lädt hier die Daten basierend auf der Menüauswahl
        const data = await ChartManager.getMarketData('crypto', 'BTCUSD', '1D'); // Ersetze mit deiner Logik
        setMarketData(data);
        series.setData(data);

        if (!chartId) {
          const newChartId = await ChartManager.createChart('BTCUSD_1D'); // Ersetze mit deiner Logik
          setChartId(newChartId);
        }
      }
    };
    initializeChart();
  }, [chartId]);

  useEffect(() => {
    const canvas = chartContainerRef.current?.querySelector('canvas');
    if (canvas && chartRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const render = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          trendLines.forEach((line) => {
            if (line.visible) {
              ctx.globalAlpha = line.transparency;
              ctx.beginPath();
              ctx.moveTo(line.start.x, line.start.y);
              ctx.lineTo(line.end.x, line.end.y);
              ctx.strokeStyle = line.color;
              ctx.lineWidth = line.lineWidth;
              ctx.stroke();
              ctx.globalAlpha = 1; // Zurücksetzen
            }
          });
          if (drawing && currentLine && chartRef.current) {
            ctx.beginPath();
            ctx.moveTo(currentLine.start.x, currentLine.start.y);
            const endY = currentLine.start.y;
            ctx.lineTo(currentLine.start.x + 100, endY);
            ctx.strokeStyle = selectedToolSettings.color;
            ctx.lineWidth = selectedToolSettings.lineWidth;
            ctx.globalAlpha = selectedToolSettings.transparency;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          requestAnimationFrame(render);
        };
        render();

        canvas.addEventListener('mousedown', (event) => {
          if (activeTool === 'trendline' && !drawing) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            setCurrentLine({ start: { x, y } });
            setDrawing(true);
          }
        });

        canvas.addEventListener('mouseup', (event) => {
          if (drawing && currentLine && activeTool === 'trendline') {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const newTrendLine = {
              start: currentLine.start,
              end: { x, y },
              color: selectedToolSettings.color,
              lineWidth: selectedToolSettings.lineWidth,
              transparency: selectedToolSettings.transparency,
              priority: selectedToolSettings.priority,
              visible: selectedToolSettings.visible,
            };
            setTrendLines((prev) => [...prev, newTrendLine]);
            setDrawing(false);
            setCurrentLine(null);
            const tool: DrawingTool = {
              id: crypto.randomUUID(),
              type: 'trendline',
              points: [{ x: currentLine.start.x, y: currentLine.start.y }, { x, y }],
              options: {
                color: selectedToolSettings.color,
                lineWidth: selectedToolSettings.lineWidth,
                transparency: selectedToolSettings.transparency,
                priority: selectedToolSettings.priority,
                visible: selectedToolSettings.visible,
              },
              createdAt: Date.now(),
            };
            if (chartId) ChartManager.saveChart(chartId, [tool]);
          }
        });

        return () => {
          canvas.removeEventListener('mousedown', () => {});
          canvas.removeEventListener('mouseup', () => {});
        };
      }
    }
  }, [activeTool, drawing, currentLine, trendLines, marketData, chartId, selectedToolSettings]);

  const handleToolSelect = (toolKey, initialSettings) => {
    setActiveTool(toolKey);
    setSelectedToolSettings(initialSettings);
    if (toolKey === 'trendline') {
      setShowMenu(true);
    }
  };

  const handleUpdateSettings = (settings) => {
    setSelectedToolSettings(settings);
    setShowMenu(false);
  };

  if (!chartId) return <div>Laden...</div>;

  return (
    <div>
      <DrawingTools onToolSelect={handleToolSelect} />
      {showMenu && (
        <DrawingToolMenu
          tool={selectedToolSettings}
          onUpdate={handleUpdateSettings}
          onClose={() => setShowMenu(false)}
        />
      )}
      <div ref={chartContainerRef} style={{ position: 'relative' }} />
    </div>
  );
};

export default ChartComponent;