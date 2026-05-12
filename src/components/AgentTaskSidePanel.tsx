import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/50',
  in_progress: 'bg-blue-500/50',
  completed: 'bg-green-500/50',
  failed: 'bg-red-500/50',
};

export function AgentTaskSidePanel() {
  const { selectedAgentTask, setSelectedAgentTask, updateAgentTask, deleteAgentTask } = useAppStore();

  if (!selectedAgentTask) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="fixed right-0 top-0 h-full w-80 glass-panel-dark p-5 z-40 overflow-y-auto"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white/90 font-medium">Task Details</h3>
          <button
            onClick={() => setSelectedAgentTask(null)}
            className="text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-white/50 text-xs">Title</label>
            <div className="text-white font-medium">{selectedAgentTask.title}</div>
          </div>

          <div>
            <label className="text-white/50 text-xs">Status</label>
            <div className="flex gap-2 mt-1">
              {(['pending', 'in_progress', 'completed', 'failed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => updateAgentTask(selectedAgentTask.id, { status })}
                  className={`px-2 py-1 rounded text-xs ${
                    selectedAgentTask.status === status
                      ? statusColors[status] + ' ring-1 ring-white/30'
                      : 'bg-white/10 text-white/50 hover:text-white'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {selectedAgentTask.description && (
            <div>
              <label className="text-white/50 text-xs">Description</label>
              <div className="text-white/80 text-sm mt-1 whitespace-pre-wrap">
                {selectedAgentTask.description}
              </div>
            </div>
          )}

          {selectedAgentTask.agent && (
            <div>
              <label className="text-white/50 text-xs">Agent</label>
              <div className="text-white/80 text-sm mt-1">{selectedAgentTask.agent}</div>
            </div>
          )}

          {selectedAgentTask.ownerId && (
            <div>
              <label className="text-white/50 text-xs">Owner</label>
              <div className="text-white/80 text-sm mt-1 break-all">{selectedAgentTask.ownerId}</div>
            </div>
          )}

          {selectedAgentTask.stale && (
            <div>
              <label className="text-white/50 text-xs">Stale</label>
              <div className="text-orange-300 text-sm mt-1">{selectedAgentTask.staleReason || 'Task has not been updated recently'}</div>
            </div>
          )}

          {selectedAgentTask.completedAt && (
            <div>
              <label className="text-white/50 text-xs">Completed</label>
              <div className="text-white/60 text-sm mt-1">
                {new Date(selectedAgentTask.completedAt).toLocaleString()}
              </div>
            </div>
          )}

          <div>
            <label className="text-white/50 text-xs">Created</label>
            <div className="text-white/60 text-sm mt-1">
              {new Date(selectedAgentTask.createdAt).toLocaleString()}
            </div>
          </div>

          <div>
            <label className="text-white/50 text-xs">Updated</label>
            <div className="text-white/60 text-sm mt-1">
              {new Date(selectedAgentTask.updatedAt).toLocaleString()}
            </div>
          </div>

          <button
            onClick={() => {
              deleteAgentTask(selectedAgentTask.id);
              setSelectedAgentTask(null);
            }}
            className="w-full mt-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
          >
            Delete Task
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
