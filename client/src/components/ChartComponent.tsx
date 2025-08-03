import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, LineSeriesOptions, DeepPartial, Time, LineStyleOptions, SeriesOptionsCommon, LineSeries, WhitespaceData } from 'lightweight-charts';
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

interface ChartProps {
  data: any[];
  marketType: string;
  symbol: string;
  timeframe: string;
  selectedTool: string | null;
  onToolDeselect: () => void;
  onAddIndicator: () => void;
  onChartUpdate: (marketType: string, symbol: string, timeframe: string) => void;
}

const ChartComponent: React.FC<ChartProps> = ({ data: initialData, marketType, symbol, timeframe, selectedTool, onToolDeselect, onAddIndicator, onChartUpdate }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line", Time, LineData<Time> | WhitespaceData<Time>, LineSeriesOptions, DeepPartial<LineStyleOptions & SeriesOptionsCommon>> | null>(null);
  const [chartId, setChartId] = useState<string | null>(null);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<{ start: { x: number; y: number } } | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(selectedTool);
  const [selectedToolSettings, setSelectedToolSettings] = useState({ color: '#000000', lineWidth: 2, transparency: 1, priority: 'foreground', visible: true });
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    console.log('ChartComponent received props:', { marketType, symbol, timeframe, initialData });
    if (seriesRef.current) {
      const lineData = initialData.map(d => {
        if (d.time && (d.close || d.value)) {
          return { time: d.time, value: d.close || d.value };
        }
        console.warn('Invalid data item:', d);
        return { time: d.time || 'invalid' as any, value: d.close || d.value || 0 };
      }).filter(d => d.time && d.value !== undefined);
      console.log('Setting data on series:', lineData);
      if (lineData.length > 0) seriesRef.current.setData(lineData);
    }
  }, [initialData, marketType, symbol, timeframe]);

  const updateChartData = useCallback(async () => {
    console.log('ChartComponent: onChartUpdate called with:', { marketType, symbol, timeframe });
    onChartUpdate(marketType, symbol, timeframe);
    const data = await ChartManager.getMarketData(marketType, symbol, timeframe);
    console.log('ChartComponent: Data fetched from ChartManager:', { marketType, symbol, timeframe, data });
    if (seriesRef.current) {
      const lineData = data.map(d => {
        if (d.time && (d.close || d.value)) {
          return { time: d.time, value: d.close || d.value };
        }
        console.warn('Invalid data item:', d);
        return { time: d.time || 'invalid' as any, value: d.close || d.value || 0 };
      }).filter(d => d.time && d.value !== undefined);
      if (lineData.length > 0) seriesRef.current.setData(lineData);
    }
  }, [marketType, symbol, timeframe, onChartUpdate]);

  useEffect(() => {
    const initializeChart = async () => {
      if (chartContainerRef.current && !chartRef.current) {
        chartRef.current = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 400,
        });
        seriesRef.current = chartRef.current.addSeries(LineSeries, {
          lineWidth: 2,
          color: '#2962FF',
        });
        console.log('Series created, initial data check:', initialData);

        if (initialData && initialData.length > 0) {
          const lineData = initialData.map(d => {
            if (d.time && (d.close || d.value)) {
              return { time: d.time, value: d.close || d.value };
            }
            console.warn('Invalid initial data item:', d);
            return { time: d.time || 'invalid' as any, value: d.close || d.value || 0 };
          }).filter(d => d.time && d.value !== undefined);
          if (lineData.length > 0) {
            console.log('Initial data converted to LineData:', lineData);
            seriesRef.current.setData(lineData);
          }
        }

        if (!chartId) {
          const newChartId = await ChartManager.createChart(`${symbol}_${timeframe}`);
          console.log('Created chart with ID:', newChartId);
          setChartId(newChartId);
        }
      }
    };
    initializeChart();
  }, [chartId, initialData, symbol, timeframe]);

  const renderChart = useCallback(() => {
    const canvas = chartContainerRef.current?.querySelector('canvas');
    if (canvas && chartRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
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
            ctx.globalAlpha = 1;
          }
        });
        if (drawing && currentLine) {
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
      }
    }
  }, [trendLines, drawing, currentLine, selectedToolSettings]);

  useEffect(() => {
    let animationFrameId = requestAnimationFrame(renderChart);
    return () => cancelAnimationFrame(animationFrameId);
  }, [renderChart]);

  useEffect(() => {
    const canvas = chartContainerRef.current?.querySelector('canvas');
    if (canvas) {
      const handleMouseDown = (event: MouseEvent) => {
        if (activeTool === 'trendline' && !drawing && seriesRef.current) {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          setCurrentLine({ start: { x, y } });
          setDrawing(true);
        }
      };

      const handleMouseUp = (event: MouseEvent) => {
        if (drawing && currentLine && activeTool === 'trendline' && seriesRef.current) {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          const newTrendLine: TrendLine = {
            start: currentLine.start,
            end: { x, y },
            ...selectedToolSettings,
          };
          setTrendLines((prev) => [...prev, newTrendLine]);
          setDrawing(false);
          setCurrentLine(null);
          const tool: DrawingTool = {
            id: crypto.randomUUID(),
            type: 'trendline',
            points: [{ x: currentLine.start.x, y: currentLine.start.y }, { x, y }],
            options: selectedToolSettings,
            createdAt: Date.now(),
          };
          if (chartId) ChartManager.saveChart(chartId, [tool]);
        }
      };

      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mouseup', handleMouseUp);

      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [activeTool, drawing, currentLine, trendLines, selectedToolSettings, chartId]);

  const handleToolSelect = (toolKey: string, initialSettings: any) => {
    console.log('Tool selected in Chart:', toolKey);
    setActiveTool(toolKey);
    setSelectedToolSettings(initialSettings);
    if (toolKey === 'trendline') {
      setShowMenu(true);
    }
  };

  const handleUpdateSettings = (settings: any) => {
    setSelectedToolSettings(settings);
    setShowMenu(false);
  };

  useEffect(() => {
    setActiveTool(selectedTool);
    if (selectedTool === null) onToolDeselect();
  }, [selectedTool, onToolDeselect]);

  if (!chartId) return <div>Laden...</div>;

  return (
    <div>
      <button onClick={updateChartData}>Daten aktualisieren</button>
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