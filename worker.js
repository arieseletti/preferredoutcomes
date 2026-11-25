// ============================================================================
// PREFERRED OUTCOMES // INTELLIGENCE DESK — CLOUDFLARE WORKER
// ============================================================================

// Replace each "price_REPLACE_*" with your real Stripe Price IDs from Stripe Dashboard
const PRICE_MAP = {
  "svc-teardown":           { priceId: "price_REPLACE_TEARDOWN",   type: "one_time",  amountCents: 100000 },
  "svc-weekly-brief":       { priceId: "price_REPLACE_BRIEF",      type: "recurring", amountCents: 100000 },
  "svc-disruption":         { priceId: "price_REPLACE_RADAR",      type: "recurring", amountCents: 75000  },
  "svc-local-audit":        { priceId: "price_REPLACE_LOCAL",      type: "one_time",  amountCents: 40000  },
  "svc-geo-audit":          { priceId: "price_REPLACE_GEO",        type: "one_time",  amountCents: 45000  },
  "svc-mirror-audit":       { priceId: "price_REPLACE_MIRROR",     type: "one_time",  amountCents: 65000  },
  "svc-sentinel":           { priceId: "price_REPLACE_SENTINEL",   type: "recurring", amountCents: 50000  },
  "svc-employer-diligence": { priceId: "price_REPLACE_EMPLOYER",   type: "one_time",  amountCents: 35000  },
  "svc-target-osint":       { priceId: "price_REPLACE_DILIGENCE",  type: "one_time",  amountCents: 120000 },
  "svc-wl-single":          { priceId: "price_REPLACE_WL_SINGLE",  type: "recurring", amountCents: 150000 },
  "svc-wl-full":            { priceId: "price_REPLACE_WL_FULL",    type: "recurring", amountCents: 450000 }
};

// Create these two "Forever" percentage coupons in your Stripe Dashboard
const COUPON_2_RECURRING = "PO_MULTI_10"; // 10% off
const COUPON_3_RECURRING = "PO_MULTI_15"; // 15% off (cap)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://preferredoutcomes.org",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 1. Checkout & Licensing Inquiry
    if (url.pathname === "/api/checkout" && request.method === "POST") {
      return handleCheckout(request, env);
    }

    // 2. Stripe Webhooks (Account setup, 25% credit cap, cancellation forfeiture)
    if (url.pathname === "/api/webhook/stripe" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }

    // 3. Post-Payment Onboarding Portal API (Used by /onboard/index.html)
    if (url.pathname === "/api/onboard/session" && request.method === "GET") {
      return handleGetOnboardSession(url, env);
    }

    if (url.pathname === "/api/onboard/submit" && request.method === "POST") {
      return handleSubmitOnboard(request, env);
    }

    // 4. Default: Serve static website files (index.html, 404.html, /onboard/, /briefings/, etc.)
    return env.ASSETS.fetch(request);
  }
};

