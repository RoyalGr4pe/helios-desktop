import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
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
  const { calendarApiKey, calendarIcsUrl } = useAppStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState('');
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

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
            .filter((event) => event.start >= weekStart && event.start <= weekEnd)
            .sort((a, b) => a.start.getTime() - b.start.getTime());
          if (!cancelled) setEvents(parsed);
          return;
        }

        if (!calendarApiKey.trim()) {
          if (!cancelled) setEvents([]);
          return;
        }

        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${weekStart.toISOString()}&timeMax=${weekEnd.toISOString()}&singleEvents=true`, {
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
  }, [calendarApiKey, calendarIcsUrl, weekStart, weekEnd]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel calendar-panel">
      <div className="calendar-header">
        <span className="widget-title">Calendar</span>
        <div className="flex gap-1">
          <button onClick={() => setWeekStart(new Date(weekStart.getTime() - 7*86400000))} className="panel-button">‹</button>
          <button onClick={() => setWeekStart(new Date(weekStart.getTime() + 7*86400000))} className="panel-button">›</button>
        </div>
      </div>
      <div className="calendar-grid">
        {weekDays.map(day => (
          <div key={day.toISOString()} className={`calendar-day ${isToday(day) ? 'is-today' : ''}`}>
            <div className="calendar-day-label">{format(day, 'E')[0]}</div>
            <div className="calendar-day-number">{format(day, 'd')}</div>
          </div>
        ))}
      </div>
      <div className="event-list">
        {error ? <div className="widget-muted">{error}</div> : events.length === 0 ? <div className="widget-muted">No events</div> : 
          events.slice(0,3).map((event) => (
            <div key={event.id} className="event-row">
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-400" />
              <div className="event-title">{event.summary}</div>
            </div>
          ))}
      </div>
    </motion.div>
  );
}
