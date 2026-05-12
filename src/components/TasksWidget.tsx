import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';

export function TasksWidget() {
  const { tasks, addTask, toggleTask, deleteTask } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newTask.trim();
    if (!text) return;

    addTask(text);
    setNewTask('');
    setIsAdding(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel tasks-panel">
      <div className="tasks-header">
        <h3 className="widget-title">Tasks</h3>
        <button
          className="tasks-add"
          onClick={() => setIsAdding((value) => !value)}
          aria-label={isAdding ? 'Cancel adding task' : 'Add task'}
        >
          {isAdding ? '×' : '+'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isAdding && (
          <motion.form
            key="task-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="tasks-form"
          >
            <input
              autoFocus
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setNewTask('');
                  setIsAdding(false);
                }
              }}
              placeholder="New task..."
              className="tasks-input"
            />
            <button className="tasks-add" type="submit">Add</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="task-list">
        <AnimatePresence>
          {tasks.map(task => (
            <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="task-row">
              <button onClick={() => toggleTask(task.id)} className={`task-checkbox ${task.completed ? 'done' : ''}`}>
                {task.completed && <span className="text-white">✓</span>}
              </button>
              <span className={`task-text ${task.completed ? 'completed' : ''}`}>{task.text}</span>
              <button onClick={() => deleteTask(task.id)} className="task-delete">×</button>
            </motion.div>
          ))}
        </AnimatePresence>
        {tasks.length === 0 && <div className="widget-muted text-center">No tasks</div>}
      </div>

      <div className="widget-muted">{tasks.filter(t => !t.completed).length} remaining</div>
    </motion.div>
  );
}
