import type { ToolDefinition } from "@vellumai/plugin-api";

interface UpdateProfileInput {
  fields: Record<string, unknown>;
}

const updateProfile: ToolDefinition = {
  description:
    "Save or update fields on the user's traveler profile. Call this whenever the user reveals a durable travel preference: home airport, preferred airline or alliance, frequent flyer / miles programs, hotel budget range, booking platform preference (Booking.com, Airbnb, direct), hotel loyalty numbers, card travel benefits (e.g. Amex Platinum hotel credit), passport country, seat or cabin preference, dietary needs. Fields are merged into the existing profile; only pass what changed.",
  input_schema: {
    type: "object",
    properties: {
      fields: {
        type: "object",
        description:
          "Partial profile object to merge. Example: { homeAirport: 'JFK', preferredCarrier: 'Delta', milesPrograms: ['Delta SkyMiles'], hotelBudgetPerNight: { min: 150, max: 300, currency: 'USD' }, bookingPreference: 'booking.com', cardBenefits: ['Amex Platinum $300 semi-annual hotel credit'], passportCountry: 'MK' }",
      },
    },
    required: ["fields"],
  },
  defaultRiskLevel: "low",
  execute: async (input: UpdateProfileInput, ctx) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const storageDir =
      (ctx as { pluginStorageDir?: string }).pluginStorageDir ??
      path.join(ctx.workingDir ?? process.cwd(), "plugins-data", "travel-planner");
    await fs.mkdir(storageDir, { recursive: true });

    const profilePath = path.join(storageDir, "profile.json");
    let profile: Record<string, unknown> = {};
    try {
      profile = JSON.parse(await fs.readFile(profilePath, "utf8"));
    } catch {
      // first write
    }

    const updated = { ...profile, ...input.fields, updatedAt: new Date().toISOString() };
    await fs.writeFile(profilePath, JSON.stringify(updated, null, 2), "utf8");

    return { content: { saved: Object.keys(input.fields), profile: updated } };
  },
};

export default updateProfile;
