import React from 'react';
import './DrawingToolMenu.css';

const DrawingToolMenu = ({ tool, onUpdate, onClose }) => {
  const [color, setColor] = React.useState(tool.color || '#000000');
  const [thickness, setThickness] = React.useState(tool.lineWidth || 2);
  const [transparency, setTransparency] = React.useState(
    tool.transparency || 1
  );
  const [priority, setPriority] = React.useState(tool.priority || 'foreground');
  const [visible, setVisible] = React.useState(tool.visible !== false);

  const handleUpdate = () => {
    onUpdate({
      color,
      lineWidth: thickness,
      transparency,
      priority,
      visible,
    });
    onClose();
  };

  return (
    <div className="drawing-tool-menu">
      <h4>Tool-Einstellungen</h4>
      <div>
        <label>Farbe: </label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </div>
      <div>
        <label>Dicke: </label>
        <input
          type="range"
          min="1"
          max="10"
          value={thickness}
          onChange={(e) => setThickness(Number(e.target.value))}
        />
      </div>
      <div>
        <label>Transparenz: </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={transparency}
          onChange={(e) => setTransparency(Number(e.target.value))}
        />
      </div>
      <div>
        <label>Priorität: </label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="foreground">Vordergrund</option>
          <option value="background">Hintergrund</option>
        </select>
      </div>
      <div>
        <label>Sichtbar: </label>
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
        />
      </div>
      <div>
        <button onClick={handleUpdate}>Übernehmen</button>
        <button onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
};

export default DrawingToolMenu;
