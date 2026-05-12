import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const store = useAppStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel-dark p-6 w-[400px] max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-white">Settings</h2>
              <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="text-white/70 text-sm font-medium mb-3">Widgets</h3>
                <div className="space-y-3">
                  {[
                    ['clock', 'Clock'],
                    ['weather', 'Weather'],
                    ['calendar', 'Calendar'],
                    ['tasks', 'Tasks'],
                    ['agent-tasks', 'Agent Tasks'],
                  ].map(([id, label]) => (
                    <label key={id} className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">{label}</span>
                      <input
                        type="checkbox"
                        checked={store.widgetVisibility[id as keyof typeof store.widgetVisibility]}
                        onChange={(e) => store.setWidgetVisible(id as keyof typeof store.widgetVisibility, e.target.checked)}
                        className="accent-white"
                      />
                    </label>
                  ))}
                  <label className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Widget Opacity</span>
                      <span className="text-white/40 text-xs">{Math.round(store.widgetOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="0.9"
                      step="0.05"
                      value={store.widgetOpacity}
                      onChange={(e) => store.setWidgetOpacity(Number(e.target.value))}
                      className="accent-white"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Widget Shadow</span>
                      <span className="text-white/40 text-xs">{Math.round(store.widgetShadow * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.05"
                      value={store.widgetShadow}
                      onChange={(e) => store.setWidgetShadow(Number(e.target.value))}
                      className="accent-white"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="text-white/70 text-sm font-medium mb-3">Clock</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Time Format</span>
                    <select
                      value={store.timeFormat}
                      onChange={(e) => store.setTimeFormat(e.target.value as '12h' | '24h')}
                      className="bg-white/10 border border-white/10 rounded px-2 py-1 text-white text-sm"
                    >
                      <option value="12h">12 hour</option>
                      <option value="24h">24 hour</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Show Seconds</span>
                    <input
                      type="checkbox"
                      checked={store.showSeconds}
                      onChange={(e) => store.setShowSeconds(e.target.checked)}
                      className="accent-white"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Show Date</span>
                    <input
                      type="checkbox"
                      checked={store.showDate}
                      onChange={(e) => store.setShowDate(e.target.checked)}
                      className="accent-white"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="text-white/70 text-sm font-medium mb-3">Weather</h3>
                <div className="space-y-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-white/60 text-sm">OpenWeather API Key</span>
                    <input
                      type="password"
                      value={store.weatherApiKey}
                      onChange={(e) => store.setWeatherApiKey(e.target.value)}
                      placeholder="Enter API key"
                      className="bg-white/10 border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-white/30"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-white/60 text-sm">Location</span>
                    <input
                      type="text"
                      value={store.weatherLocation}
                      onChange={(e) => store.setWeatherLocation(e.target.value)}
                      disabled={store.weatherUseCurrentLocation}
                      placeholder="e.g., Durham, UK"
                      className="bg-white/10 border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-white/30"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Use Device Location</span>
                    <input
                      type="checkbox"
                      checked={store.weatherUseCurrentLocation}
                      onChange={(e) => store.setWeatherUseCurrentLocation(e.target.checked)}
                      className="accent-white"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Units</span>
                    <select
                      value={store.weatherUnit}
                      onChange={(e) => store.setWeatherUnit(e.target.value as 'metric' | 'imperial')}
                      className="bg-white/10 border border-white/10 rounded px-2 py-1 text-white text-sm"
                    >
                      <option value="metric">Metric (°C)</option>
                      <option value="imperial">Imperial (°F)</option>
                    </select>
                  </label>
                </div>
              </section>

              <section>
                <h3 className="text-white/70 text-sm font-medium mb-3">Calendar</h3>
                <div className="space-y-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-white/60 text-sm">iCal / ICS URL</span>
                    <input
                      type="url"
                      value={store.calendarIcsUrl}
                      onChange={(e) => store.setCalendarIcsUrl(e.target.value)}
                      placeholder="https://.../calendar.ics"
                      className="bg-white/10 border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-white/30"
                    />
                    <span className="text-white/40 text-xs">Use an iCal/.ics link, not a Google embed URL. Google calls this the secret address in iCal format.</span>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-white/60 text-sm">Google Calendar API Key (optional)</span>
                    <input
                      type="password"
                      value={store.calendarApiKey}
                      onChange={(e) => store.setCalendarApiKey(e.target.value)}
                      placeholder="Enter API key"
                      className="bg-white/10 border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-white/30"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="text-white/70 text-sm font-medium mb-3">Agent Tasks (MCP)</h3>
                <p className="text-white/40 text-xs">
                  Enable the Agent Tasks widget above to show tasks synced from the local task API. Helios starts it automatically on port 3847.
                </p>
              </section>

              <section>
                <h3 className="text-white/70 text-sm font-medium mb-3">Layout</h3>
                <label className="mb-3 flex items-center justify-between">
                  <span className="text-white/60 text-sm">Edit Mode</span>
                  <input
                    type="checkbox"
                    checked={store.editMode}
                    onChange={(e) => store.setEditMode(e.target.checked)}
                    className="accent-white"
                  />
                </label>
                <p className="mb-3 text-white/40 text-xs">
                  Enable to move and resize widgets. Disable to lock the dashboard.
                </p>
                <button
                  onClick={() => {
                    store.resetWidgetLayout();
                  }}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-sm transition-colors"
                >
                  Reset Widget Layout
                </button>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
