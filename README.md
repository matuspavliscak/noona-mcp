# noona-mcp

MCP server for the [Noona](https://noona.app) booking platform. Check availability, book appointments, and manage bookings at any Noona-powered business — barbershops, salons, massage parlors, restaurants, and more.

Uses the official [Noona Marketplace API](https://docs.noona.is/docs).

## Disclaimer

This is an **unofficial**, personal project. It is not affiliated with, endorsed by, or connected to Noona (Noona Labs ehf.) in any way.

- **For personal use only.** Do not use this to spam bookings, scrape data at scale, or interfere with the normal operation of the Noona platform.
- The Noona Marketplace API is publicly documented and does not require authentication for standard integrations. This tool uses only the official documented endpoints.
- **Use at your own risk.** The author is not responsible for any consequences of using this tool, including but not limited to: missed appointments, incorrect bookings, API changes, or ToS violations.

## Setup

### 1. Install

```bash
git clone https://github.com/matuspavliscak/noona-mcp.git
cd noona-mcp
npm install
```

### 2. Connect to your AI client

<details>
<summary><strong>Claude Desktop</strong></summary>

Open **Settings → Developer → Edit Config** (or edit `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS / `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "noona": {
      "command": "node",
      "args": ["/absolute/path/to/noona-mcp/node_modules/.bin/tsx", "/absolute/path/to/noona-mcp/src/index.ts"]
    }
  }
}
```

> **Note:** Claude Desktop doesn't have `npx` in its PATH, so use the full path to `tsx` inside `node_modules`. Replace `/absolute/path/to/noona-mcp` with the actual path where you cloned the repo (e.g. `/Users/you/projects/noona-mcp`).

After saving, restart Claude Desktop. You should see a hammer icon with 6 tools available.

</details>

<details>
<summary><strong>Claude Code (CLI)</strong></summary>

Add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "noona": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/noona-mcp/src/index.ts"]
    }
  }
}
```

</details>

<details>
<summary><strong>Other MCP clients</strong></summary>

Any MCP-compatible client works. The server uses **stdio** transport. Run it with:

```bash
npx tsx /path/to/noona-mcp/src/index.ts
```

</details>

### 3. Set up contact info (for booking)

Create `~/.noona/config.json` with your booking details:

```bash
mkdir -p ~/.noona
cat > ~/.noona/config.json << 'EOF'
{
  "customerName": "Your Name",
  "customerPhone": "123456789",
  "phoneCountryCode": "420",
  "customerEmail": "your@email.com"
}
EOF
chmod 600 ~/.noona/config.json
```

This file is read by Claude when booking appointments. It keeps your personal info out of skill files and conversation history. The `chmod 600` ensures only your user can read it.

## Tools

| Tool | Description |
|------|-------------|
| `get-company-info` | Look up a Noona company or brand by URL/slug. Discovers locations for multi-branch businesses. |
| `get-availability` | Check available timeslots. Employee is optional. |
| `list-employees` | List all employees at a company. |
| `list-services` | List all services with prices. |
| `book-appointment` | Book an appointment (reserve + confirm). |
| `cancel-booking` | Cancel an existing booking by ID. |

## Creating a Skill

The MCP server is generic — it works with any Noona business. To create a personalized booking shortcut (e.g., `/barber`, `/massage`), create a **Claude Code skill** that stores your preferences and tells Claude which MCP tools to call.

### Step-by-step

1. **Find your business.** Ask Claude:
   > "Use get-company-info to look up https://noona.app/mybusiness"

   If it's a brand with multiple locations, Claude will list them. Pick your location.

2. **Browse services.** Ask Claude:
   > "List services at mybusiness-location"

3. **Browse employees.** Ask Claude:
   > "List employees at mybusiness-location"

4. **Create the skill.** Create a file at `~/.claude/skills/<name>/SKILL.md`:

```markdown
---
name: massage
description: Book massages at My Massage Place. Use when the user wants to book a massage.
argument-hint: "[date or day]"
---

# Massage Booking

## Config
- **Company slug**: `mymassageplace`
- **Preferred service**: Deep Tissue Massage
- **Preferred employee**: (none — any therapist is fine)
- **Customer details**: Read from `~/.noona/config.json`

## MCP tools (all prefixed `mcp__noona__`)

### Check availability
**`get-availability`** with:
- `companySlug`: "mymassageplace"
- `serviceName`: "Deep Tissue Massage"
- (no `employeeName` — check all therapists)

### Book
**`book-appointment`** — read `~/.noona/config.json` first. Use:
- `companySlug`: "mymassageplace"
- `serviceName`: "Deep Tissue Massage"
- `date`, `time`: from user
- Customer details from config file

### Cancel
**`cancel-booking`** with the booking ID.

## Workflow
1. Check availability
2. Present options to user
3. Read `~/.noona/config.json` for customer details
4. **Confirm with user before booking**
5. Report booking ID
```

That's it. Now `/massage` will check availability and book at your massage place.

## Architecture

```
noona-mcp (generic MCP server)     Skills (personal config)
├── get-company-info                ├── /barber → mybarbershop + preferred barber
├── get-availability                ├── /massage → mymassageplace + any therapist
├── list-employees                  └── /nails → mynailsalon + preferred tech
├── list-services
├── book-appointment
└── cancel-booking

~/.noona/config.json (contact info, shared across all skills)
```

## License

MIT
