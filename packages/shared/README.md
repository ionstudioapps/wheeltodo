# @todo/shared

Shared TypeScript package used by both `apps/web` and `apps/mobile`.

Imported as `@todo/shared` (or subpaths like `@todo/shared/themes`).

---

## Exports

### `themes.ts`

```ts
import { THEMES, PALETTE, DEFAULT_THEME, type ThemeName, type Theme } from '@todo/shared/themes'
```

| Export | Type | Description |
|--------|------|-------------|
| `PALETTE` | `Record<string, string>` | 9 brand hex colours (peach, coral, honey, sage, mint, lavender, lilac, blush, ink) |
| `THEMES` | `Record<ThemeName, Theme>` | 4 themes — each has 8 `wheel` colours, 8 `wheelLight` colours, full colour map |
| `DEFAULT_THEME` | `'warm-start'` | |
| `ThemeName` | union | `'warm-start' \| 'slow-down' \| 'light-a11y' \| 'dark-a11y'` |
| `Theme` | interface | `{ name, label, dark, colors: { bgScreen, bgCard, ... wheel[], wheelLight[], rest } }` |

**Theme names → labels:**
- `warm-start` → Warm Start
- `slow-down` → Slow Down
- `light-a11y` → Gentle Boost
- `dark-a11y` → Grounding Mode

### `db.ts`

Database types and Supabase query helpers. Imported in both web and mobile.

```ts
import { dbLoad, dbUpsertTask, dbUpsertSettings, ... } from '@todo/shared'
```

| Export | Description |
|--------|-------------|
| `DbTask` | `{ id, name, minutes, color, icon, category?, context?, parentTaskId? }` |
| `DbCompletedTask` | Completed task snapshot |
| `DbRestTask` | Custom rest activity |
| `DbSettings` | User settings row |
| `DbRestDay` | `{ date, is_complete, partial_pct }` |
| `dbLoad(userId)` | Fetches all user data in one parallel query |
| `dbUpsertTask(userId, task, position)` | Create or update a task (fires-and-forgets) |
| `dbDeleteTask(userId, taskId)` | Delete a task |
| `dbInsertCompleted(userId, ct)` | Log a completed task |
| `dbUpsertSettings(userId, patch)` | Partial-update user settings |
| `dbUpsertRestDay(userId, day)` | Upsert a rest day record |
| `dbDeleteRestDay(userId, date)` | Remove a rest day record |
| `dbBulkPush(userId, tasks, completed, restTasks)` | Full sync push |

### `index.ts` (TaskSchema)

```ts
import { TaskSchema, type Task } from '@todo/shared'
```

Zod schema for task validation:
- `name`: 1–120 chars
- `minutes`: integer 1–480
- `color`, `icon`, `id`: strings

---

## Testing

Tests live in `src/__tests__/` and run as part of the monorepo test suite:

```bash
npm test   # from monorepo root
```

Covers: palette hex validity, all 4 themes have correct structure (8 wheel colours, 8 wheelLight colours, required color keys, rest category colours), theme labels, `TaskSchema` boundary validation.
