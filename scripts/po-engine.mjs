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
  { code: 'CYVR', region: 'APPR', lang_code: 'en', lang: 'English' },
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

// 100% NATIVE-LANGUAGE HARDCODED CONVERSION PACKS ACROSS ALL 6 LANGUAGES (NO "FLAT" WORDING ANYWHERE)
const TIER_CONVERSION_PACKS = {
  en: {
    stancePrompt: 'Select Your Official Referendum Stance (Any Side Eligible)...',
    stanceA: 'Position A: Strongly Support / Demand Full Accountability & Investigation',
    stanceB: 'Position B: Strongly Oppose / Reject Allegations or Policy Change',
    stanceC: 'Position C: Demand Independent Third-Party Audit & Full Transparency',
    amzDefaultHeader: 'Recommended Resources, Guides & Essential Gear',
    amzSubPrefix: 'View Top-Rated Books, Tools & Related Essentials:',
    amzBtnText: 'Browse on Amazon',
    TIER_1_STATUTORY: {
      heading: 'Compare Your 3 Claim & Compensation Recovery Options:',
      redTitle: 'OPTION 1: FILE SOLO VIA STANDARD COMPANY WEB FORM (72% REJECTION RISK)',
      redText: 'Corporations, airlines, and property platforms routinely reject unrepresented consumer claims using boilerplate excuses or push restrictive vouchers that waive your right to cash.',
      amberTitle: 'OPTION 2: THIRD-PARTY CLAIM AGENCIES (LOSES 35% TO 50% OF YOUR PAYOUT)',
      amberText: 'Middleman claim sharks take 3 to 6 months to process routine demands and pocket up to half of your statutory refund or settlement check just for submitting a template letter.',
      greenTitle: 'OPTION 3: DONE-FOR-YOU PRE-CITED STATUTORY DEMAND DISPATCH ($29.00 — YOU KEEP 100%)',
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
      greenTitle: 'OPTION 3: PRIORITY INDIVIDUAL EXECUTIVE NOTICE DISPATCHED IN YOUR NAME ($4.99)',
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
      greenTitle: 'OPTION 3: VERIFIED PRIORITY STATEMENT + 10X WEIGHTED REFERENDUM BALLOT ($1.99)',
      greenText: 'What you get for $1.99: Whether you strongly agree, strongly disagree, or demand an independent investigation, your verified ballot counts with 10x referendum weight AND your personal statement is permanently recorded on the Official Public Sentiment Dossier transmitted to media desks, analysts, and stakeholders.',
      namePlaceholder: 'Your Name or Verified Display Handle',
      inputPlaceholder: 'Write Your Public Statement to Record on the Official Referendum Dossier',
      emailPlaceholder: 'Your Email Address (For Your Verified Referendum Receipt & Dossier Copy)',
      ctaBtn: 'Record My Verified Statement & 10x Weighted Vote — $1.99',
      freeTitle: 'Cast a Free Unweighted Vote & Get Live Docket / Release Alerts',
      freeCta: 'Log a free 1x vote on the public tally bar and receive instant alerts when new developments or stock drops occur.',
      freeInputPlaceholder: 'Your City & Your 1-Sentence Take (Agree / Disagree)',
      freeBtn: 'Cast Free 1x Vote & Subscribe to Alerts ($0.00)'
    }
  },
  pt: {
    stancePrompt: 'Selecione Sua Posição Oficial no Referendo (Qualquer Lado Elegível)...',
    stanceA: 'Posição A: Apoio Totalmente / Exijo Investigação e Responsabilização',
    stanceB: 'Posição B: Discordo Totalmente / Rejeito as Acusações ou Mudança',
    stanceC: 'Posição C: Exijo Auditoria Independente e Transparência Total',
    amzDefaultHeader: 'Recursos Recomendados, Guias e Itens Essenciais',
    amzSubPrefix: 'Veja Livros, Guias e Produtos Bem Avaliados sobre o Tema:',
    amzBtnText: 'Ver na Amazon',
    TIER_1_STATUTORY: {
      heading: 'Compare Suas 3 Opções para Exigir Reembolso e Indenização:',
      redTitle: 'OPÇÃO 1: FORMULÁRIO PADRÃO DA EMPRESA (72% DE RISCO DE RECUSA)',
      redText: 'Empresas e companhias aéreas frequentemente negam pedidos individuais sem fundamentação legal ou oferecem vouchers restritivos para evitar o pagamento em dinheiro.',
      amberTitle: 'OPÇÃO 2: AGÊNCIAS INTERMEDIÁRIAS (COBRAM DE 35% A 50% DO SEU VALOR)',
      amberText: 'Empresas intermediárias levam meses e ficam com até metade da sua indenização apenas para enviar uma notificação padrão.',
      greenTitle: 'OPÇÃO 3: DESPACHO DE NOTIFICAÇÃO FORMAL PRÉ-FUNDAMENTADA ($29.00 — FIQUE COM 100%)',
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
      greenTitle: 'OPÇÃO 3: NOTIFICAÇÃO EXECUTIVA INDIVIDUAL ENVIADA EM SEU NOME HOJE ($4.99)',
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
      greenTitle: 'OPÇÃO 3: DECLARAÇÃO VERIFICADA + VOTO COM PESO 10X NO DOSSIÊ PÚBLICO ($1.99)',
      greenText: 'O que você recebe por $1.99: Independentemente de você concordar, discordar ou exigir investigação, seu voto verificado tem peso 10x no painel oficial e sua declaração pessoal é gravada no Dossiê de Opinião Pública enviado à imprensa e partes envolvidas.',
      namePlaceholder: 'Seu Nome ou Identificação',
      inputPlaceholder: 'Escreva Sua Declaração Pública para Gravar no Dossiê Oficial',
      emailPlaceholder: 'Seu E-mail (Para Receber o Recibo Oficial do Dossiê)',
      ctaBtn: 'Registrar Declaração Verificada e Voto 10x — $1.99',
      freeTitle: 'Registre um Voto Gratuito (Peso 1x) e Receba Alertas Desta Pauta',
      freeCta: 'Some seu voto gratuito ao placar geral e receba alertas sobre novos desdobramentos.',
      freeInputPlaceholder: 'Sua Cidade e Sua Opinião Resumida',
      freeBtn: 'Registrar Voto Gratuito ($0.00)'
    }
  },
  es: {
    stancePrompt: 'Seleccione Su Postura Oficial en el Referéndum (Cualquier Lado Elegible)...',
    stanceA: 'Postura A: Apoyo Totalmente / Exijo Investigación y Responsabilidad',
    stanceB: 'Postura B: En Total Desacuerdo / Rechazo las Acusaciones o Medida',
    stanceC: 'Postura C: Exijo Auditoría Independiente y Transparencia Total',
    amzDefaultHeader: 'Recursos Recomendados, Guías y Artículos Esenciales',
    amzSubPrefix: 'Ver Libros, Guías y Opciones Mejor Valoradas:',
    amzBtnText: 'Ver en Amazon',
    TIER_1_STATUTORY: {
      heading: 'Compare Sus 3 Opciones de Reembolso e Indemnización:',
      redTitle: 'OPCIÓN 1: FORMULARIO WEB ESTÁNDAR DE LA EMPRESA (72% DE RIESGO DE RECHAZO)',
      redText: 'Las aerolíneas, bancos y plataformas suelen rechazar reclamaciones individuales sin respaldo normativo u ofrecen bonos restrictivos que anulan su derecho a efectivo.',
      amberTitle: 'OPCIÓN 2: AGENCIAS INTERMEDIARIAS (PIERDE DEL 35% AL 50% EN COMISIONES)',
      amberText: 'Los intermediarios tardan de 3 a 6 meses y se quedan con hasta la mitad de su indemnización solo por enviar una carta estándar.',
      greenTitle: 'OPCIÓN 3: DESPACHO DE RECLAMACIÓN FORMAL PRE-CITADA ($29.00 — CONSERVE EL 100%)',
      greenText: 'Lo que recibe por $29.00: Preparamos su reclamación formal citando la normativa aplicable y la enviamos electrónicamente al departamento de cumplimiento de la empresa en su nombre (con copia oficial de acuse en su correo) para que usted conserve el 100% de su dinero.',
      namePlaceholder: 'Su Nombre Completo',
      inputPlaceholder: 'Código de Reserva / Cuenta e Importe Estimado del Perjuicio',
      emailPlaceholder: 'Su Correo Electrónico (Para Recibir Su Copia Oficial en CC)',
      ctaBtn: 'Enviar Mi Reclamación Formal Ahora — $29.00',
      freeTitle: '¿Prefiere Esperar? Únase al Lote Colectivo Gratuito de 50 Afectados',
      freeCta: 'Ingrese sus datos abajo para recibir gratis la Guía de Conservación de Pruebas y asegurar su lugar en el lote colectivo de 50 reclamantes.',
      freeInputPlaceholder: 'Su Ciudad y Resumen del Problema o Pérdida',
      freeBtn: 'Recibir Guía Gratuita y Registrar Mi Caso ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Compare Sus 3 Opciones de Acción y Escalada Institucional:',
      redTitle: 'OPCIÓN 1: QUEJARSE EN REDES SOCIALES (IMPACTO INSTITUCIONAL CERO)',
      redText: 'Los comentarios en redes sociales carecen de validez administrativa y son ignorados por juntas directivas, ministerios y organismos reguladores.',
      amberTitle: 'OPCIÓN 2: COLA DE PETICIÓN COLECTIVA GRATUITA (ESPERA AL LOTE DE 50 FIRMAS)',
      amberText: 'Sumar su nombre a la lista gratuita registra su apoyo, pero permanece en espera hasta completar el lote de 50 firmantes.',
      greenTitle: 'OPCIÓN 3: NOTIFICACIÓN EJECUTIVA INDIVIDUAL ENVIADA EN SU NOMBRE HOY ($4.99)',
      greenText: 'Lo que recibe por $4.99: Formateamos y transmitimos hoy mismo una Notificación Formal Individual con sello de tiempo en su nombre directamente a la junta directiva, ministerio u organismo competente, con copia oficial enviada a su correo.',
      namePlaceholder: 'Su Nombre Completo',
      inputPlaceholder: 'Su Postura (A Favor / En Contra / Exigir Auditoría) y Su Declaración Formal',
      emailPlaceholder: 'Su Correo Electrónico (Para Recibir Copia de la Notificación)',
      ctaBtn: 'Enviar Mi Notificación Formal Individual — $4.99',
      freeTitle: 'Sume Su Firma al Registro Colectivo Gratuito de Este Expediente',
      freeCta: 'Registre su firma gratuita en el expediente público y reciba actualizaciones oficiales.',
      freeInputPlaceholder: 'Su Ciudad y Por Qué Este Tema le Afecta',
      freeBtn: 'Registrar Mi Firma Gratuita ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'Cómo Participar en el Referéndum Público Oficial:',
      redTitle: 'OPCIÓN 1: COMENTARIOS EN REDES SOCIALES (ENTERRADOS POR EL ALGORITMO)',
      redText: 'Las secciones de comentarios estándar están saturadas de bots y filtros algorítmicos que ocultan su opinión en minutos.',
      amberTitle: 'OPCIÓN 2: VOTO BÁSICO NO PONDERADO (SIN DECLARACIÓN DESTACADA)',
      amberText: 'Emitir un voto gratuito al final de la página suma 1 punto básico sin publicar ni certificar su argumento personal.',
      greenTitle: 'OPCIÓN 3: DECLARACIÓN VERIFICADA + VOTO PONDERADO 10X EN EL EXPEDIENTE ($1.99)',
      greenText: 'Lo que recibe por $1.99: Ya sea que esté a favor, en contra o exija una investigación, su voto verificado cuenta con peso 10x y su declaración personal queda registrada permanentemente en el Dossier Oficial de Opinión Pública enviado a medios y partes interesadas.',
      namePlaceholder: 'Su Nombre o Alias Verificado',
      inputPlaceholder: 'Escriba Su Declaración Pública para Registrar en el Dossier Oficial',
      emailPlaceholder: 'Su Correo Electrónico (Para Recibir Su Recibo Oficial)',
      ctaBtn: 'Registrar Declaración Verificada y Voto 10x — $1.99',
      freeTitle: 'Emita un Voto Gratuito (Peso 1x) y Reciba Alertas del Caso',
      freeCta: 'Sume su voto gratuito al marcador general y reciba alertas de nuevas actualizaciones.',
      freeInputPlaceholder: 'Su Ciudad y Su Opinión en 1 Frase',
      freeBtn: 'Emitir Voto Gratuito ($0.00)'
    }
  },
  de: {
    stancePrompt: 'Wählen Sie Ihre Offizielle Position im Referendum (Jede Seite Wählbar)...',
    stanceA: 'Position A: Volle Zustimmung / Forderung nach Aufklärung & Konsequenzen',
    stanceB: 'Position B: Strikte Ablehnung / Gegen die Vorwürfe oder Maßnahme',
    stanceC: 'Position C: Forderung nach Unabhängiger Prüfung & Transparenz',
    amzDefaultHeader: 'Empfohlene Ressourcen, Ratgeber & Wichtige Ausrüstung',
    amzSubPrefix: 'Top-Bewertete Bücher, Ratgeber & Passende Artikel:',
    amzBtnText: 'Bei Amazon Ansehen',
    TIER_1_STATUTORY: {
      heading: 'Vergleichen Sie Ihre 3 Optionen zur Rückerstattung & Entschädigung:',
      redTitle: 'OPTION 1: STANDARD-WEBFORMULAR DES UNTERNEHMENS (72% ABLEHNUNGSRISIKO)',
      redText: 'Konzerne und Fluggesellschaften lehnen unvertretene Kundenanträge häufig mit Standardtextbausteinen ab oder drängen auf restriktive Gutscheine statt Barauszahlung.',
      amberTitle: 'OPTION 2: INKASSO- & ANSPRUCHSPORTALE (35% BIS 50% GEBÜHRENABZUG)',
      amberText: 'Drittanbieter benötigen oft Monate und behalten bis zur Hälfte Ihrer gesetzlichen Entschädigung als Provision ein.',
      greenTitle: 'OPTION 3: DIREKTER VERSAND IHRER RECHTLICH FUNDIERTEN FORDERUNG ($29.00 — 100% BEHALTEN)',
      greenText: 'Was Sie für $29.00 erhalten: Wir erstellen Ihre formelle Zahlungsaufforderung unter Nennung der einschlägigen Verbrauchernormen und übermitteln diese elektronisch in Ihrem Namen direkt an die Rechts- und Compliance-Abteilung (mit offizieller Kopie im CC an Sie), sodass Sie 100% Ihrer Auszahlung behalten.',
      namePlaceholder: 'Ihr Vollständiger Name',
      inputPlaceholder: 'Buchungs- / Kontonummer & Geschätzter Schadensbetrag',
      emailPlaceholder: 'Ihre E-Mail-Adresse (Für Ihre Offizielle Zustellkopie)',
      ctaBtn: 'Formelle Forderung Jetzt Versenden — $29.00',
      freeTitle: 'Noch Nicht Versenden? Kostenlos in die 50-Personen-Sammelakte Eintragen',
      freeCta: 'Tragen Sie sich unten ein, um die kostenlose Beweis-Checkliste zu erhalten und Ihren Platz in der 50-Personen-Sammelakte zu sichern.',
      freeInputPlaceholder: 'Ihre Stadt & Kurze Beschreibung des Vorfalls oder Schadens',
      freeBtn: 'Kostenlose Checkliste Anfordern & Fall Registrieren ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Vergleichen Sie Ihre 3 Optionen zur Offiziellen Eskalation:',
      redTitle: 'OPTION 1: KOMMENTARE IN SOZIALEN NETZWERKEN (KEINE OFFIZIELLE WIRKUNG)',
      redText: 'Unverifizierte Beiträge in sozialen Medien haben keinerlei verwaltungsrechtliches Gewicht und werden von Vorständen und Behörden ignoriert.',
      amberTitle: 'OPTION 2: KOSTENLOSE SAMMELLISTE (WARTET AUF 50 UNTERZEICHNER)',
      amberText: 'Ihr Eintrag in die kostenlose Liste unten wird gespeichert, jedoch erst nach Erreichen von 50 Unterschriften gebündelt übermittelt.',
      greenTitle: 'OPTION 3: PRIORISIERTE INDIVIDUELLE MITTEILUNG IN IHREM NAMEN HEUTE ($4.99)',
      greenText: 'Was Sie für $4.99 erhalten: Wir formatieren und übermitteln noch heute eine individuelle, zeitgestempelte formelle Stellungnahme in Ihrem Namen direkt an den Vorstand, das Ministerium oder die Aufsichtsstelle—inklusive Kopie an Ihr E-Mail-Postfach.',
      namePlaceholder: 'Ihr Vollständiger Name',
      inputPlaceholder: 'Ihre Position (Dafür / Dagegen / Prüfung Fordern) & Ihre Stellungnahme',
      emailPlaceholder: 'Ihre E-Mail-Adresse (Für Ihre Versandbestätigung)',
      ctaBtn: 'Individuelle Offizielle Mitteilung Senden — $4.99',
      freeTitle: 'Tragen Sie Ihren Namen Kostenlos in das Öffentliche Register Ein',
      freeCta: 'Registrieren Sie Ihre kostenlose Unterschrift im Sammelregister und erhalten Sie Updates.',
      freeInputPlaceholder: 'Ihre Stadt & Warum Dieses Thema Wichtig Ist',
      freeBtn: 'Kostenlose Unterschrift Registrieren ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'So Nehmen Sie am Offiziellen Öffentlichen Meinungsregister Teil:',
      redTitle: 'OPTION 1: UNVERIFIZIERTE KOMMENTARSPALTEN (GEHEN IM ALGORITHMUS UNTER)',
      redText: 'Standard-Kommentarspalten werden von Bots geflutet und durch Algorithmen gefiltert, sodass Ihre Meinung nach wenigen Minuten verschwindet.',
      amberTitle: 'OPTION 2: EINFACHE STIMME OHNE GEWICHTUNG (OHNE STELLUNGNAHME)',
      amberText: 'Eine kostenlose Stimme unten zählt als einfacher Punkt im Balken, ohne Ihre persönliche Begründung im Dossier zu veröffentlichen.',
      greenTitle: 'OPTION 3: VERIFIZIERTE STELLUNGNAHME + 10-FACH GEWICHTETE STIMME ($1.99)',
      greenText: 'Was Sie für $1.99 erhalten: Egal ob Sie zustimmen, widersprechen oder eine Untersuchung fordern—Ihre verifizierte Stimme zählt mit 10-facher Gewichtung und Ihre persönliche Stellungnahme wird dauerhaft im offiziellen Meinungsdossier für Medien und Entscheidungsträger protokolliert.',
      namePlaceholder: 'Ihr Name oder Verifiziertes Profil',
      inputPlaceholder: 'Ihre Öffentliche Stellungnahme für das Offizielle Meinungsdossier',
      emailPlaceholder: 'Ihre E-Mail-Adresse (Für Ihren Offiziellen Beleg)',
      ctaBtn: 'Verifizierte Stellungnahme & 10x Stimme Absenden — $1.99',
      freeTitle: 'Kostenlose 1x Stimme Abgeben & Dossier-Updates Erhalten',
      freeCta: 'Geben Sie eine kostenlose Stimme ab und erhalten Sie Benachrichtigungen bei neuen Entwicklungen.',
      freeInputPlaceholder: 'Ihre Stadt & Ihre Kurze Meinung',
      freeBtn: 'Kostenlose Stimme Abgeben ($0.00)'
    }
  },
  fr: {
    stancePrompt: 'Sélectionnez Votre Position Officielle au Référendum (Tout Camp Éligible)...',
    stanceA: 'Position A : Soutien Total / Demande d’Enquête et de Responsabilité',
    stanceB: 'Position B : Opposition Ferme / Rejet des Allégations ou de la Mesure',
    stanceC: 'Position C : Demande d’Audit Indépendant et de Transparence Totale',
    amzDefaultHeader: 'Ressources Recommandées, Guides et Équipements Essentiels',
    amzSubPrefix: 'Voir les Livres, Guides et Articles les Mieux Notés :',
    amzBtnText: 'Voir sur Amazon',
    TIER_1_STATUTORY: {
      heading: 'Comparez Vos 3 Options de Remboursement et d’Indemnisation :',
      redTitle: 'OPTION 1 : FORMULAIRE CLIENT STANDARD (72 % DE RISQUE DE REJET)',
      redText: 'Les compagnies aériennes, banques et plateformes rejettent fréquemment les réclamations individuelles non citées ou imposent des avoirs restrictifs au lieu d’un remboursement en espèces.',
      amberTitle: 'OPTION 2 : AGENCES INTERMÉDIAIRES (PRÉLÈVENT 35 % À 50 % DE COMMISSION)',
      amberText: 'Les intermédiaires prennent de 3 à 6 mois et retiennent jusqu’à la moitié de votre indemnisation légale pour envoyer un simple courrier type.',
      greenTitle: 'OPTION 3 : ENVOI DIRECT DE VOTRE MISE EN DEMEURE PRÉ-CITÉE ($29.00 — GARDEZ 100 %)',
      greenText: 'Ce que vous obtenez pour $29.00 : Nous préparons votre demande formelle citant les textes réglementaires exacts et la transmettons électroniquement au service conformité en votre nom (avec copie officielle en CC sur votre e-mail) afin que vous conserviez 100 % de votre remboursement.',
      namePlaceholder: 'Votre Nom Complet',
      inputPlaceholder: 'Référence de Réservation / Compte et Montant Estimé du Préjudice',
      emailPlaceholder: 'Votre Adresse E-mail (Pour Recevoir Votre Copie Officielle en CC)',
      ctaBtn: 'Envoyer Ma Demande Officielle Maintenant — $29.00',
      freeTitle: 'Pas Prêt Aujourd’hui ? Rejoignez Gratuitement le Lot Collectif de 50 Réclamants',
      freeCta: 'Inscrivez vos coordonnées ci-dessous pour recevoir gratuitement la Checklist des Preuves et réserver votre place dans le lot collectif de 50 dossiers.',
      freeInputPlaceholder: 'Votre Ville et Résumé de la Perturbation ou Perte',
      freeBtn: 'Recevoir la Checklist Gratuite et Enregistrer Mon Cas ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Comparez Vos 3 Options d’Action et de Notification Officielle :',
      redTitle: 'OPTION 1 : RÉSEAUX SOCIAUX (AUCUN IMPACT INSTITUTIONNEL)',
      redText: 'Les publications sur les réseaux sociaux n’ont aucune valeur administrative et sont ignorées par les conseils d’administration, ministères et régulateurs.',
      amberTitle: 'OPTION 2 : PÉTITION COLLECTIVE GRATUITE (ATTEND LE QUOTA DE 50 SIGNATURES)',
      amberText: 'Ajouter votre nom à la liste gratuite ci-dessous enregistre votre soutien, mais attend que le lot de 50 signataires soit complet avant transmission.',
      greenTitle: 'OPTION 3 : NOTIFICATION OFFICIELLE INDIVIDUELLE ENVOYÉE EN VOTRE NOM ($4.99)',
      greenText: 'Ce que vous obtenez pour $4.99 : Nous formatons et transmettons dès aujourd’hui une Notification Officielle Individuelle horodatée en votre nom directement à la direction, au ministère ou à l’autorité compétente—avec copie officielle envoyée sur votre boîte mail.',
      namePlaceholder: 'Votre Nom Complet',
      inputPlaceholder: 'Votre Position (Pour / Contre / Audit) et Votre Déclaration Officielle',
      emailPlaceholder: 'Votre Adresse E-mail (Pour Recevoir Votre Copie de Notification)',
      ctaBtn: 'Envoyer Ma Notification Individuelle — $4.99',
      freeTitle: 'Ajoutez Gratuitement Votre Nom au Registre Collectif de Ce Dossier',
      freeCta: 'Enregistrez votre signature gratuite sur le dossier public et recevez les mises à jour officielles.',
      freeInputPlaceholder: 'Votre Ville et Pourquoi Ce Sujet Vous Concerne',
      freeBtn: 'Enregistrer Ma Signature Gratuite ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'Comment Participer au Référendum Public Officiel :',
      redTitle: 'OPTION 1 : COMMENTAIRES NON VÉRIFIÉS (NOYÉS PAR LES ALGORITHMES)',
      redText: 'Les sections de commentaires classiques sont saturées de robots et filtrées par les algorithmes, faisant disparaître votre avis en quelques minutes.',
      amberTitle: 'OPTION 2 : VOTE SIMPLE NON PONDÉRÉ (SANS DÉCLARATION ÉPINGLÉE)',
      amberText: 'Un vote gratuit en bas de page ajoute 1 point simple à la barre globale sans publier ni certifier votre déclaration personnelle.',
      greenTitle: 'OPTION 3 : DÉCLARATION VÉRIFIÉE + VOTE PONDÉRÉ 10X AU DOSSIER OFFICIEL ($1.99)',
      greenText: 'Ce que vous obtenez pour $1.99 : Que vous soyez d’accord, opposé ou que vous exigiez une enquête, votre vote vérifié compte avec un poids 10x et votre déclaration personnelle est inscrite de façon permanente au Dossier Officiel d’Opinion Publique transmis aux médias et décideurs.',
      namePlaceholder: 'Votre Nom ou Pseudonyme Vérifié',
      inputPlaceholder: 'Rédigez Votre Déclaration Publique à Inscrire au Dossier Officiel',
      emailPlaceholder: 'Votre Adresse E-mail (Pour Recevoir Votre Reçu Officiel)',
      ctaBtn: 'Publier Ma Déclaration Vérifiée & Vote 10x — $1.99',
      freeTitle: 'Exprimez un Vote Gratuit (Poids 1x) et Recevez les Alertes du Dossier',
      freeCta: 'Ajoutez votre vote gratuit au compteur général et recevez les alertes sur ce sujet.',
      freeInputPlaceholder: 'Votre Ville et Votre Avis en 1 Phrase',
      freeBtn: 'Valider Mon Vote Gratuit ($0.00)'
    }
  },
  it: {
    stancePrompt: 'Seleziona la Tua Posizione Ufficiale nel Referendum (Ogni Posizione Ammessa)...',
    stanceA: 'Posizione A: Pieno Supporto / Richiesta di Indagine e Responsabilità',
    stanceB: 'Posizione B: Ferma Opposizione / Rifiuto delle Accuse o della Misura',
    stanceC: 'Posizione C: Richiesta di Audit Indipendente e Piena Trasparenza',
    amzDefaultHeader: 'Risorse Consigliate, Guide e Articoli Essenziali',
    amzSubPrefix: 'Scopri Libri, Guide e Prodotti Più Recensiti:',
    amzBtnText: 'Vedi su Amazon',
    TIER_1_STATUTORY: {
      heading: 'Confronta le Tue 3 Opzioni di Rimborso e Risarcimento:',
      redTitle: 'OPZIONE 1: MODULO DI RECLAMO STANDARD (72% DI RISCHIO DI RIFIUTO)',
      redText: 'Le aziende, compagnie di trasporto e piattaforme respingono spesso i reclami individuali non citati o offrono voucher restrittivi al posto del rimborso in denaro.',
      amberTitle: 'OPZIONE 2: AGENZIE INTERMEDIARIE (TRATTENGONO DAL 35% AL 50% DI COMMISSIONE)',
      amberText: 'Gli intermediari impiegano mesi e trattengono fino alla metà del tuo risarcimento legale solo per inviare una lettera precompilata.',
      greenTitle: 'OPZIONE 3: INVIO DIRETTO DELLA DIFFIDA FORMALE PRE-CITATA ($29.00 — TIENI IL 100%)',
      greenText: 'Cosa ottieni per $29.00: Prepariamo la tua richiesta formale citando le normative vigenti a tutela del consumatore e la trasmettiamo elettronicamente a tuo nome direttamente all’ufficio conformità dell’azienda (con copia ufficiale in CC sulla tua email), così trattieni il 100% del rimborso.',
      namePlaceholder: 'Il Tuo Nome e Cognome Completo',
      inputPlaceholder: 'Codice Prenotazione / Biglietto / Conto e Importo Stimato del Danno',
      emailPlaceholder: 'Il Tuo Indirizzo Email (Per Ricevere la Copia Ufficiale in CC)',
      ctaBtn: 'Invia Ora la Mia Richiesta Formale di Rimborso — $29.00',
      freeTitle: 'Preferisci Aspettare? Unisciti Gratuitamente al Lotto Collettivo di 50 Ricorrenti',
      freeCta: 'Inserisci i tuoi dati qui sotto per ricevere gratis la Checklist di Conservazione delle Prove e bloccare il tuo posto nel lotto collettivo da 50 pratiche.',
      freeInputPlaceholder: 'La Tua Città e Breve Riepilogo del Disservizio o Perdita',
      freeBtn: 'Ricevi Checklist Gratuita e Registra il Mio Caso ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Confronta le Tue 3 Opzioni di Azione e Notifica Istituzionale:',
      redTitle: 'OPZIONE 1: SFOGARSI SUI SOCIAL MEDIA (IMPATTO ISTITUZIONALE ZERO)',
      redText: 'I commenti non verificati sui social media non hanno alcun valore amministrativo e vengono ignorati da consigli di amministrazione, ministeri ed enti regolatori.',
      amberTitle: 'OPZIONE 2: CODA PETIZIONE COLLETTIVA GRATUITA (ATTENDE IL LOTTO DI 50 FIRME)',
      amberText: 'Aggiungere il tuo nome alla lista gratuita qui sotto registra la tua adesione, ma resta in attesa finché non viene raggiunto il blocco di 50 firmatari.',
      greenTitle: 'OPZIONE 3: NOTIFICA ESECUTIVA INDIVIDUALE INVIATA A TUO NOME OGGI ($4.99)',
      greenText: 'Cosa ottieni per $4.99: Formattiamo e trasmettiamo oggi stesso una Notifica Formale Individuale con marca temporale a tuo nome direttamente alla direzione, al ministero o all’organo di vigilanza—con copia ufficiale inviata alla tua casella email.',
      namePlaceholder: 'Il Tuo Nome e Cognome',
      inputPlaceholder: 'La Tua Posizione (Favorevole / Contrario / Richiesta Audit) e il Tuo Messaggio Formale',
      emailPlaceholder: 'Il Tuo Indirizzo Email (Per Ricevere la Copia della Notifica)',
      ctaBtn: 'Invia la Mia Notifica Formale Individuale — $4.99',
      freeTitle: 'Aggiungi Gratuitamente il Tuo Nome al Registro Collettivo di Questo Fascicolo',
      freeCta: 'Registra la tua firma gratuita nel fascicolo pubblico e ricevi aggiornamenti ufficiali.',
      freeInputPlaceholder: 'La Tua Città e Perché Questo Tema Ti Riguarda',
      freeBtn: 'Registra la Mia Firma Gratuita ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'Come Partecipare al Referendum Pubblico Ufficiale:',
      redTitle: 'OPZIONE 1: COMMENTI SOCIAL NON VERIFICATI (NASCOSTI DAGLI ALGORITMI)',
      redText: 'Le normali sezioni commenti sono invase dai bot e penalizzate dagli algoritmi, facendo sparire la tua opinione in pochi minuti.',
      amberTitle: 'OPZIONE 2: VOTO BASE NON PONDERATO (SENZA DICHIARAZIONE IN EVIDENZA)',
      amberText: 'Un voto gratuito a fondo pagina aggiunge solo 1 punto base alla barra generale senza certificare né pubblicare la tua dichiarazione.',
      greenTitle: 'OPZIONE 3: DICHIARAZIONE VERIFICATA + VOTO PONDERATO 10X NEL DOSSIER ($1.99)',
      greenText: 'Cosa ottieni per $1.99: Che tu sia favorevole, contrario o chieda un’indagine, il tuo voto verificato vale con peso 10x e la tua dichiarazione personale viene registrata permanentemente nel Dossier Ufficiale dell’Opinione Pubblica inviato a media e decisori.',
      namePlaceholder: 'Il Tuo Nome o Identificativo Verificato',
      inputPlaceholder: 'Scrivi la Tua Dichiarazione Pubblica da Registrare nel Dossier Ufficiale',
      emailPlaceholder: 'Il Tuo Indirizzo Email (Per Ricevere la Ricevuta Ufficiale)',
      ctaBtn: 'Invia Dichiarazione Verificata e Voto 10x — $1.99',
      freeTitle: 'Esprimi un Voto Gratuito (Peso 1x) e Ricevi Aggiornamenti sul Dossier',
      freeCta: 'Aggiungi il tuo voto gratuito al conteggio generale e ricevi avvisi sui nuovi sviluppi.',
      freeInputPlaceholder: 'La Tua Città e la Tua Opinione in 1 Frase',
      freeBtn: 'Registra Voto Gratuito ($0.00)'
    }
  }
};