// ============================================================================
// 1. CREATE STRIPE CHECKOUT SESSION (OR LOG LICENSING INQUIRY)
// ============================================================================
async function handleCheckout(request, env) {
  try {
    const { name, email, company, context, services } = await request.json();

    if (!name || !email || !company || !Array.isArray(services) || services.length === 0) {
      return jsonResponse({ error: "Missing required fields or service selection." }, 400);
    }

    // Turnkey Engine Licensing bypasses checkout and emails your desk directly
    if (services.includes("svc-license")) {
      await sendResendEmail(env, {
        to: "desk@preferredoutcomes.org",
        subject: `Turnkey Licensing Inquiry — ${company}`,
        html: `
          <p><strong>Principal:</strong> ${escapeHtml(name)}<br>
          <strong>Email:</strong> ${escapeHtml(email)}<br>
          <strong>Company:</strong> ${escapeHtml(company)}<br>
          <strong>Selected Services:</strong> ${escapeHtml(services.join(", "))}<br>
          <strong>Context:</strong> ${escapeHtml(context || "None provided")}</p>
        `
      });
      return jsonResponse({ mode: "inquiry", message: "Licensing inquiry received." });
    }

    const validServices = services.filter((s) => PRICE_MAP[s]);
    if (!validServices.length) {
      return jsonResponse({ error: "No valid payable services selected." }, 400);
    }

    const recurringServices = validServices.filter((s) => PRICE_MAP[s].type === "recurring");
    const oneTimeServices = validServices.filter((s) => PRICE_MAP[s].type === "one_time");

    // Non-stacking rule: identify single highest One-Time diagnostic only
    let highestOneTimeCents = 0;
    let highestOneTimeId = "";
    for (const id of oneTimeServices) {
      if (PRICE_MAP[id].amountCents > highestOneTimeCents) {
        highestOneTimeCents = PRICE_MAP[id].amountCents;
        highestOneTimeId = id;
      }
    }

    const siteUrl = env.SITE_URL || "https://preferredoutcomes.org";
    const mode = recurringServices.length > 0 ? "subscription" : "payment";
    const form = new URLSearchParams();
    form.append("mode", mode);
    form.append("customer_email", email);
    form.append("success_url", `${siteUrl}/onboard/?session_id={CHECKOUT_SESSION_ID}`);
    form.append("cancel_url", `${siteUrl}/#select-services`);
    form.append("metadata[contact_name]", name.slice(0, 200));
    form.append("metadata[company_name]", company.slice(0, 200));
    form.append("metadata[services]", validServices.join(","));
    form.append("metadata[highest_one_time_id]", highestOneTimeId);
    form.append("metadata[highest_one_time_cents]", String(highestOneTimeCents));
    form.append("metadata[context]", (context || "").slice(0, 450));

    validServices.forEach((key, idx) => {
      form.append(`line_items[${idx}][price]`, PRICE_MAP[key].priceId);
      form.append(`line_items[${idx}][quantity]`, "1");
    });

    // Multi-Service Recurring Reduction: 10% for 2, 15% cap for 3+
    if (recurringServices.length === 2) {
      form.append("discounts[0][coupon]", COUPON_2_RECURRING);
    } else if (recurringServices.length >= 3) {
      form.append("discounts[0][coupon]", COUPON_3_RECURRING);
    }

    const stripeRes = await stripePost(env, "/v1/checkout/sessions", form);
    if (stripeRes.error) {
      return jsonResponse({ error: stripeRes.error.message || "Stripe checkout error." }, 500);
    }

    return jsonResponse({ url: stripeRes.url });
  } catch (err) {
    return jsonResponse({ error: "Checkout initialization failed." }, 500);
  }
}

