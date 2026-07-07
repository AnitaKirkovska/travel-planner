# Travel Planner

Your assistant can already search flights and answer visa questions. What it can't do out of the box is remember how you travel. This plugin gives it a durable traveler profile and per-trip records, so trip two takes one prompt instead of twenty.

## What it stores

**Traveler profile** (saved once, used every trip):

- Home airport, passport country
- Preferred airline and miles programs
- Hotel budget range and booking platform preference (Booking.com, Airbnb, direct)
- Card travel benefits to check against bookings (Amex hotel credit, travel portals)
- Loyalty numbers, seat preference, anything standing

**Trip records** (one per trip, persists across conversations):

- Dates, status, flights considered and booked
- Hotel shortlist with budget filtering
- Visa status and regulation notes
- Checklist with done state

## Why a plugin and not just a skill

A skill can only tell the assistant how to behave in one conversation. This plugin ships tools (`get-travel-context`, `update-profile`, `update-trip`) that read and write real state on disk. Your preferences survive across chats, models, and months. Planning picks up exactly where it stopped.

## Setup

```
assistant plugins install travel-planner
```

On first use the assistant interviews you to build your profile, then offers two recurring reminders via its built-in scheduler: a Sunday trip preview and a 48-hour pre-trip checklist.

## Usage

- "plan a trip to lisbon in september, 4 nights"
- "find flights but only ones where I earn my miles"
- "hotels under my usual budget, and check if any qualify for my card credit"
- "do I need a visa for japan"
- "where were we on the lisbon trip"
- "what trips do I have coming up"

## Cross-plugin: Amex Perk Reminder

If [Amex Perk Reminder](https://github.com/AnitaKirkovska/amex-perk-reminder) is installed, hotel shortlists get checked against your active Amex credits automatically.

## License

MIT
