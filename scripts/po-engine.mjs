import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FLIGHTAWARE_API_KEY = process.env.FLIGHTAWARE_API_KEY;
const WEBHOOK_URL = 'https://hook.us2.make.com/cyrvdqwkme5hjj26cjat8oz51jrk98jp';
const INDEXNOW_KEY = 'poindex2026key';

const AIRPORTS = [
  'CYYZ','CYVR','CYUL','CYYC','KJFK','KEWR','KATL','KORD','KDFW','KDEN','KLAX',
  'EGLL','EGKK','LFPG','EDDF','EHAM','LEMD','LIRF','EIDW','SBGR','LTFM','LLBG','OERK','OEJN'
];

const NEWS_FEEDS = [
  // Broad Global & Regional Breaking News + Consumer/Corporate Fallouts
  'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-CA&gl=CA&ceid=CA:en',
  'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-GB&gl=GB&ceid=GB:en',
  // High-Intent Compensation, Outages, Recalls, Tenancy & Public Ledger
  'https://news.google.com/rss/search?q=Airbnb+refund+OR+VRBO+cancellation+OR+tenant+eviction+OR+rent+abatement+OR+power+outage+compensation+when:4h&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=service+outage+refund+OR+network+down+compensation+OR+bank+account+freeze+OR+insurance+claim+denial+when:4h&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=data+breach+settlement+OR+product+recall+refund+OR+event+cancellation+refund+OR+class+action+lawsuit+when:4h&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=boycott+OR+petition+OR+corporate+backlash+scandal+OR+viral+feud+controversy+when:4h&hl=en-US&gl=US&ceid=US:en',
  // Non-English High-Converting Silos (LATAM / EU)
  'https://news.google.com/rss/search?q=indemnizacion+OR+reembolso+OR+corte+de+luz+OR+huelga+OR+estafa+when:4h&hl=es-419&gl=MX&ceid=MX:es-419',
  'https://news.google.com/rss/search?q=indenizacao+OR+reembolso+OR+apagao+OR+golpe+OR+cancelamento+when:4h&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  'https://news.google.com/rss/search?q=indemnisation+OR+remboursement+OR+panne+OR+greve+OR+scandale+when:4h&hl=fr&gl=FR&ceid=FR:fr'
];

const STATE_PATH = 'terminal/silos.json';
fs.mkdirSync('terminal', { recursive: true });
fs.mkdirSync('flight', { recursive: true });
fs.mkdirSync('docket', { recursive: true });

let state = { deployed: {}, active_silos: [] };
if (fs.existsSync(STATE_PATH)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    state = { deployed: {}, active_silos: [] };
  }
}

