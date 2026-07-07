import type { ToolDefinition } from "@vellumai/plugin-api";

interface GenerateTripBriefInput {
  trip: string;
}

const esc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inline SVG icons (no emoji fonts in headless render environments)
const ICONS: Record<string, string> = {
  plane:
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
  hotel:
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/></svg>',
  train:
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2c-4.42 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
  doc:
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
  alert:
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
  pin:
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
};

const icon = (name: string): string =>
  `<span class="ic">${ICONS[name] ?? ""}</span>`;

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
      // profile optional for the brief
    }

    const f = trip.flights?.booked ?? {};
    const h = trip.hotels?.booked ?? {};
    const lb = trip.localBasics ?? {};

    // ---- At-a-glance cards ----
    const glanceCards: string[] = [];
    if (f.outbound)
      glanceCards.push(
        `<div class="card"><div class="card-head accent-blue">${icon("plane")} OUTBOUND</div><div class="card-body">${esc(f.outbound)}</div>${
          f.confirmation ? `<div class="card-foot">Conf <code>${esc(f.confirmation)}</code></div>` : ""
        }</div>`,
      );
    if (h.name)
      glanceCards.push(
        `<div class="card"><div class="card-head accent-green">${icon("hotel")} HOTEL</div><div class="card-body"><strong>${esc(h.name)}</strong><br/>${esc(
          h.checkIn ? `In ${h.checkIn}` : "",
        )}${h.checkOut ? ` · Out ${esc(h.checkOut)}` : ""}</div>${
          h.hotelConfirmation ?? h.confirmation
            ? `<div class="card-foot">Conf <code>${esc(h.hotelConfirmation ?? h.confirmation)}</code></div>`
            : ""
        }</div>`,
      );
    if (f.return)
      glanceCards.push(
        `<div class="card"><div class="card-head accent-blue">${icon("plane")} RETURN</div><div class="card-body">${esc(f.return)}</div>${
          f.confirmation ? `<div class="card-foot">Conf <code>${esc(f.confirmation)}</code></div>` : ""
        }</div>`,
      );

    // ---- Flight fine print ----
    const flightMeta: string[] = [];
    if (f.airline) flightMeta.push(esc(f.airline));
    if (Array.isArray(f.passengers) && f.passengers.length)
      flightMeta.push(esc(f.passengers.join(" · ")));
    if (f.bags) flightMeta.push(esc(f.bags));
    const flightNote = flightMeta.length
      ? `<p class="fineprint">${flightMeta.join("<br/>")}</p>`
      : "";

    // ---- Day-by-day timeline ----
    const items: any[] = trip.itinerary?.length ? trip.itinerary : trip.activities ?? [];
    const dayRows = items
      .map((d: any) => {
        const text = typeof d === "string" ? d : `${d.day ?? d.date ?? ""} ${d.plan ?? ""}`;
        // split "Fri Jul 10: rest" into day label + plan
        const m = String(text).match(/^([^:]{2,24}):\s*(.*)$/s);
        const label = m ? m[1] : "";
        const plan = m ? m[2] : String(text);
        // split plan into steps on commas that precede a capital or time
        const steps = plan
          .split(/,\s+(?=[A-Z0-9])/)
          .map((s: string) => `<div class="step"><span class="dot"></span>${esc(s.trim())}</div>`)
          .join("");
        return `<div class="day"><div class="day-label">${esc(label)}</div><div class="day-steps">${steps}</div></div>`;
      })
      .join("");

    // ---- Transfers ----
    const transferRows = (trip.transfers ?? [])
      .map((t: any) => {
        if (typeof t === "string")
          return `<div class="transfer"><div class="t-leg">${icon("train")}</div><div class="t-plan">${esc(t)}</div></div>`;
        return `<div class="transfer"><div class="t-leg">${icon("train")} <strong>${esc(
          t.leg ?? t.summary ?? "",
        )}</strong></div><div class="t-plan">${esc(t.plan ?? "")}${
          t.pickupTime ? ` · Pickup ${esc(t.pickupTime)}` : ""
        }</div></div>`;
      })
      .join("");

    // ---- Documents ----
    const docItems: string[] = [
      ...(profile.passportCountry && !JSON.stringify(trip.documents ?? "").includes("passport")
        ? [`Passport: ${profile.passportCountry}`]
        : []),
      ...(Array.isArray(trip.documents)
        ? trip.documents
        : trip.documents && typeof trip.documents === "object"
          ? Object.values(trip.documents)
          : []),
      ...(trip.visa?.notes ? [trip.visa.notes] : []),
    ].map((d) => `<li>${icon("doc")} ${esc(d)}</li>`);

    // ---- Local basics chips ----
    const chips: string[] = [];
    const chip = (label: string, val: unknown) =>
      val ? chips.push(`<div class="chip"><span class="chip-label">${esc(label)}</span>${esc(val)}</div>`) : 0;
    chip("Weather", lb.weather ?? trip.weather);
    chip("Currency", lb.currency ?? trip.currency);
    chip("Getting around", lb.transit ?? trip.transit);
    chip("Language", lb.language);
    chip("Plugs", lb.plugs);
    for (const n of trip.localNotes ?? []) chip("Note", n);

    // ---- Emergency ----
    const emergencyRow = (trip.emergency ?? [])
      .map((e: unknown) => `<span class="em">${esc(e)}</span>`)
      .join("");

    // ---- Open items ----
    const openItems = (trip.checklist ?? [])
      .filter((c: any) => !c.done)
      .map((c: any) => `<li>${icon("alert")} ${esc(c.item)}</li>`)
      .join("");

    const sec = (title: string, body: string, cls = ""): string =>
      body.trim() ? `<section class="${cls}"><h2>${esc(title)}</h2>${body}</section>` : "";

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Trip brief: ${esc(trip.destination ?? slug)}</title>
<style>
  :root { --ink:#16202b; --muted:#6b7683; --line:#e6e9ed; --blue:#1f6fd6; --green:#1e8a5a; --amber:#b7791f; --bg:#f7f8fa; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; margin: 0; color: var(--ink); background:#fff; }
  .page { max-width: 720px; margin: 0 auto; padding: 28px 26px 40px; }
  .hero { border-bottom: 3px solid var(--ink); padding-bottom: 14px; margin-bottom: 18px; }
  .hero h1 { font-size: 30px; margin: 0; letter-spacing: -0.01em; }
  .hero .sub { color: var(--muted); font-size: 14px; margin-top: 4px; }
  .hero .anchor { display:inline-block; margin-top:8px; background: var(--ink); color:#fff; font-size:12px; font-weight:600; padding:3px 10px; border-radius: 99px; }
  .glance { display: flex; gap: 10px; margin: 18px 0 6px; }
  .card { flex:1; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: #fff; }
  .card-head { font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; padding: 7px 10px; display:flex; align-items:center; gap:5px; color:#fff; }
  .accent-blue { background: var(--blue); }
  .accent-green { background: var(--green); }
  .card-body { padding: 9px 10px 4px; font-size: 12.5px; line-height: 1.45; }
  .card-foot { padding: 2px 10px 9px; font-size: 11.5px; color: var(--muted); }
  .ic svg { vertical-align: -2px; }
  .fineprint { color: var(--muted); font-size: 11.5px; margin: 6px 2px 0; line-height: 1.5; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); margin: 24px 0 10px; }
  code { background: var(--bg); border:1px solid var(--line); padding: 0 5px; border-radius: 4px; font-size: 0.95em; }
  .day { display: flex; margin-bottom: 12px; break-inside: avoid; }
  .day-label { flex: 0 0 88px; font-weight: 700; font-size: 13px; padding-top: 1px; }
  .day-steps { flex: 1; border-left: 2px solid var(--line); padding-left: 14px; }
  .step { position: relative; font-size: 13px; line-height: 1.5; margin-bottom: 5px; }
  .dot { position: absolute; left: -19.5px; top: 6px; width: 8px; height: 8px; border-radius: 99px; background: var(--blue); border: 2px solid #fff; }
  .transfer { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--line); font-size: 12.5px; }
  .transfer:last-child { border-bottom: 0; }
  .t-leg { flex: 0 0 218px; color: var(--ink); }
  .t-plan { flex: 1; color: var(--muted); line-height: 1.5; }
  .hotel-box { border: 1px solid var(--line); border-left: 4px solid var(--green); border-radius: 8px; padding: 12px 14px; font-size: 13px; line-height: 1.55; }
  .hotel-box .perks { color: var(--green); font-size: 12px; margin-top: 6px; }
  ul.plain { list-style: none; padding: 0; margin: 0; }
  ul.plain li { font-size: 12.5px; padding: 4px 0; display: flex; gap: 7px; align-items: baseline; }
  ul.plain .ic { flex: 0 0 auto; color: var(--muted); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 7px 11px; font-size: 12px; line-height: 1.45; max-width: 100%; }
  .chip-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-bottom: 1px; }
  .emergency { background: var(--ink); color: #fff; border-radius: 10px; padding: 12px 14px; display: flex; flex-wrap: wrap; gap: 6px 18px; }
  .emergency .em { font-size: 12px; }
  section.open ul.plain .ic { color: var(--amber); }
  @media print { .page { padding: 0; } .glance { gap: 8px; } }
</style>
</head>
<body>
<div class="page">
  <div class="hero">
    <h1>${esc(trip.destination ?? slug)}</h1>
    <div class="sub">${esc(trip.dates?.start ?? "")} → ${esc(trip.dates?.end ?? "")}${
      Array.isArray(trip.companions) && trip.companions.length
        ? ` · with ${esc(trip.companions.join(", "))}`
        : ""
    }</div>
    ${trip.anchor ? `<span class="anchor">${esc(trip.anchor)}</span>` : ""}
  </div>
  ${glanceCards.length ? `<div class="glance">${glanceCards.join("")}</div>${flightNote}` : ""}
  ${sec("Day by day", dayRows)}
  ${sec("Getting around", transferRows)}
  ${
    h.name
      ? sec(
          "Hotel",
          `<div class="hotel-box"><strong>${esc(h.name)}</strong> · ${esc(h.roomType ?? "")}<br/>${esc(
            h.address ?? "",
          )}${h.phone ? ` · ${esc(h.phone)}` : ""}<br/>Check-in ${esc(h.checkIn ?? "")} · Check-out ${esc(
            h.checkOut ?? "",
          )}${
            h.hotelConfirmation ?? h.confirmation
              ? ` · Conf <code>${esc(h.hotelConfirmation ?? h.confirmation)}</code>`
              : ""
          }${h.perks ? `<div class="perks">${icon("check")} ${esc(h.perks)}</div>` : ""}</div>`,
        )
      : ""
  }
  ${sec("Documents & tickets", docItems.length ? `<ul class="plain">${docItems.join("")}</ul>` : "")}
  ${sec("Local basics", chips.length ? `<div class="chips">${chips.join("")}</div>` : "")}
  ${sec("Emergency", emergencyRow ? `<div class="emergency">${emergencyRow}</div>` : "")}
  ${sec("Still open", openItems ? `<ul class="plain">${openItems}</ul>` : "", "open")}
</div>
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
