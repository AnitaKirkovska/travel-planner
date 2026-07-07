# Travel Planner

Your assistant can already search flights and look up destinations. What it can't do out of the box is remember how you travel, or hand you the one-page briefing an EA would prepare before your boss got on a plane. This plugin does both.

## What you get

- **A traveler profile**, drafted from your Gmail travel history and confirmed in one exchange: home airport, preferred carrier, miles programs, hotel budget, booking platform, card travel benefits, passport country.
- **Trip records** that persist across conversations: flights considered and booked, hotel shortlist, visa status, checklist. Planning resumes where it stopped, days later.
- **A trip brief**, 48 hours before every departure: flights with confirmation numbers, transfers with pickup times, hotel with check-in details, day-by-day plan, documents, local basics, emergency numbers. Rendered in-app, PDF'd, and emailed to you (and companions if you want). Decisions made, not options listed.
- **Change monitoring**: 3 days and 1 day out, your Gmail gets swept for gate changes, delays, and cancellations. If something changed you get an email with what changed and what it affects. No news, no email.
- **Calendar sync**: trip block plus flight events pushed to Google Calendar once booked.

## Requirements

Gmail and Google Calendar connections. The plugin drafts your profile from email history, watches for booking changes, sends your brief, and blocks your calendar. Without them it can't do its job.

## Setup

```
assistant plugins install travel-planner
```

First use: the assistant scans your Gmail travel history, shows you the profile it drafted, and asks only for what email can't reveal (passport, miles programs, card benefits). Reminders are created automatically and stay silent unless there's something to say.

## Surfaces

| Surface | What it does |
| --- | --- |
| `get-travel-context` (tool) | Read profile + trip records before any planning |
| `update-profile` (tool) | Save durable travel preferences |
| `update-trip` (tool) | Create/update per-trip records |
| `generate-trip-brief` (tool) | Build the EA-style HTML brief from a trip record |
| `travel-planner` (skill) | The planning workflow: filter by profile, write back state, brief before departure |

Scheduled jobs (Sunday preview, pre-trip monitoring, 48h brief send) are created through the assistant's built-in scheduler, same pattern as [Amex Perk Reminder](https://github.com/AnitaKirkovska/amex-perk-reminder).

## Usage

- "plan a trip to lisbon in september, 4 nights"
- "find flights but only ones where I earn my miles"
- "hotels under my usual budget, and check if any qualify for my card credit"
- "send me my trip brief"
- "where were we on the lisbon trip"
- "what trips do I have coming up"

## Cross-plugin: Amex Perk Reminder

If [Amex Perk Reminder](https://github.com/AnitaKirkovska/amex-perk-reminder) is installed, hotel shortlists get checked against your active Amex credits automatically.

## License

MIT
