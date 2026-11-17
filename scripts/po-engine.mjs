import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FLIGHTAWARE_API_KEY = process.env.FLIGHTAWARE_API_KEY;
const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/cyrvdqwkme5hjj26cjat8oz51jrk98jp';
const SITE_URL = 'https://preferredoutcomes.org';
const INDEXNOW_KEY = 'poindex2026key';
const AMAZON_TAG = 'preferredoutc-20'; // <-- Replace with your Amazon Associate Tag

const SILOS_FILE = path.join(process.cwd(), 'terminal', 'silos.json');

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*'
};

const ALL_AIRPORTS = [
  { code: 'EGLL', region: 'UK261', lang: 'English', lang_code: 'en' },
  { code: 'LFPG', region: 'EU261', lang: 'French', lang_code: 'fr' },
  { code: 'EDDF', region: 'EU261', lang: 'German', lang_code: 'de' },
  { code: 'EHAM', region: 'EU261', lang: 'English', lang_code: 'en' },
  { code: 'LEMD', region: 'EU261', lang: 'Spanish', lang_code: 'es' },
  { code: 'SBGR', region: 'ANAC_BR', lang: 'Portuguese (pt-BR)', lang_code: 'pt' },
  { code: 'CYYZ', region: 'APPR', lang: 'English', lang_code: 'en' },
  { code: 'CYVR', region: 'APPR', lang: 'English', lang_code: 'en' },
  { code: 'KJFK', region: 'US_DOT', lang: 'English', lang_code: 'en' },
  { code: 'KATL', region: 'US_DOT', lang: 'English', lang_code: 'en' },
  { code: 'KLAX', region: 'US_DOT', lang: 'English', lang_code: 'en' },
  { code: 'KORD', region: 'US_DOT', lang: 'English', lang_code: 'en' },
  { code: 'OMDB', region: 'GLOBAL', lang: 'English', lang_code: 'en' },
  { code: 'YSSY', region: 'AU_ACL', lang: 'English', lang_code: 'en' }
];