const escAttr = (str = '') =>
  String(str).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callOpenAI(systemPrompt, userPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

function buildPageHtml({ langCode, pageTitle, metaDesc, badgeText, h1, aiAnswer, statusBarLeft, q1, a1, q2, a2, q3, a3, compareHeading, redTitle, redText, amberTitle, amberText, greenTitle, greenText, niche, incident, region, tier, namePh, inputPh, emailPh, ctaText, freeTitle, freeCta, freePh, coregText, freeBtn }) {
  return `<!DOCTYPE html><html lang='${escAttr(langCode)}'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1.0'><title>${escAttr(pageTitle)} | Preferred Outcomes</title><meta name='description' content='${escAttr(metaDesc)}'></head><body style='background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;margin:0;padding:20px;line-height:1.6;'><div style='max-width:760px;margin:auto;background:#ffffff;border:1px solid #cbd5e1;border-radius:12px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,0.06);'><div style='display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:20px;flex-wrap:wrap;gap:8px;'><span style='font-weight:900;font-size:15px;letter-spacing:0.05em;'>P/O // PREFERRED OUTCOMES</span><span style='background:#dcfce7;color:#166534;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:800;text-transform:uppercase;'>${badgeText}</span></div><h1 style='font-size:28px;line-height:1.25;margin:0 0 16px 0;color:#0f172a;'>${h1}</h1><div style='background:#f1f5f9;border-left:4px solid #0f172a;padding:16px;border-radius:4px;margin-bottom:20px;font-size:16px;font-weight:500;color:#1e293b;'>${aiAnswer}</div><div style='background:#0f172a;color:#ffffff;padding:12px 16px;border-radius:6px;font-size:13px;font-weight:700;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;'><span>${statusBarLeft}</span><span style='color:#4ade80;'>● LIVE</span></div><div itemscope itemtype='https://schema.org/FAQPage'><div itemscope itemprop='mainEntity' itemtype='https://schema.org/Question'><h2 itemprop='name' style='font-size:20px;color:#0f172a;margin-top:24px;'>${q1}</h2><div itemscope itemprop='acceptedAnswer' itemtype='https://schema.org/Answer'><p itemprop='text' style='color:#334155;font-size:16px;'>${a1}</p></div></div><div itemscope itemprop='mainEntity' itemtype='https://schema.org/Question'><h2 itemprop='name' style='font-size:20px;color:#0f172a;margin-top:24px;'>${q2}</h2><div itemscope itemprop='acceptedAnswer' itemtype='https://schema.org/Answer'><p itemprop='text' style='color:#334155;font-size:16px;'>${a2}</p></div></div><div itemscope itemprop='mainEntity' itemtype='https://schema.org/Question'><h2 itemprop='name' style='font-size:20px;color:#0f172a;margin-top:24px;'>${q3}</h2><div itemscope itemprop='acceptedAnswer' itemtype='https://schema.org/Answer'><p itemprop='text' style='color:#334155;font-size:16px;'>${a3}</p></div></div></div><h3 style='font-size:18px;color:#0f172a;margin-top:30px;margin-bottom:14px;'>${compareHeading}</h3><div style='display:flex;flex-direction:column;gap:14px;margin-bottom:24px;'><div style='background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:16px;'><div style='color:#b91c1c;font-weight:800;font-size:13px;text-transform:uppercase;'>${redTitle}</div><p style='margin:6px 0 0 0;font-size:14px;color:#7f1d1d;'>${redText}</p></div><div style='background:#fffbeb;border:2px solid #f59e0b;border-radius:8px;padding:16px;'><div style='color:#b45309;font-weight:800;font-size:13px;text-transform:uppercase;'>${amberTitle}</div><p style='margin:6px 0 0 0;font-size:14px;color:#78350f;'>${amberText}</p></div><div style='background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:20px;'><div style='color:#15803d;font-weight:800;font-size:14px;text-transform:uppercase;'>${greenTitle}</div><p style='margin:6px 0 14px 0;font-size:14px;color:#14532d;'>${greenText}</p><form action='${WEBHOOK_URL}' method='GET' style='display:flex;flex-direction:column;gap:10px;'><input type='hidden' name='flow_type' value='DFY_CHECKOUT'><input type='hidden' name='niche' value='${escAttr(niche)}'><input type='hidden' name='incident' value='${escAttr(incident)}'><input type='hidden' name='region' value='${escAttr(region)}'><input type='hidden' name='tier' value='${escAttr(tier)}'><input type='text' name='name' required placeholder='${escAttr(namePh)}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'><input type='text' name='pnr' required placeholder='${escAttr(inputPh)}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'><input type='email' name='email' required placeholder='${escAttr(emailPh)}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'><button type='submit' style='padding:16px;background:#16a34a;color:#ffffff;font-weight:900;font-size:16px;border:none;border-radius:6px;cursor:pointer;'>${ctaText} &rarr;</button></form></div></div><div style='background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin-top:24px;'><h4 style='margin:0 0 6px 0;font-size:16px;color:#0f172a;'>${freeTitle}</h4><p style='margin:0 0 14px 0;font-size:14px;color:#475569;'>${freeCta}</p><form action='${WEBHOOK_URL}' method='GET' style='display:flex;flex-direction:column;gap:10px;'><input type='hidden' name='flow_type' value='FREE_LEAD'><input type='hidden' name='niche' value='${escAttr(niche)}'><input type='hidden' name='incident' value='${escAttr(incident)}'><input type='hidden' name='region' value='${escAttr(region)}'><input type='hidden' name='tier' value='${escAttr(tier)}'><input type='text' name='name' required placeholder='${escAttr(namePh)}' style='padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'><input type='email' name='email' required placeholder='${escAttr(emailPh)}' style='padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'><input type='text' name='loss_impact' required placeholder='${escAttr(freePh)}' style='padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'><label style='font-size:12px;color:#475569;display:flex;align-items:flex-start;gap:8px;'><input type='checkbox' name='coreg_optin' value='yes' checked style='margin-top:3px;'><span>${coregText}</span></label><button type='submit' style='padding:13px;background:#0f172a;color:#ffffff;font-weight:800;font-size:14px;border:none;border-radius:6px;cursor:pointer;'>${freeBtn}</button></form></div><div style='margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;'><span>&copy; Preferred Outcomes Consumer Advocacy &amp; Public Sentiment Registry.</span><a href='/mandate/' style='color:#0f172a;font-weight:700;text-decoration:underline;'>Our Mandate / About</a></div></div></body></html>`;
}

const AVIATION_SYSTEM = `You are an elite, multi-lingual Direct-Response Advertorial Copywriter, Consumer Advocate, and GEO Strategist for Preferred Outcomes.
1. Detect primary language of departure airport (Portuguese SBGR, Spanish LEMD, French LFPG/CYUL, German EDDF, Italian LIRF, Dutch EHAM, Turkish LTFM, Hebrew LLBG, Arabic OERK/OEJN, English US/CA/UK/IE). Write ALL visible copy in that native language (plus 1-line English sub-summary inside ai_direct_answer for non-English airports).
2. Output strict JSON with exact keys: lang_code, jurisdiction ("APPR" if C, "UK261" if EG, "EU261" if LF/ED/EH/LE/LI/EI, "ANAC_400" if SB, "SHY_PASS" if LT, "ISRAEL_ASL" if LL, "GACA" if OE, else "US_DOT"), statutory_cite, max_comp, badge_text, seo_title, human_h1, ai_direct_answer, ledger_counter_text, q1_human, a1_answer, q2_human, a2_answer, q3_human, a3_answer, compare_heading, red_option_title, red_option_text, amber_option_title, amber_option_text, green_option_title, green_option_text, name_placeholder, pnr_placeholder, email_placeholder, cta_button_text, free_tool_title, free_tool_cta, free_input_placeholder, coreg_disclosure_text, free_button_text.`;

const NEWS_SYSTEM = `You are an elite, multi-lingual Direct-Response Advertorial Copywriter, Consumer Advocate, and GEO Strategist for Preferred Outcomes.
Evaluate the news item and turn ANY consumer frustration, corporate outage, recall, tenancy crisis, boycott, policy fight, or viral public controversy into a high-converting advertorial action page in the impacted audience's native language.
Output strict JSON with exact keys: lang_code, slug (lowercase ASCII 4-6 words with hyphens), niche ("TENANCY"|"OUTAGES"|"RECALLS"|"FINANCE"|"POLITICS"|"CULTURE"), region (2-letter code), tier ("TIER_1_STATUTORY" for $29 refunds/payouts, "TIER_2_LEDGER" for $4.99 petitions/notices, "TIER_3_POLL" for $1.99 viral polls), badge_text, human_h1, ai_direct_answer, q1_human, a1_answer, q2_human, a2_answer, q3_human, a3_answer, ledger_counter_text, compare_heading, red_option_title, red_option_text, amber_option_title, amber_option_text, green_option_title, green_option_text, name_placeholder, input_placeholder, email_placeholder, cta_button_text, free_tool_title, free_tool_cta, free_input_placeholder, coreg_disclosure_text, free_button_text.`;

const newUrls = [];
const COMMERCIAL_RE = /^(B73|B38|B75|B76|B77|B78|A319|A320|A321|A33|A35|A220)/;

// 1. PROCESS AVIATION
if (FLIGHTAWARE_API_KEY) {
  for (const airport of AIRPORTS) {
    try {
      const res = await fetch(`https://aeroapi.flightaware.com/aeroapi/airports/${airport}/flights/departures`, {
        headers: { 'x-apikey': FLIGHTAWARE_API_KEY }
      });
      if (!res.ok) continue;
      const json = await res.json();
      const departures = json.departures || [];

      for (const f of departures) {
        const ident = f.ident;
        if (!ident || !COMMERCIAL_RE.test(f.aircraft_type || '')) continue;
        const isCancelled = (f.status || '').toLowerCase().includes('cancelled');
        const isDelayed = (f.departure_delay || 0) >= 10800;
        if (!isCancelled && !isDelayed) continue;

        const prev = state.deployed[ident];
        if (prev && Date.now() - prev.ts < 48 * 3600 * 1000) continue;

        console.log(`Deploying LIVE flight: ${ident}`);
        const ai = await callOpenAI(
          AVIATION_SYSTEM,
          `Flight: ${ident} | Origin: ${f.origin?.code || airport} | Destination: ${f.destination?.code || ''} | Status: ${f.status} | Delay Seconds: ${f.departure_delay || 0}`
        );

        const html = buildPageHtml({
          langCode: ai.lang_code || 'en',
          pageTitle: ai.seo_title,
          metaDesc: ai.ai_direct_answer,
          badgeText: ai.badge_text,
          h1: ai.human_h1,
          aiAnswer: ai.ai_direct_answer,
          statusBarLeft: `${ai.statutory_cite} // MAX: ${ai.max_comp} (${ai.ledger_counter_text})`,
          q1: ai.q1_human, a1: ai.a1_answer,
          q2: ai.q2_human, a2: ai.a2_answer,
          q3: ai.q3_human, a3: ai.a3_answer,
          compareHeading: ai.compare_heading,
          redTitle: ai.red_option_title, redText: ai.red_option_text,
          amberTitle: ai.amber_option_title, amberText: ai.amber_option_text,
          greenTitle: ai.green_option_title, greenText: ai.green_option_text,
          niche: 'AVIATION',
          incident: ident,
          region: ai.jurisdiction || 'US_DOT',
          tier: 'TIER_1_STATUTORY',
          namePh: ai.name_placeholder,
          inputPh: ai.pnr_placeholder,
          emailPh: ai.email_placeholder,
          ctaText: ai.cta_button_text,
          freeTitle: ai.free_tool_title,
          freeCta: ai.free_tool_cta,
          freePh: ai.free_input_placeholder,
          coregText: ai.coreg_disclosure_text,
          freeBtn: ai.free_button_text
        });

        const dir = path.join('flight', ident.toLowerCase());
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);

        state.deployed[ident] = { ts: Date.now(), type: 'AVIATION', tier: 'TIER_1_STATUTORY', region: ai.jurisdiction };
        newUrls.push(`https://preferredoutcomes.org/flight/${ident.toLowerCase()}/`);
      }
      await sleep(1200);
    } catch (err) {
      console.error(`Airport ${airport} error:`, err.message);
    }
  }
}

