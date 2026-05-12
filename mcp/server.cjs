const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.HELIOS_MCP_PORT) || 3847;
const STORE_FILE = process.env.HELIOS_TASK_STORE_FILE || path.join(__dirname, 'task-store.json');
const COMPLETED_TTL_MS = Number(process.env.HELIOS_COMPLETED_TTL_MS) || 3 * 60 * 60 * 1000;
const STALE_AFTER_MS = Number(process.env.HELIOS_TASK_STALE_MS) || 60 * 60 * 1000;
const VALID_STATUSES = new Set(['pending', 'in_progress', 'completed', 'failed']);

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeTask(task, now = Date.now()) {
  const status = VALID_STATUSES.has(task.status) ? task.status : 'pending';
  return {
    id: asString(task.id, `agent-${now}`),
    title: asString(task.title, 'Untitled Task'),
    status,
    description: asString(task.description),
    agent: asString(task.agent, 'external'),
    ownerId: asString(task.ownerId, asString(task.agent, 'external')),
    ownerToken: asString(task.ownerToken),
    stale: Boolean(task.stale),
    staleSince: Number(task.staleSince) || null,
    staleReason: asString(task.staleReason),
    completedAt: Number(task.completedAt) || (status === 'completed' ? Number(task.updatedAt) || now : null),
    createdAt: Number(task.createdAt) || now,
    updatedAt: Number(task.updatedAt) || now,
  };
}

function taskForResponse(task) {
  const { ownerToken, ...safeTask } = task;
  return safeTask;
}

function applyLifecycle(data) {
  const now = Date.now();
  const tasks = Array.isArray(data.tasks) ? data.tasks.map(task => normalizeTask(task, now)) : [];
  let changed = tasks.length !== (Array.isArray(data.tasks) ? data.tasks.length : 0);
  const nextTasks = [];

  for (const task of tasks) {
    if (task.status === 'completed') {
      task.completedAt = Number(task.completedAt) || task.updatedAt || now;
      if (now - task.completedAt >= COMPLETED_TTL_MS) {
        changed = true;
        continue;
      }
    }

    const isStale = ['pending', 'in_progress'].includes(task.status) && now - task.updatedAt >= STALE_AFTER_MS;
    const staleSince = isStale ? (task.staleSince || now) : null;
    const staleReason = isStale ? `No update for ${Math.floor((now - task.updatedAt) / 60000)} minutes` : '';

    if (task.stale !== isStale || task.staleSince !== staleSince || task.staleReason !== staleReason) {
      changed = true;
      task.stale = isStale;
      task.staleSince = staleSince;
      task.staleReason = staleReason;
    }

    nextTasks.push(task);
  }

  return { data: { tasks: nextTasks }, changed };
}

function loadTasks() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const lifecycle = applyLifecycle(JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8')));
      if (lifecycle.changed) saveTasks(lifecycle.data);
      return lifecycle.data;
    }
  } catch (e) {}
  return { tasks: [] };
}

function saveTasks(data) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

function createResponse(id, result) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    result
  });
}

function createErrorResponse(id, code, message) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message }
  });
}

function getRequestOwner(req, url, body = {}) {
  return {
    ownerId: asString(req.headers['x-helios-agent-owner'] || url.searchParams.get('ownerId') || body.ownerId),
    ownerToken: asString(req.headers['x-helios-agent-token'] || url.searchParams.get('ownerToken') || body.ownerToken),
  };
}

function canModifyTask(task, owner) {
  if (task.ownerToken) return owner.ownerToken === task.ownerToken;
  if (task.ownerId) return owner.ownerId === task.ownerId;
  return true;
}

function applyUpdates(task, updates) {
  const now = Date.now();
  const next = { ...task };

  if (typeof updates.title === 'string') next.title = asString(updates.title, next.title);
  if (typeof updates.description === 'string') next.description = updates.description;
  if (typeof updates.agent === 'string') next.agent = asString(updates.agent, next.agent);
  if (VALID_STATUSES.has(updates.status)) {
    next.status = updates.status;
    next.completedAt = updates.status === 'completed' ? (next.completedAt || now) : null;
  }

  next.stale = false;
  next.staleSince = null;
  next.staleReason = '';
  next.updatedAt = now;
  return next;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Helios-Agent-Owner, X-Helios-Agent-Token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      server: 'helios-mcp',
      completedTtlMs: COMPLETED_TTL_MS,
      staleAfterMs: STALE_AFTER_MS,
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/tasks') {
    const data = loadTasks();
    sendJson(res, 200, data.tasks.map(taskForResponse));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/tasks/stale') {
    const data = loadTasks();
    sendJson(res, 200, data.tasks.filter(task => task.stale).map(taskForResponse));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/tasks') {
    try {
      const task = await readJson(req);
      const now = Date.now();
      const newTask = normalizeTask({
        id: `agent-${now}-${Math.random().toString(36).slice(2, 8)}`,
        title: task.title,
        status: VALID_STATUSES.has(task.status) ? task.status : 'pending',
        description: task.description,
        agent: task.agent,
        ownerId: task.ownerId || task.agent,
        ownerToken: task.ownerToken,
        completedAt: task.status === 'completed' ? now : null,
        createdAt: now,
        updatedAt: now,
      }, now);

      const data = loadTasks();
      data.tasks.push(newTask);
      saveTasks(data);
      sendJson(res, 201, taskForResponse(newTask));
    } catch (e) {
      sendJson(res, 400, { error: 'Invalid request body' });
    }
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/tasks/')) {
    try {
      const id = decodeURIComponent(url.pathname.slice('/tasks/'.length));
      const updates = await readJson(req);
      const data = loadTasks();
      const idx = data.tasks.findIndex(t => t.id === id);
      if (idx === -1) {
        sendJson(res, 404, { error: 'Task not found' });
        return;
      }

      if (!canModifyTask(data.tasks[idx], getRequestOwner(req, url, updates))) {
        sendJson(res, 403, { error: 'Task belongs to another agent owner' });
        return;
      }

      data.tasks[idx] = applyUpdates(data.tasks[idx], updates);
      saveTasks(data);
      sendJson(res, 200, taskForResponse(data.tasks[idx]));
    } catch (e) {
      sendJson(res, 400, { error: 'Invalid request body' });
    }
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/tasks/')) {
    const id = decodeURIComponent(url.pathname.slice('/tasks/'.length));
    const data = loadTasks();
    const idx = data.tasks.findIndex(t => t.id === id);
    if (idx === -1) {
      sendJson(res, 404, { error: 'Task not found' });
      return;
    }

    if (!canModifyTask(data.tasks[idx], getRequestOwner(req, url))) {
      sendJson(res, 403, { error: 'Task belongs to another agent owner' });
      return;
    }

    data.tasks.splice(idx, 1);
    saveTasks(data);
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404);
  res.end();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Helios MCP server already running on port ${PORT}`);
    process.exit(0);
  }

  throw err;
});

server.listen(PORT, () => {
  console.log(`Helios MCP server running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET  /health        - Health check`);
  console.log(`  GET  /tasks         - List all tasks`);
  console.log(`  GET  /tasks/stale   - List stale active tasks`);
  console.log(`  POST /tasks         - Create new task`);
  console.log(`  PATCH /tasks/:id    - Update task`);
  console.log(`  DELETE /tasks/:id   - Delete task`);
  console.log(`Lifecycle:`);
  console.log(`  Completed tasks are removed after ${Math.round(COMPLETED_TTL_MS / 60000)} minutes`);
  console.log(`  Active tasks are marked stale after ${Math.round(STALE_AFTER_MS / 60000)} minutes without updates`);
});
