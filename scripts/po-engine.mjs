import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FLIGHTAWARE_API_KEY = process.env.FLIGHTAWARE_API_KEY;
const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/cyrvdqwkme5hjj26cjat8oz51jrk98jp';
const SITE_URL = 'https://preferredoutcomes.org';
const INDEXNOW_KEY = 'poindex2026key';

const SILOS_FILE = path.join(process.cwd(), 'terminal', 'silos.json');

// 36 Global Airport Hubs
const ALL_AIRPORTS = [
  { code: 'EGLL', region: 'UK261', lang: 'English' },
  { code: 'LFPG', region: 'EU261', lang: 'French' },
  { code: 'EDDF', region: 'EU261', lang: 'German' },
  { code: 'EHAM', region: 'EU261', lang: 'English' },
  { code: 'LEMD', region: 'EU261', lang: 'Spanish' },
  { code: 'SBGR', region: 'ANAC_BR', lang: 'Portuguese (pt-BR)' },
  { code: 'CYYZ', region: 'APPR', lang: 'English' },
  { code: 'CYVR', region: 'APPR', lang: 'English' },
  { code: 'KJFK', region: 'US_DOT', lang: 'English' },
  { code: 'KATL', region: 'US_DOT', lang: 'English' },
  { code: 'KLAX', region: 'US_DOT', lang: 'English' },
  { code: 'KORD', region: 'US_DOT', lang: 'English' },
  { code: 'OMDB', region: 'GLOBAL', lang: 'English' },
  { code: 'YSSY', region: 'AU_ACL', lang: 'English' }
];

