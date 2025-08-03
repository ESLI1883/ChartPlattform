import { IChartApi, ISeriesApi, LineSeries } from 'lightweight-charts';

interface DrawingState {
  chart: IChartApi;
  candlestickSeries: ISeriesApi<'Candlestick'>;
  chartContainerRef: React.RefObject<HTMLDivElement>;
  selectedTool: string | null;
  drawnObjects: any[];
  setDrawnObjects: React.Dispatch<React.SetStateAction<any[]>>;
  indicators: any[];
  setIndicators: React.Dispatch<React.SetStateAction<any[]>>;
  selectedObject: any;
  setSelectedObject: (obj: any) => void;
  menuPosition: { x: number; y: number } | null;
  setMenuPosition: (pos: { x: number; y: number } | null) => void;
  dragging: any;
  setDragging: (obj: any) => void;
  draggingHandle: string | null;
  setDraggingHandle: (handle: string | null) => void;
  onToolDeselect: () => void;
  onAddIndicator: (indicator: { type: string; period?: number; color?: string }) => void;
}

export const calculateMovingAverage = (data: any[], period: number) => {
  const maData = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val.close, 0);
    const average = sum / period;
    maData.push({ time: data[i].time, value: average });
  }
  return maData;
};

export const handleVisibility = ({ selectedObject, drawnObjects, setDrawnObjects, candlestickSeries, visible }: { selectedObject: any; drawnObjects: any[]; setDrawnObjects: React.Dispatch<React.SetStateAction<any[]>>; candlestickSeries: ISeriesApi<'Candlestick'>; visible: boolean }) => {
  if (!selectedObject) return;

  setDrawnObjects((prev) => prev.map((obj) => obj.id === selectedObject.id ? { ...obj, visible } : obj));
  if (selectedObject.type === 'horizontalLine') {
    if (!visible) candlestickSeries.removePriceLine(selectedObject.series);
    else {
      const priceLine = candlestickSeries.createPriceLine({ price: selectedObject.price, color: selectedObject.color || 'blue', lineWidth: selectedObject.lineWidth || 2, lineStyle: 0, axisLabelVisible: true, title: 'Horizontale Linie' });
      setDrawnObjects((prev) => prev.map((obj) => obj.id === selectedObject.id ? { ...obj, series: priceLine } : obj));
    }
  } else if (selectedObject.type === 'trendline') {
    if (!visible) selectedObject.series.setData([]);
    else {
      const points = [selectedObject.start, selectedObject.end].sort((a, b) => (a.time as number) - (b.time as number));
      selectedObject.series.setData([{ time: points[0].time, value: points[0].price }, { time: points[1].time, value: points[1].price }]);
    }
  }
};

export const updateDrawingState = (updates: any, setDrawnObjects: React.Dispatch<React.SetStateAction<any[]>>) => {
  setDrawnObjects((prev) => prev.map(obj => obj.id === updates.id ? { ...obj, ...updates } : obj));
  if (updates.type === 'horizontalLine' && updates.series) updates.series.applyOptions({ color: updates.color, lineWidth: updates.lineWidth });
  else if (updates.type === 'trendline' && updates.series) updates.series.applyOptions({ color: updates.color, lineWidth: updates.lineWidth });
};

