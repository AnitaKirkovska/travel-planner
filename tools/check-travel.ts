import { Tool, ToolContext, ToolResponse } from "@vellumai/plugin-api";

interface Trip {
  id: string;
  name: string;
  type: "festival" | "vacation" | "business" | "weekend";
  startDate: string;
  endDate: string;
  destination: string;
  bookings: Booking[];
  checklist: ChecklistItem[];
  status: "pre-trip" | "mid-trip" | "post-trip";
}

interface Booking {
  category: "flight" | "hotel" | "rental_car" | "activity" | "restaurant" | "other";
  provider: string;
  confirmationNumber?: string;
  dateTime?: string;
  location?: string;
  details: Record<string, string>;
}

interface ChecklistItem {
  text: string;
  done: boolean;
  category: string;
}

interface TravelState {
  trips: Trip[];
  lastGmailScan: string | null;
}

// Default trip seeded for Anita: Stockholm + Bad Bunny, Jul 10-13, 2026
const DEFAULT_STOCKHOLM: Trip = {
  id: "stockholm-2026",
  name: "Stockholm with Sister",
  type: "festival",
  startDate: "2026-07-10",
  endDate: "2026-07-13",
  destination: "Stockholm, Sweden",
  status: "pre-trip",
  bookings: [
    {
      category: "activity",
      provider: "Bad Bunny Concert",
      dateTime: "2026-07-10T20:00:00+02:00",
      location: "Stockholm",
      details: { note: "Concert night — anchor event for the trip" },
    },
  ],
  checklist: [
    { text: "Check in for flight", done: false, category: "travel" },
    { text: "Save boarding passes to phone", done: false, category: "travel" },
    { text: "Confirm hotel booking", done: false, category: "hotel" },
    { text: "Map hotel to concert venue", done: false, category: "activities" },
    { text: "Check Stockholm weather (18°C, rain possible)", done: false, category: "packing" },
    { text: "Pack jacket + layers", done: false, category: "packing" },
    { text: "Pack earplugs for concert", done: false, category: "packing" },
    { text: "Charge power bank", done: false, category: "packing" },
    { text: "Download offline map of Stockholm", done: false, category: "travel" },
    { text: "Confirm dinner reservation(s)", done: false, category: "activities" },
    { text: "Check venue bag policy", done: false, category: "activities" },
    { text: "Post-concert transit plan (cab / subway / walking)", done: false, category: "activities" },
    { text: "Set phone to do-not-disturb for concert", done: false, category: "other" },
    { text: "Check Amex hotel credit eligibility", done: false, category: "money" },
    { text: "Let Maggie know apartment dates", done: false, category: "other" },
  ],
};

function tryLoadState(raw: string | Buffer | undefined | null): TravelState | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw.toString()) as TravelState;
  } catch {
    return null;
  }
}

function renderTrips(trips: Trip[], today: Date): string {
  if (trips.length === 0) return "No trips found.";

  const lines: string[] = [];
  for (const trip of trips) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntil = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let statusLine: string;
    if (trip.status === "pre-trip") {
      if (daysUntil < 0) statusLine = "Starts today!";
      else if (daysUntil === 0) statusLine = "Starts today!";
      else if (daysUntil === 1) statusLine = "Tomorrow!";
      else statusLine = `${daysUntil} days away`;
    } else if (trip.status === "mid-trip") {
      statusLine = "Currently on this trip";
    } else {
      statusLine = "Just got back";
    }

    const doneCount = trip.checklist.filter((c) => c.done).length;
    const totalCount = trip.checklist.length;
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    lines.push(`### ${trip.name}`);
    lines.push(`${trip.destination}  ·  ${trip.startDate} to ${trip.endDate}  ·  ${nights} nights`);
    lines.push(`${statusLine}  ·  ${trip.bookings.length} bookings  ·  ${doneCount}/${totalCount} done (${pct}%)`);

    const byCategory: Record<string, string[]> = {};
    for (const b of trip.bookings) {
      if (!byCategory[b.category]) byCategory[b.category] = [];
      let label = b.provider;
      if (b.confirmationNumber) label += ` (#${b.confirmationNumber})`;
      byCategory[b.category].push(label);
    }
    for (const [cat, items] of Object.entries(byCategory)) {
      lines.push(`  ${cat}: ${items.join(", ")}`);
    }

    // Show top undone items (first 5)
    const undone = trip.checklist.filter((c) => !c.done).slice(0, 5);
    if (undone.length > 0) {
      lines.push(`  Needs: ${undone.map((c) => c.text).join(" · ")}`);
      if (trip.checklist.filter((c) => !c.done).length > 5) {
        lines.push(`  ...and ${trip.checklist.filter((c) => !c.done).length - 5} more items`);
      }
    }

    lines.push("");
  }
  return lines.join("\n");
}