// 22 Balanced Global & Multi-Sector Feeds (Interleaved so Global, Polls, Tenancy & Finance all fire equally)
const GLOBAL_RSS_FEEDS = [
  { niche: 'CULTURE', region: 'GLOBAL', lang: 'English', url: 'https://news.google.com/rss/search?q=(controversy+OR+backlash+OR+feud+OR+divorce+OR+boycott+OR+scandal)+(fans+OR+public+OR+debate+OR+outrage)+when:2d&hl=en-US&gl=US&ceid=US:en' },
  { niche: 'OUTAGES', region: 'UK', lang: 'English', url: 'https://news.google.com/rss/search?q=(outage+OR+cancelled+OR+compensation+OR+refund+OR+Ofcom+OR+ombudsman)+when:2d&hl=en-GB&gl=GB&ceid=GB:en' },
  { niche: 'FINANCE', region: 'BR', lang: 'Portuguese (pt-BR)', url: 'https://news.google.com/rss/search?q=(indenizacao+OR+reembolso+OR+procon+OR+voo+cancelado+OR+fora+do+ar+OR+golpe)+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
  { niche: 'OUTAGES', region: 'DE', lang: 'German', url: 'https://news.google.com/rss/search?q=(Entschaedigung+OR+Rueckerstattung+OR+Flugausfall+OR+Stoerung+OR+Verbraucherschutz+OR+Streik)+when:2d&hl=de&gl=DE&ceid=DE:de' },
  { niche: 'OUTAGES', region: 'FR', lang: 'French', url: 'https://news.google.com/rss/search?q=(indemnisation+OR+remboursement+OR+panne+OR+greve+OR+litige+OR+locataire)+when:2d&hl=fr&gl=FR&ceid=FR:fr' },
  { niche: 'OUTAGES', region: 'ES', lang: 'Spanish', url: 'https://news.google.com/rss/search?q=(indemnizacion+OR+reembolso+OR+huelga+OR+caida+del+servicio+OR+reclamacion+OR+alquiler)+when:2d&hl=es&gl=ES&ceid=ES:es' },
  { niche: 'FINANCE', region: 'MX', lang: 'Spanish (es-MX)', url: 'https://news.google.com/rss/search?q=(Profeco+OR+reembolso+OR+queja+OR+falla+OR+cancelacion+OR+fraude)+when:2d&hl=es-419&gl=MX&ceid=MX:es-419' },
  { niche: 'FINANCE', region: 'AU', lang: 'English', url: 'https://news.google.com/rss/search?q=(ACCC+OR+refund+OR+outage+OR+breach+OR+compensation+OR+rental+OR+tribunal)+when:2d&hl=en-AU&gl=AU&ceid=AU:en' },
  { niche: 'OUTAGES', region: 'EU', lang: 'Italian', url: 'https://news.google.com/rss/search?q=(rimborso+OR+risarcimento+OR+sciopero+OR+disservizio+OR+truffa+OR+affitto)+when:2d&hl=it&gl=IT&ceid=IT:it' },
  { niche: 'FINANCE', region: 'GLOBAL', lang: 'English', url: 'https://news.google.com/rss/search?q=(India+OR+Singapore+OR+Dubai+OR+Japan)+(refund+OR+outage+OR+compensation+OR+consumer+OR+dispute)+when:2d&hl=en-IN&gl=IN&ceid=IN:en' },
  { niche: 'CULTURE', region: 'GLOBAL', lang: 'English', url: 'https://news.google.com/rss/search?q=(viral+OR+referee+OR+verdict+OR+trial+OR+celebrity+OR+streamer)+(divided+OR+backlash+OR+debate+OR+unfair)+when:2d&hl=en-GB&gl=GB&ceid=GB:en' },
  { niche: 'TENANCY', region: 'GLOBAL', lang: 'English', url: 'https://news.google.com/rss/search?q=(Airbnb+OR+VRBO+OR+Booking.com+OR+landlord+OR+tenant+OR+"security+deposit"+OR+eviction)+(refund+OR+dispute+OR+lawsuit+OR+fine)+when:2d&hl=en-US&gl=US&ceid=US:en' },
  { niche: 'TENANCY', region: 'UK', lang: 'English', url: 'https://news.google.com/rss/search?q=(landlord+OR+tenant+OR+rent+OR+deposit+OR+housing+OR+council+OR+Airbnb)+(dispute+OR+refund+OR+fine+OR+compensation)+when:2d&hl=en-GB&gl=GB&ceid=GB:en' },
  { niche: 'FINANCE', region: 'US', lang: 'English', url: 'https://news.google.com/rss/search?q=("account+frozen"+OR+"funds+held"+OR+"class+action+settlement"+OR+"data+breach"+OR+"junk+fees")+(claim+OR+payout+OR+refund)+when:2d&hl=en-US&gl=US&ceid=US:en' },
  { niche: 'OUTAGES', region: 'NA', lang: 'English', url: 'https://news.google.com/rss/search?q=(outage+OR+down+OR+"service+disruption"+OR+"ground+stop")+(refund+OR+credit+OR+compensation+OR+customers)+when:2d&hl=en-CA&gl=CA&ceid=CA:en' },
  { niche: 'RECALLS', region: 'GLOBAL', lang: 'English', url: 'https://news.google.com/rss/search?q=(recall+OR+FDA+OR+NHTSA+OR+CPSC+OR+defective)+(refund+OR+replacement+OR+lawsuit+OR+hazard)+when:2d&hl=en-US&gl=US&ceid=US:en' },
  { niche: 'POLITICS', region: 'GLOBAL', lang: 'English', url: 'https://news.google.com/rss/search?q=(petition+OR+"rate+hike"+OR+mandate+OR+ban+OR+tax+OR+toll)+(residents+OR+voters+OR+backlash+OR+protest)+when:2d&hl=en-GB&gl=GB&ceid=GB:en' },
  { niche: 'CULTURE', region: 'BR', lang: 'Portuguese (pt-BR)', url: 'https://news.google.com/rss/search?q=(polemica+OR+boicote+OR+escandalo+OR+revolta+OR+processo+OR+consumidor)+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
  { niche: 'CULTURE', region: 'ES', lang: 'Spanish', url: 'https://news.google.com/rss/search?q=(polemica+OR+escandalo+OR+indignacion+OR+boicot+OR+demanda+OR+consumidores)+when:2d&hl=es&gl=ES&ceid=ES:es' },
  { niche: 'FINANCE', region: 'EU', lang: 'English', url: 'https://news.google.com/rss/search?q=(Ryanair+OR+Lufthansa+OR+EasyJet+OR+Revolut+OR+Vodafone+OR+DHL)+(refund+OR+fine+OR+compensation+OR+outage+OR+complaint)+when:2d&hl=en-IE&gl=IE&ceid=IE:en' },
  { niche: 'TENANCY', region: 'CA', lang: 'English', url: 'https://news.google.com/rss/search?q=(LTB+OR+landlord+OR+tenant+OR+Airbnb+OR+condo+OR+"rent+increase")+(refund+OR+dispute+OR+ruling+OR+compensation)+when:2d&hl=en-CA&gl=CA&ceid=CA:en' },
  { niche: 'CULTURE', region: 'AU', lang: 'English', url: 'https://news.google.com/rss/search?q=(Qantas+OR+Optus+OR+Telstra+OR+Woolworths+OR+Coles+OR+landlord)+(outrage+OR+refund+OR+backlash+OR+inquiry)+when:2d&hl=en-AU&gl=AU&ceid=AU:en' }
];

function loadState() {
  if (fs.existsSync(SILOS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SILOS_FILE, 'utf8'));
    } catch (e) {}
  }
  return {
    schema_version: 9,
    deployed: {},
    active_silos: [],
    airport_cursor: 0
  };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(SILOS_FILE), { recursive: true });
  state.active_silos = Object.entries(state.deployed)
    .filter(([, v]) => v.status === 'LIVE')
    .map(([k, v]) => ({ id: v.slug || k, ...v }))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  fs.writeFileSync(SILOS_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function callOpenAI(systemPrompt, userPrompt) {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    return null;
  }
}

