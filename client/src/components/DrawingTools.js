import React, { useState } from 'react';
import './DrawingTools.css';

const DrawingTools = ({ onToolSelect, onCategoryClose }) => {
  const [activeCategory, setActiveCategory] = useState(null);

  const tools = {
    lines: [
      { name: 'Trendlinie', key: 'trendline' },
      { name: 'Strahl', key: 'ray' },
      { name: 'Info Linie', key: 'infoLine' },
      { name: 'Verlängerte Linie', key: 'extendedLine' },
      { name: 'Trendwinkel', key: 'trendAngle' },
      { name: 'Horizontale Linie', key: 'horizontalLine' },
      { name: 'Unterstützung/Widerstandslinie', key: 'supportResistance' },
      { name: 'Vertikale Linie', key: 'verticalLine' },
      { name: 'Fadenkreuz', key: 'crosshair' },
    ],
    channels: [
      { name: 'Paralleler Kanal', key: 'parallelChannel' },
      { name: 'Regressionstrend', key: 'regressionTrend' },
      { name: 'Flat Top/Bottom', key: 'flatTopBottom' },
      { name: 'Entkoppeler Kanal', key: 'disjointChannel' },
    ],
    pitchforks: [
      { name: 'Pitchfork', key: 'pitchfork' },
      { name: 'Schiff-Pitchfork', key: 'schiffPitchfork' },
      { name: 'Modifizierte Schiff-Pitchfork', key: 'modifiedSchiffPitchfork' },
      { name: 'Innerhalb der Pitchfork', key: 'insidePitchfork' },
    ],
  };

  const toggleCategory = (category) => {
    setActiveCategory(activeCategory === category ? null : category);
  };

  const handleToolSelect = (tool) => {
    onToolSelect(tool);
    setActiveCategory(null); // Untermenü schließen
    // onCategoryClose wird jetzt nicht direkt aufgerufen
  };

  return (
    <div className="drawing-tools">
      <div className="tool-category">
        <button onClick={() => toggleCategory('lines')}>
          <span role="img" aria-label="Linien">
            📏
          </span>{' '}
          Linien
        </button>
        {activeCategory === 'lines' && (
          <div className="sub-tools">
            {tools.lines.map((tool) => (
              <button key={tool.key} onClick={() => handleToolSelect(tool.key)}>
                {tool.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="tool-category">
        <button onClick={() => toggleCategory('channels')}>
          <span role="img" aria-label="Kanäle">
            📐
          </span>{' '}
          Kanäle
        </button>
        {activeCategory === 'channels' && (
          <div className="sub-tools">
            {tools.channels.map((tool) => (
              <button key={tool.key} onClick={() => handleToolSelect(tool.key)}>
                {tool.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="tool-category">
        <button onClick={() => toggleCategory('pitchforks')}>
          <span role="img" aria-label="Pitchforks">
            🔱
          </span>{' '}
          Pitchforks
        </button>
        {activeCategory === 'pitchforks' && (
          <div className="sub-tools">
            {tools.pitchforks.map((tool) => (
              <button key={tool.key} onClick={() => handleToolSelect(tool.key)}>
                {tool.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingTools;
