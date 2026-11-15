import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const FLIGHTAWARE_API_KEY = (process.env.FLIGHTAWARE_API_KEY || '').trim();
const WEBHOOK_URL = 'https://hook.us2.make.com/cyrvdqwkme5hjj26cjat8oz51jrk98jp';
const INDEXNOW_KEY = 'poindex2026key';
const CURRENT_SCHEMA_VERSION = 6;

if (!OPENAI_API_KEY) {
  console.error('CRITICAL ERROR: OPENAI_API_KEY secret is missing!');
  process.exit(1);
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*'
};

const PEAK_POOLS = {
  APAC_AU_WEST: ['YSSY', 'YMML', 'YBBN', 'NZAA', 'KLAX', 'CYVR', 'RJTT', 'RKSI'],
  EU_UK_ME: ['EGLL', 'EGKK', 'LFPG', 'EDDF', 'EHAM', 'LEMD', 'LIRF', 'EIDW', 'LTFM', 'LLBG', 'OERK', 'OEJN', 'LSZH', 'EDDM'],
  AMER_LATAM: ['CYYZ', 'CYUL', 'CYYC', 'CYVR', 'KJFK', 'KEWR', 'KATL', 'KORD', 'KDFW', 'KDEN', 'KLAX', 'KMIA', 'SBGR', 'MMMX']
};

const NEWS_FEEDS = [
  'https://news.google.com/rss/search?q=data+breach+settlement+OR+class+action+settlement+claim+OR+privacy+lawsuit+payout+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=product+recall+refund+OR+urgent+recall+lawsuit+OR+auto+recall+compensation+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=service+outage+refund+OR+network+down+credit+OR+internet+outage+compensation+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=bank+account+freeze+OR+fintech+funds+locked+OR+hidden+junk+fees+lawsuit+OR+overcharging+refund+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=Airbnb+refund+dispute+OR+VRBO+cancellation+OR+tenant+eviction+OR+rent+abatement+OR+landlord+lawsuit+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=utility+rate+hike+OR+power+outage+compensation+OR+water+advisory+claim+OR+billing+error+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=insurance+claim+denial+lawsuit+OR+healthcare+billing+dispute+OR+medical+data+breach+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=flight+cancelled+passengers+stranded+OR+airline+refund+fine+OR+baggage+fee+dispute+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=ticket+cancellation+refund+OR+concert+cancelled+refund+OR+subscription+cancellation+lawsuit+when:7d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=public+petition+boycott+OR+corporate+backlash+scandal+OR+consumer+boycott+when:3d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=city+council+controversy+OR+school+board+petition+OR+tax+hike+backlash+OR+zoning+protest+when:3d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=viral+controversy+outcry+OR+public+debate+backlash+OR+policy+feud+when:2d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=compensation+claim+OR+consumer+refund+OR+ombudsman+complaint+OR+outage+when:7d&hl=en-GB&gl=GB&ceid=GB:en',
  'https://news.google.com/rss/search?q=class+action+Canada+OR+outage+refund+Canada+OR+tenant+board+dispute+when:7d&hl=en-CA&gl=CA&ceid=CA:en',
  'https://news.google.com/rss/search?q=ACCC+refund+OR+compensation+claim+Australia+OR+outage+refund+when:7d&hl=en-AU&gl=AU&ceid=AU:en'
];

const STATE_PATH = 'terminal/silos.json';
fs.mkdirSync('terminal', { recursive: true });

let state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  deployed: {},
  active_silos: [],
  cursor: { APAC_AU_WEST: 0, EU_UK_ME: 0, AMER_LATAM: 0 },
  last_flight_poll_ts: 0
};

if (fs.existsSync(STATE_PATH)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    if (loaded.schema_version === CURRENT_SCHEMA_VERSION) {
      state = {
        ...state,
        ...loaded,
        cursor: { APAC_AU_WEST: 0, EU_UK_ME: 0, AMER_LATAM: 0, ...(loaded.cursor || {}) }
      };
    } else {
      console.log('Upgrading to Schema v6: hard-resetting state.deployed, flight/, and docket/...');
      fs.rmSync('flight', { recursive: true, force: true });
      fs.rmSync('docket', { recursive: true, force: true });
    }
  } catch {}
}

fs.mkdirSync('flight', { recursive: true });
fs.mkdirSync('docket', { recursive: true });
fs.writeFileSync('flight/.gitkeep', '');
fs.writeFileSync('docket/.gitkeep', '');