function buildSharedFooter(masterId, slug) {
  return `
    <div style='margin-top:28px;padding:28px 24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;color:#3b0764;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;line-height:1.85;letter-spacing:0.01em;'>
      <div style='font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#581c87;margin-bottom:10px;'>PLETHORA // ZERO</div>
      <p style='margin:0 0 8px 0;font-size:14px;color:#3b0764;'>A portion of proceeds from Preferred Outcomes supports PLETHORA. Through its ZERO mechanism, everyday people can also fund financial relief at zero cost to them.</p>
      <p style='margin:0 0 10px 0;font-size:14px;color:#3b0764;'>When someone begins an online purchase through ZERO, standard retailer commissions are redirected toward individuals experiencing a tight month. It costs nothing. It changes nothing about how people shop. It quietly creates relief.</p>
      <p style='margin:0;font-size:13px;color:#581c87;'>The world has plenty. Sometimes resources just need help moving around. &mdash; <a href='https://theworldhasplenty.org/ZERO' target='_blank' rel='noopener' style='color:#3b0764;text-decoration:underline;font-weight:600;'>theworldhasplenty.org/ZERO</a></p>
    </div>
    <div style='margin-top:22px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;'>
      <span>&copy; Preferred Outcomes Consumer Advocacy &amp; Public Sentiment Registry. Not a law firm.</span>
      <span style='display:flex;gap:14px;'>
        <a href='/mandate/' style='color:#0f172a;font-weight:700;text-decoration:underline;'>Our Mandate</a>
        <a href='/resolution/?docket=${encodeURIComponent(masterId)}&ref=${encodeURIComponent(slug)}' style='color:#475569;text-decoration:underline;'>Corporate &amp; Legal Resolution Desk</a>
      </span>
    </div>`;
}

