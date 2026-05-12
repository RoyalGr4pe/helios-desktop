import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useAppStore } from '../store/appStore';

export function ClockWidget() {
  const { timeFormat, showDate } = useAppStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayTime = timeFormat === '12h' ? format(time, 'h:mm a') : format(time, 'HH:mm');
  const displayDate = format(time, 'EEEE, MMMM d');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel clock-panel"
    >
      <div className="clock-time">{displayTime}</div>
      {showDate && (
        <div className="clock-date">{displayDate}</div>
      )}
    </motion.div>
  );
}
