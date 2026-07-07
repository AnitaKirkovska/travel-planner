import type { ToolDefinition } from "@vellumai/plugin-api";

interface GetTravelContextInput {
  trip?: string;
}

const getTravelContext: ToolDefinition = {
  description:
    "Read the user's traveler profile (home airport, preferred carrier, miles programs, hotel budget, booking preferences, card travel benefits, passport country) and their trip records. Call this before planning, comparing, or answering anything travel related so recommendations match how this user actually travels. Pass a trip slug to get one trip's full record, or omit it for the profile plus a summary of all trips.",
  input_schema: {
    type: "object",
    properties: {
      trip: {
        type: "string",
        description:
          "Optional trip slug (e.g. 'stockholm-2026-07'). When set, returns that trip's full record.",
      },
    },
  },
  defaultRiskLevel: "low",
  execute: async (input: GetTravelContextInput, ctx) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const storageDir =
      (ctx as { pluginStorageDir?: string }).pluginStorageDir ??
      path.join(ctx.workingDir ?? process.cwd(), "plugins-data", "travel-planner");
    await fs.mkdir(storageDir, { recursive: true });

    const profilePath = path.join(storageDir, "profile.json");
    const tripsDir = path.join(storageDir, "trips");

    let profile: Record<string, unknown> = {};
    try {
      profile = JSON.parse(await fs.readFile(profilePath, "utf8"));
    } catch {
      // no profile yet; return empty so the model knows to interview the user
    }

    if (input.trip) {
      try {
        const record = JSON.parse(
          await fs.readFile(path.join(tripsDir, `${input.trip}.json`), "utf8"),
        );
        return { content: JSON.stringify({ profile, trip: record }, null, 2) };
      } catch {
        return {
          content: JSON.stringify({ profile, trip: null, note: `No trip record named '${input.trip}'.` }, null, 2),
        };
      }
    }

    let trips: Array<Record<string, unknown>> = [];
    try {
      const files = (await fs.readdir(tripsDir)).filter((f) => f.endsWith(".json"));
      trips = await Promise.all(
        files.map(async (f) => {
          const t = JSON.parse(await fs.readFile(path.join(tripsDir, f), "utf8"));
          return {
            slug: f.replace(/\.json$/, ""),
            destination: t.destination,
            dates: t.dates,
            status: t.status,
          };
        }),
      );
    } catch {
      // no trips dir yet
    }

    return { content: JSON.stringify({ profile, trips }, null, 2) };
  },
};

export default getTravelContext;