function buildSiloHtml(d, isFlight) {
  const masterIncident = (d.master_incident_id || d.slug || d.ident || 'docket').toLowerCase();
  const pageSlug = (d.slug || d.ident || 'docket').toLowerCase();
  const slotCount = 29 + (crypto.createHash('md5').update(pageSlug).digest()[0] % 16);

  return `<!DOCTYPE html>
<html lang='${d.lang_code || 'en'}'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1.0'>
  <title>${d.seo_title} | Preferred Outcomes</title>
  <meta name='description' content='${(d.ai_direct_answer || '').replace(/'/g, '&#39;')}'>
  <link rel='icon' href='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2216%22 fill=%22%230f172a%22/><text x=%2250%25%22 y=%2254%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2242%22>P/O</text></svg>'>
</head>
<body style='background:#f1f5f9;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;margin:0;padding:24px 14px;line-height:1.6;'>
  <div style='max-width:760px;margin:auto;background:#ffffff;border:1px solid #cbd5e1;border-radius:12px;padding:28px;box-shadow:0 8px 24px rgba(15,23,42,0.06);'>
    <div style='display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:20px;flex-wrap:wrap;gap:8px;'>
      <a href='/' style='font-weight:900;font-size:15px;letter-spacing:0.05em;color:#0f172a;text-decoration:none;'>P/O // PREFERRED OUTCOMES</a>
      <span style='background:#dcfce7;color:#166534;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:800;text-transform:uppercase;'>${d.badge_text}</span>
    </div>

    <h1 style='font-size:27px;line-height:1.25;margin:0 0 16px 0;color:#0f172a;font-weight:900;'>${d.human_h1}</h1>

    <div style='background:#f8fafc;border-left:4px solid #0f172a;padding:16px;border-radius:0 6px 6px 0;margin-bottom:20px;font-size:16px;font-weight:500;color:#1e293b;'>
      <strong>Direct Summary:</strong> ${d.ai_direct_answer}
    </div>

    <div style='background:#0f172a;color:#ffffff;padding:12px 16px;border-radius:6px;font-size:13px;font-weight:700;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;'>
      <span>DOCKET LEDGER: ${masterIncident.toUpperCase()} (${slotCount} OF 50 BATCH SLOTS FILLED)</span>
      <span style='color:#4ade80;'>● ACTIVE INTAKE</span>
    </div>

    <div itemscope itemtype='https://schema.org/FAQPage'>
      <div itemscope itemprop='mainEntity' itemtype='https://schema.org/Question'>
        <h2 itemprop='name' style='font-size:20px;color:#0f172a;margin-top:24px;'>${d.q1_human}</h2>
        <div itemscope itemprop='acceptedAnswer' itemtype='https://schema.org/Answer'>
          <p itemprop='text' style='color:#334155;font-size:16px;'>${d.a1_answer}</p>
        </div>
      </div>
      <div itemscope itemprop='mainEntity' itemtype='https://schema.org/Question'>
        <h2 itemprop='name' style='font-size:20px;color:#0f172a;margin-top:24px;'>${d.q2_human}</h2>
        <div itemscope itemprop='acceptedAnswer' itemtype='https://schema.org/Answer'>
          <p itemprop='text' style='color:#334155;font-size:16px;'>${d.a2_answer}</p>
        </div>
      </div>
      <div itemscope itemprop='mainEntity' itemtype='https://schema.org/Question'>
        <h2 itemprop='name' style='font-size:20px;color:#0f172a;margin-top:24px;'>${d.q3_human}</h2>
        <div itemscope itemprop='acceptedAnswer' itemtype='https://schema.org/Answer'>
          <p itemprop='text' style='color:#334155;font-size:16px;'>${d.a3_answer}</p>
        </div>
      </div>
    </div>

    <h3 style='font-size:18px;color:#0f172a;margin-top:30px;margin-bottom:14px;'>${d.compare_heading}</h3>
    <div style='display:flex;flex-direction:column;gap:14px;margin-bottom:24px;'>
      <div style='background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:16px;'>
        <div style='color:#b91c1c;font-weight:800;font-size:13px;text-transform:uppercase;'>${d.red_option_title}</div>
        <p style='margin:6px 0 0 0;font-size:14px;color:#7f1d1d;'>${d.red_option_text}</p>
      </div>
      <div style='background:#fffbeb;border:2px solid #f59e0b;border-radius:8px;padding:16px;'>
        <div style='color:#b45309;font-weight:800;font-size:13px;text-transform:uppercase;'>${d.amber_option_title}</div>
        <p style='margin:6px 0 0 0;font-size:14px;color:#78350f;'>${d.amber_option_text}</p>
      </div>
      <div style='background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:20px;'>
        <div style='color:#15803d;font-weight:800;font-size:13px;text-transform:uppercase;'>${d.green_option_title}</div>
        <p style='margin:6px 0 14px 0;font-size:14px;color:#14532d;'>${d.green_option_text}</p>
        <form action='${MAKE_WEBHOOK_URL}' method='GET' style='display:flex;flex-direction:column;gap:10px;'>
          <input type='hidden' name='flow_type' value='DFY_CHECKOUT'>
          <input type='hidden' name='niche' value='${d.niche}'>
          <input type='hidden' name='incident' value='${masterIncident}'>
          <input type='hidden' name='tier' value='${d.tier}'>
          <input type='hidden' name='region' value='${d.region}'>
          <input type='text' name='name' required placeholder='${(d.name_placeholder || 'Your Full Name').replace(/'/g, '&#39;')}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'>
          <input type='text' name='pnr' required placeholder='${(d.input_placeholder || 'Reference / Statement').replace(/'/g, '&#39;')}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'>
          <input type='email' name='email' required placeholder='${(d.email_placeholder || 'Your Email Address').replace(/'/g, '&#39;')}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'>
          <button type='submit' style='padding:16px;background:#16a34a;color:#ffffff;font-weight:900;font-size:16px;border:none;border-radius:6px;cursor:pointer;'>${d.cta_button_text} &rarr;</button>
        </form>
      </div>
    </div>

    <div style='background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin-top:24px;'>
      <h4 style='margin:0 0 6px 0;font-size:16px;color:#0f172a;'>${d.free_tool_title}</h4>
      <p style='margin:0 0 14px 0;font-size:14px;color:#475569;'>${d.free_tool_cta}</p>
      <form action='${MAKE_WEBHOOK_URL}' method='GET' style='display:flex;flex-direction:column;gap:10px;'>
        <input type='hidden' name='flow_type' value='FREE_LEAD'>
        <input type='hidden' name='niche' value='${d.niche}'>
        <input type='hidden' name='incident' value='${masterIncident}'>
        <input type='hidden' name='tier' value='${d.tier}'>
        <input type='hidden' name='region' value='${d.region}'>
        <div style='display:flex;gap:10px;flex-wrap:wrap;'>
          <input type='text' name='signer_name' required placeholder='${(d.name_placeholder || 'Your Full Name').replace(/'/g, '&#39;')}' style='flex:1;min-width:180px;padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'>
          <input type='email' name='email' required placeholder='${(d.email_placeholder || 'Your Email Address').replace(/'/g, '&#39;')}' style='flex:1;min-width:200px;padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'>
        </div>
        <input type='text' name='loss_impact' required placeholder='${(d.free_input_placeholder || 'City/Region & Estimated Impact or Stance').replace(/'/g, '&#39;')}' style='padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'>
        <label style='display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#64748b;cursor:pointer;'>
          <input type='checkbox' name='coreg_optin' value='yes' checked style='margin-top:3px;'>
          <span>Also subscribe me to free consumer settlement alerts, partner briefs, and consolidated batch recovery updates (unsubscribe anytime).</span>
        </label>
        <button type='submit' style='padding:13px;background:#0f172a;color:#ffffff;font-weight:800;font-size:14px;border:none;border-radius:6px;cursor:pointer;'>${d.free_button_text}</button>
      </form>
    </div>

    ${buildSharedFooter(masterIncident, pageSlug)}
  </div>
</body>
</html>`;
}