export const initializeDrawing = ({
  chart,
  candlestickSeries,
  chartContainerRef,
  selectedTool,
  drawnObjects,
  setDrawnObjects,
  indicators,
  setIndicators,
  selectedObject,
  setSelectedObject,
  menuPosition,
  setMenuPosition,
  dragging,
  setDragging,
  draggingHandle,
  setDraggingHandle,
  onToolDeselect,
  onAddIndicator,
}: DrawingState) => {
  const handleClick = (param) => {
    if (!param || !param.time || !param.point) return;

    const price = candlestickSeries.coordinateToPrice(param.point.y);
    const time = param.time;
    if (price == null) return;

    if (selectedTool === 'horizontalLine') {
      const priceLine = candlestickSeries.createPriceLine({ price, color: 'blue', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'Horizontale Linie' });
      setDrawnObjects((prev) => [...prev, { id: Date.now(), type: 'horizontalLine', series: priceLine, color: 'blue', lineWidth: 2, transparency: 1, priority: 'foreground', visible: true, isEditable: false, price }]);
      setTimeout(onToolDeselect, 0);
    } else if (selectedTool === 'verticalLine') {
      chart.timeScale().applyOptions({ borderColor: 'blue', rightOffset: 10, fixLeftEdge: false, fixRightEdge: false });
      setDrawnObjects((prev) => [...prev, { id: Date.now(), type: 'verticalLine', marker: { time }, color: 'blue', lineWidth: 2, transparency: 1, priority: 'foreground', visible: true, isEditable: false }]);
      setTimeout(onToolDeselect, 0);
    } else if (selectedTool === 'trendline') {
      setDrawnObjects((prev) => {
        const prevPoints = prev.filter((obj) => obj.type === 'trendlinePoint');
        if (prevPoints.length === 0) {
          return [...prev, { id: Date.now(), type: 'trendlinePoint', point: { time, price } }];
        } else if (prevPoints.length === 1) {
          const start = prevPoints[0].point;
          const end = { time, price };
          const points = [start, end].sort((a, b) => (a.time as number) - (b.time as number));
          const sortedStart = points[0];
          const sortedEnd = points[1];
          const lineSeries = chart.addSeries(LineSeries, { color: 'blue', lineWidth: 2, lineStyle: 0 });
          lineSeries.setData([{ time: sortedStart.time, value: sortedStart.price }, { time: sortedEnd.time, value: sortedEnd.price }]);
          return prev.filter((obj) => obj.type !== 'trendlinePoint').concat({ id: Date.now(), type: 'trendline', series: lineSeries, start: sortedStart, end: sortedEnd, color: 'blue', lineWidth: 2, transparency: 1, priority: 'foreground', visible: true, isEditable: false });
        }
        return prev;
      });
      setTimeout(onToolDeselect, 0);
    }
  };

  const handleObjectClick = (param) => {
    if (!param || !param.point) return;

    const price = candlestickSeries.coordinateToPrice(param.point.y);
    const time = param.time;

    let closestObject = null;
    let minDistance = Infinity;
    let handle = null;

    drawnObjects.forEach((obj) => {
      if (!obj.visible) return;

      let distance = Infinity;
      if (obj.type === 'horizontalLine') {
        distance = Math.abs(obj.price - price);
      } else if (obj.type === 'trendline') {
        const { start, end } = obj;
        const t = (time - start.time) / (end.time - start.time);
        if (t >= 0 && t <= 1) {
          const interpolatedPrice = start.price + t * (end.price - start.price);
          distance = Math.abs(interpolatedPrice - price);
        }
        const startCoord = chart.timeScale().timeToCoordinate(start.time as number);
        const startPriceCoord = candlestickSeries.priceToCoordinate(start.price);
        const endCoord = chart.timeScale().timeToCoordinate(end.time as number);
        const endPriceCoord = candlestickSeries.priceToCoordinate(end.price);
        const startDistance = Math.sqrt(Math.pow(startCoord - param.point.x, 2) + Math.pow(startPriceCoord - param.point.y, 2));
        const endDistance = Math.sqrt(Math.pow(endCoord - param.point.x, 2) + Math.pow(endPriceCoord - param.point.y, 2));
        if (startDistance < 10) { handle = 'start'; distance = startDistance; }
        else if (endDistance < 10) { handle = 'end'; distance = endDistance; }
      }
      if (distance < minDistance && distance < 10) { minDistance = distance; closestObject = obj; }
    });

    if (closestObject) {
      setSelectedObject(closestObject);
      setDrawnObjects((prev) => prev.map((obj) => obj.id === closestObject.id ? { ...obj, isEditable: true } : { ...obj, isEditable: false }));
      if (handle) { setDraggingHandle(handle); setDragging(closestObject); }
      else { setDraggingHandle(null); setDragging(closestObject); }
    } else {
      setSelectedObject(null);
      setDragging(null);
      setDraggingHandle(null);
      setMenuPosition(null);
      setDrawnObjects((prev) => prev.map((obj) => ({ ...obj, isEditable: false })));
    }
  };

  const handleRightClick = (event) => {
    event.preventDefault();
    if (!selectedObject) return;

    const rect = chartContainerRef.current!.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setMenuPosition({ x: x + 20, y });
  };

  const handleMouseMove = (param) => {
    if (!param || !param.point) return;

    const price = candlestickSeries.coordinateToPrice(param.point.y);
    const time = param.time;

    if (!price || !time) return;

    const obj = drawnObjects.find((o) => o.id === dragging.id);
    if (!obj) return;

    const updatedObj = { ...obj, id: obj.id };
    if (obj.type === 'trendline') {
      if (draggingHandle === 'start') updatedObj.start = { time, price };
      else if (draggingHandle === 'end') updatedObj.end = { time, price };
      else {
        const timeDelta = (time as number) - (obj.start.time as number);
        const priceDelta = price - obj.start.price;
        updatedObj.start = { time: (obj.start.time as number) + timeDelta, price: obj.start.price + priceDelta };
        updatedObj.end = { time: (obj.end.time as number) + timeDelta, price: obj.end.price + priceDelta };
      }
      if (obj.visible) {
        const points = [updatedObj.start, updatedObj.end].sort((a, b) => (a.time as number) - (b.time as number));
        obj.series.setData([{ time: points[0].time, value: points[0].price }, { time: points[1].time, value: points[1].price }]);
      }
    }

    updateDrawingState(updatedObj, setDrawnObjects);
  };

  const handleMouseUp = () => {
    if (dragging) {
      setDrawnObjects((prev) => prev.map((obj) => obj.id === dragging.id ? dragging : obj));
      setDragging(null);
      setDraggingHandle(null);
    }
  };

  if (chart && chartContainerRef.current) {
    if (selectedTool) chart.subscribeClick(handleClick);
    else chart.subscribeClick(handleObjectClick);
    chartContainerRef.current.addEventListener('contextmenu', handleRightClick);
    chart.subscribeCrosshairMove(handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      chart.unsubscribeClick(handleClick);
      chart.unsubscribeClick(handleObjectClick);
      chartContainerRef.current!.removeEventListener('contextmenu', handleRightClick);
      chart.unsubscribeCrosshairMove(handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }
  return () => {};
};

export const handleAddIndicator = (indicator: { type: string; period?: number; color?: string }, chart: IChartApi, data: any[], setIndicators: React.Dispatch<React.SetStateAction<any[]>>) => {
  if (indicator.type === 'ma' && chart) {
    const maData = calculateMovingAverage(data, indicator.period || 10);
    const maSeries = chart.addSeries(LineSeries, { color: indicator.color || 'gray', lineWidth: 2 });
    maSeries.setData(maData);
    setIndicators((prev) => [...prev, { id: Date.now(), type: 'ma', series: maSeries, period: indicator.period, color: indicator.color }]);
  }
};