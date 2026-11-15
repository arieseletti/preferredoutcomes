import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const FLIGHTAWARE_API_KEY = (process.env.FLIGHTAWARE_API_KEY || '').trim();
const WEBHOOK_URL = `https://hook.us2.make.com/cyrvdqwkme5hjj26cjat8oz51jrk98jp`;
const INDEXNOW_KEY = `poindex2026key`;
const CURRENT_SCHEMA_VERSION = 6;

if (!OPENAI_API_KEY) {
  console.error(`CRITICAL ERROR: OPENAI_API_KEY secret is missing!`);
  process.exit(1);
}

const BROWSER_HEADERS = {
  'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0`,
  'Accept': `application/rss+xml, application/xml, text/xml, */*`
};

const PEAK_POOLS = {
  APAC_AU_WEST: ['YSSY', 'YMML', 'YBBN', 'NZAA', 'KLAX', 'CYVR', 'RJTT', 'RKSI'],
  EU_UK_ME: [
    'EGLL', 'EGKK', 'LFPG', 'EDDF', 'EHAM', 'LEMD',
    'LIRF', 'EIDW', 'LTFM', 'LLBG', 'OERK', 'OEJN', 'LSZH', 'EDDM'
  ],
  AMER_LATAM: [
    'CYYZ', 'CYUL', 'CYYC', 'CYVR', 'KJFK', 'KEWR',
    'KATL', 'KORD', 'KDFW', 'KDEN', 'KLAX', 'KMIA', 'SBGR', 'MMMX'
  ]
};

const NEWS_FEEDS = [
  `https://news.google.com/rss/search?q=data+breach+settlement+OR+class+action+settlement+claim+OR+privacy+lawsuit+payout+when:7d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=product+recall+refund+OR+urgent+recall+lawsuit+OR+auto+recall+compensation+when:7d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=service+outage+refund+OR+network+down+credit+OR+internet+outage+compensation+when:7d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=bank+account+freeze+OR+fintech+funds+locked+OR+hidden+junk+fees+lawsuit+OR+overcharging+refund+when:7d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=Airbnb+refund+dispute+OR+VRBO+cancellation+OR+tenant+eviction+OR+rent+abatement+OR+landlord+lawsuit+when:7d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=utility+rate+hike+OR+power+outage+compensation+OR+water+advisory+claim+OR+billing+error+when:7d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=insurance+claim+denial+lawsuit+OR+healthcare+billing+dispute+OR+medical+data+breach+when:7d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=flight+cancelled+passengers+stranded+OR+airline+refund+fine+OR+baggage+fee+dispute+when:7d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=ticket+cancellation+refund+OR+concert+cancelled+refund+OR+subscription+cancellation+lawsuit+when:7d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=public+petition+boycott+OR+corporate+backlash+scandal+OR+consumer+boycott+when:3d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=city+council+controversy+OR+school+board+petition+OR+tax+hike+backlash+OR+zoning+protest+when:3d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=viral+controversy+outcry+OR+public+debate+backlash+OR+policy+feud+when:2d&hl=en-US&gl=US&ceid=US:en`,
  `https://news.google.com/rss/search?q=compensation+claim+OR+consumer+refund+OR+ombudsman+complaint+OR+outage+when:7d&hl=en-GB&gl=GB&ceid=GB:en`,
  `https://news.google.com/rss/search?q=class+action+Canada+OR+outage+refund+Canada+OR+tenant+board+dispute+when:7d&hl=en-CA&gl=CA&ceid=CA:en`,
  `