function buildOmnibusFeedMatrix() {
  const locales = [
    { region: 'US', lang: 'English', lang_code: 'en', hl: 'en-US', gl: 'US', ceid: 'US:en' },
    { region: 'UK', lang: 'English', lang_code: 'en', hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
    { region: 'CA', lang: 'English', lang_code: 'en', hl: 'en-CA', gl: 'CA', ceid: 'CA:en' },
    { region: 'AU', lang: 'English', lang_code: 'en', hl: 'en-AU', gl: 'AU', ceid: 'AU:en' },
    { region: 'BR', lang: 'Portuguese (pt-BR)', lang_code: 'pt', hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt-419' },
    { region: 'DE', lang: 'German', lang_code: 'de', hl: 'de', gl: 'DE', ceid: 'DE:de' },
    { region: 'FR', lang: 'French', lang_code: 'fr', hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
    { region: 'ES', lang: 'Spanish', lang_code: 'es', hl: 'es', gl: 'ES', ceid: 'ES:es' },
    { region: 'MX', lang: 'Spanish (es-MX)', lang_code: 'es', hl: 'es-419', gl: 'MX', ceid: 'MX:es-419' },
    { region: 'EU', lang: 'Italian', lang_code: 'it', hl: 'it', gl: 'IT', ceid: 'IT:it' }
  ];

  const topics = [
    { topic: 'BUSINESS', defaultNiche: 'FINANCE' },
    { topic: 'TECHNOLOGY', defaultNiche: 'OUTAGES' },
    { topic: 'WORLD', defaultNiche: 'POLITICS' },
    { topic: 'NATION', defaultNiche: 'POLITICS' },
    { topic: 'ENTERTAINMENT', defaultNiche: 'CULTURE' },
    { topic: 'SPORTS', defaultNiche: 'CULTURE' },
    { topic: 'SCIENCE', defaultNiche: 'CULTURE' },
    { topic: 'HEALTH', defaultNiche: 'RECALLS' }
  ];

  const feeds = [];

  for (const loc of locales) {
    feeds.push({
      niche: 'OUTAGES',
      region: loc.region,
      lang: loc.lang,
      lang_code: loc.lang_code,
      url: `https://news.google.com/rss/search?q=(outage+OR+refund+OR+lawsuit+OR+strike+OR+cancelled+OR+compensation+OR+Airbnb+OR+tenant)+when:7d&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`
    });
    feeds.push({
      niche: 'CULTURE',
      region: loc.region,
      lang: loc.lang,
      lang_code: loc.lang_code,
      url: `https://news.google.com/rss/search?q=(controversy+OR+backlash+OR+scandal+OR+boycott+OR+investigation+OR+verdict+OR+feud)+when:7d&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`
    });
  }

  for (const t of topics) {
    for (const loc of locales) {
      feeds.push({
        niche: t.defaultNiche,
        region: loc.region,
        lang: loc.lang,
        lang_code: loc.lang_code,
        url: `https://news.google.com/rss/headlines/section/topic/${t.topic}?hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`
      });
    }
  }

  return feeds;
}

const OMNIBUS_FEEDS = buildOmnibusFeedMatrix();

// 100% HARDCODED CONVERSION BOXES (Titles, Explanations, Inputs & Buttons — AI Cannot Touch or Break These)
const TIER_CONVERSION_PACKS = {
  en: {
    TIER_1_STATUTORY: {
      heading: 'Compare Your 3 Claim & Compensation Recovery Options:',
      redTitle: 'OPTION 1: FILE SOLO VIA STANDARD COMPANY WEB FORM (72% REJECTION RISK)',
      redText: 'Corporations, airlines, and property platforms routinely reject unrepresented consumer claims using boilerplate excuses or push restrictive travel vouchers that waive your right to cash.',
      amberTitle: 'OPTION 2: THIRD-PARTY CLAIM AGENCIES (LOSES 35% TO 50% OF YOUR PAYOUT)',
      amberText: 'Middleman claim sharks take 3 to 6 months to process routine demands and pocket up to half of your statutory refund or settlement check just for submitting a template letter.',
      greenTitle: 'OPTION 3: DONE-FOR-YOU PRE-CITED STATUTORY DEMAND DISPATCH ($29.00 FLAT — YOU KEEP 100%)',
      greenText: 'What you get for $29.00: We prepare your formal legal-grade demand notice citing the exact consumer statute, attach your claim telemetry, and electronically dispatch it directly to the corporate compliance desk on your behalf (with you CC\'d on the official Proof-of-Service record) so you keep 100% of your payout.',
      namePlaceholder: 'Your Full Legal Name',
      inputPlaceholder: 'Booking / Account Reference & Estimated Dollar Loss (e.g. PNR K8M2P9 - $650)',
      emailPlaceholder: 'Your Email Address (For Your CC\'d Proof-of-Service Dossier)',
      ctaBtn: 'Dispatch My Formal Statutory Claim Notice — $29.00',
      freeTitle: 'Not Ready to Dispatch Today? Join the Free 50-Claimant Batch & Evidence Tracker',
      freeCta: 'Enter your details below to receive the free Evidence Preservation Checklist and lock in your spot on our 50-claimant consolidated legal batch.',
      freeInputPlaceholder: 'City/State & Brief Summary of Disruption or Financial Loss',
      freeBtn: 'Send Free Evidence Checklist & Log My Claim ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Compare Your 3 Institutional Action & Escalation Options:',
      redTitle: 'OPTION 1: VENTING ON SOCIAL MEDIA (ZERO INSTITUTIONAL IMPACT)',
      redText: 'Unverified social media posts and comment threads carry zero administrative weight and are completely ignored by corporate boards, ministries, and regulatory oversight committees.',
      amberTitle: 'OPTION 2: STANDARD FREE PETITION QUEUE (HELD IN BATCH ESCROW)',
      amberText: 'Adding your name to the free petition queue below logs your support, but your signature is held in escrow until a full 50-person consolidated batch is reached.',
      greenTitle: 'OPTION 3: PRIORITY INDIVIDUAL EXECUTIVE NOTICE DISPATCHED IN YOUR NAME ($4.99 FLAT)',
      greenText: 'What you get for $4.99: Instead of waiting in the free batch queue, we format and electronically transmit an individual, timestamped Formal Executive Accountability Notice in your name directly to the governing board, agency, or corporate leadership desk today—with an official copy sent to your inbox.',
      namePlaceholder: 'Your Full Name (As Shown on Official Notice)',
      inputPlaceholder: 'Your Position (Support / Oppose / Demand Audit) & Personal Statement to Dispatch',
      emailPlaceholder: 'Your Email Address (To Receive Your Dispatched Notice Copy)',
      ctaBtn: 'Dispatch My Individual Formal Notice — $4.99',
      freeTitle: 'Prefer the Free Route? Add Your Name to the 50-Person Public Docket Batch',
      freeCta: 'Log your free signature on the consolidated public docket and receive official updates as this issue escalates.',
      freeInputPlaceholder: 'Your City/Region & Why This Issue Matters to You',
      freeBtn: 'Log My Free Signature on the Public Docket ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'How to Weigh In on the Official Public Referendum & Sentiment Ledger:',
      redTitle: 'OPTION 1: UNVERIFIED SOCIAL COMMENT THREADS (BURIED BY ALGORITHMS)',
      redText: 'Standard social media comment sections are flooded with bots and throttled by engagement algorithms—meaning your take disappears within minutes and never reaches decision-makers or media desks.',
      amberTitle: 'OPTION 2: BASIC UNWEIGHTED TALLY VOTE (NO PINNED STATEMENT)',
      amberText: 'Casting a free vote at the bottom of this page adds 1 basic unweighted point to the aggregate sentiment bar, without publishing or certifying your personal statement.',
      greenTitle: 'OPTION 3: VERIFIED PRIORITY STATEMENT + 10X WEIGHTED REFERENDUM BALLOT ($1.99 FLAT)',
      greenText: 'What you get for $1.99: Whether you strongly agree, strongly disagree, or demand an independent investigation, your verified ballot counts with 10x referendum weight AND your personal statement is permanently recorded on the Official Public Sentiment Dossier transmitted to media desks, analysts, and stakeholders.',
      namePlaceholder: 'Your Name or Verified Display Handle',
      inputPlaceholder: 'State Your Position (Agree / Disagree / Neutral) & Your Public Statement to Record',
      emailPlaceholder: 'Your Email Address (For Your Verified Referendum Receipt & Dossier Copy)',
      ctaBtn: 'Record My Verified Statement & 10x Weighted Vote — $1.99',
      freeTitle: 'Cast a Free Unweighted Vote & Get Live Docket / Release Alerts',
      freeCta: 'Log a free 1x vote on the public tally bar and receive instant alerts when new developments or stock drops occur.',
      freeInputPlaceholder: 'Your City & Your 1-Sentence Take (Agree / Disagree)',
      freeBtn: 'Cast Free 1x Vote & Subscribe to Alerts ($0.00)'
    }
  },
  pt: {
    TIER_1_STATUTORY: {
      heading: 'Compare Suas 3 Opções para Exigir Reembolso e Indenização:',
      redTitle: 'OPÇÃO 1: FORMULÁRIO PADRÃO DA EMPRESA (72% DE RISCO DE RECUSA)',
      redText: 'Empresas e companhias aéreas frequentemente negam pedidos individuais sem fundamentação legal ou empurram vouchers restritivos para evitar o pagamento em dinheiro.',
      amberTitle: 'OPÇÃO 2: AGÊNCIAS INTERMEDIÁRIAS (COBRAM DE 35% A 50% DO SEU VALOR)',
      amberText: 'Empresas intermediárias levam meses e ficam com até metade da sua indenização apenas para enviar uma notificação padrão.',
      greenTitle: 'OPÇÃO 3: DESPACHO DE NOTIFICAÇÃO FORMAL PRÉ-FUNDAMENTADA ($29.00 FIXOS — FIQUE COM 100%)',
      greenText: 'O que você recebe por $29.00: Preparamos sua Notificação Formal citando a legislação aplicável (CDC / ANAC / Procon) e enviamos eletronicamente direto ao setor de conformidade da empresa em seu nome (com cópia oficial de protocolo para o seu e-mail), garantindo 100% do valor para você.',
      namePlaceholder: 'Seu Nome Completo',
      inputPlaceholder: 'Código da Reserva / Conta e Valor Estimado do Prejuízo',
      emailPlaceholder: 'Seu E-mail (Para Receber a Cópia Oficial Protocolada)',
      ctaBtn: 'Enviar Minha Notificação Formal de Reembolso — $29.00',
      freeTitle: 'Prefere Não Enviar Hoje? Entre no Lote Coletivo Gratuito de 50 Reclamantes',
      freeCta: 'Cadastre seu e-mail abaixo para receber o Checklist Gratuito de Provas e integrar o lote coletivo de 50 afetados.',
      freeInputPlaceholder: 'Sua Cidade/UF e Resumo do Problema ou Prejuízo',
      freeBtn: 'Receber Checklist Gratuito e Registrar Caso ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Compare Suas 3 Opções de Manifestação e Escalada Institucional:',
      redTitle: 'OPÇÃO 1: RECLAMAR NAS REDES SOCIAIS (IMPACTO OFICIAL ZERO)',
      redText: 'Comentários em redes sociais não possuem validade administrativa e são ignorados por diretorias, conselhos e órgãos reguladores.',
      amberTitle: 'OPÇÃO 2: FILA DE PETIÇÃO COLETIVA GRATUITA (AGUARDA LOTE DE 50 NOMES)',
      amberText: 'Assinar a lista gratuita abaixo registra seu apoio, mas aguarda o fechamento do lote de 50 assinaturas antes do envio consolidado.',
      greenTitle: 'OPÇÃO 3: NOTIFICAÇÃO EXECUTIVA INDIVIDUAL ENVIADA EM SEU NOME HOJE ($4.99 FIXOS)',
      greenText: 'O que você recebe por $4.99: Formatamos e transmitimos hoje uma Notificação Formal Individual em seu nome diretamente para a diretoria, ouvidoria ou órgão responsável—seja para cobrar providências, apoiar ou contestar a medida—com cópia oficial enviada ao seu e-mail.',
      namePlaceholder: 'Seu Nome Completo',
      inputPlaceholder: 'Sua Posição (A Favor / Contra / Cobrar Auditoria) e Sua Mensagem Formal',
      emailPlaceholder: 'Seu E-mail (Para Receber o Comprovante de Envio)',
      ctaBtn: 'Enviar Minha Notificação Individual Agora — $4.99',
      freeTitle: 'Adicione Seu Nome Gratuitamente ao Lote Coletivo Desta Pauta',
      freeCta: 'Registre sua assinatura gratuita no dossiê público e receba atualizações oficiais sobre este caso.',
      freeInputPlaceholder: 'Sua Cidade/UF e Sua Posição sobre o Caso',
      freeBtn: 'Registrar Minha Assinatura Gratuita ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'Como Registrar Sua Posição no Referendo Público Oficial:',
      redTitle: 'OPÇÃO 1: COMENTÁRIOS COMUNS EM REDES SOCIAIS (OCULTADOS PELO ALGORITMO)',
      redText: 'Caixas de comentários comuns misturam opiniões reais com robôs e desaparecem do feed em poucos minutos.',
      amberTitle: 'OPÇÃO 2: VOTO SIMPLES SEM PESO (SEM DECLARAÇÃO REGISTRADA)',
      amberText: 'O voto gratuito no final da página soma apenas 1 ponto básico na barra geral, sem destacar ou protocolar seu argumento.',
      greenTitle: 'OPÇÃO 3: DECLARAÇÃO VERIFICADA + VOTO COM PESO 10X NO DOSSIÊ PÚBLICO ($1.99 FIXOS)',
      greenText: 'O que você recebe por $1.99: Independentemente de você concordar, discordar ou exigir investigação, seu voto verificado tem peso 10x no painel oficial e sua declaração pessoal é gravada no Dossiê de Opinião Pública enviado à imprensa e partes envolvidas.',
      namePlaceholder: 'Seu Nome ou Identificação',
      inputPlaceholder: 'Sua Posição (Concordo / Discordo / Investigar) e Seu Comentário para o Dossiê',
      emailPlaceholder: 'Seu E-mail (Para Receber o Recibo Oficial do Dossiê)',
      ctaBtn: 'Registrar Declaração Verificada e Voto 10x — $1.99',
      freeTitle: 'Registre um Voto Gratuito (Peso 1x) e Receba Alertas Desta Pauta',
      freeCta: 'Some seu voto gratuito ao placar geral e receba alertas sobre novos desdobramentos.',
      freeInputPlaceholder: 'Sua Cidade e Sua Opinião Resumida',
      freeBtn: 'Registrar Voto Gratuito ($0.00)'
    }
  }
};

// Map Spanish, German, French, Italian to English structure with localized labels
['es', 'de', 'fr', 'it'].forEach(lc => {
  TIER_CONVERSION_PACKS[lc] = TIER_CONVERSION_PACKS.en;
});

function loadState() {
  let state = {
    schema_version: 13,
    deployed: {},
    active_silos: [],
    airport_cursor: 0,
    feed_cursor: 0
  };

  if (fs.existsSync(SILOS_FILE)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(SILOS_FILE, 'utf8'));
      state = { ...state, ...loaded };
    } catch (e) {}
  }

  // SELF-HEALING UPGRADE: Wipe all old pre-v13 /docket/ folders once so zero broken "BICYCLE" or "Totally agree" pages survive
  if (state.schema_version !== 13) {
    console.log('[Upgrade v13] Purging old pre-v13 docket pages so 100% of articles use v13 advertorial & conversion boxes...');
    const docketRoot = path.join(process.cwd(), 'docket');
    if (fs.existsSync(docketRoot)) {
      fs.rmSync(docketRoot, { recursive: true, force: true });
    }
    const keptFlights = {};
    for (const [k, v] of Object.entries(state.deployed || {})) {
      if (v.type === 'AVIATION') keptFlights[k] = v;
    }
    state.deployed = keptFlights;
    state.schema_version = 13;
    state.feed_cursor = 0;
  }

  return state;
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
        temperature: 0.4,
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
  const langKey = (d.lang_code || 'en').slice(0, 2).toLowerCase();
  const tierKey = d.tier || 'TIER_2_LEDGER';
  const pack = (TIER_CONVERSION_PACKS[langKey] || TIER_CONVERSION_PACKS.en)[tierKey] || TIER_CONVERSION_PACKS.en.TIER_2_LEDGER;

  const hashByte = crypto.createHash('md5').update(pageSlug).digest()[0];
  const slotCount = 29 + (hashByte % 16);
  const pollSideAPct = 54 + (hashByte % 28);
  const pollSideBPct = 100 - pollSideAPct;
  const pollVotesTotal = 920 + (hashByte * 9);

  const isPoll = tierKey === 'TIER_3_POLL';
  const statusBarHtml = isPoll
    ? `<div style='background:#0f172a;color:#ffffff;padding:14px 16px;border-radius:6px;font-size:13px;font-weight:700;margin-bottom:24px;'>
         <div style='display:flex;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:6px;'>
           <span>OFFICIAL PUBLIC REFERENDUM LEDGER: ${masterIncident.toUpperCase()} (${pollVotesTotal.toLocaleString()} VERIFIED BALLOTS)</span>
           <span style='color:#4ade80;'>● ${pollSideAPct}% MAJORITY STANCE</span>
         </div>
         <div style='width:100%;height:8px;background:#334155;border-radius:4px;overflow:hidden;display:flex;'>
           <div style='width:${pollSideAPct}%;background:#16a34a;height:100%;'></div>
           <div style='width:${pollSideBPct}%;background:#ef4444;height:100%;'></div>
         </div>
       </div>`
    : `<div style='background:#0f172a;color:#ffffff;padding:12px 16px;border-radius:6px;font-size:13px;font-weight:700;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;'>
         <span>DOCKET LEDGER: ${masterIncident.toUpperCase()} (${slotCount} OF 50 BATCH SLOTS FILLED)</span>
         <span style='color:#4ade80;'>● ACTIVE INTAKE</span>
       </div>`;

  const paragraphs = Array.isArray(d.advertorial_paragraphs) ? d.advertorial_paragraphs : [];
  const advertorialHtml = paragraphs.length > 0
    ? `<div style='color:#1e293b;font-size:16.5px;line-height:1.8;margin-bottom:28px;padding-bottom:22px;border-bottom:2px solid #e2e8f0;'>
         ${paragraphs.map(p => `<p style='margin:0 0 16px 0;'>${p}</p>`).join('')}
       </div>`
    : '';

  const stanceSelectorHtml = isPoll
    ? `<select name='stance' required style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;background:#ffffff;color:#0f172a;font-weight:700;'>
         <option value='' disabled selected>Select Your Official Referendum Stance (Any Side Eligible)...</option>
         <option value='SUPPORT_ACTION'>Position A: Strongly Support / Demand Full Accountability &amp; Investigation</option>
         <option value='OPPOSE_ACTION'>Position B: Strongly Oppose / Reject Allegations or Policy Change</option>
         <option value='INDEPENDENT_AUDIT'>Position C: Demand Independent Third-Party Audit &amp; Full Transparency</option>
       </select>`
    : '';

  const affiliateBlockHtml = d.affiliate_keyword
    ? `<div style='margin-top:20px;padding:18px;background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;'>
         <div>
           <div style='font-size:11px;font-weight:800;color:#b45309;text-transform:uppercase;'>Verified Retail, Gear &amp; Collector Availability</div>
           <div style='font-size:14px;font-weight:700;color:#0f172a;'>Check Live Stock, Editions &amp; Top-Rated Options: ${d.affiliate_keyword}</div>
         </div>
         <a href='https://www.amazon.com/s?k=${encodeURIComponent(d.affiliate_keyword)}&tag=${AMAZON_TAG}' target='_blank' rel='noopener' style='padding:10px 16px;background:#f59e0b;color:#0f172a;font-weight:800;font-size:13px;text-decoration:none;border-radius:6px;'>Check Amazon Availability &rarr;</a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang='${langKey}'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1.0'>
  <title>${d.seo_title} | Preferred Outcomes</title>
  <meta name='description' content='${(d.ai_direct_answer || '').replace(/'/g, '&#39;')}'>
  <link rel='icon' href='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2216%22 fill=%22%230f172a%22/><text x=%2250%25%22 y=%2254%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2242%22>P/O</text></svg>'>
</head>
<body style='background:#f1f5f9;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;margin:0;padding:24px 14px;line-height:1.65;'>
  <div style='max-width:760px;margin:auto;background:#ffffff;border:1px solid #cbd5e1;border-radius:12px;padding:28px;box-shadow:0 8px 24px rgba(15,23,42,0.06);'>
    <div style='display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:20px;flex-wrap:wrap;gap:8px;'>
      <a href='/' style='font-weight:900;font-size:15px;letter-spacing:0.05em;color:#0f172a;text-decoration:none;'>P/O // PREFERRED OUTCOMES</a>
      <span style='background:#dcfce7;color:#166534;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:800;text-transform:uppercase;'>${d.badge_text || 'ACTIVE DOCKET'}</span>
    </div>

    <h1 style='font-size:28px;line-height:1.25;margin:0 0 16px 0;color:#0f172a;font-weight:900;'>${d.human_h1}</h1>

    <div style='background:#f8fafc;border-left:4px solid #0f172a;padding:16px;border-radius:0 6px 6px 0;margin-bottom:20px;font-size:16px;font-weight:500;color:#1e293b;'>
      <strong>Executive Summary:</strong> ${d.ai_direct_answer}
    </div>

    ${statusBarHtml}
    ${advertorialHtml}

    <div itemscope itemtype='https://schema.org/FAQPage'>
      <div itemscope itemprop='mainEntity' itemtype='https://schema.org/Question'>
        <h2 itemprop='name' style='font-size:20px;color:#0f172a;margin-top:24px;font-weight:800;'>${d.q1_human}</h2>
        <div itemscope itemprop='acceptedAnswer' itemtype='https://schema.org/Answer'>
          <p itemprop='text' style='color:#334155;font-size:16px;line-height:1.75;'>${d.a1_answer}</p>
        </div>
      </div>
      <div itemscope itemprop='mainEntity' itemtype='https://schema.org/Question'>
        <h2 itemprop='name' style='font-size:20px;color:#0f172a;margin-top:24px;font-weight:800;'>${d.q2_human}</h2>
        <div itemscope itemprop='acceptedAnswer' itemtype='https://schema.org/Answer'>
          <p itemprop='text' style='color:#334155;font-size:16px;line-height:1.75;'>${d.a2_answer}</p>
        </div>
      </div>
      <div itemscope itemprop='mainEntity' itemtype='https://schema.org/Question'>
        <h2 itemprop='name' style='font-size:20px;color:#0f172a;margin-top:24px;font-weight:800;'>${d.q3_human}</h2>
        <div itemscope itemprop='acceptedAnswer' itemtype='https://schema.org/Answer'>
          <p itemprop='text' style='color:#334155;font-size:16px;line-height:1.75;'>${d.a3_answer}</p>
        </div>
      </div>
    </div>

    <h3 style='font-size:19px;color:#0f172a;margin-top:34px;margin-bottom:14px;font-weight:900;'>${pack.heading}</h3>
    <div style='display:flex;flex-direction:column;gap:14px;margin-bottom:24px;'>
      <div style='background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:16px;'>
        <div style='color:#b91c1c;font-weight:800;font-size:13px;text-transform:uppercase;'>${pack.redTitle}</div>
        <p style='margin:6px 0 0 0;font-size:14.5px;color:#7f1d1d;'>${pack.redText}</p>
      </div>
      <div style='background:#fffbeb;border:2px solid #f59e0b;border-radius:8px;padding:16px;'>
        <div style='color:#b45309;font-weight:800;font-size:13px;text-transform:uppercase;'>${pack.amberTitle}</div>
        <p style='margin:6px 0 0 0;font-size:14.5px;color:#78350f;'>${pack.amberText}</p>
      </div>
      <div style='background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:22px;'>
        <div style='color:#15803d;font-weight:800;font-size:13.5px;text-transform:uppercase;'>${pack.greenTitle}</div>
        <p style='margin:8px 0 16px 0;font-size:14.5px;color:#14532d;line-height:1.65;'>${pack.greenText}</p>
        <form action='${MAKE_WEBHOOK_URL}' method='GET' style='display:flex;flex-direction:column;gap:10px;'>
          <input type='hidden' name='flow_type' value='DFY_CHECKOUT'>
          <input type='hidden' name='niche' value='${d.niche}'>
          <input type='hidden' name='incident' value='${masterIncident}'>
          <input type='hidden' name='tier' value='${tierKey}'>
          <input type='hidden' name='region' value='${d.region}'>
          ${stanceSelectorHtml}
          <input type='text' name='name' required placeholder='${pack.namePlaceholder}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'>
          <input type='text' name='pnr' required placeholder='${pack.inputPlaceholder}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'>
          <input type='email' name='email' required placeholder='${pack.emailPlaceholder}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'>
          <button type='submit' style='padding:16px;background:#16a34a;color:#ffffff;font-weight:900;font-size:16px;border:none;border-radius:6px;cursor:pointer;'>${pack.ctaBtn} &rarr;</button>
        </form>
      </div>
    </div>

    <div style='background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin-top:24px;'>
      <h4 style='margin:0 0 6px 0;font-size:16px;color:#0f172a;'>${pack.freeTitle}</h4>
      <p style='margin:0 0 14px 0;font-size:14px;color:#475569;'>${pack.freeCta}</p>
      <form action='${MAKE_WEBHOOK_URL}' method='GET' style='display:flex;flex-direction:column;gap:10px;'>
        <input type='hidden' name='flow_type' value='FREE_LEAD'>
        <input type='hidden' name='niche' value='${d.niche}'>
        <input type='hidden' name='incident' value='${masterIncident}'>
        <input type='hidden' name='tier' value='${tierKey}'>
        <input type='hidden' name='region' value='${d.region}'>
        <div style='display:flex;gap:10px;flex-wrap:wrap;'>
          <input type='text' name='signer_name' required placeholder='${pack.namePlaceholder}' style='flex:1;min-width:180px;padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'>
          <input type='email' name='email' required placeholder='${pack.emailPlaceholder}' style='flex:1;min-width:200px;padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'>
        </div>
        <input type='text' name='loss_impact' required placeholder='${pack.freeInputPlaceholder}' style='padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'>
        <label style='display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#64748b;cursor:pointer;'>
          <input type='checkbox' name='coreg_optin' value='yes' checked style='margin-top:3px;'>
          <span>Also subscribe me to free consumer settlement alerts, partner briefs, and consolidated batch recovery updates (unsubscribe anytime).</span>
        </label>
        <button type='submit' style='padding:13px;background:#0f172a;color:#ffffff;font-weight:800;font-size:14px;border:none;border-radius:6px;cursor:pointer;'>${pack.freeBtn}</button>
      </form>
    </div>

    ${affiliateBlockHtml}
    ${buildSharedFooter(masterIncident, pageSlug)}
  </div>
</body>
</html>`;
}

const MASTER_SYSTEM_PROMPT = `You are an elite long-tail SEO investigative journalist and consumer advocacy advertorial writer.
CRITICAL RULES:
1. NEVER write one-sentence answers. Every paragraph in "advertorial_paragraphs" and every answer ("a1_answer", "a2_answer", "a3_answer") MUST be 4 to 5 full, detailed sentences (at least 65 words per paragraph/answer) packed with specific context, regulatory/financial stakes, and actionable insights.
2. NEVER use the words "automated", "bot", or "AI".
3. LONG-TAIL GOOGLE SEARCH HEADLINES:
   - "seo_title" and "human_h1" MUST be written the exact way real people search on Google when looking for answers, refunds, petitions, or fallout from this news event (e.g. "Megaspeed Nvidia Chip Investigation: What the Export Probe Means & Public Accountability Docket" or "Rome Friday Transport Strike: How Commuters & Tourists Claim Ticket Refunds & Delay Compensation").
4. MONETIZATION TIER ROUTING:
   - "TIER_1_STATUTORY" ($29.00): Direct consumer financial loss (flights, transit strikes, telecom/software outages, Airbnb/landlord disputes, bank account freezes, billing errors, product recalls).
   - "TIER_2_LEDGER" ($4.99): Government/corporate policy decisions, investigations (like corporate probes/scandals), rate hikes, school/labor strikes, municipal rules, or institutional actions where citizens want to send a formal $4.99 notice or sign a petition.
   - "TIER_3_POLL" ($1.99): Sports, celebrity drama, entertainment/gaming releases, cultural flashpoints, or viral debates where readers want to log a weighted referendum vote and statement.

Return a strict JSON object in the requested Language with:
- "slug": (4 to 6 word ASCII lowercase hyphenated long-tail search slug)
- "master_incident_id": (2 to 3 word ASCII lowercase hyphenated canonical key so related articles share one lead list)
- "english_title": (Clear 6-to-9 word English title for the operator dashboard)
- "affiliate_keyword": (2-to-4 word Amazon search phrase for relevant gear, books, hardware, or emergency items related to this topic)
- "lang_code": ("en", "pt", "es", "de", "fr", or "it")
- "niche": ("TENANCY", "OUTAGES", "RECALLS", "FINANCE", "POLITICS", or "CULTURE")
- "region": ("US", "CA", "UK", "EU", "BR", "ES", "MX", "DE", "FR", "AU", or "GLOBAL")
- "tier": ("TIER_1_STATUTORY", "TIER_2_LEDGER", or "TIER_3_POLL")
- "badge_text": (2-to-3 word authoritative status badge in the target language)
- "seo_title": (Long-tail Google search title, 50-65 chars)
- "human_h1": (Compelling long-tail search headline)
- "ai_direct_answer": (3-sentence executive summary of the event, who is affected, and the active docket options)
- "advertorial_paragraphs": [
    "Paragraph 1 (4-5 detailed sentences breaking down the exact news catalyst, the entities involved, and why thousands of people are searching for answers right now)...",
    "Paragraph 2 (4-5 detailed sentences analyzing the regulatory, financial, or institutional stakes behind the scenes that mainstream coverage glosses over)...",
    "Paragraph 3 (4-5 detailed sentences explaining the specific rights, escalation channels, or public referendum leverage available to affected citizens, customers, or stakeholders)..."
  ]
- "q1_human": (Long-tail search question 1)
- "a1_answer": (4-5 detailed sentences answering Q1 thoroughly)
- "q2_human": (Long-tail search question 2)
- "a2_answer": (4-5 detailed sentences answering Q2 thoroughly)
- "q3_human": (Long-tail search question 3)
- "a3_answer": (4-5 detailed sentences answering Q3 thoroughly)`;

async function pollGlobalAviation(state, newUrls) {
  if (!FLIGHTAWARE_API_KEY) return;

  for (let h = 0; h < 3; h++) {
    const idx = (state.airport_cursor || 0) % ALL_AIRPORTS.length;
    state.airport_cursor = (idx + 1) % ALL_AIRPORTS.length;
    const hub = ALL_AIRPORTS[idx];

    try {
      console.log(`[Aviation] Polling hub ${hub.code} (${hub.region})...`);
      const res = await fetch(`https://aeroapi.flightaware.com/aeroapi/airports/${hub.code}/flights?max_pages=1`, {
        headers: { 'x-apikey': FLIGHTAWARE_API_KEY }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const allFlights = [...(data.departures || []), ...(data.arrivals || [])];

      const disrupted = allFlights.filter(f => {
        if (!f.ident || f.ident.length < 4) return false;
        const ident = f.ident.toLowerCase();
        if (state.deployed[ident] && state.deployed[ident].v13) return false;
        const delaySec = Math.max(f.departure_delay || 0, f.arrival_delay || 0);
        return f.cancelled === true || delaySec >= 10800;
      }).slice(0, 5);

      for (const fl of disrupted) {
        const ident = fl.ident.toLowerCase();
        const parsed = await callOpenAI(
          MASTER_SYSTEM_PROMPT,
          `Headline: "Flight ${fl.ident} at ${hub.code} (${hub.region}) ${fl.cancelled ? 'Cancelled' : 'Delayed Over 3 Hours'} — Passenger Compensation & Refund Claim" | Suggested Category: AVIATION | Region: ${hub.region} | Language: ${hub.lang}`
        );

        if (!parsed || !parsed.seo_title) continue;
        parsed.slug = ident;
        parsed.master_incident_id = ident;
        parsed.niche = 'AVIATION';
        parsed.tier = 'TIER_1_STATUTORY';
        parsed.region = hub.region;
        parsed.lang_code = hub.lang_code;

        const html = buildSiloHtml(parsed, true);
        const outDir = path.join(process.cwd(), 'flight', ident);
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

        state.deployed[ident] = {
          ts: Date.now(),
          status: 'LIVE',
          v13: true,
          slug: ident,
          master_id: ident,
          english_title: parsed.english_title || `Flight ${ident.toUpperCase()} (${hub.region} Compensation)`,
          type: 'AVIATION',
          tier: 'TIER_1_STATUTORY',
          region: hub.region
        };
        newUrls.push(`${SITE_URL}/flight/${ident}/`);
        console.log(`Deployed v13 Flight [${hub.region}]: /flight/${ident}/`);
      }
    } catch (e) {
      console.error('Aviation poll error:', e.message);
    }
  }
}

async function processGlobalNews(state, newUrls) {
  const startIdx = (state.feed_cursor || 0) % OMNIBUS_FEEDS.length;
  state.feed_cursor = (startIdx + 30) % OMNIBUS_FEEDS.length;

  const activeFeeds = [];
  for (let i = 0; i < 30; i++) {
    activeFeeds.push(OMNIBUS_FEEDS[(startIdx + i) % OMNIBUS_FEEDS.length]);
  }

  const feedResults = await Promise.all(
    activeFeeds.map(async (feed) => {
      try {
        const res = await fetch(feed.url, { headers: BROWSER_HEADERS });
        if (!res.ok) return [];
        const xml = await res.text();
        const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 100);
        const freshItems = [];
        for (const m of matches) {
          const itemXml = m[1];
          const t = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/);
          if (!t) continue;
          const rawTitle = t[1].replace(/ - .*$/, '').trim();
          const hashId = crypto.createHash('sha256').update(rawTitle).digest('hex').slice(0, 16);
          if (!state.deployed[hashId]) {
            freshItems.push({ rawTitle, hashId, feed });
          }
          if (freshItems.length >= 8) break;
        }
        return freshItems;
      } catch (e) {
        return [];
      }
    })
  );

  const candidates = [];
  for (let i = 0; i < 8; i++) {
    for (const list of feedResults) {
      if (list[i]) candidates.push(list[i]);
    }
  }

  const uniqueQueue = [];
  const seenHashes = new Set();
  for (const item of candidates) {
    if (!seenHashes.has(item.hashId)) {
      seenHashes.add(item.hashId);
      uniqueQueue.push(item);
    }
    if (uniqueQueue.length >= 72) break;
  }

  console.log(`[Omnibus v13] Generating ${uniqueQueue.length} full-length advertorial dockets...`);

  const BATCH_SIZE = 12;
  for (let i = 0; i < uniqueQueue.length; i += BATCH_SIZE) {
    const chunk = uniqueQueue.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(async ({ rawTitle, hashId, feed }) => {
      const parsed = await callOpenAI(
        MASTER_SYSTEM_PROMPT,
        `Headline: "${rawTitle}" | Suggested Category: ${feed.niche} | Region: ${feed.region} | Language: ${feed.lang}`
      );

      if (!parsed || !parsed.slug) return;

      const cleanSlug = parsed.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
      const cleanMaster = (parsed.master_incident_id || cleanSlug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
      if (!cleanSlug) return;

      parsed.slug = cleanSlug;
      parsed.master_incident_id = cleanMaster;
      parsed.region = feed.region;
      parsed.lang_code = feed.lang_code;

      const html = buildSiloHtml(parsed, false);
      const outDir = path.join(process.cwd(), 'docket', cleanSlug);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

      state.deployed[hashId] = {
        ts: Date.now(),
        status: 'LIVE',
        v13: true,
        slug: cleanSlug,
        master_id: cleanMaster,
        english_title: parsed.english_title || cleanSlug.replace(/-/g, ' '),
        type: parsed.niche || feed.niche,
        tier: parsed.tier || 'TIER_3_POLL',
        region: feed.region
      };

      newUrls.push(`${SITE_URL}/docket/${cleanSlug}/`);
      console.log(`Deployed v13 [${parsed.tier}] (${feed.region} - ${parsed.niche}): /docket/${cleanSlug}/`);
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
