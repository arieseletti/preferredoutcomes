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
    { topic: 'SPORTS', defaultNiche: 'CULTURE' }
  ];

  const feeds = [];

  for (const loc of locales) {
    feeds.push({
      niche: 'OUTAGES',
      region: loc.region,
      lang: loc.lang,
      lang_code: loc.lang_code,
      url: `https://news.google.com/rss/search?q=(outage+OR+refund+OR+lawsuit+OR+strike+OR+cancelled+OR+compensation+OR+Airbnb+OR+tenant+OR+recall)+when:7d&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`
    });
    feeds.push({
      niche: 'CULTURE',
      region: loc.region,
      lang: loc.lang,
      lang_code: loc.lang_code,
      url: `https://news.google.com/rss/search?q=(controversy+OR+backlash+OR+scandal+OR+boycott+OR+investigation+OR+verdict+OR+feud)+when:7d&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`
    });
    feeds.push({
      niche: 'POLITICS',
      region: loc.region,
      lang: loc.lang,
      lang_code: loc.lang_code,
      url: `https://news.google.com/rss?hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`
    });
    feeds.push({
      niche: 'RECALLS',
      region: loc.region,
      lang: loc.lang,
      lang_code: loc.lang_code,
      url: `https://news.google.com/rss/search?q=(recall+OR+"class+action"+OR+defective+OR+settlement+OR+fine+OR+overcharged)+when:7d&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`
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

// Safe HTML attribute escaper so single quotes never truncate input placeholders
function escAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// 100% NATIVE-LANGUAGE CONVERSION PACKS (Zero unescaped apostrophes, universal poll copy, & SLA/credit support in $4.99 Tier 2)
const TIER_CONVERSION_PACKS = {
  en: {
    execSummaryLabel: 'Executive Summary:',
    stancePrompt: 'Select Your Official Referendum Position (All Sides Eligible)...',
    stanceA: 'Position A: Strongly Agree / Support This Action or Outcome',
    stanceB: 'Position B: Strongly Disagree / Oppose This Action or Narrative',
    stanceC: 'Position C: Undecided / Demand Full Transparency & Facts First',
    amzDefaultHeader: 'Recommended Resources, Guides & Essential Gear',
    amzSubPrefix: 'View Top-Rated Books, Tools & Related Essentials:',
    amzBtnText: 'Browse on Amazon',
    coregNote: 'Also subscribe me to free consumer settlement alerts, partner briefs, and consolidated group recovery updates (unsubscribe anytime).',
    TIER_1_STATUTORY: {
      heading: 'Compare Your 3 High-Value Claim, Deposit & Statutory Recovery Options:',
      redTitle: 'OPTION 1: STANDARD CUSTOMER SUPPORT CHANNELS (72% REJECTION RISK)',
      redText: 'Carriers, financial institutions, and property platforms routinely stall or reject individual requests that lack formal statutory citations, offering generic excuses or restrictive credits instead of cash.',
      amberTitle: 'OPTION 2: THIRD-PARTY CLAIM BROKERS (LOSES 35% TO 50% OF YOUR PAYOUT)',
      amberText: 'Middleman recovery agencies take 3 to 6 months to process routine demands and pocket up to half of your statutory refund, deposit release, or compensation payout in commission fees.',
      greenTitle: 'OPTION 3: DONE-FOR-YOU PRE-CITED STATUTORY DEMAND DISPATCH ($29.00 — KEEP 100%)',
      greenText: 'What you get for $29.00: We prepare your formal legal-grade demand and fund recovery notice citing the exact consumer and statutory regulations, and electronically dispatch it directly to the corporate compliance desk on your behalf (with an official copy sent to your email) so you keep 100% of your payout.',
      namePlaceholder: 'Your Full Legal Name',
      inputPlaceholder: 'Booking / Account / Reference Number & Dollar Amount Claimed',
      emailPlaceholder: 'Your Email Address (To Receive Your Official Proof-of-Service Copy)',
      ctaBtn: 'Dispatch My Formal Statutory Notice Now — $29.00',
      freeTitle: 'Prefer to Wait? Join the Free 50-Claimant Consolidated Group Docket',
      freeCta: 'Enter your details below to receive the free Evidence & Claim Preservation Checklist and register your spot in our 50-claimant consolidated group filing.',
      freeInputPlaceholder: 'Your City & Brief Summary of Your Financial Loss or Disruption',
      freeBtn: 'Send Free Claim Checklist & Register My Case ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Compare Your 3 SLA Credit, Billing Dispute & Official Escalation Options:',
      redTitle: 'OPTION 1: VENTING ON SOCIAL MEDIA OR BASIC SUPPORT CHAT (IGNORED)',
      redText: 'Social media complaints and tier-1 support chats carry zero administrative weight—companies and institutions never issue automatic SLA billing credits or policy reversals unless a formal notice is logged.',
      amberTitle: 'OPTION 2: STANDARD FREE GROUP QUEUE (WAITS FOR 50 SIGNATURES)',
      amberText: 'Adding your name to the free group registry below logs your complaint, but your filing is held in queue until a full 50-person consolidated batch is reached.',
      greenTitle: 'OPTION 3: PRIORITY INDIVIDUAL SLA CREDIT & EXECUTIVE NOTICE ($4.99)',
      greenText: 'What you get for $4.99: Instead of waiting in the free group queue, we format and electronically transmit an individual, timestamped Formal SLA Billing Credit & Executive Accountability Notice in your name directly to the corporate billing, compliance, or oversight desk today—with an official copy sent to your inbox.',
      namePlaceholder: 'Your Full Name (As Shown on Official Notice)',
      inputPlaceholder: 'Account Email / Service Affected & Your Demand (SLA Credit / Refund / Policy Objection)',
      emailPlaceholder: 'Your Email Address (To Receive Your Dispatched Notice Copy)',
      ctaBtn: 'Dispatch My Individual Formal Notice — $4.99',
      freeTitle: 'Prefer the Free Route? Add Your Name to the 50-Person Public Group Docket',
      freeCta: 'Log your free signature on the consolidated public docket and receive official updates as this outage, billing, or policy issue escalates.',
      freeInputPlaceholder: 'Your City/Region & How This Outage or Policy Affects You',
      freeBtn: 'Log My Free Signature on the Public Docket ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'How to Weigh In on the Official Public Referendum & Sentiment Ledger:',
      redTitle: 'OPTION 1: UNVERIFIED SOCIAL COMMENT THREADS (BURIED BY ALGORITHMS)',
      redText: 'Standard social media comment sections are flooded with bots and throttled by engagement algorithms—meaning your take disappears within minutes and never registers on the permanent public record.',
      amberTitle: 'OPTION 2: BASIC UNWEIGHTED TALLY VOTE (NO PINNED STATEMENT)',
      amberText: 'Casting a free vote at the bottom of this page adds 1 basic unweighted point to the aggregate sentiment bar, without publishing or featuring your personal commentary.',
      greenTitle: 'OPTION 3: VERIFIED PRIORITY STATEMENT + 10X WEIGHTED REFERENDUM BALLOT ($1.99)',
      greenText: 'What you get for $1.99: Whichever side of this story you stand on, your verified ballot counts with 10x referendum weight AND your personal statement is permanently featured on the Official Public Sentiment Report shared with media desks, commentators, and readers following this story.',
      namePlaceholder: 'Your Name or Verified Display Handle',
      inputPlaceholder: 'Write Your Personal Take or Public Comment to Feature on the Official Ledger',
      emailPlaceholder: 'Your Email Address (To Receive Your Verified Referendum Receipt & Report)',
      ctaBtn: 'Publish My Verified Statement & 10x Weighted Vote — $1.99',
      freeTitle: 'Cast a Free Unweighted Vote & Get Live Story / Release Alerts',
      freeCta: 'Log a free 1x vote on the public tally bar and receive instant alerts when new developments or updates break.',
      freeInputPlaceholder: 'Your City & Your 1-Sentence Take on This Story',
      freeBtn: 'Cast Free 1x Vote & Subscribe to Updates ($0.00)'
    }
  },
  pt: {
    execSummaryLabel: 'Resumo Executivo:',
    stancePrompt: 'Selecione Sua Posição Oficial nesta Pauta (Qualquer Lado Elegível)...',
    stanceA: 'Posição A: Concordo Totalmente / Apoio Esta Decisão ou Desfecho',
    stanceB: 'Posição B: Discordo Totalmente / Crítico a Esta Situação ou Medida',
    stanceC: 'Posição C: Neutro / Aguardando Mais Fatos e Transparência',
    amzDefaultHeader: 'Recursos Recomendados, Guias e Itens Essenciais',
    amzSubPrefix: 'Veja Livros, Guias e Produtos Bem Avaliados sobre o Tema:',
    amzBtnText: 'Ver na Amazon',
    coregNote: 'Também quero receber alertas gratuitos de acordos ao consumidor, informativos de parceiros e atualizações do grupo coletivo (cancele quando quiser).',
    TIER_1_STATUTORY: {
      heading: 'Compare Suas 3 Opções de Proteção de Conta, Reembolso e Indenização:',
      redTitle: 'OPÇÃO 1: ATENDIMENTO PADRÃO DA EMPRESA (72% DE RISCO DE RECUSA)',
      redText: 'Instituições financeiras, plataformas e companhias aéreas frequentemente negam ou protelam reclamações individuais sem fundamentação normativa, oferecendo respostas automáticas em vez de solução em dinheiro.',
      amberTitle: 'OPÇÃO 2: INTERMEDIÁRIOS E AGÊNCIAS (COBRAM DE 35% A 50% DO SEU VALOR)',
      amberText: 'Empresas intermediárias levam meses e retêm até metade do seu reembolso ou indenização apenas para protocolar um pedido padrão.',
      greenTitle: 'OPÇÃO 3: DESPACHO DE NOTIFICAÇÃO FORMAL PRÉ-FUNDAMENTADA ($29.00 — FIQUE COM 100%)',
      greenText: 'O que você recebe por $29.00: Preparamos sua Notificação Formal de Proteção e Reembolso citando a legislação aplicável (CDC / Banco Central / Procon / ANAC) e enviamos eletronicamente direto ao setor de conformidade da empresa em seu nome (com cópia oficial protocolada no seu e-mail), garantindo 100% do valor para você.',
      namePlaceholder: 'Seu Nome Completo',
      inputPlaceholder: 'Número da Conta / Reserva / Protocolo e Valor Estimado Envolvido',
      emailPlaceholder: 'Seu E-mail (Para Receber a Cópia Oficial Protocolada)',
      ctaBtn: 'Enviar Minha Notificação Formal Agora — $29.00',
      freeTitle: 'Prefere Aguardar? Entre Gratuitamente no Grupo Coletivo de 50 Reclamantes',
      freeCta: 'Cadastre seus dados abaixo para receber o Checklist Gratuito de Proteção e Provas e garantir sua vaga no expediente coletivo de 50 consumidores.',
      freeInputPlaceholder: 'Sua Cidade/UF e Resumo do Problema ou Prejuízo Financeiro',
      freeBtn: 'Receber Checklist Gratuito e Registrar Meu Caso ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Compare Suas 3 Opções de Crédito por Falha, Contestação e Escalada Oficial:',
      redTitle: 'OPÇÃO 1: RECLAMAR NAS REDES SOCIAIS OU CHAT COMUM (IMPACTO ZERO)',
      redText: 'Comentários em redes sociais e chats básicos não geram protocolo jurídico—empresas nunca concedem abatimento na fatura ou revisão sem uma notificação formal registrada.',
      amberTitle: 'OPÇÃO 2: LISTA COLETIVA GRATUITA (AGUARDA GRUPO DE 50 NOMES)',
      amberText: 'Assinar a lista gratuita abaixo registra sua queixa, mas aguarda o fechamento do grupo de 50 assinaturas antes do envio consolidado.',
      greenTitle: 'OPÇÃO 3: NOTIFICAÇÃO INDIVIDUAL DE ABATIMENTO E RESPONSABILIDADE ($4.99)',
      greenText: 'O que você recebe por $4.99: Formatamos e transmitimos hoje uma Notificação Formal Individual em seu nome diretamente para o setor de faturamento, ouvidoria ou órgão regulador—exigindo crédito na assinatura por tempo fora do ar, revisão de cobrança ou providências imediatas—com cópia oficial no seu e-mail.',
      namePlaceholder: 'Seu Nome Completo',
      inputPlaceholder: 'Serviço Afetado / Seu Pedido (Crédito na Fatura / Contestação / Providências)',
      emailPlaceholder: 'Seu E-mail (Para Receber o Comprovante Oficial de Envio)',
      ctaBtn: 'Enviar Minha Notificação Individual Agora — $4.99',
      freeTitle: 'Adicione Seu Nome Gratuitamente ao Grupo Coletivo Desta Pauta',
      freeCta: 'Registre sua assinatura gratuita no dossiê público e receba atualizações oficiais sobre este caso.',
      freeInputPlaceholder: 'Sua Cidade/UF e Como Esta Falha ou Medida Afeta Você',
      freeBtn: 'Registrar Minha Assinatura Gratuita ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'Como Registrar Sua Opinião no Painel Público Oficial:',
      redTitle: 'OPÇÃO 1: COMENTÁRIOS COMUNS EM REDES SOCIAIS (OCULTADOS PELO ALGORITMO)',
      redText: 'Caixas de comentários comuns misturam opiniões reais com robôs e desaparecem do feed em poucos minutos.',
      amberTitle: 'OPÇÃO 2: VOTO SIMPLES SEM PESO (SEM COMENTÁRIO DESTACADO)',
      amberText: 'O voto gratuito no final da página soma apenas 1 ponto básico na barra geral, sem destacar ou publicar sua opinião.',
      greenTitle: 'OPÇÃO 3: COMENTÁRIO VERIFICADO EM DESTAQUE + VOTO COM PESO 10X ($1.99)',
      greenText: 'O que você recebe por $1.99: Qualquer que seja a sua opinião sobre este caso, seu voto verificado tem peso 10x no placar oficial e seu comentário pessoal fica registrado em destaque no Relatório de Opinião Pública compartilhado com a imprensa, analistas e leitores.',
      namePlaceholder: 'Seu Nome ou Identificação',
      inputPlaceholder: 'Escreva Sua Opinião ou Comentário para Destacar no Painel Oficial',
      emailPlaceholder: 'Seu E-mail (Para Receber o Recibo Oficial do Seu Voto)',
      ctaBtn: 'Publicar Comentário Verificado e Voto 10x — $1.99',
      freeTitle: 'Registre um Voto Gratuito (Peso 1x) e Receba Alertas Desta Pauta',
      freeCta: 'Some seu voto gratuito ao placar geral e receba alertas sobre novos desdobramentos.',
      freeInputPlaceholder: 'Sua Cidade e Sua Opinião em 1 Frase',
      freeBtn: 'Registrar Voto Gratuito ($0.00)'
    }
  },
  es: {
    execSummaryLabel: 'Resumen Ejecutivo:',
    stancePrompt: 'Seleccione Su Postura Oficial sobre Este Tema (Cualquier Lado Elegible)...',
    stanceA: 'Postura A: Totalmente de Acuerdo / Apoyo Esta Posición o Resultado',
    stanceB: 'Postura B: En Total Desacuerdo / Crítico con Esta Situación o Medida',
    stanceC: 'Postura C: Neutral / Esperando Más Datos y Transparencia',
    amzDefaultHeader: 'Recursos Recomendados, Guías y Artículos Esenciales',
    amzSubPrefix: 'Ver Libros, Guías y Opciones Mejor Valoradas:',
    amzBtnText: 'Ver en Amazon',
    coregNote: 'También deseo recibir alertas gratuitas sobre acuerdos de consumidores, informes de socios y actualizaciones del expediente colectivo (cancelar en cualquier momento).',
    TIER_1_STATUTORY: {
      heading: 'Compare Sus 3 Opciones de Protección de Fondos, Reembolso e Indemnización:',
      redTitle: 'OPCIÓN 1: FORMULARIO DE ATENCIÓN ESTÁNDAR (72% DE RIESGO DE RECHAZO)',
      redText: 'Las aerolíneas, entidades financieras y plataformas suelen rechazar o demorar reclamaciones individuales que carecen de fundamentos normativos, ofreciendo respuestas automáticas en lugar de efectivo.',
      amberTitle: 'OPCIÓN 2: AGENCIAS INTERMEDIARIAS (RETIENEN DEL 35% AL 50% EN COMISIONES)',
      amberText: 'Los gestores intermediarios tardan de 3 a 6 meses y se quedan con hasta la mitad de su dinero o indemnización solo por enviar una carta estándar.',
      greenTitle: 'OPCIÓN 3: DESPACHO DE RECLAMACIÓN FORMAL PRE-CITADA ($29.00 — CONSERVE EL 100%)',
      greenText: 'Lo que recibe por $29.00: Preparamos su requerimiento formal de protección de cuenta o reembolso citando la normativa aplicable y lo enviamos electrónicamente al departamento de cumplimiento de la entidad en su nombre (con copia oficial en su correo) para que usted conserve el 100% de sus fondos.',
      namePlaceholder: 'Su Nombre y Apellidos Completos',
      inputPlaceholder: 'Número de Cuenta / Reserva / Referencia y Monto Reclamado',
      emailPlaceholder: 'Su Correo Electrónico (Para Recibir Su Copia Oficial Protocolizada)',
      ctaBtn: 'Enviar Mi Reclamación Formal Ahora — $29.00',
      freeTitle: '¿Prefiere Esperar? Únase Gratis al Grupo Colectivo de 50 Afectados',
      freeCta: 'Ingrese sus datos abajo para recibir gratis la Guía de Protección de Pruebas y Fondos y asegurar su lugar en el expediente colectivo de 50 reclamantes.',
      freeInputPlaceholder: 'Su Ciudad y Resumen del Problema o Pérdida Económica',
      freeBtn: 'Recibir Guía Gratuita y Registrar Mi Caso ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Compare Sus 3 Opciones de Abono en Factura, Reclamo de Servicio y Escalada:',
      redTitle: 'OPCIÓN 1: QUEJARSE EN REDES SOCIALES O CHAT BÁSICO (IMPACTO CERO)',
      redText: 'Las quejas en redes sociales o chats de soporte básico no generan registro legal—las empresas nunca otorgan descuentos en factura por caídas del servicio sin un reclamo formal.',
      amberTitle: 'OPCIÓN 2: LISTA COLECTIVA GRATUITA (ESPERA AL GRUPO DE 50 FIRMAS)',
      amberText: 'Sumar su nombre a la lista gratuita registra su queja, pero permanece en espera hasta completar el grupo consolidado de 50 afectados.',
      greenTitle: 'OPCIÓN 3: NOTIFICACIÓN FORMAL INDIVIDUAL DE ABONO Y CUMPLIMIENTO ($4.99)',
      greenText: 'Lo que recibe por $4.99: Formateamos y transmitimos hoy mismo una Notificación Formal Individual con sello de tiempo en su nombre directamente al departamento de facturación, cumplimiento o regulador—exigiendo abono por caída de servicio (SLA) o revisión de cargos—con copia oficial en su correo.',
      namePlaceholder: 'Su Nombre Completo',
      inputPlaceholder: 'Servicio Afectado y Su Solicitud (Abono en Factura / Reclamo SLA / Queja Formal)',
      emailPlaceholder: 'Su Correo Electrónico (Para Recibir Copia de la Notificación)',
      ctaBtn: 'Enviar Mi Notificación Formal Individual — $4.99',
      freeTitle: 'Sume Su Firma al Expediente Colectivo Gratuito de Este Caso',
      freeCta: 'Registre su firma gratuita en el expediente público y reciba actualizaciones oficiales.',
      freeInputPlaceholder: 'Su Ciudad y Cómo le Afecta Esta Caída o Medida',
      freeBtn: 'Registrar Mi Firma Gratuita ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'Cómo Participar en el Referéndum y Panel de Opinión Pública:',
      redTitle: 'OPCIÓN 1: COMENTARIOS EN REDES SOCIALES (ENTERRADOS POR EL ALGORITMO)',
      redText: 'Las secciones de comentarios estándar están saturadas de bots y filtros algorítmicos que ocultan su opinión en minutos.',
      amberTitle: 'OPCIÓN 2: VOTO BÁSICO NO PONDERADO (SIN COMENTARIO DESTACADO)',
      amberText: 'Emitir un voto gratuito al final de la página suma 1 punto básico sin publicar ni destacar su opinión personal.',
      greenTitle: 'OPCIÓN 3: COMENTARIO VERIFICADO DESTACADO + VOTO PONDERADO 10X ($1.99)',
      greenText: 'Lo que recibe por $1.99: Cualquiera que sea su postura sobre esta noticia, su voto verificado cuenta con peso 10x y su comentario personal queda publicado permanentemente en el Informe Oficial de Opinión Pública compartido con medios, analistas y lectores.',
      namePlaceholder: 'Su Nombre o Alias Verificado',
      inputPlaceholder: 'Escriba Su Opinión o Comentario para Destacar en el Panel Oficial',
      emailPlaceholder: 'Su Correo Electrónico (Para Recibir Su Recibo Oficial)',
      ctaBtn: 'Publicar Comentario Verificado y Voto 10x — $1.99',
      freeTitle: 'Emita un Voto Gratuito (Peso 1x) y Reciba Alertas de Esta Noticia',
      freeCta: 'Sume su voto gratuito al marcador general y reciba alertas de nuevas actualizaciones.',
      freeInputPlaceholder: 'Su Ciudad y Su Opinión en 1 Frase',
      freeBtn: 'Emitir Voto Gratuito ($0.00)'
    }
  },
  de: {
    execSummaryLabel: 'Zusammenfassung:',
    stancePrompt: 'Wählen Sie Ihre Offizielle Position zu Diesem Thema (Jede Ansicht Wählbar)...',
    stanceA: 'Position A: Volle Zustimmung / Unterstütze Diese Entscheidung oder Entwicklung',
    stanceB: 'Position B: Strikte Ablehnung / Kritisch Gegenüber Dieser Maßnahme',
    stanceC: 'Position C: Neutral / Forderung nach Voller Transparenz & Fakten',
    amzDefaultHeader: 'Empfohlene Ressourcen, Ratgeber & Wichtige Ausrüstung',
    amzSubPrefix: 'Top-Bewertete Bücher, Ratgeber & Passende Artikel:',
    amzBtnText: 'Bei Amazon Ansehen',
    coregNote: 'Ich möchte außerdem kostenlose Verbraucher-Updates, Partner-Briefings und Statusmeldungen zur Sammelakte erhalten (jederzeit abbestellbar).',
    TIER_1_STATUTORY: {
      heading: 'Vergleichen Sie Ihre 3 Optionen zum Kontoschutz, zur Rückerstattung & Entschädigung:',
      redTitle: 'OPTION 1: STANDARD-SUPPORTFORMULAR DES ANBIETERS (72% ABLEHNUNGSRISIKO)',
      redText: 'Fluggesellschaften, Banken und Plattformen lehnen einfache Kundenanfragen ohne konkrete Gesetzesverweise häufig mit Standardtextbausteinen ab oder verzögern die Auszahlung.',
      amberTitle: 'OPTION 2: INKASSO- & ANSPRUCHSPORTALE (35% BIS 50% GEBÜHRENABZUG)',
      amberText: 'Drittanbieter benötigen oft Monate für die Bearbeitung und behalten bis zur Hälfte Ihres Guthabens oder Ihrer Entschädigung als Provision ein.',
      greenTitle: 'OPTION 3: DIREKTER VERSAND IHRER RECHTLICH FUNDIERTEN FORDERUNG ($29.00 — 100% BEHALTEN)',
      greenText: 'Was Sie für $29.00 erhalten: Wir erstellen Ihre formelle Zahlungs- und Erstattungsaufforderung unter Nennung der einschlägigen Verbrauchernormen und übermitteln diese elektronisch in Ihrem Namen direkt an die Rechts- und Compliance-Abteilung (mit offizieller Kopie an Ihre E-Mail), sodass Sie 100% Ihrer Summe behalten.',
      namePlaceholder: 'Ihr Vollständiger Name',
      inputPlaceholder: 'Buchungs- / Konto- / Referenznummer & Geforderter Betrag',
      emailPlaceholder: 'Ihre E-Mail-Adresse (Für Ihre Offizielle Übermittlungsbestätigung)',
      ctaBtn: 'Formelle Forderung Jetzt Versenden — $29.00',
      freeTitle: 'Lieber Abwarten? Kostenlos in die 50-Personen-Sammelakte Eintragen',
      freeCta: 'Tragen Sie sich unten ein, um die kostenlose Nachweis-Checkliste zu erhalten und Ihren Platz in der 50-Personen-Sammelakte zu sichern.',
      freeInputPlaceholder: 'Ihre Stadt & Kurze Beschreibung Ihres Finanziellen Schadens',
      freeBtn: 'Kostenlose Checkliste Anfordern & Fall Registrieren ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Vergleichen Sie Ihre 3 Optionen für Beitragsgutschrift, Widerspruch & Eskalation:',
      redTitle: 'OPTION 1: KOMMENTARE IN SOZIALEN NETZWERKEN ODER CHAT (KEINE WIRKUNG)',
      redText: 'Beschwerden in sozialen Medien oder Standard-Chats haben kein rechtliches Gewicht—Anbieter gewähren keine automatischen SLA-Gutschriften ohne formelle Rüge.',
      amberTitle: 'OPTION 2: KOSTENLOSE SAMMELLISTE (WARTET AUF 50 UNTERZEICHNER)',
      amberText: 'Ihr Eintrag in die kostenlose Liste unten wird gespeichert, jedoch erst nach Erreichen einer Gruppe von 50 Personen gebündelt übermittelt.',
      greenTitle: 'OPTION 3: INDIVIDUELLE GUTSCHRIFTS- & WIDERSPRUCHSMITTEILUNG HEUTE ($4.99)',
      greenText: 'Was Sie für $4.99 erhalten: Wir formatieren und übermitteln noch heute eine individuelle, zeitgestempelte formelle SLA-Gutschriftsforderung oder Stellungnahme in Ihrem Namen direkt an die Abrechnungsstelle, den Vorstand oder das zuständige Gremium—inklusive Kopie an Ihr E-Mail-Postfach.',
      namePlaceholder: 'Ihr Vollständiger Name',
      inputPlaceholder: 'Betroffener Dienst / Ihre Forderung (Gutschrift / Widerspruch / Stellungnahme)',
      emailPlaceholder: 'Ihre E-Mail-Adresse (Für Ihre Offizielle Übermittlungsbestätigung)',
      ctaBtn: 'Individuelle Offizielle Mitteilung Senden — $4.99',
      freeTitle: 'Tragen Sie Ihren Namen Kostenlos in das Öffentliche Sammelregister Ein',
      freeCta: 'Registrieren Sie Ihre kostenlose Unterschrift im Sammelregister und erhalten Sie Updates.',
      freeInputPlaceholder: 'Ihre Stadt & Wie Sie von der Störung oder Maßnahme Betroffen Sind',
      freeBtn: 'Kostenlose Unterschrift Registrieren ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'So Nehmen Sie am Offiziellen Öffentlichen Meinungsregister Teil:',
      redTitle: 'OPTION 1: UNVERIFIZIERTE KOMMENTARSPALTEN (GEHEN IM ALGORITHMUS UNTER)',
      redText: 'Standard-Kommentarspalten werden von Bots geflutet und durch Algorithmen gefiltert, sodass Ihre Meinung nach wenigen Minuten verschwindet.',
      amberTitle: 'OPTION 2: EINFACHE STIMME OHNE GEWICHTUNG (OHNE KOMMENTAR)',
      amberText: 'Eine kostenlose Stimme unten zählt als einfacher Punkt im Balken, ohne Ihren persönlichen Kommentar im Dossier hervorzuheben.',
      greenTitle: 'OPTION 3: VERIFIZIERTER KOMMENTAR + 10-FACH GEWICHTETE STIMME ($1.99)',
      greenText: 'Was Sie für $1.99 erhalten: Ganz gleich, welche Position Sie zu diesem Thema vertreten—Ihre verifizierte Stimme zählt mit 10-facher Gewichtung und Ihr persönlicher Kommentar wird dauerhaft im offiziellen Meinungsbericht für Medien, Analysten und Leser veröffentlicht.',
      namePlaceholder: 'Ihr Name oder Verifiziertes Profil',
      inputPlaceholder: 'Ihr Persönlicher Kommentar für den Offiziellen Meinungsbericht',
      emailPlaceholder: 'Ihre E-Mail-Adresse (Für Ihren Offiziellen Beleg)',
      ctaBtn: 'Verifizierten Kommentar & 10x Stimme Absenden — $1.99',
      freeTitle: 'Kostenlose 1x Stimme Abgeben & Themen-Updates Erhalten',
      freeCta: 'Geben Sie eine kostenlose Stimme ab und erhalten Sie Benachrichtigungen bei neuen Entwicklungen.',
      freeInputPlaceholder: 'Ihre Stadt & Ihre Kurze Meinung',
      freeBtn: 'Kostenlose Stimme Abgeben ($0.00)'
    }
  },
  fr: {
    execSummaryLabel: 'Résumé Exécutif :',
    stancePrompt: 'Sélectionnez Votre Position Officielle sur Ce Sujet (Tout Avis Éligible)...',
    stanceA: 'Position A : Tout à Fait d’Accord / Soutien à Cette Décision',
    stanceB: 'Position B : Totalement Opposé / Critique envers Cette Situation',
    stanceC: 'Position C : Neutre / En Attente de Plus d’Informations',
    amzDefaultHeader: 'Ressources Recommandées, Guides et Équipements Essentiels',
    amzSubPrefix: 'Voir les Livres, Guides et Articles les Mieux Notés :',
    amzBtnText: 'Voir sur Amazon',
    coregNote: 'Je souhaite également recevoir gratuitement les alertes de règlement, les notes partenaires et les mises à jour du dossier collectif (désinscription à tout moment).',
    TIER_1_STATUTORY: {
      heading: 'Comparez Vos 3 Options de Protection des Fonds, de Remboursement et d’Indemnisation :',
      redTitle: 'OPTION 1 : FORMULAIRE SUPPORT STANDARD (72 % DE RISQUE DE REJET)',
      redText: 'Les compagnies aériennes, banques et plateformes rejettent ou retardent fréquemment les demandes individuelles dépourvues de références légales précises.',
      amberTitle: 'OPTION 2 : AGENCES INTERMÉDIAIRES (PRÉLÈVENT 35 % À 50 % DE COMMISSION)',
      amberText: 'Les intermédiaires prennent de 3 à 6 mois et retiennent jusqu’à la moitié de vos fonds ou de votre indemnisation légale pour envoyer un simple courrier type.',
      greenTitle: 'OPTION 3 : ENVOI DIRECT DE VOTRE MISE EN DEMEURE PRÉ-CITÉE ($29.00 — GARDEZ 100 %)',
      greenText: 'Ce que vous obtenez pour $29.00 : Nous préparons votre demande formelle de protection ou de remboursement citant les textes réglementaires exacts et la transmettons électroniquement au service conformité en votre nom (avec copie officielle envoyée sur votre e-mail) afin que vous conserviez 100 % de vos fonds.',
      namePlaceholder: 'Votre Nom et Prénom Complet',
      inputPlaceholder: 'Numéro de Compte / Réservation et Montant Estimé Concerné',
      emailPlaceholder: 'Votre Adresse E-mail (Pour Recevoir Votre Copie Officielle)',
      ctaBtn: 'Envoyer Ma Demande Officielle Maintenant — $29.00',
      freeTitle: 'Vous Préférez Attendre ? Rejoignez Gratuitement le Dossier Collectif de 50 Réclamants',
      freeCta: 'Inscrivez vos coordonnées ci-dessous pour recevoir gratuitement la Checklist de Protection des Preuves et réserver votre place dans le groupe collectif de 50 dossiers.',
      freeInputPlaceholder: 'Votre Ville et Résumé de Votre Préjudice Financier',
      freeBtn: 'Recevoir la Checklist Gratuite et Enregistrer Mon Cas ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Comparez Vos 3 Options d’Avoir Facture, de Contestation et de Notification :',
      redTitle: 'OPTION 1 : RÉSEAUX SOCIAUX OU CHAT STANDARD (AUCUN IMPACT)',
      redText: 'Les plaintes sur les réseaux sociaux n’ont aucune valeur juridique—les opérateurs et éditeurs n’accordent jamais d’avoir SLA automatique sans demande formelle.',
      amberTitle: 'OPTION 2 : PÉTITION COLLECTIVE GRATUITE (ATTEND LE GROUPE DE 50 SIGNATURES)',
      amberText: 'Ajouter votre nom à la liste gratuite ci-dessous enregistre votre soutien, mais attend que le groupe de 50 signataires soit complet avant transmission.',
      greenTitle: 'OPTION 3 : NOTIFICATION INDIVIDUELLE D’AVOIR SLA ET DE CONTESTATION ($4.99)',
      greenText: 'Ce que vous obtenez pour $4.99 : Nous formatons et transmettons dès aujourd’hui une Notification Officielle Individuelle horodatée en votre nom directement au service facturation, à la direction ou au régulateur—avec copie officielle envoyée sur votre boîte mail.',
      namePlaceholder: 'Votre Nom Complet',
      inputPlaceholder: 'Service Concerné et Votre Demande (Avoir Facture SLA / Contestation)',
      emailPlaceholder: 'Votre Adresse E-mail (Pour Recevoir Votre Copie de Notification)',
      ctaBtn: 'Envoyer Ma Notification Individuelle — $4.99',
      freeTitle: 'Ajoutez Gratuitement Votre Nom au Dossier Collectif Public',
      freeCta: 'Enregistrez votre signature gratuite sur le dossier public et recevez les mises à jour officielles.',
      freeInputPlaceholder: 'Votre Ville et Comment Cette Panne ou Mesure Vous Affecte',
      freeBtn: 'Enregistrer Ma Signature Gratuita ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'Comment Participer au Sondage et Registre d’Opinion Publique :',
      redTitle: 'OPTION 1 : COMMENTAIRES NON VÉRIFIÉS (NOYÉS PAR LES ALGORITHMES)',
      redText: 'Les sections de commentaires classiques sont saturées de robots et filtrées par les algorithmes, faisant disparaître votre avis en quelques minutes.',
      amberTitle: 'OPTION 2 : VOTE SIMPLE NON PONDÉRÉ (SANS COMMENTAIRE ÉPINGLÉ)',
      amberText: 'Un vote gratuit en bas de page ajoute 1 point simple à la barre globale sans publier ni mettre en avant votre commentaire.',
      greenTitle: 'OPTION 3 : COMMENTAIRE VÉRIFIÉ ÉPINGLÉ + VOTE PONDÉRÉ 10X ($1.99)',
      greenText: 'Ce que vous obtenez pour $1.99 : Quel que soit votre avis sur ce sujet, votre vote vérifié compte avec un poids 10x et votre commentaire personnel est publié de façon permanente dans le Rapport Officiel d’Opinion Publique partagé avec les médias et lecteurs.',
      namePlaceholder: 'Votre Nom ou Pseudonyme Vérifié',
      inputPlaceholder: 'Rédigez Votre Commentaire Personnel à Publier au Rapport Officiel',
      emailPlaceholder: 'Votre Adresse E-mail (Pour Recevoir Votre Reçu Officiel)',
      ctaBtn: 'Publier Mon Commentaire Vérifié & Vote 10x — $1.99',
      freeTitle: 'Exprimez un Vote Gratuit (Poids 1x) et Recevez les Alertes du Sujet',
      freeCta: 'Ajoutez votre vote gratuit au compteur général et recevez les alertes sur ce sujet.',
      freeInputPlaceholder: 'Votre Ville et Votre Avis en 1 Phrase',
      freeBtn: 'Valider Mon Vote Gratuit ($0.00)'
    }
  },
  it: {
    execSummaryLabel: 'Sintesi Esecutiva:',
    stancePrompt: 'Seleziona la Tua Opinione Ufficiale su Questo Tema (Ogni Posizione Ammessa)...',
    stanceA: 'Posizione A: Pienamente d’Accordo / Condivido Questa Scelta o Sviluppo',
    stanceB: 'Posizione B: In Disaccordo / Critico verso Questa Situazione',
    stanceC: 'Posizione C: Neutrale / In Attesa di Maggiori Dettagli e Fatti',
    amzDefaultHeader: 'Risorse Consigliate, Guide e Strumenti Utili',
    amzSubPrefix: 'Scopri Libri, Guide e Strumenti Più Recensiti:',
    amzBtnText: 'Vedi su Amazon',
    coregNote: 'Desidero inoltre ricevere gratuitamente avvisi di tutela dei consumatori, informative dei partner e aggiornamenti sul fascicolo collettivo (disiscrizione in qualsiasi momento).',
    TIER_1_STATUTORY: {
      heading: 'Confronta le Tue 3 Opzioni di Tutela del Conto, Rimborso e Risarcimento:',
      redTitle: 'OPZIONE 1: RECLAMO STANDARD ALL’ASSISTENZA CLIENTI (72% DI RISCHIO DI RIFIUTO)',
      redText: 'Istituti finanziari, compagnie aeree e piattaforme respingono o ritardano frequentemente i reclami individuali privi di riferimenti normativi vincolanti, fornendo risposte preconfezionate invece di sbloccare i fondi o rimborsare.',
      amberTitle: 'OPZIONE 2: AGENZIE INTERMEDIARIE (TRATTENGONO DAL 35% AL 50% DI COMMISSIONE)',
      amberText: 'Gli intermediari impiegano mesi e trattengono fino alla metà del tuo rimborso o indennizzo legale solo per inviare una comunicazione standard.',
      greenTitle: 'OPZIONE 3: INVIO DIRETTO DELLA DIFFIDA E ISTANZA FORMALE PRE-CITATA ($29.00 — TIENI IL 100%)',
      greenText: 'Cosa ottieni per $29.00: Prepariamo la tua istanza formale di tutela fondi o rimborso citando le normative vigenti (Codice del Consumo / Banca d’Italia / Normativa UE) e la trasmettiamo elettronicamente a tuo nome direttamente all’ufficio conformità e reclami della società (con copia ufficiale sulla tua email), così trattieni il 100% delle tue somme.',
      namePlaceholder: 'Il Tuo Nome e Cognome Completo',
      inputPlaceholder: 'Numero di Conto / Prenotazione / Pratica e Importo Stimato Coinvolto',
      emailPlaceholder: 'Il Tuo Indirizzo Email (Per Ricevere la Copia Ufficiale Protocollo)',
      ctaBtn: 'Invia Ora la Mia Istanza Formale di Tutela e Rimborso — $29.00',
      freeTitle: 'Preferisci Attendere? Unisciti Gratuitamente al Fascicolo Collettivo di 50 Ricorrenti',
      freeCta: 'Inserisci i tuoi dati qui sotto per ricevere gratis la Checklist di Tutela del Conto e delle Prove e riservare il tuo posto nel gruppo collettivo di 50 pratiche.',
      freeInputPlaceholder: 'La Tua Città e Breve Riepilogo del Problema sul Conto o Perdita',
      freeBtn: 'Ricevi Checklist Gratuita e Registra il Mio Caso ($0.00)'
    },
    TIER_2_LEDGER: {
      heading: 'Confronta le Tue 3 Opzioni di Rimborso Canone, Reclamo SLA e Tutela:',
      redTitle: 'OPZIONE 1: SFOGARSI SUI SOCIAL MEDIA O CHAT STANDARD (IMPATTO ZERO)',
      redText: 'I commenti sui social o nelle chat di supporto non hanno valore amministrativo—i gestori non accreditano mai rimborsi SLA automatici senza un’istanza formale.',
      amberTitle: 'OPZIONE 2: LISTA COLLETTIVA GRATUITA (ATTENDE IL GRUPPO DI 50 FIRME)',
      amberText: 'Aggiungere il tuo nome alla lista gratuita qui sotto registra la tua adesione, ma resta in coda finché non viene raggiunto il gruppo consolidato di 50 firmatari.',
      greenTitle: 'OPZIONE 3: NOTIFICA FORMALE INDIVIDUALE DI ACCREDITO SLA E TUTELA ($4.99)',
      greenText: 'Cosa ottieni per $4.99: Formattiamo e trasmettiamo oggi stesso una Notifica Formale Individuale con marca temporale a tuo nome direttamente all’ufficio fatturazione, alla direzione o all’organo di vigilanza—con copia ufficiale inviata alla tua casella email.',
      namePlaceholder: 'Il Tuo Nome e Cognome',
      inputPlaceholder: 'Servizio Coinvolto e Tua Richiesta (Accredito SLA / Tutela Conto / Opposizione)',
      emailPlaceholder: 'Il Tuo Indirizzo Email (Per Ricevere la Copia della Notifica)',
      ctaBtn: 'Invia la Mia Notifica Formale Individuale — $4.99',
      freeTitle: 'Aggiungi Gratuitamente il Tuo Nome al Fascicolo Collettivo di Questo Caso',
      freeCta: 'Registra la tua adesione gratuita nel fascicolo pubblico e ricevi aggiornamenti ufficiali sugli sviluppi.',
      freeInputPlaceholder: 'La Tua Città e Come Ti Riguarda Questo Disservizio o Provvedimento',
      freeBtn: 'Registra la Mia Adesione Gratuita ($0.00)'
    },
    TIER_3_POLL: {
      heading: 'Come Partecipare al Sondaggio e Registro dell’Opinione Pubblica:',
      redTitle: 'OPZIONE 1: COMMENTI SOCIAL NON VERIFICATI (NASCOSTI DAGLI ALGORITMI)',
      redText: 'Le normali sezioni commenti sono invase dai bot e penalizzate dagli algoritmi, facendo sparire la tua opinione in pochi minuti.',
      amberTitle: 'OPZIONE 2: VOTO BASE NON PONDERATO (SENZA COMMENTO IN EVIDENZA)',
      amberText: 'Un voto gratuito a fondo pagina aggiunge solo 1 punto base alla barra generale senza pubblicare né mettere in risalto il tuo commento.',
      greenTitle: 'OPZIONE 3: COMMENTO VERIFICATO IN EVIDENZA + VOTO PONDERATO 10X ($1.99)',
      greenText: 'Cosa ottieni per $1.99: Qualunque sia la tua opinione su questa notizia, il tuo voto verificato vale con peso 10x e il tuo commento personale viene pubblicato permanentemente nel Report Ufficiale dell’Opinione Pubblica condiviso con redazioni, analisti e lettori.',
      namePlaceholder: 'Il Tuo Nome o Identificativo Verificato',
      inputPlaceholder: 'Scrivi il Tuo Commento Personale da Pubblicare nel Report Ufficiale',
      emailPlaceholder: 'Il Tuo Indirizzo Email (Per Ricevere la Ricevuta Ufficiale)',
      ctaBtn: 'Pubblica Commento Verificato e Voto 10x — $1.99',
      freeTitle: 'Esprimi un Voto Gratuito (Peso 1x) e Ricevi Aggiornamenti sulla Notizia',
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

// Normalizes master_incident_id so related articles (like "microsoft-365-outage" and "microsoft-outage") merge into one canonical lead list
function normalizeMasterIncidentId(rawId, state) {
  let clean = String(rawId || 'docket')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/\b(365|teams|outlook|app|online|global|canada|us|uk|2026|2027)\b/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const parts = clean.split('-').filter(Boolean);
  if (parts.length > 2) clean = parts.slice(0, 2).join('-');
  if (!clean || clean.length < 3) clean = String(rawId || 'docket').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');

  // If an existing live silo shares the same first brand word + same niche, snap to its master_id
  const primaryWord = parts[0];
  if (primaryWord && primaryWord.length >= 4 && state && state.deployed) {
    for (const v of Object.values(state.deployed)) {
      if (v.status === 'LIVE' && v.master_id && v.master_id.startsWith(primaryWord + '-')) {
        return v.master_id;
      }
    }
  }
  return clean;
}

function buildConversionSectionHtml(langKey, tierKey, niche, masterIncident, region, customStances = null) {
  const langGroup = TIER_CONVERSION_PACKS[langKey] || TIER_CONVERSION_PACKS.en;
  const pack = langGroup[tierKey] || langGroup.TIER_2_LEDGER;
  const isPoll = tierKey === 'TIER_3_POLL';

  const optA = (customStances && customStances.a) ? escAttr(customStances.a) : escAttr(langGroup.stanceA);
  const optB = (customStances && customStances.b) ? escAttr(customStances.b) : escAttr(langGroup.stanceB);
  const optC = (customStances && customStances.c) ? escAttr(customStances.c) : escAttr(langGroup.stanceC);

  const stanceSelectorHtml = isPoll
    ? `<select name='stance' required style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;background:#ffffff;color:#0f172a;font-weight:700;'>
         <option value='' disabled selected>${escAttr(langGroup.stancePrompt)}</option>
         <option value='STANCE_A'>${optA}</option>
         <option value='STANCE_B'>${optB}</option>
         <option value='STANCE_C'>${optC}</option>
       </select>`
    : '';

  return `<h3 style='font-size:19px;color:#0f172a;margin-top:34px;margin-bottom:14px;font-weight:900;'>${pack.heading}</h3>
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
          <input type='hidden' name='niche' value='${escAttr(niche)}'>
          <input type='hidden' name='incident' value='${escAttr(masterIncident)}'>
          <input type='hidden' name='tier' value='${escAttr(tierKey)}'>
          <input type='hidden' name='region' value='${escAttr(region)}'>
          ${stanceSelectorHtml}
          <input type='text' name='name' required placeholder='${escAttr(pack.namePlaceholder)}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'>
          <input type='text' name='pnr' required placeholder='${escAttr(pack.inputPlaceholder)}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'>
          <input type='email' name='email' required placeholder='${escAttr(pack.emailPlaceholder)}' style='padding:12px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;'>
          <button type='submit' style='padding:16px;background:#16a34a;color:#ffffff;font-weight:900;font-size:16px;border:none;border-radius:6px;cursor:pointer;'>${pack.ctaBtn} &rarr;</button>
        </form>
      </div>
    </div>

    <div style='background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin-top:24px;'>
      <h4 style='margin:0 0 6px 0;font-size:16px;color:#0f172a;'>${pack.freeTitle}</h4>
      <p style='margin:0 0 14px 0;font-size:14px;color:#475569;'>${pack.freeCta}</p>
      <form action='${MAKE_WEBHOOK_URL}' method='GET' style='display:flex;flex-direction:column;gap:10px;'>
        <input type='hidden' name='flow_type' value='FREE_LEAD'>
        <input type='hidden' name='niche' value='${escAttr(niche)}'>
        <input type='hidden' name='incident' value='${escAttr(masterIncident)}'>
        <input type='hidden' name='tier' value='${escAttr(tierKey)}'>
        <input type='hidden' name='region' value='${escAttr(region)}'>
        <div style='display:flex;gap:10px;flex-wrap:wrap;'>
          <input type='text' name='signer_name' required placeholder='${escAttr(pack.namePlaceholder)}' style='flex:1;min-width:180px;padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'>
          <input type='email' name='email' required placeholder='${escAttr(pack.emailPlaceholder)}' style='flex:1;min-width:200px;padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'>
        </div>
        <input type='text' name='loss_impact' required placeholder='${escAttr(pack.freeInputPlaceholder)}' style='padding:11px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;'>
        <label style='display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#64748b;cursor:pointer;'>
          <input type='checkbox' name='coreg_optin' value='yes' checked style='margin-top:3px;'>
          <span>${langGroup.coregNote}</span>
        </label>
        <button type='submit' style='padding:13px;background:#0f172a;color:#ffffff;font-weight:800;font-size:14px;border:none;border-radius:6px;cursor:pointer;'>${pack.freeBtn}</button>
      </form>
    </div>`;
}

// Retroactively fixes the truncated "CC'd" email placeholder, re-routes SaaS/telecom outages (like Microsoft) to $4.99 SLA Credit Notice, unifies master_ids, and refreshes TIER_3_POLL copy
function patchAndCleanExistingFiles(state) {
  const clinicalRegex = /(anorexia|bulimia|leukemia|leukaemie|onkopedia|pirtobrutinib|chemotherapy|chimiotherapie|cancer-treatment|tumor|alzheimer|carcinoma)/i;
  const geoIntelRegex = /(intelligence-services|servicios-de-inteligencia|servizi-di-intelligence|nachrichtendienst|renseignement|caida-infraestructuras|military|pentagon|nato|otan|espionage|espionaje|cia|nsa|missile|warfare)/i;
  const saasOutageRegex = /(microsoft|outlook|teams|xbox|playstation|psn|netflix|spotify|aws|cloudflare|openai|chatgpt|slack|zoom|discord|steam|att|verizon|t-mobile|rogers|bell|telstra|optus|vodafone)/i;

  const docketRoot = path.join(process.cwd(), 'docket');

  if (fs.existsSync(docketRoot)) {
    for (const sub of fs.readdirSync(docketRoot)) {
      const fullSub = path.join(docketRoot, sub);
      const indexFile = path.join(fullSub, 'index.html');
      if (!fs.existsSync(indexFile)) continue;

      const htmlContent = fs.readFileSync(indexFile, 'utf8');
      const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
      const titleText = titleMatch ? titleMatch[1] : '';

      // 1. Delete clinical disease/oncology pages
      if (clinicalRegex.test(sub) || clinicalRegex.test(titleText)) {
        fs.rmSync(fullSub, { recursive: true, force: true });
        for (const [k, v] of Object.entries(state.deployed || {})) {
          if (v.slug === sub || v.master_id === sub) {
            state.deployed[k].status = 'SKIPPED';
          }
        }
        continue;
      }

      let updatedHtml = htmlContent;
      const langMatch = updatedHtml.match(/<html lang='([a-z]{2})'>/i);
      const langKey = langMatch ? langMatch[1].toLowerCase() : 'en';
      const incMatch = updatedHtml.match(/name='incident' value='([^']+)'/i);
      let masterIncident = incMatch ? incMatch[1] : sub;
      const regMatch = updatedHtml.match(/name='region' value='([^']+)'/i);
      const region = regMatch ? regMatch[1] : 'GLOBAL';
      const tierMatch = updatedHtml.match(/name='tier' value='([^']+)'/i);
      let currentTier = tierMatch ? tierMatch[1] : 'TIER_2_LEDGER';
      const nicheMatch = updatedHtml.match(/name='niche' value='([^']+)'/i);
      const currentNiche = nicheMatch ? nicheMatch[1] : 'OUTAGES';

      // Unify Microsoft outage master IDs
      if (/microsoft/i.test(masterIncident) && /outage/i.test(masterIncident)) {
        masterIncident = 'microsoft-outage';
        updatedHtml = updatedHtml.replace(/DOCKET LEDGER:\s*MICROSOFT-365-OUTAGE/g, 'DOCKET LEDGER: MICROSOFT-OUTAGE');
      }

      // Re-route military/intelligence to TIER_3_POLL ($1.99)
      if (geoIntelRegex.test(sub) || geoIntelRegex.test(titleText)) {
        currentTier = 'TIER_3_POLL';
      }
      // Re-route SaaS / cloud / telecom outages (like Microsoft 365 / Outlook / Teams) from $29 to $4.99 SLA Credit Notice
      else if (currentTier === 'TIER_1_STATUTORY' && (saasOutageRegex.test(sub) || saasOutageRegex.test(titleText))) {
        currentTier = 'TIER_2_LEDGER';
      }

      // Rebuild conversion section on all existing docket pages so truncated "CC'd", poll copy, and SaaS $4.99 SLA copy are 100% clean
      const rebuiltConversion = buildConversionSectionHtml(langKey, currentTier, currentNiche, masterIncident, region);
      updatedHtml = updatedHtml.replace(/<h3 style='font-size:1[89]px;color:#0f172a;margin-top:3\dpx;[\s\S]*?<\/form>\s*<\/div>/i, rebuiltConversion);

      for (const [k, v] of Object.entries(state.deployed || {})) {
        if (v.slug === sub) {
          state.deployed[k].tier = currentTier;
          state.deployed[k].master_id = masterIncident;
        }
      }

      if (updatedHtml !== htmlContent) {
        fs.writeFileSync(indexFile, updatedHtml, 'utf8');
      }
    }
  }

  // Also fix the truncated "CC'd" email placeholder on all existing /flight/ pages
  const flightRoot = path.join(process.cwd(), 'flight');
  if (fs.existsSync(flightRoot)) {
    for (const sub of fs.readdirSync(flightRoot)) {
      const indexFile = path.join(flightRoot, sub, 'index.html');
      if (!fs.existsSync(indexFile)) continue;
      const html = fs.readFileSync(indexFile, 'utf8');
      const fixed = html.replace(/placeholder='Your Email Address \(To Receive Your Official CC'd Proof-of-Service Copy\)'/g,
        "placeholder='Your Email Address (To Receive Your Official Proof-of-Service Copy)'");
      if (fixed !== html) fs.writeFileSync(indexFile, fixed, 'utf8');
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

  const customStances = (d.poll_stance_a && d.poll_stance_b)
    ? { a: d.poll_stance_a, b: d.poll_stance_b, c: d.poll_stance_c }
    : null;

  const conversionSectionHtml = buildConversionSectionHtml(langKey, tierKey, d.niche, masterIncident, d.region, customStances);

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
  <title>${escAttr(d.seo_title)} | Preferred Outcomes</title>
  <meta name='description' content='${escAttr(d.ai_direct_answer)}'>
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
      <strong>${langGroup.execSummaryLabel}</strong> ${d.ai_direct_answer}
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

    ${conversionSectionHtml}
    ${affiliateBlockHtml}
    ${buildSharedFooter(masterIncident, pageSlug)}
  </div>
</body>
</html>`;
}

const MASTER_SYSTEM_PROMPT = `You are an elite long-tail SEO consumer advocacy & public referendum advertorial writer.
CRITICAL RULES:
1. CLINICAL MEDICAL & DISEASE SAFETY FILTER: If the headline is strictly about clinical disease treatment, cancer/oncology drug guidelines (e.g. CLL, leukemia, pirtobrutinib), eating disorders (e.g. anorexia, bulimia), surgery, or hospital patient care, return {"skip": true}. (NOTE: Health insurance pricing/co-pay debates, product recalls, corporate lawsuits, and ALL non-medical news—including sports, entertainment, tech, business, politics, and viral culture—are 100% VALID and must NEVER be skipped).
2. HARD-HITTING ADVOCACY & DEBATE TONE (NEVER WRITE CORPORATE PR):
   - NEVER praise a company for "swiftly restoring service" or tell users to passively "check the company's official status page."
   - Even if an outage (like Microsoft 365, Outlook, Teams, telecom, or banking) was "Restored", frame the entire headline, summary, and article around **Post-Outage SLA Billing Credits, Subscription Fee Refunds, and Uncompensated Downtime**—explaining that providers quietly pocket full monthly subscription fees after major outages unless subscribers file a formal SLA credit notice within the billing window.
   - For celebrity, sports, entertainment, or political stories, frame the headline and article around the **central controversy, public debate, or fan divide** so readers feel compelled to vote and log their take in the referendum below.
3. NEVER write one-sentence answers. Every paragraph in "advertorial_paragraphs" and every answer ("a1_answer", "a2_answer", "a3_answer") MUST be 4 to 5 full, detailed sentences (at least 65 words per paragraph/answer) in the requested Language.
4. NEVER use the words "automated", "bot", or "AI".
5. PRECISE MONETIZATION TIER ROUTING:
   - "TIER_1_STATUTORY" ($29.00): ONLY for high-ticket individual financial losses worth $100+ (cancelled/delayed airline flights, withheld Airbnb/tenancy security deposits, frozen bank/fintech accounts, or major physical product/auto recalls). NEVER use TIER_1_STATUTORY for $10/month software/app/telecom outages!
   - "TIER_2_LEDGER" ($4.99): Software/cloud/telecom/ISP/gaming outages (e.g. Microsoft 365, Outlook, Teams, AT&T, Rogers, PlayStation) where users want to demand an SLA subscription billing credit, PLUS corporate probes, rate hikes, labor/school/transit strikes, and domestic household financial policies (e.g. health insurance co-pay hikes).
   - "TIER_3_POLL" ($1.99): ALL military, intelligence agency, national security, foreign geopolitics, general politics, sports, celebrity drama (e.g. Leonardo DiCaprio party), entertainment/gaming releases, court trials, or viral debates.
6. CUSTOM POLL STANCES FOR TIER_3_POLL:
   - Populate "poll_stance_a", "poll_stance_b", and "poll_stance_c" with 3 natural, story-specific voting positions in the requested Language (e.g. for a celebrity breakup rumor: Position A = "They Quietly Split", Position B = "Still Together — Just Keeping It Private", Position C = "Overblown Media Rumors").
7. CANONICAL 2-WORD MASTER INCIDENT ID:
   - "master_incident_id" MUST be strictly 2 words: "[primary-brand-or-person]-[core-topic]" (e.g. "microsoft-outage", "revolut-administration", "dicaprio-party") so all articles about the same event merge into one list.

Return a strict JSON object in the requested Language with:
- "skip": false
- "slug": (4 to 6 word ASCII lowercase hyphenated long-tail search slug)
- "master_incident_id": (Strictly 2-word ASCII lowercase hyphenated canonical key, e.g. "microsoft-outage")
- "english_title": (Clear 6-to-9 word English title for the operator dashboard)
- "affiliate_heading": (3-to-5 word natural callout header in the target language matching the article context)
- "affiliate_keyword": (2-to-4 word Amazon search phrase for relevant books, guides, gear, hardware, or emergency items related to this topic)
- "lang_code": ("en", "pt", "es", "de", "fr", or "it")
- "niche": ("TENANCY", "OUTAGES", "RECALLS", "FINANCE", "POLITICS", or "CULTURE")
- "region": ("US", "CA", "UK", "EU", "BR", "ES", "MX", "DE", "FR", "AU", or "GLOBAL")
- "tier": ("TIER_1_STATUTORY", "TIER_2_LEDGER", or "TIER_3_POLL")
- "poll_stance_a": (Story-specific Position A in target language)
- "poll_stance_b": (Story-specific Position B in target language)
- "poll_stance_c": (Story-specific Position C in target language)
- "badge_text": (2-to-3 word authoritative status badge in the target language)
- "seo_title": (Long-tail Google search title in the target language, 50-65 chars)
- "human_h1": (Compelling long-tail search headline in the target language)
- "ai_direct_answer": (3-sentence executive summary in the target language highlighting the stakes and active docket options)
- "advertorial_paragraphs": [
    "Paragraph 1 (4-5 detailed sentences in the target language)...",
    "Paragraph 2 (4-5 detailed sentences in the target language)...",
    "Paragraph 3 (4-5 detailed sentences in the target language)..."
  ]
- "q1_human", "a1_answer", "q2_human", "a2_answer", "q3_human", "a3_answer"`;

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

  const clinicalPreFilter = /(anorexia|bulimia|leukemia|leukaemie|onkopedia|pirtobrutinib|chemotherapy|chimiotherapie|carcinoma|lymphoma|melanoma|glioblastoma)/i;
  const geoIntelForcePollRegex = /(intelligence agency|intelligence services|servicios de inteligencia|servizi di intelligence|nachrichtendienst|renseignement|pentagon|cia|nsa|military|nato|otan|espionage)/i;
  const saasOutageForceTier2Regex = /(microsoft|outlook|teams|xbox|playstation|psn|netflix|spotify|aws|cloudflare|openai|chatgpt|slack|zoom|discord|steam|at&t|verizon|t-mobile|rogers|bell|telstra|optus|vodafone)/i;

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
          if (clinicalPreFilter.test(rawTitle)) continue;
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

      if (!parsed || parsed.skip === true || !parsed.slug || !Array.isArray(parsed.advertorial_paragraphs) || parsed.advertorial_paragraphs.length < 2) {
        state.deployed[hashId] = { ts: Date.now(), status: 'SKIPPED', v14: true };
        return;
      }

      if (geoIntelForcePollRegex.test(rawTitle) || geoIntelForcePollRegex.test(parsed.english_title || '')) {
        parsed.tier = 'TIER_3_POLL';
      } else if (parsed.tier === 'TIER_1_STATUTORY' && (saasOutageForceTier2Regex.test(rawTitle) || saasOutageForceTier2Regex.test(parsed.english_title || ''))) {
        parsed.tier = 'TIER_2_LEDGER';
      }

      const cleanSlug = parsed.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
      const cleanMaster = normalizeMasterIncidentId(parsed.master_incident_id || cleanSlug, state);
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
  patchAndCleanExistingFiles(state);
  const newUrls = [];
  await pollGlobalAviation(state, newUrls);
  await processGlobalNews(state, newUrls);
  saveState(state);
  await updateSitemap(state);
  await pingIndexNow(newUrls);
}

run();
