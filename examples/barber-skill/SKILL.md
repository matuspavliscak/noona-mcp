---
name: barber
description: Book appointments at my barbershop via Noona. Check availability, list services/employees, book, or cancel appointments.
user_invocable: true
---

# Barber Skill

Book appointments at my barbershop using the Noona MCP tools.

## Locations

| Location | Slug | Address | Barbers |
|----------|------|---------|---------|
| Downtown | `mybarbershop-downtown` | 123 Main St | Petr, Jan, Tomas |

## Default Preferences

- **Location**: Downtown (`mybarbershop-downtown`)
- **Barber**: Petr
- **Service**: CLASSIC HAIRCUT (500 CZK)

## Services (English names — use these when calling Noona tools)

- CLASSIC HAIRCUT (500 CZK)
- CLASSIC HAIRCUT & BEARD TRIM (800 CZK)
- CLIPPER CUT (400 CZK)
- BEARD TRIM (350 CZK)
- HOT TOWEL SHAVE (400 CZK)

## Customer Contact

Read from `~/.noona/config.json` — the Noona MCP server provides these automatically.

## Behavior

### Quick booking (user says `/barber` with no details or just a vague request)

1. Use `mcp__noona__get-availability` with the default location, service, and barber, checking 7 days ahead.
2. Print a short intro: "Booking **CLASSIC HAIRCUT** (500 CZK) with **Petr** at **Downtown**" (substitute actual service/barber/location).
3. Use `AskUserQuestion` to let the user pick a **day** first — show up to 4 available dates as options (label: e.g. "Sat 21 Mar", description: list the available times for that day).
4. Then use a second `AskUserQuestion` to let the user pick a **time** from the chosen day's slots (up to 4 options).
5. Book using `mcp__noona__book-appointment` with all defaults plus the chosen date/time.
6. Confirm the booking with date, time, barber, service, and price.

### When user specifies details

- If the user names a different location, barber, or service, use those instead of defaults.
- If the user asks for a specific date, check availability for that date only (set `days` to 1 and adjust accordingly).

### Other actions

- **Check availability**: Use `mcp__noona__get-availability`. Default to the user's preferences.
- **List services**: Use `mcp__noona__list-services`.
- **List barbers**: Use `mcp__noona__list-employees`.
- **Cancel booking**: Ask for the booking ID, then use `mcp__noona__cancel-booking`.

## Rules

- Always use English service names when calling Noona tools.
- Always confirm details with the user before actually booking.
- Keep responses concise — present slots as a compact list, not a wall of text.
- Today's date can be determined from the system context.
