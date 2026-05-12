import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export interface AgentTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  description?: string;
  agent?: string;
  ownerId?: string;
  completedAt?: number | null;
  stale?: boolean;
  staleSince?: number | null;
  staleReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  humidity: number;
  wind: number;
  location: string;
  lastUpdated: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
}

export interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type WidgetId = 'clock' | 'weather' | 'calendar' | 'tasks' | 'agent-tasks';

export type WidgetVisibility = Record<WidgetId, boolean>;

export const DEFAULT_WIDGET_LAYOUT: WidgetLayout[] = [
  { id: 'clock', x: 0, y: 0, w: 2, h: 1 },
  { id: 'weather', x: 2, y: 0, w: 1, h: 1 },
  { id: 'calendar', x: 3, y: 0, w: 3, h: 2 },
  { id: 'tasks', x: 0, y: 1, w: 3, h: 2 },
  { id: 'agent-tasks', x: 3, y: 2, w: 3, h: 1 },
];

export const DEFAULT_WIDGET_VISIBILITY: WidgetVisibility = {
  clock: true,
  weather: true,
  calendar: true,
  tasks: true,
  'agent-tasks': false,
};

interface AppState {
  timeFormat: '12h' | '24h';
  showSeconds: boolean;
  showDate: boolean;
  weatherUnit: 'metric' | 'imperial';
  weatherApiKey: string;
  weatherLocation: string;
  weatherUseCurrentLocation: boolean;
  calendarApiKey: string;
  calendarIcsUrl: string;
  calendarViewMode: 'day' | 'week' | 'month';
  tasks: Task[];
  agentTasks: AgentTask[];
  agentTasksEnabled: boolean;
  weather: WeatherData | null;
  widgetLayout: WidgetLayout[];
  widgetVisibility: WidgetVisibility;
  widgetOpacity: number;
  widgetShadow: number;
  editMode: boolean;
  selectedAgentTask: AgentTask | null;

  setTimeFormat: (format: '12h' | '24h') => void;
  setShowSeconds: (show: boolean) => void;
  setShowDate: (show: boolean) => void;
  setWeatherUnit: (unit: 'metric' | 'imperial') => void;
  setWeatherApiKey: (key: string) => void;
  setWeatherLocation: (location: string) => void;
  setWeatherUseCurrentLocation: (enabled: boolean) => void;
  setCalendarApiKey: (key: string) => void;
  setCalendarIcsUrl: (url: string) => void;
  setCalendarViewMode: (mode: 'day' | 'week' | 'month') => void;
  setWeather: (weather: WeatherData | null) => void;
  setAgentTasks: (tasks: AgentTask[]) => void;
  setAgentTasksEnabled: (enabled: boolean) => void;
  setWidgetLayout: (layout: WidgetLayout[]) => void;
  setWidgetVisible: (id: WidgetId, visible: boolean) => void;
  setWidgetOpacity: (opacity: number) => void;
  setWidgetShadow: (shadow: number) => void;
  resetWidgetLayout: () => void;
  setEditMode: (enabled: boolean) => void;
  setSelectedAgentTask: (task: AgentTask | null) => void;

  addTask: (text: string, priority?: Task['priority']) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (tasks: Task[]) => void;

  addAgentTask: (title: string, description?: string, agent?: string) => void;
  updateAgentTask: (id: string, updates: Partial<AgentTask>) => void;
  deleteAgentTask: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      timeFormat: '24h',
      showSeconds: false,
      showDate: true,
      weatherUnit: 'metric',
      weatherApiKey: '',
      weatherLocation: '',
      weatherUseCurrentLocation: false,
      calendarApiKey: '',
      calendarIcsUrl: '',
      calendarViewMode: 'week',
      tasks: [],
      agentTasks: [],
      agentTasksEnabled: false,
      weather: null,
      widgetLayout: DEFAULT_WIDGET_LAYOUT,
      widgetVisibility: DEFAULT_WIDGET_VISIBILITY,
      widgetOpacity: 0.36,
      widgetShadow: 0.18,
      editMode: false,
      selectedAgentTask: null,

