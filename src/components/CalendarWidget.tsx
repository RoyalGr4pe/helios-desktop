import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, startOfMonth, endOfMonth, eachDayOfInterval as eachDayOfInterval2, isSameDay, isSameMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import { useAppStore } from '../store/appStore';

type CalendarEvent = {
  id: string;
  summary: string;
  start: Date;
};

function normalizeCalendarUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('webcal://')) return `https://${trimmed.slice('webcal://'.length)}`;

  try {
    const url = new URL(trimmed);
    const src = url.hostname === 'calendar.google.com' && url.pathname === '/calendar/embed'
      ? url.searchParams.get('src')
      : null;

    if (src) {
      return `https://calendar.google.com/calendar/ical/${encodeURIComponent(src)}/public/basic.ics`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function isGoogleEmbedUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.hostname === 'calendar.google.com' && url.pathname === '/calendar/embed';
  } catch {
    return false;
  }
}

async function httpGetText(url: string) {
  if (window.electronAPI?.httpGet) {
    const response = await window.electronAPI.httpGet(url);
    if (!response.ok) throw new Error(`Failed to fetch calendar (${response.status})`);
    return response.body;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch calendar (${response.status})`);
  return response.text();
}

function unfoldIcs(ics: string) {
  return ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
}

function readIcsValue(line: string) {
  const index = line.indexOf(':');
  return index === -1 ? '' : line.slice(index + 1).trim();
}

function parseIcsDate(value: string) {
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));

  const dateTime = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!dateTime) return null;

  const [, year, month, day, hour, minute, second] = dateTime;
  if (value.endsWith('Z')) {
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  }

  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

function parseIcsEvents(ics: string) {
  const lines = unfoldIcs(ics);
  const events: CalendarEvent[] = [];
  let current: Partial<CalendarEvent> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (current?.summary && current.start) {
        events.push({
          id: current.id || `${current.summary}-${current.start.getTime()}`,
          summary: current.summary,
          start: current.start,
        });
      }
      current = null;
      continue;
    }

    if (!current) continue;

    if (line.startsWith('UID')) current.id = readIcsValue(line);
    if (line.startsWith('SUMMARY')) current.summary = readIcsValue(line).replace(/\\,/g, ',');
    if (line.startsWith('DTSTART')) {
      const parsed = parseIcsDate(readIcsValue(line));
      if (parsed) current.start = parsed;
    }
  }

  return events;
}

export function CalendarWidget() {
  const { calendarApiKey, calendarIcsUrl, calendarViewMode, setCalendarViewMode } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState('');

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);
  const monthDays = useMemo(() => eachDayOfInterval2({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  const dayStart = useMemo(() => startOfDay(currentDate), [currentDate]);
  const dayEnd = useMemo(() => endOfDay(currentDate), [currentDate]);

  const getDateRange = () => {
    switch (calendarViewMode) {
      case 'day': return { start: dayStart, end: dayEnd };
      case 'week': return { start: weekStart, end: weekEnd };
      case 'month': return { start: monthStart, end: monthEnd };
    }
  };

  const navigatePrev = () => {
    switch (calendarViewMode) {
      case 'day': setCurrentDate(d => subDays(d, 1)); break;
      case 'week': setCurrentDate(d => subWeeks(d, 1)); break;
      case 'month': setCurrentDate(d => subMonths(d, 1)); break;
    }
  };

  const navigateNext = () => {
    switch (calendarViewMode) {
      case 'day': setCurrentDate(d => addDays(d, 1)); break;
      case 'week': setCurrentDate(d => addWeeks(d, 1)); break;
      case 'month': setCurrentDate(d => addMonths(d, 1)); break;
    }
  };

  const getHeaderLabel = () => {
    switch (calendarViewMode) {
      case 'day': return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week': return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month': return format(currentDate, 'MMMM yyyy');
    }
  };

  const dateRange = getDateRange();

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setError('');

      try {
        if (calendarIcsUrl.trim()) {
          const icsUrl = normalizeCalendarUrl(calendarIcsUrl);
          const ics = await httpGetText(icsUrl);
          if (!ics.includes('BEGIN:VCALENDAR')) {
            throw new Error('Calendar URL did not return an iCal feed');
          }
          const parsed = parseIcsEvents(ics)
            .filter((event) => event.start >= dateRange.start && event.start <= dateRange.end)
            .sort((a, b) => a.start.getTime() - b.start.getTime());
          if (!cancelled) setEvents(parsed);
          return;
        }

        if (!calendarApiKey.trim()) {
          if (!cancelled) setEvents([]);
          return;
        }

        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${dateRange.start.toISOString()}&timeMax=${dateRange.end.toISOString()}&singleEvents=true`, {
          headers: { Authorization: `Bearer ${calendarApiKey.trim()}` }
        });
        if (!response.ok) throw new Error('Google Calendar unavailable');
        const data = await response.json();
        const googleEvents = (data.items || []).map((item: any) => ({
          id: item.id,
          summary: item.summary || 'Untitled event',
          start: new Date(item.start?.dateTime || item.start?.date),
        }));
        if (!cancelled) setEvents(googleEvents);
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setError(isGoogleEmbedUrl(calendarIcsUrl)
            ? 'Google embed URLs are not iCal feeds. Use the secret iCal address or a public iCal address.'
            : err instanceof Error ? err.message : 'Unable to load calendar');
        }
      }
    };

    loadEvents();
    return () => { cancelled = true; };
  }, [calendarApiKey, calendarIcsUrl, dateRange.start, dateRange.end]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel calendar-panel">
      <div className="calendar-header">
        <span className="widget-title">Calendar</span>
        <div className="flex gap-1">
          <button onClick={navigatePrev} className="panel-button">‹</button>
          <span className="calendar-nav-label">{getHeaderLabel()}</span>
          <button onClick={navigateNext} className="panel-button">›</button>
        </div>
        <div className="flex gap-1">
          {(['day', 'week', 'month'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setCalendarViewMode(mode)}
              className={`panel-button text-xs px-2 ${calendarViewMode === mode ? 'bg-indigo-500/40' : ''}`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {calendarViewMode === 'week' && (
        <div className="calendar-grid">
          {weekDays.map(day => {
            const dayEvents = events.filter(e => isSameDay(e.start, day));
            return (
              <div key={day.toISOString()} className={`calendar-day ${isToday(day) ? 'is-today' : ''}`}>
                <div className="calendar-day-label">{format(day, 'E')[0]}</div>
                <div className="calendar-day-number">{format(day, 'd')}</div>
                {dayEvents.slice(0, 2).map((event) => (
                  <div key={event.id} className="event-title text-xs truncate">{event.summary}</div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {calendarViewMode === 'month' && (
        <div className="calendar-month-grid">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="calendar-month-header">{d}</div>
          ))}
          {(() => {
            const startDay = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
            const prevDays: Date[] = [];
            for (let i = startDay - 1; i >= 0; i--) {
              prevDays.push(subDays(monthStart, i + 1));
            }
            const allDays = [...prevDays, ...monthDays];
            const remaining = 42 - allDays.length;
            for (let i = 1; i <= remaining; i++) {
              allDays.push(addDays(monthEnd, i));
            }
            return allDays.map(day => {
              const dayEvents = events.filter(e => isSameDay(e.start, day));
              const isCurrentMonth = isSameMonth(day, currentDate);
              return (
                <div
                  key={day.toISOString()}
                  className={`calendar-month-day ${isToday(day) ? 'is-today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                >
                  <span className="text-xs">{format(day, 'd')}</span>
                  {dayEvents.length > 0 && <span className="text-xs text-indigo-400">•</span>}
                </div>
              );
            });
          })()}
        </div>
      )}

      {calendarViewMode === 'day' && (
        <div className="calendar-day-view">
          {events.length === 0 ? (
            <div className="widget-muted">No events</div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="event-row">
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-400" />
                <div className="event-title">{format(event.start, 'h:mm a')} - {event.summary}</div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
