# Travel Planner

A skill that turns your travel emails into trip checklists. Scans Gmail for confirmations — flights, hotels, activities, restaurants — and keeps everything organized pre-, mid-, and post-trip.

## Capabilities

### Scan Gmail for travel
On demand: "plan my stockholm trip from my emails"
Automated: weekly preview every Sunday, pre-trip reminder 24h before departure

The assistant searches Gmail for confirmation emails matching flight bookings, hotel reservations, rental cars, event tickets, and restaurant reservations. Results populate structured trip objects.

### Trip types and templates

**Concert/Festival** (Bad Bunny in Stockholm ready to go)
Pre-trip: flight, hotel, concert tickets, dinner reservations, venue-to-transit mapped, outfit planned (weather check), earplugs packed, phone power bank
Day of: tickets accessible offline, venue bag policy checked, transit to venue mapped, post-concert transit confirmed
Post-trip: receipts saved, photos backed up

**Standard vacation**
Pre-trip (T-7d): bookings collected, travel docs checked, packing list, home tasks (mail hold, pet care), directions verified
Pre-trip (T-1d): online check-in, packing complete, boarding passes saved, transit to airport confirmed
Mid-trip: daily agenda from bookings, weather check, restaurant times synced, transit between activities mapped
Post-trip: receipts saved, expenses logged, credits checked (hotel, lounge)

**Business trip**
Pre-trip: flights, hotel, meeting agenda synced, expense tracking opened, lounge access verified
Mid-trip: next meeting reminder, receipt capture, expense log updated
Post-trip: expense report drafted, receipts attached, follow-ups logged

**Weekend getaway**
Same as standard but compressed — packing for 2-3 days, no mail hold needed for short trips

### Stockholm trip (pre-seeded for Jul 10-13, 2026)
If Anita installs this before Jul 10, the assistant already knows about the Stockholm trip with Bad Bunny concert on Jul 10. It pre-fills the concert template and will:
- Scan Gmail for the flight booking and hotel confirmation
- Build a packing list for Stockholm weather (18°C, chance of rain)
- Map the venue from the hotel on concert night
- Remind about earplugs and a power bank
- Cross-reference Amex credits if the Amex Perk Reminder plugin is also installed

### Cross-plugin: Amex integration
If Amex Perk Reminder is also installed, the assistant checks any hotel booking against the $300 FHR/THC credit. "You're booking 2 nights at Hotel J — this qualifies for your $300 Amex Platinum hotel credit."

## Commands

Natural language, not rigid syntax:

- "plan my stockholm trip from my gmail"
- "what's my flight time on friday"
- "build a packing list for stockholm"
- "add dinner at tradicja to my trip"
- "show me what i still need to do before we leave"
- "anything i haven't done for the trip yet"
- "what trips do i have coming up"

No onboarding flow. Install and it works immediately — the assistant has the templates built in.
