import type { ToolDefinition } from "@vellumai/plugin-api";

interface GenerateTripBriefInput {
  trip: string;
}

const esc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const section = (title: string, body: string): string =>
  body.trim()
    ? `<section><h2>${esc(title)}</h2>${body}</section>`
    : "";

const list = (items: unknown[] | undefined, render: (i: any) => string): string =>
  items && items.length
    ? `<ul>${items.map((i) => `<li>${render(i)}</li>`).join("")}</ul>`
    : "";

const generateTripBrief: ToolDefinition = {
  description:
    "Generate the trip brief for a trip: an executive-assistant style briefing built from the trip record and traveler profile. Renders an HTML document (flights with confirmation numbers, transfers, hotel with check-in details, day-by-day plan, documents status, local basics, emergency numbers) and saves it to plugin storage. Call when the user asks for their trip brief, or 48 hours before departure for the automatic send. After calling, render the HTML for the user in-app, convert it to PDF, and email it per the travel-planner skill.",
  input_schema: {
    type: "object",
    properties: {
      trip: {
        type: "string",
        description: "Trip slug, e.g. 'lisbon-2026-09'.",
      },
    },
    required: ["trip"],
  },
  defaultRiskLevel: "low",
  execute: async (input: GenerateTripBriefInput, ctx) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const slug = input.trip.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    let trip: any;
    try {
      trip = JSON.parse(
        await fs.readFile(path.join(ctx.pluginStorageDir, "trips", `${slug}.json`), "utf8"),
      );
    } catch {
      return {
        content: `No trip record named '${slug}'. Create it with update-trip first.`,
        isError: true,
      };
    }

    let profile: any = {};
    try {
      profile = JSON.parse(
        await fs.readFile(path.join(ctx.pluginStorageDir, "profile.json"), "utf8"),
      );
    } catch {
      // brief still works without a profile
    }

    const flights = section(
      "Flights",
      list(trip.flights?.booked ? [trip.flights.booked].flat() : [], (f) =>
        `<strong>${esc(f.route ?? f.summary ?? "Flight")}</strong> ${esc(f.date ?? "")} ${esc(
          f.time ?? "",
        )}${f.confirmation ? ` · Confirmation <code>${esc(f.confirmation)}</code>` : ""}${
          f.seat ? ` · Seat ${esc(f.seat)}` : ""
        }`,
      ),
    );

    const transfers = section(
      "Transfers",
      list(trip.transfers, (t) =>
        `${esc(t.summary ?? t)}${t.pickupTime ? ` · Pickup ${esc(t.pickupTime)}` : ""}`,
      ),
    );

    const hotel = section(
      "Hotel",
      trip.hotels?.booked
        ? `<p><strong>${esc(trip.hotels.booked.name)}</strong><br/>${esc(
            trip.hotels.booked.address ?? "",
          )}<br/>Check-in ${esc(trip.hotels.booked.checkIn ?? "")} · Check-out ${esc(
            trip.hotels.booked.checkOut ?? "",
          )}${
            trip.hotels.booked.confirmation
              ? ` · Confirmation <code>${esc(trip.hotels.booked.confirmation)}</code>`
              : ""
          }</p>`
        : "",
    );

    const itinerary = section(
      "Day by day",
      list(trip.itinerary, (d) => `<strong>${esc(d.day ?? d.date ?? "")}</strong> ${esc(d.plan ?? d)}`),
    );

    const docs = section(
      "Documents",
      list(
        [
          trip.visa
            ? { s: `Visa: ${trip.visa.required ? trip.visa.status ?? "required" : "not required"}` }
            : null,
          profile.passportCountry ? { s: `Passport: ${profile.passportCountry}` } : null,
          ...(trip.documents ?? []).map((d: unknown) => ({ s: d })),
        ].filter(Boolean) as Array<{ s: unknown }>,
        (d) => esc(d.s),
      ),
    );

    const basics = section(
      "Local basics",
      list(
        [
          trip.weather ? { s: `Weather: ${trip.weather}` } : null,
          trip.currency ? { s: `Currency: ${trip.currency}` } : null,
          trip.transit ? { s: `From the airport: ${trip.transit}` } : null,
          ...(trip.localNotes ?? []).map((n: unknown) => ({ s: n })),
        ].filter(Boolean) as Array<{ s: unknown }>,
        (b) => esc(b.s),
      ),
    );

    const emergency = section(
      "Emergency",
      list(trip.emergency, (e) => esc(typeof e === "string" ? e : `${e.label}: ${e.value}`)),
    );

    const openItems = (trip.checklist ?? []).filter((c: any) => !c.done);
    const checklist = section(
      "Still open",
      list(openItems, (c) => esc(c.item ?? c)),
    );

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Trip brief: ${esc(trip.destination ?? slug)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.55; }
  h1 { font-size: 26px; margin-bottom: 2px; }
  .dates { color: #666; margin-bottom: 28px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin: 26px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  ul { padding-left: 18px; margin: 6px 0; }
  li { margin: 4px 0; }
  code { background: #f4f4f4; padding: 1px 6px; border-radius: 4px; font-size: 0.95em; }
</style>
</head>
<body>
  <h1>${esc(trip.destination ?? slug)}</h1>
  <p class="dates">${esc(trip.dates?.start ?? "")} → ${esc(trip.dates?.end ?? "")}</p>
  ${flights}${transfers}${hotel}${itinerary}${docs}${basics}${emergency}${checklist}
</body>
</html>`;

    const briefsDir = path.join(ctx.pluginStorageDir, "briefs");
    await fs.mkdir(briefsDir, { recursive: true });
    const briefPath = path.join(briefsDir, `${slug}.html`);
    await fs.writeFile(briefPath, html, "utf8");

    const missing = [
      !trip.flights?.booked && "flights",
      !trip.hotels?.booked && "hotel",
      !trip.itinerary?.length && "itinerary",
      !trip.emergency?.length && "emergency numbers",
    ].filter(Boolean);

    return {
      content: {
        briefPath,
        html,
        missingSections: missing,
        note: missing.length
          ? `Brief generated but missing: ${missing.join(", ")}. Fill the trip record and regenerate before sending.`
          : "Brief complete. Render in-app, convert to PDF, and email per the skill.",
      },
    };
  },
};

export default generateTripBrief;
