import { useEffect } from 'react';
import { AgentTask, useAppStore } from '../store/appStore';

const MCP_URL = 'http://localhost:3847';
const VALID_STATUSES = new Set(['pending', 'in_progress', 'completed', 'failed']);

function normalizeTask(task: any, index: number): AgentTask {
  const now = Date.now();
  const status = VALID_STATUSES.has(task.status) ? task.status : 'pending';

  return {
    id: String(task.id || `agent-${now}-${index}`),
    title: String(task.title || 'Untitled Task'),
    status,
    description: task.description ? String(task.description) : '',
    agent: task.agent ? String(task.agent) : 'external',
    ownerId: task.ownerId ? String(task.ownerId) : undefined,
    completedAt: Number(task.completedAt) || null,
    stale: Boolean(task.stale),
    staleSince: Number(task.staleSince) || null,
    staleReason: task.staleReason ? String(task.staleReason) : '',
    createdAt: Number(task.createdAt) || now,
    updatedAt: Number(task.updatedAt) || now,
  };
}

export function MCPSync() {
  const { setAgentTasks, widgetVisibility } = useAppStore();
  const agentTasksEnabled = widgetVisibility['agent-tasks'];

  useEffect(() => {
    if (!agentTasksEnabled) return;

    const fetchTasks = async () => {
      try {
        const res = await fetch(`${MCP_URL}/tasks`);
        if (!res.ok) return;
        const mcpTasks = await res.json();
        if (Array.isArray(mcpTasks)) setAgentTasks(mcpTasks.map(normalizeTask));
      } catch (e) {
        // MCP server not running
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [agentTasksEnabled, setAgentTasks]);

  return null;
}