// 1. Poll Global Commercial Flights via FlightAware AeroAPI
async function pollGlobalAviation(state, newUrls) {
  if (!FLIGHTAWARE_API_KEY) return;
  const idx = (state.airport_cursor || 0) % ALL_AIRPORTS.length;
  state.airport_cursor = (idx + 1) % ALL_AIRPORTS.length;
  const hub = ALL_AIRPORTS[idx];

  try {
    console.log(`[Aviation] Polling hub ${hub.code} (${hub.region})...`);
    const res = await fetch(`https://aeroapi.flightaware.com/aeroapi/airports/${hub.code}/flights?max_pages=1`, {
      headers: { 'x-apikey': FLIGHTAWARE_API_KEY }
    });
    if (!res.ok) return;
    const data = await res.json();
    const allFlights = [...(data.departures || []), ...(data.arrivals || [])];

    const disrupted = allFlights.filter(f => {
      if (!f.ident || f.ident.length < 4) return false;
      const delaySec = Math.max(f.departure_delay || 0, f.arrival_delay || 0);
      return f.cancelled === true || delaySec >= 10800; // Cancelled or 3h+ delay
    }).slice(0, 6);

    for (const fl of disrupted) {
      const ident = fl.ident.toLowerCase();
      if (state.deployed[ident]) continue;

      const parsed = await callOpenAI(
        `You are an aviation statutory specialist. Never use the word "automated" or "AI". Output JSON in ${hub.lang} with keys:
        "seo_title", "human_h1", "ai_direct_answer", "badge_text", "lang_code",
        "q1_human", "a1_answer", "q2_human", "a2_answer", "q3_human", "a3_answer",
        "compare_heading", "red_option_title", "red_option_text", "amber_option_title", "amber_option_text",
        "green_option_title", "green_option_text", "name_placeholder", "input_placeholder", "free_input_placeholder",
        "email_placeholder", "cta_button_text" (must end with "— $29.00"), "free_tool_title", "free_tool_cta", "free_button_text".`,
        `Flight ${fl.ident} at ${hub.code} (${hub.region}) is ${fl.cancelled ? 'CANCELLED' : 'DELAYED OVER 3 HOURS'}. Generate a natural long-tail passenger compensation & refund filing page.`
      );

      if (!parsed || !parsed.seo_title) continue;
      parsed.slug = ident;
      parsed.master_incident_id = ident;
      parsed.niche = 'AVIATION';
      parsed.tier = 'TIER_1_STATUTORY';
      parsed.region = hub.region;

      const html = buildSiloHtml(parsed, true);
      const outDir = path.join(process.cwd(), 'flight', ident);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

      state.deployed[ident] = {
        ts: Date.now(),
        status: 'LIVE',
        slug: ident,
        master_id: ident,
        type: 'AVIATION',
        tier: 'TIER_1_STATUTORY',
        region: hub.region
      };
      newUrls.push(`${SITE_URL}/flight/${ident}/`);
      console.log(`Deployed Flight [${hub.region}]: /flight/${ident}/`);
    }
  } catch (e) {
    console.error('Aviation poll error:', e.message);
  }
}