// ============================================================================
// 2. STRIPE WEBHOOKS (ISOLATION, 25% CREDIT CAP, FORFEITURE)
// ============================================================================
async function handleStripeWebhook(request, env) {
  const payload = await request.text();
  const sigHeader = request.headers.get("stripe-signature");

  const valid = await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(payload);
  const siteUrl = env.SITE_URL || "https://preferredoutcomes.org";

  // A. Payment Cleared -> Create Isolated Account, Log Credit, Email Onboarding Link
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerId = session.customer || `guest_${session.id}`;
    const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
    const meta = session.metadata || {};
    const services = (meta.services || "").split(",").filter(Boolean);
    const highestOneTimeCents = parseInt(meta.highest_one_time_cents || "0", 10);
    const highestOneTimeId = meta.highest_one_time_id || "";

    const isWhiteLabel = services.includes("svc-wl-single") || services.includes("svc-wl-full");
    const seatLimit = services.includes("svc-wl-full") ? 10 : services.includes("svc-wl-single") ? 5 : 1;

    // 1. Upsert strictly separated account record in D1
    const accountId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO accounts (
        account_id, account_type, stripe_customer_id, stripe_checkout_session_id,
        contact_name, contact_email, company_name, purchased_services_json, seat_limit
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(stripe_customer_id) DO UPDATE SET
        stripe_checkout_session_id = excluded.stripe_checkout_session_id,
        purchased_services_json = excluded.purchased_services_json,
        seat_limit = MAX(accounts.seat_limit, excluded.seat_limit),
        onboarding_completed = 0
    `).bind(
      accountId,
      isWhiteLabel ? "white_label" : "direct",
      customerId,
      session.id,
      meta.contact_name || "",
      email,
      meta.company_name || "",
      JSON.stringify(services),
      seatLimit
    ).run();

    // 2. Non-stacking diagnostic credit (stores only the single highest One-Time fee)
    if (highestOneTimeCents > 0) {
      const expiresAt = new Date(Date.now() + 14 * 86400 * 1000).toISOString();
      const existing = await env.DB.prepare(`
        SELECT credit_id, original_amount_cents
        FROM diagnostic_credits
        WHERE contact_email = ? AND status IN ('available', 'active')
      `).bind(email).first();

      if (!existing) {
        await env.DB.prepare(`
          INSERT INTO diagnostic_credits (
            credit_id, stripe_customer_id, contact_email, source_service_id,
            original_amount_cents, remaining_cents, active_subscription_id, expires_at, status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          customerId,
          email,
          highestOneTimeId,
          highestOneTimeCents,
          highestOneTimeCents,
          session.subscription || null,
          expiresAt,
          session.subscription ? "active" : "available"
        ).run();
      } else if (highestOneTimeCents > existing.original_amount_cents) {
        await env.DB.prepare(`
          UPDATE diagnostic_credits
          SET source_service_id = ?, original_amount_cents = ?, remaining_cents = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE credit_id = ?
        `).bind(highestOneTimeId, highestOneTimeCents, highestOneTimeCents, expiresAt, existing.credit_id).run();
      }
    }

    // 3. If they activated a subscription within 14 days of a prior diagnostic, bind the credit
    if (session.subscription) {
      await env.DB.prepare(`
        UPDATE diagnostic_credits
        SET status = 'active', active_subscription_id = ?, stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE contact_email = ? AND status = 'available' AND expires_at > datetime('now')
      `).bind(session.subscription, customerId, email).run();
    }

    // 4. Email private onboarding portal link via Resend
    if (email) {
      await sendResendEmail(env, {
        to: email,
        subject: "Preferred Outcomes — Private Onboarding Portal",
        html: `
          <p>Thank you for initiating your desk with Preferred Outcomes.</p>
          <p>Submit your target URLs, competitor watchlist, delivery timezone, and (for white-label partners) separated client accounts securely here:</p>
          <p><a href="${siteUrl}/onboard/?session_id=${session.id}">Open Private Onboarding Portal &rarr;</a></p>
          <p style="color:#57534E;font-size:12px;">All submitted target lists and client accounts are strictly separated and held in confidence.</p>
        `
      });
    }
  }

  // B. Monthly Billing Cycle -> Apply 25% Diagnostic Credit Cap Before Finalizing Invoice
  if (event.type === "invoice.created") {
    const invoice = event.data.object;
    if (invoice.subscription && invoice.subtotal > 0 && invoice.status === "draft") {
      const credit = await env.DB.prepare(`
        SELECT credit_id, remaining_cents
        FROM diagnostic_credits
        WHERE active_subscription_id = ? AND status = 'active' AND remaining_cents > 0
      `).bind(invoice.subscription).first();

      if (credit) {
        const capCents = Math.floor(invoice.subtotal * 0.25);
        const applyCents = Math.min(credit.remaining_cents, capCents);

        if (applyCents > 0) {
          const itemForm = new URLSearchParams();
          itemForm.append("customer", invoice.customer);
          itemForm.append("invoice", invoice.id);
          itemForm.append("amount", String(-applyCents));
          itemForm.append("currency", invoice.currency || "usd");
          itemForm.append("description", "Diagnostic Credit Applied (25% Monthly Cap)");
          await stripePost(env, "/v1/invoiceitems", itemForm);

          const newRemaining = credit.remaining_cents - applyCents;
          await env.DB.prepare(`
            UPDATE diagnostic_credits
            SET remaining_cents = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE credit_id = ?
          `).bind(newRemaining, newRemaining === 0 ? "exhausted" : "active", credit.credit_id).run();
        }
      }
    }
  }

  // C. Subscription Canceled -> Immediately Forfeit Any Unused Diagnostic Credit
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await env.DB.prepare(`
      UPDATE diagnostic_credits
      SET remaining_cents = 0, status = 'forfeited', updated_at = CURRENT_TIMESTAMP
      WHERE active_subscription_id = ? AND status = 'active'
    `).bind(sub.id).run();
  }

  return new Response("OK", { status: 200 });
}

