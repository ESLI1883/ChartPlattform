// client/src/components/Chart.js

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  PriceScaleMode,
  CrosshairMode,
} from 'lightweight-charts';

import DrawingToolMenu from './DrawingToolMenu';

const Chart = ({
  data,
  marketType,
  symbol, // <-- now fully dynamic
  selectedTool,
  onToolDeselect,
  onAddIndicator,
}) => {
  const chartContainerRef = useRef();
  const [chart, setChart] = useState(null);
  const [series, setSeries] = useState(null);
  const [seasonSeries, setSeasonSeries] = useState({
    5: null,
    10: null,
    15: null,
    20: null,
  });
  // Wir halten hier nicht länger “seasonData” pro‐Gruppe,
  // sondern wir befüllen die LineSeries direkt nach dem Fetch.
  // (Man könnte “seasonData” gerne noch in State halten, wenn man
  //  eine weitere Komponente darauf zugreifen will –
  //  aber für die reine Darstellung ist das nicht nötig.)
  const [drawnObjects, setDrawnObjects] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [draggingHandle, setDraggingHandle] = useState(null);
  const draggingObjectRef = useRef(null);


subscribeToEvents(){
  this.Chart.subscribeCrosshairMove(this.hanleC)
}


  // ───────────────────────────────────────────────────────────────────────────────
  // NEU: State für Sichtbarkeit der Saison-Linien
  const [visibility, setVisibility] = useState({
    5: true,
    10: true,
    15: true,
    20: true,
  });
  // ───────────────────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────────────────
  // 1) Dieser Hook erzeugt das Chart‐Objekt und beide PriceScales,
  //    baut die Candlestick‐Serie und vier leere LineSeries (5/10/15/20 Jahre).
  // ───────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) {
      console.error('Chart-Container nicht verfügbar.');
      return;
    }

    const chartInstance = createChart(chartContainerRef.current, {
      // ─────────────────────────────────────────────────────────────────────────
      // Größe des Charts:
      width: 1700, // (kann nach Bedarf änderbar gemacht werden)
      height: 720,
      // ─────────────────────────────────────────────────────────────────────────
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      timeScale: { timeVisible: true, secondsVisible: false },
      leftPriceScale: {
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: PriceScaleMode.Normal,
      },
      rightPriceScale: {
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: PriceScaleMode.Normal,
        autoScale: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    // Candlestick‐Serie auf der linken (Normal-)Skala

    const candlestickSeries = chartInstance.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceScaleId: 'left',
    });

    // Vier LineSeries (alle auf der rechten [%] Skala), zunächst leer:
    const seasonSeries5 = chartInstance.addSeries(LineSeries, {
      color: '#FF0000', // Rot für 5 Jahre
      lineWidth: 2,
      priceScaleId: 'right',
      title: '5 Jahre',
      visible: visibility[5], // anfängliche Sichtbarkeit
    });
    const seasonSeries10 = chartInstance.addSeries(LineSeries, {
      color: '#00FF00', // Grün für 10 Jahre
      lineWidth: 2,
      priceScaleId: 'right',
      title: '10 Jahre',
      visible: visibility[10],
    });
    const seasonSeries15 = chartInstance.addSeries(LineSeries, {
      color: '#0000FF', // Blau für 15 Jahre
      lineWidth: 2,
      priceScaleId: 'right',
      title: '15 Jahre',
      visible: visibility[15],
    });
    const seasonSeries20 = chartInstance.addSeries(LineSeries, {
      color: '#FFA500', // Orange für 20 Jahre
      lineWidth: 2,
      priceScaleId: 'right',
      title: '20 Jahre',
      visible: visibility[20],
    });

    setChart(chartInstance);
    setSeries(candlestickSeries);
    setSeasonSeries({
      5: seasonSeries5,
      10: seasonSeries10,
      15: seasonSeries15,
      20: seasonSeries20,
    });

    return () => {
      if (chartInstance) {
        chartInstance.remove();
      }
    };
  }, []); // nur einmal beim Mount

  // ───────────────────────────────────────────────────────────────────────────────
  // 2) Wenn sich “data” (die Candlestick‐Daten, vom Parent über Props geliefert)
  //    ändert, setzen wir sie in “series.setData(...)”.
  // ───────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (series && data && data.length > 0) {
      series.setData(data);
    }
  }, [series, data]);

  // ───────────────────────────────────────────────────────────────────────────────
  // 3) Hook: Saison‐Daten für **dynamisches** `symbol` laden
  //
  //    Immer wenn sich “symbol” ODER “data” (Candles) ändert, rufen wir
  //    `/api/seasonality?symbol=${symbol}` und zeichnen die vier Linien
  //    (5/10/15/20 Jahre) **im Kalender-Raster des aktuellen Jahres**.
  // ───────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // a) Prüfen, ob alles Notwendige bereitsteht:
    if (
      !chart ||
      !series ||
      !seasonSeries[5] ||
      !seasonSeries[10] ||
      !seasonSeries[15] ||
      !seasonSeries[20] ||
      !symbol ||
      !data ||
      data.length === 0
    ) {
      return;
    }

    // b) Ermittle, welche Kalenderjahre in den Candlesticks vorkommen
    //    (rein informativ – hier brauchen wir nur: Länge ≥ 20 beispielsweise).
    const candlestickYears = Array.from(
      new Set(
        data.map((c) => {
          const date =
            typeof c.time === 'number'
              ? new Date(c.time * 1000)
              : new Date(c.time);
          return date.getUTCFullYear();
        })
      )
    ).sort((a, b) => a - b);

    // c) Erzeuge eine Liste **aller Handelstage (Mo–Fr)** des aktuellen Jahres
    const currentYear = new Date().getFullYear();
    const businessDaysOfCurrentYear = [];
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(
        Date.UTC(currentYear, m + 1, 0)
      ).getUTCDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateUTC = new Date(Date.UTC(currentYear, m, d));
        const weekday = dateUTC.getUTCDay(); // 0 = So, 6 = Sa
        if (weekday !== 0 && weekday !== 6) {
          const yyyy = currentYear;
          const mm = String(m + 1).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          businessDaysOfCurrentYear.push(`${yyyy}-${mm}-${dd}`);
        }
      }
    }
    // Jetzt sind in businessDaysOfCurrentYear ca. 252–260 Einträge
    // (alle Mo–Fr‐Tage von Jan 1 bis Dec 31 dieses Jahres).

    // d) Rufe die API **mit dem dynamischen symbol‐String** auf:
    fetch(`http://localhost:3001/api/seasonality?symbol=${symbol}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        console.log('Geladene Saison-Daten für', symbol, ':', json);

        // e) Für N in [5,10,15,20] Jahre die jeweilige Kurve erzeugen
        [5, 10, 15, 20].forEach((N) => {
          // e.1) Prüfe, ob wir überhaupt mindestens N Jahre Candles haben
          if (candlestickYears.length < N) {
            return; // nicht genug Historie → überspringe
          }

          // e.2) Filtere aus dem JSON nur die Objekte mit years_back === N
          const yearDataAll = json.filter((s) => s.years_back === N);

          // e.3) Baue Lookup { trading_day_index → avg_pct }
          const avgPctByDay = {};
          yearDataAll.forEach((entry) => {
            avgPctByDay[entry.trading_day_index] = entry.avg_pct;
          });

          // e.4) Mappen auf das aktuelle Jahres‐Raster
          const transformedSeasonData = [];
          for (let i = 0; i < businessDaysOfCurrentYear.length; i++) {
            const tradingIdx = i + 1; // 1-basiert (1. Handelstag, 2. Handelstag, …)
            const pctValue = avgPctByDay[tradingIdx];
            // Nur dann pushen, wenn pctValue eine Zahl ist
            if (pctValue === null || pctValue === undefined) {
              continue;
            }
            if (typeof pctValue !== 'number' || Number.isNaN(pctValue)) {
              continue;
            }
            transformedSeasonData.push({
              time: businessDaysOfCurrentYear[i], // "2025-03-15", "2025-03-16", …
              value: pctValue,
            });
          }

          // e.5) Sortiere (rein vorsorglich):
          transformedSeasonData.sort((a, b) => a.time.localeCompare(b.time));

          // e.6) Schreibe die Daten in seasonSeries[N] und wende die Sichtbarkeit an
          seasonSeries[N].setData(transformedSeasonData);
          seasonSeries[N].applyOptions({ visible: visibility[N] });
        });

        // f) Passe die Y-Achse (Prozent-Skala) an:
        chart.applyOptions({
          rightPriceScale: {
            autoScale: true,
            scaleMargins: { top: 0.1, bottom: 0.1 },
          },
        });

        // g) KEIN manuelles setVisibleRange: Chart zoomt automatisch
      })
      .catch((err) => {
        console.error('Seasonality-Fetch error:', err.message);
      });
  }, [chart, series, seasonSeries, marketType, symbol, data, visibility]);

  // ───────────────────────────────────────────────────────────────────────────────
  // 4) Wenn sich “visibility” (Buttons 5/10/15/20 Jahre) ändert,
  //    passen wir nur die sichtbaren Serien an:
  // ───────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      !chart ||
      !series ||
      !seasonSeries[5] ||
      !seasonSeries[10] ||
      !seasonSeries[15] ||
      !seasonSeries[20]
    ) {
      return;
    }

    [5, 10, 15, 20].forEach((yr) => {
      const seriesInstance = seasonSeries[yr];
      const isVisible = visibility[yr];
      seriesInstance.applyOptions({ visible: isVisible });
    });
  }, [visibility, chart, series, seasonSeries]);

  // ───────────────────────────────────────────────────────────────────────────────
  // Der Rest deiner Drawing-/Indicator-/Trendline-Logik bleibt unverändert.
  // Ich habe aus Platzgründen nur die Saisonalitäts-relevanten Teile auskommentiert.
  // ───────────────────────────────────────────────────────────────────────────────

  const calculateMovingAverage = (data, period) => {
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

  const handleAddIndicator = (indicator) => {
    if (indicator.type === 'ma' && chart) {
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
      const time = param.time;
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

    if (chart && chartContainerRef.current) {
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
        if (chart) {
          chart.unsubscribeClick(handleClick);
          chart.unsubscribeClick(handleObjectClick);
        }
        if (container) {
          container.removeEventListener('contextmenu', handleRightClick);
        }
      };
    }
  }, [
    chart,
    series,
    selectedTool,
    onToolDeselect,
    drawnObjects,
    selectedObject,
  ]);

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

  return (
    <div style={{ position: 'relative' }}>
      {/* ────────────────────────────────────────────────────────────────────────────
          Buttons zum Ein-/Ausblenden der Saisonlinien
          Sie stehen **außerhalb** des Chart-Containers, 
          damit die Chart‐Events (subscribeClick etc.) sie nicht überlagern.
      ──────────────────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '10px' }}>
        {[5, 10, 15, 20].map((yr) => (
          <button
            key={yr}
            onClick={() =>
              setVisibility((prev) => ({ ...prev, [yr]: !prev[yr] }))
            }
            style={{
              marginRight: '8px',
              padding: '5px 10px',
              backgroundColor: visibility[yr] ? '#1976d2' : '#f0f0f0',
              color: visibility[yr] ? '#fff' : '#333',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {yr} Jahre
          </button>
        ))}
      </div>

      {/* Chart‐Container */}
      <div
        ref={chartContainerRef}
        style={{
          width: '100%', // Container nimmt 100% der Elternbreite ein
          height: '800px', // Höhe in Pixel, kann angepasst werden
        }}
      />

      {/* Zeichnungskontextmenü */}
      {menuPosition && selectedObject && (
        <div
          style={{
            position: 'absolute',
            left: menuPosition.x,
            top: menuPosition.y,
            zIndex: 3,
          }}
        >
          <DrawingToolMenu
            tool={selectedObject}
            onUpdate={handleUpdateObject}
            onToggleVisibility={handleToggleVisibility}
            onClose={() => {
              setSelectedObject(null);
              setMenuPosition(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Chart;
