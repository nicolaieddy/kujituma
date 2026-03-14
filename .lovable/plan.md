

## MCP Server Upgrades — Options

Your current server has 11 tools (6 read, 5 write). Here are practical upgrades grouped by category:

### 1. New Tools (more data surface area)

| Tool | Type | What it does |
|------|------|-------------|
| `create_goal` | write | Create a new goal with title, category, timeframe, description |
| `update_goal` | write | Update goal status (complete, pause, deprioritize), edit title/description |
| `delete_objective` | write | Remove a weekly objective |
| `get_daily_check_ins` | read | Fetch check-in history for a date range (mood, energy, journal entries) |
| `get_weekly_planning` | read | Get current/past weekly planning sessions (intention, reflection) |
| `create_weekly_planning` | write | Start or update a weekly planning session |
| `get_friends` | read | List friends with online status |
| `get_goal_details` | read | Get a single goal with its linked objectives and habit items |
| `search_goals` | read | Full-text search across goal titles and descriptions |
| `get_week_summary` | read | Combined snapshot: objectives completion %, habits done, check-in status, planning status for a given week |

### 2. MCP Resources (read-only context Claude can pull automatically)

MCP Resources let Claude pull context without the user explicitly asking. Using mcp-lite you can register resources:

- **`user://profile`** — user's name, streak, goal count (auto-loaded context)
- **`week://current`** — this week's objectives + completion status
- **`goals://active`** — all active goals as structured context

This means Claude starts every conversation already knowing your current state.

### 3. MCP Prompts (pre-built conversation starters)

Register prompt templates that appear in Claude's UI:

- **"Weekly review"** — pre-fills a prompt that pulls this week's data and asks Claude to analyze progress
- **"Plan my week"** — pulls last week's incomplete objectives and active goals, asks Claude to suggest this week's plan
- **"Daily check-in"** — guided journal prompt that ends by calling `log_daily_check_in`

### 4. Infrastructure Improvements

- **Rate limiting** — track calls per token per minute in a simple counter to prevent abuse
- **Token scoping** — allow tokens to be read-only vs read-write (add a `scope` column to `mcp_api_tokens`)
- **Audit logging** — log every tool call with timestamp, tool name, and params for debugging
- **Better error messages** — return structured error codes so Claude can retry intelligently

### Recommendation

The highest-impact upgrades are:
1. **New tools** (`create_goal`, `get_week_summary`, `delete_objective`) — these fill obvious gaps
2. **MCP Resources** — makes Claude contextually aware without extra prompting
3. **MCP Prompts** — gives users one-click workflows

### Implementation scope
- New tools: ~1 file edit (mcp-server/index.ts) + update the tools list in McpSection.tsx
- Resources & Prompts: same file, using mcp-lite's `mcp.resource()` and `mcp.prompt()` APIs
- Token scoping: 1 migration (add `scope` column) + auth logic update
- No new dependencies needed

