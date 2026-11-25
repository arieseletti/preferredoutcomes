import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ============================================================================
// PREFERRED OUTCOMES // INTELLIGENCE DESK — AUTONOMOUS FULFILLMENT & OUTREACH
// ============================================================================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''; // Optional: enables cross-model faithfulness audit
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_D1_DATABASE_ID = process.env.CF_D1_DATABASE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

const WRITER_MODEL = process.env.WRITER_MODEL || 'gpt-4o';
const FALLBACK_AUDITOR_MODEL = 'gpt-4o-mini';
const SITE_URL = 'https://preferredoutcomes.org';
const INDEXNOW_KEY = 'poindex2026key';
const MODE = (process.env.PO_MODE || process.argv[2] || 'fulfill').toLowerCase();

const CATALOG = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'config', 'catalog.json'), 'utf8')
);

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; PreferredOutcomesDesk/2.0; +https://preferredoutcomes.org)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

// ============================================================================
// 1. CLOUDFLARE D1 REST API CLIENT
// ============================================================================
async function d1Query(sql, params = []) {
  if (!CF_ACCOUNT_ID || !CF_D1_DATABASE_ID || !CF_API_TOKEN) {
    throw new Error('Missing Cloudflare D1 credentials (CF_ACCOUNT_ID, CF_D1_DATABASE_ID, CF_API_TOKEN).');
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(data.errors || data)}`);
  }
  return data.result?.[0]?.results || [];
}

// ============================================================================
// 2. LIGHTWEIGHT PUBLIC SOURCE SCRAPER (STRICTLY PER-WORKSPACE)
// ============================================================================
async function fetchCleanText(rawUrl, maxChars = 6500) {
  try {
    const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { url, ok: false, status: res.status, text: '' };
    const html = await res.text();
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxChars);
    return { url, ok: true, status: res.status, text: cleaned };
  } catch (err) {
    return { url: rawUrl, ok: false, status: 0, text: '' };
  }
}

async function gatherWorkspaceEvidence(ws) {
  const urls = [];
  if (ws.target_url) urls.push({ role: 'client_target', url: ws.target_url });
  const competitors = JSON.parse(ws.competitor_urls_json || '[]').slice(0, 5);
  for (const c of competitors) {
    urls.push({ role: 'competitor', url: c });
  }

  const results = await Promise.all(
    urls.map(async (item) => {
      const scraped = await fetchCleanText(item.url);
      return { role: item.role, ...scraped };
    })
  );

  return results.filter((r) => r.ok && r.text.length > 80);
}

// ============================================================================
// 3. LLM WRITER & TWO-LAYER ANTI-HALLUCINATION FAITHFULNESS GATE
// ============================================================================
async function callOpenAI(model, systemPrompt, userPrompt, temperature = 0.2) {
  if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY.');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI error: ${JSON.stringify(data)}`);
  return JSON.parse(data.choices[0].message.content);
}

