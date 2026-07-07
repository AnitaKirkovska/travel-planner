import type { ToolDefinition } from "@vellumai/plugin-api";

interface UpdateTripInput {
  slug: string;
  record: Record<string, unknown>;
}

const updateTrip: ToolDefinition = {
  description:
    "Create or update a trip record. Call this when the user starts planning a trip, when new options are researched (flights considered, hotel shortlist), when something gets booked, or when checklist items are done. The record persists across conversations, so planning can resume days later without re-asking. Fields are merged; only pass what changed.",
  input_schema: {
    type: "object",
    properties: {
      slug: {
        type: "string",
        description:
          "Stable kebab-case trip id: destination plus year-month, e.g. 'stockholm-2026-07'.",
      },
      record: {
        type: "object",
        description:
          "Partial trip record to merge. Suggested shape: { destination, dates: { start, end }, status: 'planning'|'booked'|'done', flights: { considered: [], booked: null }, hotels: { shortlist: [], booked: null, budgetPerNight }, visa: { required, status, notes }, regulations: [], activities: [], checklist: [{ item, done }] }",
      },
    },
    required: ["slug", "record"],
  },
  defaultRiskLevel: "low",
  execute: async (input: UpdateTripInput, ctx) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const storageDir =
      (ctx as { pluginStorageDir?: string }).pluginStorageDir ??
      path.join(ctx.workingDir ?? process.cwd(), "plugins-data", "travel-planner");
    await fs.mkdir(storageDir, { recursive: true });

    const tripsDir = path.join(storageDir, "trips");
    await fs.mkdir(tripsDir, { recursive: true });

    const safeSlug = input.slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const tripPath = path.join(tripsDir, `${safeSlug}.json`);

    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(await fs.readFile(tripPath, "utf8"));
    } catch {
      // new trip
    }

    const updated = {
      ...existing,
      ...input.record,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(tripPath, JSON.stringify(updated, null, 2), "utf8");

    return { content: { slug: safeSlug, trip: updated } };
  },
};

export default updateTrip;
