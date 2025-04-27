import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import DrawingToolMenu from './DrawingToolMenu';

const Chart = ({ data, selectedTool, onToolDeselect, onAddIndicator }) => {
  const chartContainerRef = useRef();
  const [chart, setChart] = useState(null);
  const [series, setSeries] = useState(null);
  const [drawnObjects, setDrawnObjects] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [draggingHandle, setDraggingHandle] = useState(null);
  const draggingObjectRef = useRef(null);

  useEffect(() => {
    console.log('Chart-Komponente initialisiert. Daten:', data);

    if (!data || data.length === 0) {
      console.error('Keine Daten zum Rendern des Charts verfügbar.');
      return;
    }

    const chartInstance = createChart(chartContainerRef.current, {
      width: 1400,
      height: 600,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    const candlestickSeries = chartInstance.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candlestickSeries.setData(data);

    setChart(chartInstance);
    setSeries(candlestickSeries);

    return () => {
      console.log('Chart-Komponente entfernt.');
      chartInstance.remove();
    };
  }, [data]);

  // Berechne Moving Average
  const calculateMovingAverage = (data, period) => {
    const maData = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) continue; // Nicht genug Daten für den MA
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, val) => acc + val.close, 0);
      const average = sum / period;
      maData.push({ time: data[i].time, value: average });
    }
    return maData;
  };

  // Füge Indikatoren hinzu
  const handleAddIndicator = (indicator) => {
    if (indicator.type === 'ma') {
      const maData = calculateMovingAverage(data, indicator.period);
      const maSeries = chart.addSeries(LineSeries, {
        color: indicator.color,
        lineWidth: 2,
      });
      maSeries.setData(maData);
      setIndicators((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'ma',
          series: maSeries,
          period: indicator.period,
          color: indicator.color,
        },
      ]);
    }
  };

  // Handle Klick-Events
  useEffect(() => {
    if (!chart || !series || !chartContainerRef.current) {
      console.log('Chart, Series oder Container nicht verfügbar:', {
        chart,
        series,
        chartContainerRef,
      });
      return;
    }

    console.log('Selected Tool:', selectedTool);

    const handleClick = (param) => {
      console.log('Klick erkannt:', param);

      if (!param || !param.time || !param.point) {
        console.log('Ungültige Klick-Daten:', param);
        return;
      }

      const price = series.coordinateToPrice(param.point.y);
      if (price == null) {
        console.log('Preis konnte nicht ermittelt werden:', param.point.y);
        return;
      }

      if (selectedTool === 'horizontalLine') {
        console.log('Zeichne horizontale Linie bei Preis:', price);
        const priceLine = series.createPriceLine({
          price: price,
          color: 'blue',
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: 'Horizontale Linie',
        });
        setDrawnObjects((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'horizontalLine',
            series: priceLine,
            color: 'blue',
            lineWidth: 2,
            transparency: 1,
            priority: 'foreground',
            visible: true,
            isEditable: false,
            price: price,
          },
        ]);
        setTimeout(() => onToolDeselect(), 0);
      } else if (selectedTool === 'verticalLine') {
        console.log('Zeichne vertikale Linie bei Zeit:', param.time);
        chart.timeScale().applyOptions({
          borderColor: 'blue',
          rightOffset: 10,
          fixLeftEdge: false,
          fixRightEdge: false,
        });
        setDrawnObjects((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'verticalLine',
            marker: { time: param.time },
            color: 'blue',
            lineWidth: 2,
            transparency: 1,
            priority: 'foreground',
            visible: true,
            isEditable: false,
          },
        ]);
        setTimeout(() => onToolDeselect(), 0);
      } else if (selectedTool === 'trendline') {
        setDrawnObjects((prev) => {
          const prevPoints = prev.filter(
            (obj) => obj.type === 'trendlinePoint'
          );
          if (prevPoints.length === 0) {
            console.log('Erster Punkt der Trendlinie:', {
              time: param.time,
              price,
            });
            return [
              ...prev,
              {
                id: Date.now(),
                type: 'trendlinePoint',
                point: { time: param.time, price },
              },
            ];
          } else if (prevPoints.length === 1) {
            const start = prevPoints[0].point;
            const end = { time: param.time, price };

            console.log('Zweiter Punkt der Trendlinie:', end);
            const points = [start, end].sort((a, b) => a.time - b.time);
            const sortedStart = points[0];
            const sortedEnd = points[1];
            const lineData = [
              { time: sortedStart.time, value: sortedStart.price },
              { time: sortedEnd.time, value: sortedEnd.price },
            ];
            console.log('Sortierte Trendlinie Daten:', lineData);

            try {
              const lineSeries = chart.addSeries(LineSeries, {
                color: 'blue',
                lineWidth: 2,
                lineStyle: 0,
              });
              lineSeries.setData(lineData);
              const newObjects = prev.filter(
                (obj) => obj.type !== 'trendlinePoint'
              );
              newObjects.push({
                id: Date.now(),
                type: 'trendline',
                series: lineSeries,
                start: sortedStart,
                end: sortedEnd,
                color: 'blue',
                lineWidth: 2,
                transparency: 1,
                priority: 'foreground',
                visible: true,
                isEditable: false,
              });
              return newObjects;
            } catch (error) {
              console.error('Fehler beim Zeichnen der Trendlinie:', error);
              return prev;
            } finally {
              setTimeout(() => onToolDeselect(), 0);
            }
          }
          return prev;
        });
      } else if (dragging || draggingHandle) {
        setDragging(null);
        setDraggingHandle(null);
      }
    };

    const handleObjectClick = (param) => {
      if (!param || !param.point) return;

      const price = series.coordinateToPrice(param.point.y);
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
            const interpolatedPrice =
              start.price + t * (end.price - start.price);
            distance = Math.abs(interpolatedPrice - price);
          }

          if (obj.isEditable) {
            const startCoord = chart.timeScale().timeToCoordinate(start.time);
            const startPriceCoord = series.priceToCoordinate(start.price);
            const endCoord = chart.timeScale().timeToCoordinate(end.time);
            const endPriceCoord = series.priceToCoordinate(end.price);

            const startDistance = Math.sqrt(
              Math.pow(startCoord - param.point.x, 2) +
                Math.pow(startPriceCoord - param.point.y, 2)
            );
            const endDistance = Math.sqrt(
              Math.pow(endCoord - param.point.x, 2) +
                Math.pow(endPriceCoord - param.point.y, 2)
            );

            if (startDistance < 10) {
              handle = 'start';
              distance = startDistance;
            } else if (endDistance < 10) {
              handle = 'end';
              distance = endDistance;
            }
          }
        }

        if (distance < minDistance && distance < 10) {
          minDistance = distance;
          closestObject = obj;
        }
      });

      if (closestObject) {
        setSelectedObject(closestObject);
        setDrawnObjects((prev) =>
          prev.map((obj) =>
            obj.id === closestObject.id
              ? { ...obj, isEditable: true }
              : { ...obj, isEditable: false }
          )
        );
        if (handle) {
          setDraggingHandle(handle);
          setDragging(closestObject);
        } else {
          setDraggingHandle(null);
          setDragging(closestObject);
        }
      } else {
        setSelectedObject(null);
        setDragging(null);
        setDraggingHandle(null);
        setMenuPosition(null);
        setDrawnObjects((prev) =>
          prev.map((obj) => ({ ...obj, isEditable: false }))
        );
      }
    };

    const handleRightClick = (event) => {
      event.preventDefault();
      if (!selectedObject) return;

      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setMenuPosition({ x: x + 20, y });
    };

    if (selectedTool) {
      console.log('Abonniere Klick-Events für Tool:', selectedTool);
      chart.subscribeClick(handleClick);
    } else {
      console.log('Abonniere Klick-Events für Objektauswahl');
      chart.subscribeClick(handleObjectClick);
    }

    const container = chartContainerRef.current;
    container.addEventListener('contextmenu', handleRightClick);

    return () => {
      console.log('Entferne Klick-Event-Listener.');
      chart.unsubscribeClick(handleClick);
      chart.unsubscribeClick(handleObjectClick);
      container.removeEventListener('contextmenu', handleRightClick);
    };
  }, [
    selectedTool,
    chart,
    series,
    onToolDeselect,
    drawnObjects,
    selectedObject,
  ]);

  // Separater useEffect für Mausbewegungen
  useEffect(() => {
    if (!chart || !series || !dragging) return;

    const handleMouseMove = (param) => {
      if (!param || !param.point) return;

      const price = series.coordinateToPrice(param.point.y);
      const time = param.time;

      if (!price || !time) return;

      const obj = drawnObjects.find((o) => o.id === dragging.id);
      if (!obj) return;

      const updatedObj = { ...obj };
      if (obj.type === 'trendline') {
        if (draggingHandle === 'start') {
          updatedObj.start = { time, price };
        } else if (draggingHandle === 'end') {
          updatedObj.end = { time, price };
        } else {
          const timeDelta = time - obj.start.time;
          const priceDelta = price - obj.start.price;
          updatedObj.start = {
            time: obj.start.time + timeDelta,
            price: obj.start.price + priceDelta,
          };
          updatedObj.end = {
            time: obj.end.time + timeDelta,
            price: obj.end.price + priceDelta,
          };
        }

        if (obj.visible) {
          const points = [updatedObj.start, updatedObj.end].sort(
            (a, b) => a.time - b.time
          );
          const sortedStart = points[0];
          const sortedEnd = points[1];
          obj.series.setData([
            { time: sortedStart.time, value: sortedStart.price },
            { time: sortedEnd.time, value: sortedEnd.price },
          ]);
        }
      }

      draggingObjectRef.current = updatedObj;
    };

    const handleMouseUp = () => {
      if (draggingObjectRef.current) {
        setDrawnObjects((prev) =>
          prev.map((obj) =>
            obj.id === draggingObjectRef.current.id
              ? draggingObjectRef.current
              : obj
          )
        );
        draggingObjectRef.current = null;
      }
      setDragging(null);
      setDraggingHandle(null);
    };

    chart.subscribeCrosshairMove(handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      chart.unsubscribeCrosshairMove(handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [chart, series, dragging, draggingHandle, drawnObjects]);

  const handleUpdateObject = (updates) => {
    if (!selectedObject) return;

    setDrawnObjects((prev) =>
      prev.map((obj) =>
        obj.id === selectedObject.id ? { ...obj, ...updates } : obj
      )
    );

    if (selectedObject.type === 'horizontalLine') {
      selectedObject.series.applyOptions({
        color: updates.color,
        lineWidth: updates.lineWidth,
      });
    } else if (selectedObject.type === 'trendline') {
      selectedObject.series.applyOptions({
        color: updates.color,
        lineWidth: updates.lineWidth,
      });
    }

    setSelectedObject(null);
    setMenuPosition(null);
  };

  const handleToggleVisibility = (visible) => {
    if (!selectedObject) return;

    setDrawnObjects((prev) =>
      prev.map((obj) =>
        obj.id === selectedObject.id ? { ...obj, visible } : obj
      )
    );

    if (selectedObject.type === 'horizontalLine') {
      if (!visible) {
        series.removePriceLine(selectedObject.series);
      } else {
        const priceLine = series.createPriceLine({
          price: selectedObject.price,
          color: selectedObject.color,
          lineWidth: selectedObject.lineWidth,
          lineStyle: 0,
          axisLabelVisible: true,
          title: 'Horizontale Linie',
        });
        setDrawnObjects((prev) =>
          prev.map((obj) =>
            obj.id === selectedObject.id ? { ...obj, series: priceLine } : obj
          )
        );
      }
    } else if (selectedObject.type === 'trendline') {
      if (!visible) {
        selectedObject.series.setData([]);
      } else {
        const points = [selectedObject.start, selectedObject.end].sort(
          (a, b) => a.time - b.time
        );
        const sortedStart = points[0];
        const sortedEnd = points[1];
        selectedObject.series.setData([
          { time: sortedStart.time, value: sortedStart.price },
          { time: sortedEnd.time, value: sortedEnd.price },
        ]);
      }
    }
  };

  const handleCloseMenu = () => {
    setSelectedObject(null);
    setMenuPosition(null);
  };

  return (
    <div ref={chartContainerRef} style={{ position: 'relative' }}>
      {menuPosition && selectedObject && (
        <div
          style={{
            position: 'absolute',
            left: menuPosition.x,
            top: menuPosition.y,
          }}
        >
          <DrawingToolMenu
            tool={selectedObject}
            onUpdate={handleUpdateObject}
            onToggleVisibility={handleToggleVisibility}
            onClose={handleCloseMenu}
          />
        </div>
      )}
    </div>
  );
};

export default Chart;