const escAttr = (str = '') =>
  String(str).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const TIER_TEMPLATES = {
  TIER_1_STATUTORY: {
    badgeText: 'Active Statutory Claim & Refund Window',
    statusBarLeft: 'STATUS: BATCH #1 CLAIMANT ESCROW OPEN (38 OF 50 SLOTS FILLED)',
    compareHeading: 'Compare Your 3 Recovery & Claim Options:',
    redTitle: 'Option 1: Standard Customer Support Queues (Free — High Rejection Rate)',
    redText: 'Filing a generic support ticket without citing specific consumer protection statutes almost always results in automated bots rejecting your claim or forcing expireable store vouchers on you.',
    amberTitle: 'Option 2: Wait for Class Action or Contingency Lawyers (35%–50% Fee Cut)',
    amberText: 'Joining a multi-year class action lawsuit means waiting 18 to 36 months while contingency attorneys take up to half of your settlement check before you see a dime.',
    greenTitle: 'Option 3: Done-For-You Statutory Demand Dispatch (\$29.00 Flat — Keep 100% of Your Money)',
    greenText: 'Skip the customer service runaround. Enter your details below and we automatically compile, cite the exact consumer protection statute, and electronically serve your formal demand directly to the corporate compliance desk on your behalf—with you CC’d for proof of service.',
    namePh: 'Your Full Legal Name',
    inputPh: 'Target Company Name + Your Account/Booking Ref & Dollar Loss Amount',
    emailPh: 'Your Email Address (for CC Proof of Service & Dossier Copy)',
    ctaText: 'AUTHORIZE & DISPATCH MY STATUTORY CLAIM — \$29.00',
    freeTitle: 'Not Ready for Instant Individual Dispatch? Join the Free 50-Claimant Batch Escrow',
    freeCta: 'Register your impact on the official public claimant ledger below for 100% free. Once this docket hits 50 verified claimants, we trigger a consolidated batch audit—plus we will immediately email you the 1-Page Statutory Evidence Checklist so you know exactly which records to save right now.',
    freePh: 'Target Company Name + Estimated Dollar Loss or Impact',
    coregText: 'Keep me updated with breaking settlement alerts, partner consumer rights briefs, and batch recovery notices.',
    freeBtn: 'Register Free on Batch Ledger & Send Evidence Checklist'
  },
  TIER_2_LEDGER: {
    badgeText: 'Official Public Petition & Accountability Docket',
    statusBarLeft: 'DOCKET STATUS: 1,412 VERIFIED PUBLIC SIGNATURES RECORDED (BATCH #1 DISPATCHES AT 1,500)',
    compareHeading: 'How to Put Your Stance on the Official Record:',
    redTitle: 'Option 1: Venting in Unverified Social Media Comment Sections',
    redText: 'Complaining in social media threads gets buried by algorithms within hours and is completely ignored by corporate boards, regulators, and compliance officers.',
    amberTitle: 'Option 2: Add Your Name to the Standard Group Petition Batch (100% Free — Below)',
    amberText: 'Scroll down to the free registry box below to add your name to the group petition batch, which dispatches as a consolidated manifest once the milestone counter hits 1,500 signatures.',
    greenTitle: 'Option 3: Priority Individual Notice Dispatched in Your Own Name (\$4.99 Instant Delivery)',
    greenText: 'Refuse to wait for the group batch? Enter your name and personal grievance statement below and we will immediately format, cite, and electronically dispatch an individually indexed Formal Accountability Notice directly to the executive board or decision-makers in your own name today.',
    namePh: 'Your Full Name (or Verified Citizen Signatory Name)',
    inputPh: 'Target Entity/Board Name + Your Personal Statement to Dispatch',
    emailPh: 'Your Email Address (for CC Dispatch Confirmation)',
    ctaText: 'DISPATCH PRIORITY INDIVIDUAL NOTICE IN MY NAME — \$4.99',
    freeTitle: 'Sign the Official Group Petition Ledger (100% Free) & Get the Unredacted Case Brief',
    freeCta: 'Add your signature to the free public accountability ledger below to help push Batch #1 over the 1,500-signature dispatch threshold, and receive the 1-page unredacted case brief directly in your inbox.',
    freePh: 'Your City/State + Brief Reason for Signing This Docket',
    coregText: 'Keep me updated with docket dispatch confirmations, partner advocacy briefs, and public accountability alerts.',
    freeBtn: 'Add Free Signature to Docket & Send Case Brief'
  },
  TIER_3_POLL: {
    badgeText: 'Live Public Referendum & Verified Sentiment Poll',
    statusBarLeft: 'LIVE SENTIMENT SPLIT: 4,890 VERIFIED VOTES CAST (54% SIDE A // 46% SIDE B)',
    compareHeading: 'How to Cast Your Vote & Pin Your Verified Statement:',
    redTitle: 'Option 1: Unverified Anonymous Comment Sections',
    redText: 'Standard comment sections are flooded with bots and brigading, making it impossible for real citizens to have their perspective seen at the top of the discussion.',
    amberTitle: 'Option 2: Cast a Standard Unpinned Poll Vote (100% Free — Below)',
    amberText: 'Use the free voter box at the bottom of this page to log a standard anonymous vote in the regional tally and receive the live demographic sentiment breakdown.',
    greenTitle: 'Option 3: Pin Your Verified Statement to the Top of This Live Poll + Weighted Vote (\$1.99)',
    greenText: 'Want your take seen first by every reader on this docket? Verify your humanity for \$1.99 to pin your custom public statement to the top of this referendum page and lock in a verified weighted vote.',
    namePh: 'Your Display Name or Initials (Shown on Pinned Comment)',
    inputPh: 'Your Vote (Support / Oppose) + Your Public Comment to Pin at Top of Page',
    emailPh: 'Your Email Address (for