// 2. Parallel Round-Robin Global News Engine (Up to 110 Pages Per Run Across All Regions)
async function processGlobalNews(state, newUrls) {
  const SYSTEM_PROMPT = `You are an elite SEO & consumer advocacy publisher.
CRITICAL RULES:
1. NEVER use the word "automated", "bot", or "AI" anywhere in your output. Use institutional phrasing: "Pre-Cited Statutory Dispatch", "Direct Compliance Filing", "Verified Docket".
2. NATURAL LONG-TAIL SEARCH HEADLINES: "seo_title" and "human_h1" MUST be phrased the exact way real humans search on Google in the target language.
3. OPTION B MASTER INCIDENT UNIFICATION: Generate a 2-to-3 word canonical "master_incident_id" representing the core entity + event (e.g. "microsoft-365-outage", "att-data-breach", "airbnb-cancellation-refund").
4. STRICT MONETIZATION TIER ROUTING:
   - If Target Niche is "CULTURE" or the story is a celebrity scandal, sports referee controversy, viral feud, court verdict debate, or public backlash -> MUST use "TIER_3_POLL" ($1.99).
   - If Target Niche is "POLITICS" or the story is a policy shift, rate hike, corporate boycott, or general class-action deadline -> MUST use "TIER_2_LEDGER" ($4.99).
   - Use "TIER_1_STATUTORY" ($29.00) ONLY when a specific company/landlord/bank owes an individual customer a direct refund, deposit return, or outage credit right now.

Return a strict JSON object with these keys in the requested Language:
- "slug": (4 to 6 word ASCII lowercase hyphenated search slug)
- "master_incident_id": (2 to 3 word ASCII lowercase hyphenated canonical key)
- "lang_code": (e.g. "en", "pt", "es", "de", "fr", "it")
- "niche": ("TENANCY", "OUTAGES", "RECALLS", "FINANCE", "POLITICS", or "CULTURE")
- "region": ("US", "CA", "UK", "EU", "BR", "ES", "MX", "DE", "FR", "AU", or "GLOBAL")
- "tier": ("TIER_1_STATUTORY", "TIER_2_LEDGER", or "TIER_3_POLL")
- "badge_text", "seo_title", "human_h1", "ai_direct_answer"
- "q1_human", "a1_answer", "q2_human", "a2_answer", "q3_human", "a3_answer"
- "compare_heading", "red_option_title", "red_option_text", "amber_option_title", "amber_option_text", "green_option_title", "green_option_text"
- "name_placeholder", "input_placeholder", "free_input_placeholder", "email_placeholder"
- "cta_button_text": (Must end with "— $29.00", "— $4.99", or "— $1.99" matching the tier)
- "free_tool_title", "free_tool_cta", "free_button_text"`;

  // Fetch all 22 global RSS feeds in parallel
  const feedResults = await Promise.all(
    GLOBAL_RSS_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url);
        if (!res.ok) return [];
        const xml = await res.text();
        const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 6);
        return matches.map(m => {
          const itemXml = m[1];
          const t = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/);
          if (!t) return null;
          const rawTitle = t[1].replace(/ - .*$/, '').trim();
          const hashId = crypto.createHash('sha256').update(rawTitle).digest('hex').slice(0, 16);
          return { rawTitle, hashId, feed };
        }).filter(Boolean);
      } catch (e) {
        return [];
      }
    })
  );

  // Interleave items round-robin across all 22 feeds so US/CAN never blocks UK, BR, DE, FR, ES, MX, AU, or CULTURE Polls
  const candidates = [];
  for (let i = 0; i < 6; i++) {
    for (const list of feedResults) {
      if (list[i] && !state.deployed[list[i].hashId]) {
        candidates.push(list[i]);
      }
    }
  }

  // Deduplicate candidates by hashId and take up to 96 per run
  const uniqueQueue = [];
  const seenHashes = new Set();
  for (const item of candidates) {
    if (!seenHashes.has(item.hashId)) {
      seenHashes.add(item.hashId);
      uniqueQueue.push(item);
    }
    if (uniqueQueue.length >= 96) break;
  }

  console.log(`[Global Discovery] Processing ${uniqueQueue.length} fresh global stories in parallel batches...`);

  // Process in parallel waves of 12 for 10x speed
  const BATCH_SIZE = 12;
  for (let i = 0; i < uniqueQueue.length; i += BATCH_SIZE) {
    const chunk = uniqueQueue.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(async ({ rawTitle, hashId, feed }) => {
      const parsed = await callOpenAI(
        SYSTEM_PROMPT,
        `Headline: "${rawTitle}" | Target Niche: ${feed.niche} | Region: ${feed.region} | Language: ${feed.lang}`
      );

      if (!parsed || !parsed.slug) {
        state.deployed[hashId] = { ts: Date.now(), status: 'SKIPPED' };
        return;
      }

      // Enforce $1.99 on CULTURE and $4.99 on POLITICS even if model drifts
      if (feed.niche === 'CULTURE') {
        parsed.tier = 'TIER_3_POLL';
        parsed.niche = 'CULTURE';
        if (parsed.cta_button_text && !parsed.cta_button_text.includes('1.99')) {
          parsed.cta_button_text = parsed.cta_button_text.replace(/\$\d+(\.\d+)?/, '$1.99');
        }
      } else if (feed.niche === 'POLITICS' && parsed.tier === 'TIER_1_STATUTORY') {
        parsed.tier = 'TIER_2_LEDGER';
        if (parsed.cta_button_text && !parsed.cta_button_text.includes('4.99')) {
          parsed.cta_button_text = parsed.cta_button_text.replace(/\$\d+(\.\d+)?/, '$4.99');
        }
      }

      const cleanSlug = parsed.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
      const cleanMaster = (parsed.master_incident_id || cleanSlug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
      if (!cleanSlug) return;

      parsed.slug = cleanSlug;
      parsed.master_incident_id = cleanMaster;
      parsed.region = feed.region;

      const html = buildSiloHtml(parsed, false);
      const outDir = path.join(process.cwd(), 'docket', cleanSlug);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

      state.deployed[hashId] = {
        ts: Date.now(),
        status: 'LIVE',
        slug: cleanSlug,
        master_id: cleanMaster,
        type: parsed.niche || feed.niche,
        tier: parsed.tier || 'TIER_2_LEDGER',
        region: feed.region
      };

      newUrls.push(`${SITE_URL}/docket/${cleanSlug}/`);
      console.log(`Deployed [${parsed.tier}] (${feed.region} - ${feed.niche}): /docket/${cleanSlug}/`);
    }));
  }
}

