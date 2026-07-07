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
    const storageDir =
      (ctx as { pluginStorageDir?: string }).pluginStorageDir ??
      path.join(ctx.workingDir ?? process.cwd(), "plugins-data", "travel-planner");
    await fs.mkdir(storageDir, { recursive: true });

    const slug = input.trip.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    let trip: any;
    try {
      trip = JSON.parse(
        await fs.readFile(path.join(storageDir, "trips", `${slug}.json`), "utf8"),
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
        await fs.readFile(path.join(storageDir, "profile.json"), "utf8"),
      );
    } catch {
      // brief still works without a profile
    }

    const renderFlight = (f: any): string => {
      if (typeof f === "string") return esc(f);
      const lines: string[] = [];
      if (f.outbound) lines.push(`<strong>Out:</strong> ${esc(f.outbound)}`);
      if (f.return) lines.push(`<strong>Back:</strong> ${esc(f.return)}`);
      if (!f.outbound && !f.return)
        lines.push(`<strong>${esc(f.route ?? f.summary ?? "Flight")}</strong> ${esc(f.date ?? "")} ${esc(f.time ?? "")}`.trim());
      const meta: string[] = [];
      if (f.airline) meta.push(esc(f.airline));
      if (f.confirmation) meta.push(`Confirmation <code>${esc(f.confirmation)}</code>`);
      if (f.seat) meta.push(`Seat ${esc(f.seat)}`);
      if (Array.isArray(f.passengers) && f.passengers.length) meta.push(esc(f.passengers.join(", ")));
      if (f.bags) meta.push(esc(f.bags));
      if (meta.length) lines.push(meta.join(" · "));
      return lines.join("<br/>");
    };
    const flights = section(
      "Flights",
      list(trip.flights?.booked ? [trip.flights.booked].flat() : [], renderFlight),
    );

    const transfers = section(
      "Transfers",
      list(trip.transfers, (t) => {
        if (typeof t === "string") return esc(t);
        const head = t.leg ?? t.summary ?? "";
        const body = t.plan ?? (t.summary && t.leg ? t.summary : "");
        return `${head ? `<strong>${esc(head)}</strong>` : ""}${head && body ? "<br/>" : ""}${esc(body)}${
          t.pickupTime ? ` · Pickup ${esc(t.pickupTime)}` : ""
        }`;
      }),
    );

    const hotel = section(
      "Hotel",
      trip.hotels?.booked
        ? `<p><strong>${esc(trip.hotels.booked.name)}</strong><br/>${esc(
            trip.hotels.booked.address ?? "",
          )}<br/>Check-in ${esc(trip.hotels.booked.checkIn ?? "")} · Check-out ${esc(
            trip.hotels.booked.checkOut ?? "",
          )}${(() => {
            const h = trip.hotels.booked;
            const conf = h.confirmation ?? h.hotelConfirmation;
            const bits: string[] = [];
            if (conf) bits.push(`Confirmation <code>${esc(conf)}</code>`);
            if (h.roomType) bits.push(esc(h.roomType));
            if (h.phone) bits.push(esc(h.phone));
            const extra = bits.length ? `<br/>${bits.join(" · ")}` : "";
            const perks = h.perks ? `<br/><em>${esc(h.perks)}</em>` : "";
            return `${extra}${perks}`;
          })()}</p>`
        : "",
    );

    const itineraryItems = trip.itinerary?.length ? trip.itinerary : trip.activities;
    const itinerary = section(
      "Day by day",
      list(itineraryItems, (d) =>
        typeof d === "string"
          ? esc(d)
          : `<strong>${esc(d.day ?? d.date ?? "")}</strong> ${esc(d.plan ?? "")}`,
      ),
    );

    const docs = section(
      "Documents",
      list(
        [
          trip.visa
            ? { s: `Visa: ${trip.visa.required ? trip.visa.status ?? "required" : "not required"}` }
            : null,
          profile.passportCountry ? { s: `Passport: ${profile.passportCountry}` } : null,
          ...(Array.isArray(trip.documents)
            ? trip.documents
            : trip.documents && typeof trip.documents === "object"
              ? Object.values(trip.documents)
              : []
          ).map((d: unknown) => ({ s: d })),
        ].filter(Boolean) as Array<{ s: unknown }>,
        (d) => esc(d.s),
      ),
    );

    const basics = section(
      "Local basics",
      list(
        [
          (trip.localBasics?.weather ?? trip.weather) ? { s: `Weather: ${trip.localBasics?.weather ?? trip.weather}` } : null,
          (trip.localBasics?.currency ?? trip.currency) ? { s: `Currency: ${trip.localBasics?.currency ?? trip.currency}` } : null,
          (trip.localBasics?.transit ?? trip.transit) ? { s: `Getting around: ${trip.localBasics?.transit ?? trip.transit}` } : null,
          trip.localBasics?.language ? { s: `Language: ${trip.localBasics.language}` } : null,
          trip.localBasics?.plugs ? { s: `Plugs: ${trip.localBasics.plugs}` } : null,
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

    const briefsDir = path.join(storageDir, "briefs");
    await fs.mkdir(briefsDir, { recursive: true });
    const briefPath = path.join(briefsDir, `${slug}.html`);
    await fs.writeFile(briefPath, html, "utf8");

    const missing = [
      !trip.flights?.booked && "flights",
      !trip.hotels?.booked && "hotel",
      !(trip.itinerary?.length || trip.activities?.length) && "itinerary",
      !trip.emergency?.length && "emergency numbers",
    ].filter(Boolean);

    return {
      content: JSON.stringify(
        {
          briefPath,
          html,
          missingSections: missing,
          note: missing.length
            ? `Brief generated but missing: ${missing.join(", ")}. Fill the trip record and regenerate before sending.`
            : "Brief complete. Render in-app, convert to PDF, and email per the skill.",
        },
        null,
        2,
      ),
    };
  },
};

export default generateTripBrief;
