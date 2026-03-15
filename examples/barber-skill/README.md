# Example: Barber Skill

This is a sample [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills) for booking appointments at a barbershop via the noona-mcp server.

## How it works

When you type `/barber`, Claude will:
1. Check your barber's availability for the next 7 days
2. Let you pick a day (interactive picker)
3. Let you pick a time slot
4. Book the appointment and confirm

## Setup

1. Copy `SKILL.md` to `~/.claude/skills/barber/SKILL.md`
2. Edit the defaults (location, barber, service) to match your preferences

You don't need to do this manually — just ask Claude:

> "Create a skill called /barber to book at https://noona.app/mybarbershop"

and it will set everything up for you interactively.