      setTimeFormat: (format) => set({ timeFormat: format }),
      setShowSeconds: (show) => set({ showSeconds: show }),
      setShowDate: (show) => set({ showDate: show }),
      setWeatherUnit: (unit) => set({ weatherUnit: unit }),
      setWeatherApiKey: (key) => set({ weatherApiKey: key }),
      setWeatherLocation: (location) => set({ weatherLocation: location }),
      setWeatherUseCurrentLocation: (enabled) => set({ weatherUseCurrentLocation: enabled }),
      setCalendarApiKey: (key) => set({ calendarApiKey: key }),
      setCalendarIcsUrl: (url) => set({ calendarIcsUrl: url }),
      setCalendarViewMode: (mode) => set({ calendarViewMode: mode }),
      setWeather: (weather) => set({ weather }),
      setAgentTasks: (agentTasks) => set((state) => ({
        agentTasks,
        selectedAgentTask: state.selectedAgentTask
          ? agentTasks.find((task) => task.id === state.selectedAgentTask?.id) ?? null
          : null,
      })),
      setAgentTasksEnabled: (enabled) => set((state) => ({
        agentTasksEnabled: enabled,
        widgetVisibility: { ...state.widgetVisibility, 'agent-tasks': enabled },
      })),
      setWidgetLayout: (layout) => set({ widgetLayout: layout }),
      setWidgetVisible: (id, visible) => set((state) => ({
        widgetVisibility: { ...state.widgetVisibility, [id]: visible },
        agentTasksEnabled: id === 'agent-tasks' ? visible : state.agentTasksEnabled,
      })),
      setWidgetOpacity: (opacity) => set({ widgetOpacity: opacity }),
      setWidgetShadow: (shadow) => set({ widgetShadow: shadow }),
      resetWidgetLayout: () => set({ widgetLayout: DEFAULT_WIDGET_LAYOUT }),
      setEditMode: (enabled) => set({ editMode: enabled }),
      setSelectedAgentTask: (task) => set({ selectedAgentTask: task }),

      addTask: (text, priority = 'medium') => set((state) => ({
        tasks: [...state.tasks, {
          id: Date.now().toString(),
          text,
          completed: false,
          priority,
          createdAt: Date.now(),
        }],
      })),
      toggleTask: (id) => set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
        ),
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      })),
      reorderTasks: (tasks) => set({ tasks }),

      addAgentTask: (title, description, agent) => set((state) => ({
        agentTasks: [...state.agentTasks, {
          id: `agent-${Date.now()}`,
          title,
          status: 'pending',
          description,
          agent,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }],
      })),
      updateAgentTask: (id, updates) => set((state) => ({
        agentTasks: state.agentTasks.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
        ),
        selectedAgentTask: state.selectedAgentTask?.id === id
          ? { ...state.selectedAgentTask, ...updates, updatedAt: Date.now() }
          : state.selectedAgentTask,
      })),
      deleteAgentTask: (id) => set((state) => ({
        agentTasks: state.agentTasks.filter((t) => t.id !== id),
        selectedAgentTask: state.selectedAgentTask?.id === id ? null : state.selectedAgentTask,
      })),
    }),
    {
      name: 'helios-storage',
      version: 6,
      migrate: (persistedState: unknown, version) => {
        if (persistedState && typeof persistedState === 'object') {
          const state = persistedState as Partial<AppState>;
          return {
            ...state,
            widgetLayout: version < 2 ? DEFAULT_WIDGET_LAYOUT : state.widgetLayout ?? DEFAULT_WIDGET_LAYOUT,
            widgetVisibility: {
              ...DEFAULT_WIDGET_VISIBILITY,
              ...(state.widgetVisibility ?? {}),
              'agent-tasks': state.widgetVisibility?.['agent-tasks'] ?? state.agentTasksEnabled ?? false,
            },
            widgetOpacity: state.widgetOpacity ?? 0.36,
            widgetShadow: state.widgetShadow ?? 0.18,
            weatherUseCurrentLocation: state.weatherUseCurrentLocation ?? false,
            calendarIcsUrl: state.calendarIcsUrl ?? '',
          };
        }
        return persistedState as AppState;
      },
    }
  )
);
