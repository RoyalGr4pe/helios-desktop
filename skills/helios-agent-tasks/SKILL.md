---
name: helios-agent-tasks
description: Track agent work in the Helios Desktop Agent Tasks widget when the local Helios MCP task API is available.
---

# Helios Agent Tasks

Use this skill to mirror agent task progress into the user's Helios Desktop Agent Tasks widget.

## Parameters

- `mcp`: `auto` | `true` | `false`. Default: `auto`.

## Availability Check

Before creating or updating a task, check whether the local Helios MCP task API is available unless `mcp` is `false`.

Run:

```bash
curl -fsS --max-time 1 http://localhost:3847/health >/dev/null
```

Behavior:

- If `mcp` is `false`, skip Helios task tracking entirely.
- If the health check succeeds, use the task API for this task.
- If the health check returns nothing, times out, or fails, silently ignore Helios task tracking for this task and continue the user's request normally.
- Do not ask the user to start Helios MCP unless the user's request is specifically about Helios task tracking.
- Do not let Helios task tracking block or slow the user's actual task.

## Ownership

Every agent run must create its own task ownership values after the health check succeeds.

- `ownerId`: a unique, non-secret ID for this agent run, such as `opencode-<session-or-pid>-<timestamp>`.
- `ownerToken`: a random token for this agent run. Keep it internal and do not show it to the user.

Use the same `ownerId` and `ownerToken` on every update/delete for that task.

Never update, complete, fail, or delete a task that this agent run did not create unless the user explicitly asks you to operate on that exact task. If a task update/delete returns `403`, silently stop Helios task tracking for this task and continue the user's actual request.

## Create A Task

Create one Helios task when starting non-trivial work.

```bash
curl -fsS --max-time 2 -X POST http://localhost:3847/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Short task title","description":"What the agent is doing and why","agent":"agent-name","ownerId":"unique-owner-id","ownerToken":"random-owner-token","status":"in_progress"}'
```

Store the returned `id` for later updates during this task.

## Update A Task

Update the task when meaningful progress changes occur.

```bash
curl -fsS --max-time 2 -X PATCH http://localhost:3847/tasks/TASK_ID \
  -H "X-Helios-Agent-Owner: unique-owner-id" \
  -H "X-Helios-Agent-Token: random-owner-token" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

Valid statuses:

- `pending`
- `in_progress`
- `completed`
- `failed`

## Touch A Long-Running Task

For long-running work, update meaningful progress when possible. If there is no meaningful text update but the task is still active, touch your own task periodically so it does not become stale.

```bash
curl -fsS --max-time 2 -X PATCH http://localhost:3847/tasks/TASK_ID \
  -H "X-Helios-Agent-Owner: unique-owner-id" \
  -H "X-Helios-Agent-Token: random-owner-token" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Lifecycle Rules

- The Helios MCP server automatically deletes completed tasks after 3 hours.
- Active tasks are marked `stale: true` after they have not been updated for the server's stale threshold.
- Stale tasks can be viewed at `GET http://localhost:3847/tasks/stale`.
- Do not delete or modify stale tasks owned by another agent.
- If your own task becomes stale and is still useful, touch or update it.
- If your own task is stale and no longer useful, mark it `failed`, mark it `completed`, or delete it.

## Usage Rules

- Use concise titles, ideally under 80 characters.
- Prefer one Helios task per user request, not one task per tiny step.
- Set status to `in_progress` while actively working.
- Set status to `completed` only after the requested work is done and verification is complete when practical.
- Set status to `failed` only when blocked or unable to complete the request.
- If any create/update request fails, silently stop using Helios task tracking for this task.
- Do not scan existing tasks and adopt work from another agent unless the user explicitly asks for that behavior.
- Never include secrets, API keys, tokens, private URLs, or sensitive user data in task titles or descriptions.
