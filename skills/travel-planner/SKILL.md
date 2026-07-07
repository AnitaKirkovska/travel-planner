---
name: travel-planner
description: >-
  Plan trips against the user's saved traveler profile and trip records.
  Use when the user wants to plan a trip, compare flights or hotels, check
  visa requirements, resume planning an existing trip, or update travel
  preferences like preferred airline, miles programs, or hotel budget.
metadata:
  emoji: "✈️"
  vellum:
    display-name: "Travel Planner"
    activation-hints:
      - "User wants to plan a new trip or resume planning one"
      - "User asks about flights, hotels, visas, or travel regulations for a trip"
      - "User mentions a travel preference worth saving (airline, miles, hotel budget)"
      - "User asks what trips they have coming up or what's left to do before a trip"
    avoid-when:
      - "User asks a general geography or culture question with no trip attached"
---

# Travel Planner

You plan trips the way this specific user travels, not generically. The plugin stores a traveler profile and one record per trip. Your job is to read them before planning and write back everything durable you learn.

## The rules

1. **Always call `get-travel-context` first.** Before recommending any flight, hotel, or itinerary. If the profile is empty, this is a first run: interview the user (see First run below).
2. **Write back what you learn.** Any durable preference the user reveals mid-conversation goes to `update-profile` immediately. Any trip development (option researched, thing booked, checklist item done) goes to `update-trip`. Do not keep state only in chat.
3. **Filter, don't dump.** The profile exists so you can pre-filter. If the user prefers Delta for miles, lead with Delta options and mention one cheaper alternative, not ten. If hotel budget is $150-300, don't show $500 rooms.

## First run: build the profile

Ask for these, conversationally, not as a form:

- Home airport and passport country
- Preferred airline or alliance, and which miles programs they collect
- Hotel budget range per night, and booking platform preference (Booking.com, Airbnb, direct, corporate)
- Card travel benefits worth checking against bookings (e.g. Amex Platinum hotel credit, Chase travel portal)
- Anything else standing: seat preference, dietary needs, loyalty numbers

Save with `update-profile`. Partial answers are fine; save what you get.

## Planning a trip

1. `get-travel-context` for profile + existing trips. If this trip exists, resume it, don't restart.
2. Create or update the trip record with `update-trip`: destination, dates, status `planning`.
3. **Flights.** Search with the user's dates. Rank by their preferred carrier and miles program first, then price. Record the considered options in the trip record so a later session can compare without re-searching.
4. **Hotels.** Filter by their budget range and platform preference. Cross-check card travel benefits from the profile: if a booking would qualify for a credit (e.g. prepaid Fine Hotels + Resorts for an Amex hotel credit), say so with the estimated savings. Save the shortlist.
5. **Visa and regulations.** Check requirements for their passport country against the destination. Record status and any deadlines in the trip record.
6. **Things to do.** Suggest based on trip dates and any anchor events. Save picks to the record.
7. Build the checklist in the trip record: bookings pending, documents, visa steps, packing. Mark items done as they happen.

## Reminders

On first setup, offer to create two recurring jobs via the assistant's built-in scheduler:

- Weekly Sunday morning: preview upcoming trips and open checklist items
- Daily morning check: if a trip starts within 48 hours, surface the checklist and flight details

Plugins don't schedule natively; use the scheduler the assistant already has (same pattern as the Amex Perk Reminder plugin).

## Resuming

"Where were we on the Lisbon trip" means: `get-travel-context` with the trip slug, summarize status in a few lines (booked, shortlisted, open items), then continue from the first open item.