async function callCrossModelAuditor(draftJson, evidenceList) {
  const auditSystem = `You are a strict factual faithfulness auditor.
Compare every bullet in the draft against the RAW_EVIDENCE below.
For each bullet index (0, 1, 2...), mark "supported": true ONLY if every number, price, claim, and fact is explicitly backed by RAW_EVIDENCE.
Mark "supported": false if any detail is extrapolated, invented, or missing from RAW_EVIDENCE.
Also check "adjacent_blind_spot" (if present) under the same strict rule.
Return strict JSON: { "bullet_verdicts": [ { "index": 0, "supported": true } ], "blind_spot_supported": true }`;

  const auditUser = JSON.stringify({
    DRAFT: draftJson,
    RAW_EVIDENCE: evidenceList.map((e) => ({ url: e.url, role: e.role, text: e.text }))
  });

  // Prefer Gemini 2.5 Flash for cross-model auditing (eliminates same-family bias)
  if (GEMINI_API_KEY) {
    try {
      const gemUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(gemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${auditSystem}\n\n${auditUser}` }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.0 }
        })
      });
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) return JSON.parse(rawText);
    } catch (e) {
      console.warn('[Auditor] Gemini fallback to OpenAI mini:', e.message);
    }
  }

  return callOpenAI(FALLBACK_AUDITOR_MODEL, auditSystem, auditUser, 0.0);
}

async function verifyAndExciseDraft(draft, evidenceList) {
  const validUrls = new Set(evidenceList.map((e) => e.url.trim()));

  // Layer 1: Deterministic URL & placeholder check
  let bullets = (draft.findings || []).filter((f) => {
    if (!f || !f.lead || !f.detail || !f.source_url) return false;
    if (/\[TBD\]|\[insert\]|placeholder/i.test(`${f.lead} ${f.detail}`)) return false;
    return validUrls.has(f.source_url.trim());
  });

  // Layer 2: Cross-model faithfulness check (auto-excise any unsupported claim)
  const audit = await callCrossModelAuditor({ findings: bullets, adjacent_blind_spot: draft.adjacent_blind_spot }, evidenceList);
  const supportedIdx = new Set(
    (audit.bullet_verdicts || []).filter((v) => v.supported === true).map((v) => v.index)
  );

  bullets = bullets.filter((_, idx) => supportedIdx.has(idx));
  const verifiedBlindSpot = audit.blind_spot_supported ? draft.adjacent_blind_spot : null;

  return {
    ...draft,
    findings: bullets,
    adjacent_blind_spot: verifiedBlindSpot,
    audit_passed: bullets.length > 0
  };
}

// ============================================================================
// 4. TIMEZONE & SCHEDULE CHECK (MONDAYS 06:00 LOCAL TIME)
// ============================================================================
function isWorkspaceDueNow(ws) {
  if (ws.schedule === 'one_time') {
    return !ws.last_delivered_at;
  }

  if (ws.schedule === 'weekly_mon') {
    if (ws.last_delivered_at) {
      const daysSince = (Date.now() - new Date(ws.last_delivered_at).getTime()) / 86400000;
      if (daysSince < 5) return false;
    }
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: ws.timezone || 'America/New_York',
        weekday: 'short',
        hour: '2-digit',
        hour12: false
      }).formatToParts(now);
      const weekday = parts.find((p) => p.type === 'weekday')?.value;
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      return weekday === 'Mon' && hour === 6;
    } catch {
      return false;
    }
  }

  return false;
}

// ============================================================================
// 5. DOSSIER EMAIL RENDERER (EDITORIAL PALETTE + DYNAMIC CREDIT + ADD-ON)
// ============================================================================
function renderDossierEmailHtml({ brandHeader, ws, dossier, creditCents, matchingAddon }) {
  const findingsHtml = dossier.findings
    .map(
      (f) => `
      <li style="margin-bottom:12px;line-height:1.6;color:#141413;">
        <strong>${escHtml(f.lead)}</strong> ${escHtml(f.detail)}
        <div style="font-family:monospace;font-size:11px;color:#57534E;margin-top:3px;">Source: ${escHtml(f.source_url)}</div>
      </li>`
    )
    .join('');

  const blindSpotHtml = dossier.adjacent_blind_spot
    ? `<div style="margin-top:18px;padding:12px 14px;background:#F3F1EC;border-left:3px solid #14362B;font-size:13.5px;color:#141413;">
         <div style="font-family:monospace;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#14362B;margin-bottom:4px;">Adjacent Blind Spot Detected</div>
         ${escHtml(dossier.adjacent_blind_spot)}
       </div>`
    : '';

  const creditDollars = creditCents > 0 ? `$${Math.round(creditCents / 100).toLocaleString('en-US')}` : null;
  const upsellHtml = creditDollars
    ? `<div style="margin-top:24px;padding:18px;background:#E9F0EC;border:1px solid #14362B;border-radius:2px;">
         <div style="font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#14362B;margin-bottom:6px;">14-Day Diagnostic Credit Available</div>
         <p style="margin:0 0 12px 0;font-size:14px;color:#141413;">Activate any ongoing monthly desk within 14 days and apply 100% of your ${creditDollars} diagnostic fee at up to 25% off each monthly invoice.</p>
         <a href="${SITE_URL}/#select-services" style="display:inline-block;background:#14362B;color:#FFFFFF;text-decoration:none;padding:10px 16px;font-size:13px;font-weight:500;border-radius:2px;">Start an Ongoing Plan — Apply Your ${creditDollars} Credit &rarr;</a>
       </div>`
    : '';

  const addonHtml = matchingAddon
    ? `<div style="margin-top:14px;padding:14px 16px;background:#FAF9F6;border:1px solid #E5E2DC;font-size:13px;color:#57534E;">
         <strong style="color:#141413;">Need turnkey execution on these counter-moves?</strong>
         Reply to request the <strong>${escHtml(matchingAddon.name)}</strong> ($${matchingAddon.price_usd} one-time): ${escHtml(matchingAddon.deliverable)}
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px 14px;background:#FAF9F6;color:#141413;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:680px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E2DC;border-top:3px solid #14362B;padding:28px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #E5E2DC;padding-bottom:14px;margin-bottom:20px;">
      <span style="font-family:Georgia,serif;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#141413;">${escHtml(brandHeader)}</span>
      <span style="font-family:monospace;font-size:11px;color:#57534E;text-transform:uppercase;">Confidential Client Dossier</span>
    </div>

    <div style="font-family:monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#14362B;margin-bottom:6px;">
      TARGET: ${escHtml(ws.target_company)}
    </div>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:24px;line-height:1.2;color:#14362B;margin:0 0 18px 0;">
      ${escHtml(dossier.headline)}
    </h1>

    <div style="background:#F3F1EC;border-left:2px solid #14362B;padding:14px 16px;margin-bottom:20px;">
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.09em;text-transform:uppercase;color:#14362B;margin-bottom:4px;">Executive Summary</div>
      <p style="margin:0;font-size:14.5px;line-height:1.6;color:#141413;">${escHtml(dossier.executive_summary)}</p>
    </div>

    <ul style="padding-left:18px;margin:0 0 20px 0;font-size:14.5px;">
      ${findingsHtml}
    </ul>

    <div style="background:#E9F0EC;border-left:3px solid #14362B;padding:14px 16px;">
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.09em;text-transform:uppercase;color:#14362B;margin-bottom:4px;">Recommended Counter-Move</div>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#141413;">${escHtml(dossier.recommended_counter_move)}</p>
    </div>

    ${blindSpotHtml}
    ${upsellHtml}
    ${addonHtml}

    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #E5E2DC;font-family:monospace;font-size:11px;color:#78736C;">
      ${escHtml(brandHeader)} &middot; Strictly Confidential
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// 6. MODE A: ISOLATED CLIENT FULFILLMENT (RUNS HOURLY)
// ============================================================================
async function runFulfillment() {
  const rows = await d1Query(`
    SELECT w.*, a.account_type, a.brand_name, a.contact_email
    FROM workspaces w
    JOIN accounts a ON a.account_id = w.parent_account_id
    WHERE w.status = 'active'
  `);

  console.log(`[Fulfill] Found ${rows.length} active workspace(s). Checking due schedules...`);

  for (const ws of rows) {
    if (!isWorkspaceDueNow(ws)) continue;

    console.log(`[Fulfill] Processing isolated workspace ${ws.workspace_id} (${ws.target_company})...`);
    const evidence = await gatherWorkspaceEvidence(ws);

    if (evidence.length === 0) {
      await sendResendEmail({
        to: ['desk@preferredoutcomes.org'],
        subject: `[Scraper Alert] Zero readable sources for ${ws.target_company}`,
        html: `<p>Workspace <code>${ws.workspace_id}</code> returned zero readable URLs. Target: ${escHtml(ws.target_url)}. Please verify URLs.</p>`
      });
      continue;
    }

    const activeServices = JSON.parse(ws.active_services_json || '[]');
    const primaryServiceId = activeServices[0] || 'svc-weekly-brief';
    const serviceMeta = CATALOG.core_services.find((s) => s.id === primaryServiceId);

    const writerSystem = `You are a senior analyst at a boutique private intelligence desk.
Write strictly in locale "${ws.locale || 'en-US'}".
NEVER use the words "automated", "bot", or "AI".
NEVER invent statistics, pricing, dates, or quotes. Every bullet MUST cite an exact URL from RAW_EVIDENCE.
Include "adjacent_blind_spot" (max 2 sentences) ONLY if RAW_EVIDENCE clearly reveals a verifiable secondary gap outside the primary service; otherwise set it to null.
Return strict JSON:
{
  "headline": "Concise executive dossier title",
  "executive_summary": "2-sentence plain-English executive summary",
  "findings": [
    { "lead": "Short bold lead-in:", "detail": "2-sentence evidence-backed finding", "source_url": "exact URL from RAW_EVIDENCE", "evidence_snippet": "verbatim supporting phrase" }
  ],
  "recommended_counter_move": "Concrete, actionable 2-sentence move for leadership",
  "adjacent_blind_spot": null,
  "metrics": { "sources_verified": 0, "key_signal_count": 0 }
}`;

    const writerUser = JSON.stringify({
      TARGET_COMPANY: ws.target_company,
      SERVICE: serviceMeta ? serviceMeta.name : primaryServiceId,
      CLIENT_NOTES: ws.context_notes || '',
      RAW_EVIDENCE: evidence
    });

    const draft = await callOpenAI(WRITER_MODEL, writerSystem, writerUser, 0.2);
    const verified = await verifyAndExciseDraft(draft, evidence);

    if (!verified.audit_passed) {
      console.warn(`[Fulfill] Workspace ${ws.workspace_id} failed faithfulness gate after excision; skipping dispatch.`);
      continue;
    }

    // Check available 14-day diagnostic credit for dynamic CTA
    const credits = await d1Query(
      `SELECT original_amount_cents FROM diagnostic_credits WHERE contact_email = ? AND status = 'available' AND expires_at > datetime('now') LIMIT 1`,
      [ws.contact_email]
    );
    const creditCents = ws.account_type === 'direct' && credits.length ? credits[0].original_amount_cents : 0;

    // Pick 1 matching execution add-on from catalog.json (direct clients only)
    const matchingAddon = ws.account_type === 'direct' && serviceMeta
      ? CATALOG.post_dossier_execution_addons.find((a) => a.triggered_from_practices.includes(serviceMeta.practice))
      : null;

    const brandHeader = ws.account_type === 'white_label' && ws.brand_name
      ? `${ws.brand_name} // Intelligence Desk`
      : 'Preferred Outcomes // Intelligence Desk';

    const emailHtml = renderDossierEmailHtml({
      brandHeader,
      ws,
      dossier: verified,
      creditCents,
      matchingAddon
    });

    const recipients = JSON.parse(ws.delivery_emails_json || '[]');
    if (recipients.length > 0) {
      await sendResendEmail({
        to: recipients,
        subject: `${verified.headline} — ${ws.target_company}`,
        html: emailHtml
      });
    }

    // Archive structured snapshot in D1 for 90-day quarterly rollups
    const dateStamp = new Date().toISOString().slice(0, 10);
    await d1Query(
      `INSERT INTO intel_snapshots (snapshot_id, workspace_id, service_id, metrics_json, r2_evidence_key, audit_passed)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        crypto.randomUUID(),
        ws.workspace_id,
        primaryServiceId,
        JSON.stringify(verified.metrics || {}),
        `accounts/${ws.parent_account_id}/${ws.workspace_id}/${dateStamp}/`
      ]
    );

    const nextStatus = ws.schedule === 'one_time' ? 'completed' : 'active';
    await d1Query(
      `UPDATE workspaces SET last_delivered_at = CURRENT_TIMESTAMP, status = ? WHERE workspace_id = ?`,
      [nextStatus, ws.workspace_id]
    );

    console.log(`[Fulfill] Dispatched verified dossier for ${ws.target_company} (${verified.findings.length} verified bullets).`);
  }
}

// ============================================================================
// 7. MODE B: AUTOMATED LIFECYCLE TRIGGERS (DAY 10 / DAY 21 / DAY 60)
// ============================================================================
async function runLifecycleTriggers() {
  // 1. Day-10 Credit Expiry Reminder (4 days left in 14-day window)
  const expiring = await d1Query(`
    SELECT c.credit_id, c.contact_email, c.original_amount_cents, a.account_id, a.contact_name
    FROM diagnostic_credits c
    JOIN accounts a ON a.contact_email = c.contact_email
    WHERE c.status = 'available'
      AND datetime(c.created_at, '+10 days') <= datetime('now')
      AND c.expires_at > datetime('now')
      AND NOT EXISTS (
        SELECT 1 FROM lifecycle_events l WHERE l.account_id = a.account_id AND l.trigger_key = 'day_10_credit_reminder'
      )
  `);

  for (const row of expiring) {
    const amt = `$${Math.round(row.original_amount_cents / 100).toLocaleString('en-US')}`;
    await sendResendEmail({
      to: [row.contact_email],
      subject: `4 days left to apply your ${amt} diagnostic credit`,
      html: `<p>Quick note — your ${amt} diagnostic credit expires in 4 days. If you would like ongoing weekly monitoring, activating any monthly desk before then applies 100% of that fee at up to 25% off each monthly invoice.</p>
             <p><a href="${SITE_URL}/#select-services">Activate Ongoing Desk (${amt} Credit) &rarr;</a></p>`
    });
    await d1Query(
      `INSERT OR IGNORE INTO lifecycle_events (event_id, account_id, trigger_key) VALUES (?, ?, 'day_10_credit_reminder')`,
      [crypto.randomUUID(), row.account_id]
    );
  }

  // 2. Day-21 Quarterly Pulse Audit Offer (for one-time buyers who skipped monthly)
  const day21 = await d1Query(`
    SELECT c.contact_email, a.account_id, a.company_name
    FROM diagnostic_credits c
    JOIN accounts a ON a.contact_email = c.contact_email
    WHERE c.status IN ('available', 'expired')
      AND datetime(c.created_at, '+21 days') <= datetime('now')
      AND NOT EXISTS (
        SELECT 1 FROM lifecycle_events l WHERE l.account_id = a.account_id AND l.trigger_key = 'day_21_quarterly_pitch'
      )
  `);

  for (const row of day21) {
    await sendResendEmail({
      to: [row.contact_email],
      subject: `Quarterly check-in option for ${row.company_name}`,
      html: `<p>If weekly briefs felt heavier than you need right now, we also run a quiet <strong>Quarterly Pulse Audit ($900/quarter or $3,000/yr)</strong> — every 90 days we re-check rival pricing, review friction, and AI-search visibility against your baseline.</p>
             <p>Just reply "Quarterly" if you'd like us to put ${escHtml(row.company_name)} on the 90-day schedule.</p>`
    });
    await d1Query(
      `INSERT OR IGNORE INTO lifecycle_events (event_id, account_id, trigger_key) VALUES (?, ?, 'day_21_quarterly_pitch')`,
      [crypto.randomUUID(), row.account_id]
    );
  }

  console.log(`[Lifecycle] Processed ${expiring.length} credit reminder(s), ${day21.length} quarterly offer(s).`);
}

// ============================================================================
// 8. MODE C: BENCHMARK MINI-STUDY GENERATOR & THROTTLED OUTREACH
// ============================================================================
async function runOutreachBatch() {
  const MAX_PER_RUN = 15; // Safe daily cap per sending domain
  const prospects = await d1Query(
    `SELECT * FROM outreach_prospects WHERE outreach_status = 'queued' LIMIT ?`,
    [MAX_PER_RUN]
  );

  console.log(`[Outreach] Found ${prospects.length} queued prospect(s).`);

  for (const p of prospects) {
    const scraped = p.website_url ? await fetchCleanText(p.website_url, 4000) : { ok: false, text: '' };
    if (!scraped.ok) continue;

    // 3-Signal Pre-Scan Router: picks highest-likely service + 2 verifiable observations
    const router = await callOpenAI(
      'gpt-4o-mini',
      `You are a private intelligence analyst running a pre-scan for cold outreach in locale "${p.locale || 'en-US'}".
Based ONLY on the scraped website text, select the single highest-likely service from:
- svc-teardown (Competitor & Market Teardown)
- svc-local-audit (Local Business & Venue Audit)
- svc-geo-audit (AI-Search GEO Visibility Audit)
- svc-mirror-audit (The Mirror Perception Audit)
Write a crisp 4-sentence plain-text email leading with 2 concrete observations from the site text, offering to send the private scorecard/breakdown. NEVER use hype or mention bots/AI.
Return JSON: { "recommended_service_id": "svc-...", "subject": "...", "body_text": "...", "findings": ["...", "..."] }`,
      JSON.stringify({ company: p.company_name, industry: p.industry, city: p.city_region, text: scraped.text }),
      0.3
    );

    if (!router?.subject || !router?.body_text) continue;

    const fullHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14.5px;line-height:1.65;color:#141413;max-width:600px;">
        <p>${escHtml(router.body_text).replace(/\n/g, '<br>')}</p>
        <p style="margin-top:20px;font-size:12px;color:#57534E;border-top:1px solid #E5E2DC;padding-top:12px;">
          <strong>Preferred Outcomes // Intelligence Desk</strong><br>
          Competitive Monitoring &middot; AI-Search &amp; Perception Audits &middot; Pre-Transaction &amp; Employer Due Diligence<br>
          <a href="${SITE_URL}" style="color:#14362B;">preferredoutcomes.org</a>
        </p>
      </div>`;

    await sendResendEmail({
      to: [p.contact_email],
      subject: router.subject,
      html: fullHtml
    });

    await d1Query(
      `UPDATE outreach_prospects
       SET recommended_service_id = ?, prescan_findings_json = ?, outreach_status = 'sent_initial', last_contacted_at = CURRENT_TIMESTAMP
       WHERE prospect_id = ?`,
      [router.recommended_service_id || 'svc-geo-audit', JSON.stringify(router.findings || []), p.prospect_id]
    );
  }
}

// ============================================================================
// 9. SITEMAP & INDEXNOW HELPER (FOR NEW /briefings/ BENCHMARK STUDIES)
// ============================================================================
async function syncBriefingsSitemap() {
  const briefingsDir = path.join(process.cwd(), 'briefings');
  const urls = [`${SITE_URL}/`];

  if (fs.existsSync(briefingsDir)) {
    for (const entry of fs.readdirSync(briefingsDir)) {
      const full = path.join(briefingsDir, entry, 'index.html');
      if (fs.existsSync(full)) {
        urls.push(`${SITE_URL}/briefings/${entry}/`);
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u, i) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><priority>${i === 0 ? '1.0' : '0.8'}</priority></url>`).join('\n') +
    `\n</urlset>\n`;

  fs.writeFileSync(path.join(process.cwd(), 'sitemap.xml'), xml, 'utf8');

  if (urls.length > 1) {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'preferredoutcomes.org',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 100)
      })
    }).catch(() => {});
  }
}

// ============================================================================
// HELPERS & ENTRYPOINT
// ============================================================================
async function sendResendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('[Resend] RESEND_API_KEY not set; skipping email to', to);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Preferred Outcomes <dispatch@preferredoutcomes.org>',
      to,
      subject,
      html
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[Resend] Dispatch failed:', errText);
  }
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function main() {
  console.log(`[PO Engine] Starting in mode: ${MODE}`);
  if (MODE === 'fulfill') {
    await runFulfillment();
  } else if (MODE === 'lifecycle') {
    await runLifecycleTriggers();
  } else if (MODE === 'outreach') {
    await runOutreachBatch();
  } else if (MODE === 'sitemap') {
    await syncBriefingsSitemap();
  } else {
    throw new Error(`Unknown PO_MODE: ${MODE}`);
  }
}

main().catch((err) => {
  console.error('[PO Engine Fatal]', err);
  process.exit(1);
});