function loadState() {
  let state = {
    schema_version: 14,
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

  return state;
}

// Automatically cleans any existing live pages in /docket/ and /flight/ so "FLAT" and "Collector Availability" are replaced immediately without losing your page count
function patchExistingHtmlFiles() {
  const dirs = [path.join(process.cwd(), 'docket'), path.join(process.cwd(), 'flight')];
  for (const rootDir of dirs) {
    if (!fs.existsSync(rootDir)) continue;
    for (const sub of fs.readdirSync(rootDir)) {
      const file = path.join(rootDir, sub, 'index.html');
      if (!fs.existsSync(file)) continue;
      let html = fs.readFileSync(file, 'utf8');
      const updated = html
        .replace(/\$29\.00\s+(?:FLAT|FIXOS|FIJOS|PAUSCHAL|FIXES|FISSI)/gi, '$29.00')
        .replace(/\$4\.99\s+(?:FLAT|FIXOS|FIJOS|PAUSCHAL|FIXES|FISSI)/gi, '$4.99')
        .replace(/\$1\.99\s+(?:FLAT|FIXOS|FIJOS|PAUSCHAL|FIXES|FISSI)/gi, '$1.99')
        .replace(/Verified Retail, Gear &amp; Collector Availability/g, 'Recommended Resources, Guides &amp; Essential Gear')
        .replace(/Verified Retail &amp; Replacement Availability/g, 'Recommended Resources, Guides &amp; Essential Gear')
        .replace(/Check Live Stock, Editions &amp; Top-Rated Options:/g, 'View Top-Rated Books, Tools &amp; Related Essentials:')
        .replace(/Check Live Stock, Collector Editions &amp; Approved Alternatives:/g, 'View Top-Rated Books, Tools &amp; Related Essentials:');
      if (updated !== html) {
        fs.writeFileSync(file, updated, 'utf8');
      }
    }
  }
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
  const langGroup = TIER_CONVERSION_PACKS[langKey] || TIER_CONVERSION_PACKS.en;
  const pack = langGroup[tierKey] || langGroup.TIER_2_LEDGER;

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
         <option value='' disabled selected>${langGroup.stancePrompt}</option>
         <option value='SUPPORT_ACTION'>${langGroup.stanceA}</option>
         <option value='OPPOSE_ACTION'>${langGroup.stanceB}</option>
         <option value='INDEPENDENT_AUDIT'>${langGroup.stanceC}</option>
       </select>`
    : '';

  const customAmzHeader = d.affiliate_heading || langGroup.amzDefaultHeader;
  const affiliateBlockHtml = d.affiliate_keyword
    ? `<div style='margin-top:20px;padding:18px;background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;'>
         <div>
           <div style='font-size:11px;font-weight:800;color:#b45309;text-transform:uppercase;'>${customAmzHeader}</div>
           <div style='font-size:14px;font-weight:700;color:#0f172a;'>${langGroup.amzSubPrefix} ${d.affiliate_keyword}</div>
         </div>
         <a href='https://www.amazon.com/s?k=${encodeURIComponent(d.affiliate_keyword)}&tag=${AMAZON_TAG}' target='_blank' rel='noopener' style='padding:10px 16px;background:#f59e0b;color:#0f172a;font-weight:800;font-size:13px;text-decoration:none;border-radius:6px;'>${langGroup.amzBtnText} &rarr;</a>
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
1. NEVER write one-sentence answers. Every paragraph in "advertorial_paragraphs" and every answer ("a1_answer", "a2_answer", "a3_answer") MUST be 4 to 5 full, detailed sentences (at least 65 words per paragraph/answer) packed with specific context, regulatory/financial stakes, and actionable insights in the requested Language.
2. NEVER use the words "automated", "bot", or "AI".
3. LONG-TAIL GOOGLE SEARCH HEADLINES:
   - "seo_title" and "human_h1" MUST be written in the requested Language the exact way real people search on Google when looking for answers, refunds, petitions, or fallout from this news event.
   - "english_title" MUST always be written in clear English so the operator dashboard reads in English.
4. MONETIZATION TIER ROUTING:
   - "TIER_1_STATUTORY" ($29.00): Direct consumer financial loss (flights, transit strikes, telecom/software outages, Airbnb/landlord disputes, bank account freezes, billing errors, product recalls).
   - "TIER_2_LEDGER" ($4.99): Government/corporate policy decisions, investigations (like corporate probes/scandals), rate hikes, school/labor strikes, municipal rules, or institutional actions where citizens want to send a formal $4.99 notice or sign a petition.
   - "TIER_3_POLL" ($1.99): Sports, celebrity drama, entertainment/gaming releases, cultural flashpoints, or viral debates where readers want to log a weighted referendum vote and statement.
5. CONTEXT-MATCHED AMAZON AFFILIATE CALLOUT:
   - "affiliate_heading": A natural 3-to-5 word category callout in the requested Language that explains WHY the recommended product/book/gear below fits this article (e.g., "Recommended Family Safety & Legal Guides", "Air Travel & Delay Preparedness Gear", "Home Outage & Backup Power Essentials", or "Official Franchise Editions & Hardware").
   - "affiliate_keyword": A high-converting 2-to-4 word Amazon search phrase in the requested Language matching that callout.

Return a strict JSON object in the requested Language with:
- "slug": (4 to 6 word ASCII lowercase hyphenated long-tail search slug)
- "master_incident_id": (2 to 3 word ASCII lowercase hyphenated canonical key so related articles share one lead list)
- "english_title": (Clear 6-to-9 word English title for the operator dashboard)
- "affiliate_heading": (3-to-5 word natural callout header in the target language matching the article context)
- "affiliate_keyword": (2-to-4 word Amazon search phrase for relevant books, guides, gear, hardware, or emergency items related to this topic)
- "lang_code": ("en", "pt", "es", "de", "fr", or "it")
- "niche": ("TENANCY", "OUTAGES", "RECALLS", "FINANCE", "POLITICS", or "CULTURE")
- "region": ("US", "CA", "UK", "EU", "BR", "ES", "MX", "DE", "FR", "AU", or "GLOBAL")
- "tier": ("TIER_1_STATUTORY", "TIER_2_LEDGER", or "TIER_3_POLL")
- "badge_text": (2-to-3 word authoritative status badge in the target language)
- "seo_title": (Long-tail Google search title in the target language, 50-65 chars)
- "human_h1": (Compelling long-tail search headline in the target language)
- "ai_direct_answer": (3-sentence executive summary of the event, who is affected, and the active docket options in the target language)
- "advertorial_paragraphs": [
    "Paragraph 1 (4-5 detailed sentences in the target language breaking down the exact news catalyst, the entities involved, and why thousands of people are searching for answers right now)...",
    "Paragraph 2 (4-5 detailed sentences in the target language analyzing the regulatory, financial, or institutional stakes behind the scenes that mainstream coverage glosses over)...",
    "Paragraph 3 (4-5 detailed sentences in the target language explaining the specific rights, escalation channels, or public referendum leverage available to affected citizens, customers, or stakeholders)..."
  ]
- "q1_human": (Long-tail search question 1 in the target language)
- "a1_answer": (4-5 detailed sentences answering Q1 thoroughly in the target language)
- "q2_human": (Long-tail search question 2 in the target language)
- "a2_answer": (4-5 detailed sentences answering Q2 thoroughly in the target language)
- "q3_human": (Long-tail search question 3 in the target language)
- "a3_answer": (4-5 detailed sentences answering Q3 thoroughly in the target language)`;

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
        if (state.deployed[ident] && state.deployed[ident].v14) return false;
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
          v14: true,
          slug: ident,
          master_id: ident,
          english_title: parsed.english_title || `Flight ${ident.toUpperCase()} (${hub.region} Compensation)`,
          type: 'AVIATION',
          tier: 'TIER_1_STATUTORY',
          region: hub.region
        };
        newUrls.push(`${SITE_URL}/flight/${ident}/`);
        console.log(`Deployed v14 Flight [${hub.region}]: /flight/${ident}/`);
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

  console.log(`[Omnibus v14] Generating ${uniqueQueue.length} full-length native advertorial dockets...`);

  const BATCH_SIZE = 12;
  for (let i = 0; i < uniqueQueue.length; i += BATCH_SIZE) {
    const chunk = uniqueQueue.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(async ({ rawTitle, hashId, feed }) => {
      const parsed = await callOpenAI(
        MASTER_SYSTEM_PROMPT,
        `Headline: "${rawTitle}" | Suggested Category: ${feed.niche} | Region: ${feed.region} | Language: ${feed.lang} (lang_code: ${feed.lang_code})`
      );

      if (!parsed || !parsed.slug || !Array.isArray(parsed.advertorial_paragraphs) || parsed.advertorial_paragraphs.length < 2) return;

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
        v14: true,
        slug: cleanSlug,
        master_id: cleanMaster,
        english_title: parsed.english_title || cleanSlug.replace(/-/g, ' '),
        type: parsed.niche || feed.niche,
        tier: parsed.tier || 'TIER_3_POLL',
        region: feed.region
      };

      newUrls.push(`${SITE_URL}/docket/${cleanSlug}/`);
      console.log(`Deployed v14 [${parsed.tier}] (${feed.region} - ${parsed.niche}): /docket/${cleanSlug}/`);
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
  patchExistingHtmlFiles();
  const newUrls = [];
  await pollGlobalAviation(state, newUrls);
  await processGlobalNews(state, newUrls);
  saveState(state);
  await updateSitemap(state);
  await pingIndexNow(newUrls);
}

run();
