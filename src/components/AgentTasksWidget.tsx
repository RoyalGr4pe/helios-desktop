import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore';

const statusColors: Record<string, string> = { pending: 'rgba(234,179,8,0.5)', in_progress: 'rgba(59,130,246,0.5)', completed: 'rgba(34,197,94,0.5)', failed: 'rgba(239,68,68,0.5)' };
const statusLabels: Record<string, string> = { pending: 'Pending', in_progress: 'In Progress', completed: 'Done', failed: 'Failed' };

export function AgentTasksWidget() {
  const { agentTasks, setSelectedAgentTask } = useAppStore();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel agent-panel">
      <div className="agent-header">
        <h3 className="widget-title">Agent Tasks</h3>
      </div>
      <div className="agent-list">
        {agentTasks.length === 0 ? (
          <div className="widget-muted text-center">No agent tasks. Local API on 3847.</div>
        ) : (
          agentTasks.map(task => (
            <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setSelectedAgentTask(task)}
              className="agent-row cursor-pointer">
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="agent-title">{task.title}</span>
                <div className="flex flex-shrink-0 gap-1">
                  {task.stale && <span className="status-badge" style={{ background: 'rgba(249,115,22,0.55)' }}>Stale</span>}
                  <span className="status-badge" style={{ background: statusColors[task.status] }}>{statusLabels[task.status]}</span>
                </div>
              </div>
              {task.agent && <div className="widget-muted">Agent: {task.agent}</div>}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
