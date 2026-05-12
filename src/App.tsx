import { useState, useEffect, useRef, useMemo } from 'react';
import GridLayout from 'react-grid-layout/legacy';
import { ClockWidget } from './components/ClockWidget';
import { WeatherWidget } from './components/WeatherWidget';
import { CalendarWidget } from './components/CalendarWidget';
import { TasksWidget } from './components/TasksWidget';
import { AgentTasksWidget } from './components/AgentTasksWidget';
import { AgentTaskSidePanel } from './components/AgentTaskSidePanel';
import { SettingsPanel } from './components/SettingsPanel';
import { MCPSync } from './components/MCPSync';
import { WidgetId, useAppStore } from './store/appStore';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const GRID_COLS = 6;
const GRID_ROWS = 6;
const GRID_MARGIN: [number, number] = [18, 18];

const WIDGETS: { id: WidgetId; component: JSX.Element }[] = [
  { id: 'clock', component: <ClockWidget /> },
  { id: 'weather', component: <WeatherWidget /> },
  { id: 'calendar', component: <CalendarWidget /> },
  { id: 'tasks', component: <TasksWidget /> },
  { id: 'agent-tasks', component: <AgentTasksWidget /> },
];

const Grid = GridLayout as any;

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState({ width: 1200, rowHeight: 180 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { widgetLayout, widgetVisibility, widgetOpacity, widgetShadow, setWidgetLayout, editMode } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') setSettingsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const widgets = useMemo(
    () => WIDGETS.filter((widget) => widgetVisibility[widget.id]),
    [widgetVisibility]
  );

  const availableWidgetIds = useMemo(
    () => widgets.map((widget) => widget.id),
    [widgets]
  );

  const currentLayout = useMemo(() => 
    widgetLayout.filter(item => availableWidgetIds.includes(item.id as WidgetId)),
    [widgetLayout, availableWidgetIds]
  );

  const gridLayout = useMemo(() => 
    currentLayout.map(item => ({
      i: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: 1,
      minH: 1,
      static: !editMode,
    })),
    [currentLayout, editMode]
  );

  useEffect(() => {
    const updateGridSize = () => {
      const container = containerRef.current;
      if (!container) return;

      const width = Math.floor(container.clientWidth);
      const height = Math.floor(container.clientHeight);
      const rowHeight = Math.max(
        64,
        Math.floor((height - GRID_MARGIN[1] * (GRID_ROWS - 1)) / GRID_ROWS)
      );

      setGridSize({ width, rowHeight });
    };

    updateGridSize();
    const resizeObserver = new ResizeObserver(updateGridSize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [gridLayout]);

  const handleLayoutChange = (layout: any[]) => {
    const newLayout = layout.map(item => ({
      id: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    setWidgetLayout(newLayout);
  };

  return (
    <div 
      className="helios-root"
      style={{
        '--widget-opacity': widgetOpacity,
        '--widget-shadow-opacity': widgetShadow,
      } as React.CSSProperties}
      onContextMenu={(e) => { e.preventDefault(); setSettingsOpen(true); }}
    >
      <div ref={containerRef} className="helios-grid-frame">
        <Grid
          className={`layout ${editMode ? 'layout-editing' : 'layout-locked'}`}
          layout={gridLayout}
          cols={GRID_COLS}
          rowHeight={gridSize.rowHeight}
          width={Math.max(gridSize.width, 600)}
          onLayoutChange={handleLayoutChange}
          isResizable={editMode}
          isDraggable={editMode}
          compactType={null}
          maxRows={GRID_ROWS}
          containerPadding={[0, 0]}
          margin={GRID_MARGIN}
          useCSSTransforms={true}
        >
          {widgets.map(widget => (
            <div key={widget.id} className="widget-cell">
              {widget.component}
            </div>
          ))}
        </Grid>
      </div>

      <AgentTaskSidePanel />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <MCPSync />
    </div>
  );
}

export default App;