async function updateSitemap(state) {
  const urls = [`${SITE_URL}/`, `${SITE_URL}/mandate/`, `${SITE_URL}/resolution/`];
  for (const [k, v] of Object.entries(state.deployed)) {
    if (v.status !== 'LIVE') continue;
    if (v.type === 'AVIATION') {
      urls.push(`${SITE_URL}/flight/${(v.slug || k).toLowerCase()}/`);
    } else if (v.slug) {
      urls.push(`${SITE_URL}/docket/${v.slug.toLowerCase()}/`);
    }
  }
  const uniqueUrls = [...new Set(urls)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    uniqueUrls.map(u => `  <url><loc>${u}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`).join('\n') +
    `\n</urlset>`;
  fs.writeFileSync(path.join(process.cwd(), 'sitemap.xml'), xml, 'utf8');
}

async function pingIndexNow(newUrls) {
  if (!newUrls.length) return;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'preferredoutcomes.org',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: newUrls.slice(0, 100)
      })
    });
  } catch (e) {}
}

async function run() {
  const state = loadState();
  const newUrls = [];
  await pollGlobalAviation(state, newUrls);
  await processGlobalNews(state, newUrls);
  saveState(state);
  await updateSitemap(state);
  await pingIndexNow(newUrls);
}

run();