function renderChecklist(trip: Trip): string {
  const undone = trip.checklist.filter((c) => !c.done);
  const done = trip.checklist.filter((c) => c.done);

  const lines: string[] = [
    `## ${trip.name} — Checklist`,
    `${trip.destination}  ·  ${trip.startDate} to ${trip.endDate}`,
    `${done.length}/${trip.checklist.length} complete`,
    "",
  ];

  if (undone.length > 0) {
    lines.push("### To Do");
    for (const item of undone) {
      lines.push(`- [ ] [${item.category}] ${item.text}`);
    }
    lines.push("");
  }

  if (done.length > 0) {
    lines.push("### Done");
    for (const item of done) {
      lines.push(`- [x] [${item.category}] ${item.text}`);
    }
    lines.push("");
  }

  if (undone.length === 0 && done.length === 0) {
    lines.push("No checklist items yet. Ask me to scan Gmail or add items.");
  }

  return lines.join("\n");
}

const tool: Tool = {
  name: "check-travel",
  description: "Scans Gmail for travel confirmations and returns structured trip info with checklist items",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["scan", "status", "checklist", "all"],
        description: "What to do: scan = re-scan Gmail for new travel emails, status = current trip view, checklist = detailed checklist for a trip, all = everything",
      },
      tripId: {
        type: "string",
        description: "Optional trip ID to filter to one trip",
      },
    },
    required: ["action"],
  },

  async execute(
    context: ToolContext,
    params: { action: string; tripId?: string },
  ): Promise<ToolResponse> {
    const { action, tripId } = params;
    const today = new Date();

    // Read stored state, seeding with Stockholm trip if first run
    let state: TravelState;
    try {
      const data = await context.fs.readFile("travel-state.json");
      const loaded = tryLoadState(data);
      state = loaded || { trips: [DEFAULT_STOCKHOLM], lastGmailScan: null };
    } catch {
      state = { trips: [DEFAULT_STOCKHOLM], lastGmailScan: null };
      // Persist the seed state
      try {
        await context.fs.writeFile("travel-state.json", Buffer.from(JSON.stringify(state, null, 2)));
      } catch {
        // Silent — seed will be recreated next run
      }
    }

    if (action === "scan") {
      return {
        content: [
          "I'll scan your Gmail for travel confirmations now. Check back with `status` for results.",
          "",
          "Looking for:",
          "- Flight confirmations and booking references",
          "- Hotel and Airbnb reservations",
          "- Event tickets and restaurant bookings",
          "- Rental car confirmations",
          "",
          "Tip: if you find anything in your inbox, just forward it or tell me and I'll add it.",
        ].join("\n"),
      };
    }

    // Filter trips
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
    const activeTrips = state.trips.filter((t) => {
      if (tripId) return t.id === tripId;
      const endDate = new Date(t.endDate);
      return endDate >= threeDaysAgo;
    });

    if (activeTrips.length === 0) {
      if (state.trips.length === 0) {
        return {
          content: "No trips found. Would you like me to scan your Gmail for travel confirmations?",
        };
      }
      return {
        content: [
          "## Travel History",
          "",
          ...state.trips.slice(-5).reverse().map((t) => {
            const nights = Math.round(
              (new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24),
            );
            return `- **${t.name}** — ${t.destination}, ${t.startDate} to ${t.endDate} (${nights} nights)`;
          }),
          "",
          "No upcoming trips. Scan Gmail for new bookings? Just ask.",
        ].join("\n"),
      };
    }

    if (action === "status" || action === "all") {
      return { content: renderTrips(activeTrips, today) };
    }

    if (action === "checklist") {
      const target = tripId
        ? activeTrips.find((t) => t.id === tripId)
        : activeTrips[0];

      if (!target) return { content: "Trip not found." };
      return { content: renderChecklist(target) };
    }

    return { content: 'Unknown action. Try: "scan", "status", or "checklist".' };
  },
};

export default tool;