// ============================================================================
// 3. POST-PAYMENT ONBOARDING PORTAL API (/onboard/index.html)
// ============================================================================
async function handleGetOnboardSession(url, env) {
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return jsonResponse({ error: "Missing session_id." }, 400);
  }

  const account = await env.DB.prepare(`
    SELECT account_id, account_type, contact_name, contact_email, company_name,
           purchased_services_json, seat_limit, onboarding_completed
    FROM accounts
    WHERE stripe_checkout_session_id = ?
  `).bind(sessionId).first();

  if (!account) {
    return jsonResponse({ pending: true, error: "Finalizing payment record. Please refresh in a few seconds." }, 404);
  }

  return jsonResponse({
    account_id: account.account_id,
    account_type: account.account_type,
    contact_name: account.contact_name,
    contact_email: account.contact_email,
    company_name: account.company_name,
    purchased_services: JSON.parse(account.purchased_services_json || "[]"),
    seat_limit: account.seat_limit,
    onboarding_completed: Boolean(account.onboarding_completed)
  });
}

async function handleSubmitOnboard(request, env) {
  try {
    const { session_id, brand_name, workspaces } = await request.json();

    if (!session_id || !Array.isArray(workspaces) || workspaces.length === 0) {
      return jsonResponse({ error: "Missing session or workspace details." }, 400);
    }

    const account = await env.DB.prepare(`
      SELECT account_id, account_type, contact_email, purchased_services_json, seat_limit
      FROM accounts
      WHERE stripe_checkout_session_id = ?
    `).bind(session_id).first();

    if (!account) {
      return jsonResponse({ error: "Invalid onboarding session." }, 404);
    }

    const allowedWorkspaces = workspaces.slice(0, account.seat_limit);
    const purchasedServices = JSON.parse(account.purchased_services_json || "[]");

    // Save optional white-label brand header name
    if (account.account_type === "white_label" && brand_name) {
      await env.DB.prepare(`UPDATE accounts SET brand_name = ? WHERE account_id = ?`)
        .bind(brand_name.trim(), account.account_id).run();
    }

    // Insert each workspace as its own strictly isolated row
    for (const ws of allowedWorkspaces) {
      const servicesForWs = Array.isArray(ws.services) && ws.services.length > 0
        ? ws.services
        : purchasedServices;

      const hasRecurring = servicesForWs.some((id) => PRICE_MAP[id]?.type === "recurring");
      const schedule = hasRecurring ? "weekly_mon" : "one_time";

      await env.DB.prepare(`
        INSERT INTO workspaces (
          workspace_id, parent_account_id, target_company, target_url,
          competitor_urls_json, active_services_json, delivery_emails_json,
          locale, timezone, schedule, context_notes, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).bind(
        crypto.randomUUID(),
        account.account_id,
        (ws.target_company || "").trim(),
        (ws.target_url || "").trim(),
        JSON.stringify(ws.competitor_urls || []),
        JSON.stringify(servicesForWs),
        JSON.stringify(ws.delivery_emails?.length ? ws.delivery_emails : [account.contact_email]),
        ws.locale || "en-US",
        ws.timezone || "America/New_York",
        schedule,
        (ws.context_notes || "").trim()
      ).run();
    }

    await env.DB.prepare(`UPDATE accounts SET onboarding_completed = 1 WHERE account_id = ?`)
      .bind(account.account_id).run();

    // Notify your desk that a new client is onboarded and queued
    await sendResendEmail(env, {
      to: "desk@preferredoutcomes.org",
      subject: `Onboarding Complete — ${account.account_type.toUpperCase()} (${allowedWorkspaces.length} workspace${allowedWorkspaces.length > 1 ? "s" : ""})`,
      html: `<p>Account <strong>${escapeHtml(account.account_email)}</strong> completed onboarding with ${allowedWorkspaces.length} isolated workspace(s). Ready for fulfillment.</p>`
    });

    return jsonResponse({ ok: true, workspaces_created: allowedWorkspaces.length });
  } catch (err) {
    return jsonResponse({ error: "Unable to save onboarding details." }, 500);
  }
}

// ============================================================================
// HELPERS
// ============================================================================
async function stripePost(env, path, formParams) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formParams.toString()
  });
  return res.json();
}

async function sendResendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Preferred Outcomes <dispatch@preferredoutcomes.org>",
      to: [to],
      subject,
      html
    })
  });
}

async function verifyStripeSignature(payload, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (!parts.t || !parts.v1) return false;
  const signedPayload = `${parts.t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computed = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return computed === parts.v1;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}
