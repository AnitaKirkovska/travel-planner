# Travel Planner

Turn your travel emails into trip checklists. Scans Gmail for flight confirmations, hotel bookings, and activity reservations — then structures everything into one view with pre-trip, mid-trip, and post-trip checklists.

## Setup

```
assistant plugins install travel-planner
```

## How it works

On install, the assistant creates two recurring jobs:

1. **Weekly Sunday preview** — fires every Sunday at 9 AM. "Here's what's coming up this week and what you still need to do."
2. **Pre-trip reminder** — fires daily at 8 AM. "Your trip to [destination] starts tomorrow. Here's your checklist."

The assistant also has a `check-travel` tool it can call on demand.

## Built-in trip templates

- **Concert/Festival** — earplug reminders, venue bag-policy check, post-concert transit
- **Standard vacation** — packing, travel docs, mail hold, pet care
- **Business trip** — meeting syncing, expense tracking
- **Weekend getaway** — compressed version for quick trips

## Cross-plugin: Amex integration

If [Amex Perk Reminder](https://github.com/AnitaKirkovska/amex-perk-reminder) is also installed, the assistant checks hotel bookings against your $300 Amex Platinum hotel credit. "You're booking 2 nights at Hotel J — this qualifies for your $300 Amex Platinum hotel credit."

## Usage

Ask the assistant:

- "plan my stockholm trip from my gmail"
- "what's my flight time on friday"
- "build a packing list for stockholm"
- "show me what i still need to do before we leave"
- "what trips do i have coming up"

## License

MIT