// 2. PROCESS GLOBAL NEWS FEEDS
let newsCreated = 0;
for (const feedUrl of NEWS_FEEDS) {
  if (newsCreated >= 15) break; // Cap per 30-min cycle to keep OpenAI spend ultra-lean
  try {
    const res = await fetch(feedUrl);
    if (!res.ok) continue;
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8);

    for (const match of items) {
      if (newsCreated >= 15) break;
      const block = match[1];
      const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/);
      const title = (titleMatch?.[1] || '').replace(/<[^>]+>/g, '').trim();
      const desc = (descMatch?.[1] || '').replace(/<[^>]+>/g, '').trim();
      if (!title) continue;

      const hash = crypto.createHash('md5').update(title).digest('hex').slice(0, 16);
      if (state.deployed[hash]) continue;

      console.log(`Deploying News Docket: ${title}`);
      const ai = await callOpenAI(NEWS_SYSTEM, `Headline: ${title} | Details: ${desc}`);
      const slug = (ai.slug || hash).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

      const html = buildPageHtml({
        langCode: ai.lang_code || 'en',
        pageTitle: ai.human_h1,
        metaDesc: ai.ai_direct_answer,
        badgeText: ai.badge_text,
        h1: ai.human_h1,
        aiAnswer: ai.ai_direct_answer,
        statusBarLeft: ai.ledger_counter_text,
        q1: ai.q1_human, a1: ai.a1_answer,
        q2: ai.q2_human, a2: ai.a2_answer,
        q3: ai.q3_human, a3: ai.a3_answer,
        compareHeading: ai.compare_heading,
        redTitle: ai.red_option_title, redText: ai.red_option_text,
        amberTitle: ai.amber_option_title, amberText: ai.amber_option_text,
        greenTitle: ai.green_option_title, greenText: ai.green_option_text,
        niche: ai.niche || 'CULTURE',
        incident: slug,
        region: ai.region || 'GLOBAL',
        tier: ai.tier || 'TIER_2_LEDGER',
        namePh: ai.name_placeholder,
        inputPh: ai.input_placeholder,
        emailPh: ai.email_placeholder,
        ctaText: ai.cta_button_text,
        freeTitle: ai.free_tool_title,
        freeCta: ai.free_tool_cta,
        freePh: ai.free_input_placeholder,
        coregText: ai.coreg_disclosure_text,
        freeBtn: ai.free_button_text
      });

      const dir = path.join('docket', slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html);

      state.deployed[hash] = { ts: Date.now(), slug, type: ai.niche, tier: ai.tier, region: ai.region };
      newUrls.push(`https://preferredoutcomes.org/docket/${slug}/`);
      newsCreated++;
    }
  } catch (err) {
    console.error(`Feed error:`, err.message);
  }
}

// 3. UPDATE STATE FOR DASHBOARD & PING INDEXNOW
state.active_silos = Object.entries(state.deployed)
  .sort((a, b) => b[1].ts - a[1].ts)
  .slice(0, 50)
  .map(([key, val]) => ({ id: val.slug || key, ...val }));

fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

if (newUrls.length > 0) {
  await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: 'preferredoutcomes.org',
      key: INDEXNOW_KEY,
      urlList: newUrls
    })
  }).catch(() => {});
  console.log(`Successfully deployed ${newUrls.length} new silos.`);
}
