import http from "node:http";
import { randomUUID, createHmac, timingSafeEqual, scryptSync } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.API_PORT || 8000);
const DATA_DIR = join(__dirname, "data");
const DB_PATH = join(DATA_DIR, "local-db.json");
const SECRET = process.env.SECRET_KEY || "fundakamental-local-dev-secret";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const now = () => new Date().toISOString();

const yahooTickerSymbols = [
  "RELIANCE.NS",
  "TCS.NS",
  "INFY.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
  "WIPRO.NS",
  "SBIN.NS",
  "MARUTI.NS",
  "AXISBANK.NS",
  "TITAN.NS",
  "BAJFINANCE.NS",
  "ULTRACEMCO.NS",
  "ADANIENT.NS",
  "HINDUNILVR.NS",
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "TSLA",
  "NVDA",
  "META",
  "JPM",
  "BRK-B",
  "NFLX",
  "ASML.AS",
  "SAP.DE",
  "LVMH.PA",
  "SHEL.L",
  "NESN.SW",
  "7203.T",
  "005930.KS",
  "0700.HK",
  "BTC-USD",
  "ETH-USD",
  "SOL-USD",
  "BNB-USD",
  "^NSEI",
  "^BSESN",
  "^GSPC",
  "^DJI",
  "^IXIC",
];

const stocks = [
  ["RELIANCE", "Reliance Industries Ltd.", "Energy", "NSE", 2918.4, 21.25, 1.02, 26.4, 8.5, 7.9, "19.7T", 9.4],
  ["TCS", "Tata Consultancy Services Ltd.", "IT", "NSE", 3842.2, -18.1, -0.47, 30.8, 5.7, 23.4, "13.9T", 52.1],
  ["INFY", "Infosys Ltd.", "IT", "NSE", 1488.6, 13.45, 0.91, 23.1, 6.4, 18.9, "6.2T", 31.8],
  ["HDFCBANK", "HDFC Bank Ltd.", "Banking", "NSE", 1537.8, -6.2, -0.4, 18.7, 15.2, 20.7, "11.7T", 15.8],
  ["ICICIBANK", "ICICI Bank Ltd.", "Banking", "NSE", 1112.7, 8.4, 0.76, 19.9, 17.1, 21.1, "7.8T", 17.2],
  ["WIPRO", "Wipro Ltd.", "IT", "NSE", 482.35, 2.9, 0.6, 21.6, 3.9, 15.3, "2.5T", 16.1],
  ["SBIN", "State Bank of India", "Banking", "NSE", 817.4, 7.2, 0.89, 10.2, 14.6, 16.8, "7.3T", 18.4],
  ["MARUTI", "Maruti Suzuki India Ltd.", "Auto", "NSE", 12420.5, -114.6, -0.91, 28.9, 14.2, 8.8, "3.9T", 15.6],
  ["AXISBANK", "Axis Bank Ltd.", "Banking", "NSE", 1194.15, 6.75, 0.57, 14.8, 13.7, 18.4, "3.7T", 16.9],
  ["TITAN", "Titan Company Ltd.", "Consumer", "NSE", 3544.2, -22.35, -0.63, 82.4, 20.3, 9.6, "3.1T", 28.5],
  ["BAJFINANCE", "Bajaj Finance Ltd.", "Financials", "NSE", 6824.9, 41.75, 0.62, 29.7, 24.8, 22.4, "4.2T", 19.7],
  ["ULTRACEMCO", "UltraTech Cement Ltd.", "Materials", "NSE", 10184.0, 95.1, 0.94, 42.5, 11.1, 12.7, "2.9T", 13.8],
].map(([ticker, company, sector, exchange, price, change, changePct, pe, revenue, margin, marketCap, roe]) => ({
  ticker,
  company,
  name: company,
  sector,
  exchange,
  price,
  change,
  change_percent: changePct,
  pe_ratio: pe,
  pb_ratio: sector === "Banking" ? 2.4 : 6.8,
  revenue_growth: revenue,
  profit_margin: margin,
  market_cap: marketCap,
  roe,
  debt_to_equity: sector === "Banking" || sector === "Financials" ? 0 : 0.42,
  dividend_yield: 0.7,
  current_ratio: 1.35,
  match_score: Math.round(70 + Number(revenue) / 3 + Number(margin) / 4),
}));

const globalQuoteFallbacks = {
  AAPL: { name: "Apple Inc.", exchange: "NASDAQ", price: 189.98, change: 1.18, change_percent: 0.62, currency: "USD", market_cap: "2.9T", sector: "Technology" },
  MSFT: { name: "Microsoft Corporation", exchange: "NASDAQ", price: 428.74, change: -0.77, change_percent: -0.18, currency: "USD", market_cap: "3.2T", sector: "Technology" },
  GOOGL: { name: "Alphabet Inc.", exchange: "NASDAQ", price: 176.34, change: 0.48, change_percent: 0.27, currency: "USD", market_cap: "2.1T", sector: "Communication Services" },
  AMZN: { name: "Amazon.com Inc.", exchange: "NASDAQ", price: 183.12, change: 1.92, change_percent: 1.06, currency: "USD", market_cap: "1.9T", sector: "Consumer" },
  TSLA: { name: "Tesla Inc.", exchange: "NASDAQ", price: 178.08, change: -2.14, change_percent: -1.19, currency: "USD", market_cap: "568B", sector: "Auto" },
  NVDA: { name: "NVIDIA Corporation", exchange: "NASDAQ", price: 1134.8, change: 24.2, change_percent: 2.18, currency: "USD", market_cap: "2.8T", sector: "Technology" },
  META: { name: "Meta Platforms Inc.", exchange: "NASDAQ", price: 493.65, change: 3.36, change_percent: 0.69, currency: "USD", market_cap: "1.25T", sector: "Communication Services" },
  JPM: { name: "JPMorgan Chase & Co.", exchange: "NYSE", price: 204.3, change: 0.7, change_percent: 0.34, currency: "USD", market_cap: "585B", sector: "Financials" },
  "BRK-B": { name: "Berkshire Hathaway Inc.", exchange: "NYSE", price: 414.5, change: -1.12, change_percent: -0.27, currency: "USD", market_cap: "894B", sector: "Financials" },
  NFLX: { name: "Netflix Inc.", exchange: "NASDAQ", price: 642.1, change: 4.7, change_percent: 0.74, currency: "USD", market_cap: "276B", sector: "Communication Services" },
  "BTC-USD": { name: "Bitcoin USD", exchange: "Crypto", price: 68240.2, change: 0, change_percent: 1.9, currency: "USD", market_cap: "1.3T", sector: "Crypto" },
  "ETH-USD": { name: "Ethereum USD", exchange: "Crypto", price: 3678.8, change: 0, change_percent: -0.72, currency: "USD", market_cap: "442B", sector: "Crypto" },
  "SOL-USD": { name: "Solana USD", exchange: "Crypto", price: 159.4, change: 0, change_percent: 2.4, currency: "USD", market_cap: "73B", sector: "Crypto" },
  "BNB-USD": { name: "BNB USD", exchange: "Crypto", price: 594.2, change: 0, change_percent: 0.8, currency: "USD", market_cap: "88B", sector: "Crypto" },
};

function fallbackQuoteForSymbol(symbol) {
  const clean = String(symbol).replace(/\.(NS|BO)$/i, "");
  const local = stocks.find((stock) => stock.ticker === clean.toUpperCase());
  if (local) {
    return {
      symbol: local.ticker,
      yahoo_symbol: symbol,
      name: local.company,
      exchange: local.exchange || "NSE",
      price: local.price,
      change: local.change,
      change_percent: local.change_percent,
      currency: symbol.endsWith(".NS") || symbol.endsWith(".BO") ? "INR" : "USD",
      market_cap: local.market_cap,
      sector: local.sector,
    };
  }

  const global = globalQuoteFallbacks[symbol] || globalQuoteFallbacks[clean] || globalQuoteFallbacks.AAPL;
  return {
    symbol: clean,
    yahoo_symbol: symbol,
    name: global.name,
    exchange: global.exchange,
    price: global.price,
    change: global.change,
    change_percent: global.change_percent,
    currency: global.currency,
    market_cap: global.market_cap,
    sector: global.sector,
  };
}

async function fetchYahooQuotes(symbols) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 FundaKaMental/1.0",
      },
    });

    if (!response.ok) throw new Error(`Yahoo returned ${response.status}`);
    const data = await response.json();

    return (data.quoteResponse?.result || []).map((quote) => {
      const fallback = fallbackQuoteForSymbol(quote.symbol);
      const price = Number(quote.regularMarketPrice ?? fallback.price);
      const change = Number(quote.regularMarketChange ?? fallback.change);
      const changePercent = Number(quote.regularMarketChangePercent ?? fallback.change_percent);

      return {
        symbol: fallback.symbol,
        yahoo_symbol: quote.symbol,
        name: quote.shortName || quote.longName || fallback.name,
        exchange: quote.fullExchangeName?.includes("BSE") ? "BSE" : "NSE",
        price,
        change,
        change_percent: changePercent,
        currency: quote.currency || fallback.currency,
        market_cap: quote.marketCap || fallback.market_cap,
        sector: fallback.sector,
      };
    });
  } catch (error) {
    console.warn(`Yahoo quote fallback used: ${error.message}`);
    return symbols.map((symbol) => {
      return fallbackQuoteForSymbol(symbol);
    });
  }
}

function emptyDb() {
  const demoUserId = randomUUID();
  const defaultPortfolioId = randomUUID();
  const defaultWatchlistId = randomUUID();

  return {
    users: [
      {
        id: demoUserId,
        name: "Demo User",
        email: "demo@fundakamental.local",
        password_hash: hashPassword("password123"),
        plan: "free",
        reports_used: 0,
        reports_limit: 5,
        created_at: now(),
      },
    ],
    reports: [],
    uploaded_files: [],
    chat_messages: [],
    portfolios: [
      {
        id: defaultPortfolioId,
        user_id: demoUserId,
        name: "Main Portfolio",
        description: "Default local portfolio",
        currency: "USD",
        is_default: true,
        created_at: now(),
      },
    ],
    portfolio_transactions: [],
    watchlists: [
      {
        id: defaultWatchlistId,
        user_id: demoUserId,
        name: "Core Watchlist",
        description: "Stocks to monitor",
        color: "#3b82f6",
        is_default: true,
        sort_order: 0,
        created_at: now(),
      },
    ],
    watchlist_items: [
      {
        id: randomUUID(),
        watchlist_id: defaultWatchlistId,
        user_id: demoUserId,
        ticker: "RELIANCE",
        company_name: "Reliance Industries Ltd.",
        added_price: 2918.4,
        target_price: 2850,
        target_price_type: "BUY",
        notes: "Quality compounder",
        tags: ["quality"],
        created_at: now(),
      },
      {
        id: randomUUID(),
        watchlist_id: defaultWatchlistId,
        user_id: demoUserId,
        ticker: "TCS",
        company_name: "Tata Consultancy Services Ltd.",
        added_price: 3842.2,
        target_price: 4100,
        target_price_type: "SELL",
        notes: "Cloud and AI leader",
        tags: ["cloud"],
        created_at: now(),
      },
    ],
  };
}

function loadDb() {
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_PATH)) saveDb(emptyDb());
  return JSON.parse(readFileSync(DB_PATH, "utf8"));
}

function saveDb(db) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(data) {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

function createToken(user) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    sub: user.id,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  }));
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

function verifyToken(token) {
  const [header, payload, signature] = String(token || "").split(".");
  if (!header || !payload || !signature) return null;
  const expected = sign(`${header}.${payload}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
  return decoded;
}

function hashPassword(password) {
  const salt = "local-dev-salt";
  return scryptSync(password, salt, 64).toString("hex");
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan || "free",
    reports_used: user.reports_used || 0,
    reports_limit: user.reports_limit || 5,
    created_at: user.created_at || now(),
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const type = req.headers["content-type"] || "";
  if (type.includes("application/json")) return raw.length ? JSON.parse(raw.toString("utf8")) : {};
  return { raw };
}

function send(res, status, data, headers = {}) {
  const body = data instanceof Buffer ? data : JSON.stringify(data);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": data instanceof Buffer ? "application/pdf" : "application/json",
    ...headers,
  });
  res.end(body);
}

function getUser(req, db) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const payload = verifyToken(token);
  if (!payload) return null;
  return db.users.find((user) => user.id === payload.sub) || null;
}

function requireUser(req, res, db) {
  const user = getUser(req, db);
  if (!user) send(res, 401, { detail: "Authentication required" });
  return user;
}

function stockByTicker(ticker) {
  return stocks.find((stock) => stock.ticker === String(ticker).replace(/\.(NS|BO)$/i, "").toUpperCase()) || stocks[0];
}

function makeReport(userId, ticker = "AAPL", companyName) {
  const stock = stockByTicker(ticker);
  const score = Math.max(5.5, Math.min(9.5, 6 + stock.profit_margin / 20 + stock.revenue_growth / 30));
  return {
    id: randomUUID(),
    user_id: userId,
    company: companyName || stock.company,
    ticker: stock.ticker,
    exchange: "NASDAQ",
    date: now(),
    created_at: now(),
    status: "completed",
    overall_score: Number(score.toFixed(1)),
    overallScore: Number(score.toFixed(1)),
    summary: `${stock.company} shows ${stock.revenue_growth >= 10 ? "strong" : "steady"} growth, ${stock.profit_margin >= 20 ? "healthy" : "mixed"} margins, and a ${stock.pe_ratio > 35 ? "premium" : "reasonable"} valuation profile.`,
    metrics: {
      profitability: { score: Math.min(9.7, 5 + stock.profit_margin / 8), label: stock.profit_margin > 25 ? "Excellent" : "Good" },
      liquidity: { score: 7.6, label: "Good" },
      solvency: { score: stock.debt_to_equity > 1.5 ? 6.8 : 8.4, label: stock.debt_to_equity > 1.5 ? "Moderate" : "Strong" },
      efficiency: { score: Math.min(9.5, 6 + stock.roe / 20), label: "Strong" },
    },
    key_ratios: [
      { name: "P/E Ratio", value: `${stock.pe_ratio}x`, benchmark: "Industry: 25.2x" },
      { name: "Revenue Growth", value: `${stock.revenue_growth}%`, benchmark: "Industry: 8.0%" },
      { name: "Profit Margin", value: `${stock.profit_margin}%`, benchmark: "Industry: 18.0%" },
      { name: "ROE", value: `${stock.roe}%`, benchmark: "Industry: 18.4%" },
    ],
    keyRatios: [
      { name: "P/E Ratio", value: `${stock.pe_ratio}x`, benchmark: "Industry: 25.2x" },
      { name: "Revenue Growth", value: `${stock.revenue_growth}%`, benchmark: "Industry: 8.0%" },
      { name: "Profit Margin", value: `${stock.profit_margin}%`, benchmark: "Industry: 18.0%" },
      { name: "ROE", value: `${stock.roe}%`, benchmark: "Industry: 18.4%" },
    ],
    strengths: ["Durable market position", "Solid cash generation", "Recognizable brand and customer base"],
    red_flags: stock.pe_ratio > 35 ? ["Valuation leaves less room for disappointment", "Growth expectations are high"] : ["Macroeconomic sensitivity", "Competitive pressure remains a watch item"],
    redFlags: stock.pe_ratio > 35 ? ["Valuation leaves less room for disappointment", "Growth expectations are high"] : ["Macroeconomic sensitivity", "Competitive pressure remains a watch item"],
    investment_assessment: `A balanced view suggests ${stock.ticker} is best suited for investors comfortable with the current growth and valuation trade-off.`,
    investmentAssessment: `A balanced view suggests ${stock.ticker} is best suited for investors comfortable with the current growth and valuation trade-off.`,
  };
}

function holdingsFor(db, portfolioId) {
  const txs = db.portfolio_transactions.filter((tx) => tx.portfolio_id === portfolioId);
  const map = new Map();
  for (const tx of txs) {
    const key = tx.ticker;
    const current = map.get(key) || { quantity: 0, total_cost: 0, company_name: tx.company_name || stockByTicker(key).company };
    const qty = Number(tx.quantity);
    const cost = qty * Number(tx.price_per_share) + Number(tx.fees || 0);
    if (tx.transaction_type === "SELL") {
      current.quantity -= qty;
      current.total_cost -= Math.min(current.total_cost, cost);
    } else if (tx.transaction_type === "BUY") {
      current.quantity += qty;
      current.total_cost += cost;
    }
    map.set(key, current);
  }
  return [...map.entries()].filter(([, h]) => h.quantity > 0).map(([ticker, h]) => {
    const stock = stockByTicker(ticker);
    const currentValue = h.quantity * stock.price;
    const gainLoss = currentValue - h.total_cost;
    return {
      id: `${portfolioId}-${ticker}`,
      ticker,
      company_name: h.company_name,
      quantity: h.quantity,
      avg_cost_basis: h.total_cost / h.quantity,
      total_cost: h.total_cost,
      current_price: stock.price,
      current_value: currentValue,
      gain_loss: gainLoss,
      gain_loss_pct: h.total_cost ? (gainLoss / h.total_cost) * 100 : 0,
    };
  });
}

function portfolioSummary(db, portfolioId) {
  const holdings = holdingsFor(db, portfolioId);
  const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.total_cost, 0);
  const sorted = [...holdings].sort((a, b) => b.gain_loss_pct - a.gain_loss_pct);
  return {
    portfolio_id: portfolioId,
    total_value: totalValue,
    total_cost: totalCost,
    total_gain_loss: totalValue - totalCost,
    gain_loss_pct: totalCost ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    num_holdings: holdings.length,
    best_performer: sorted[0] ? { ticker: sorted[0].ticker, gain_loss_pct: sorted[0].gain_loss_pct } : null,
    worst_performer: sorted.at(-1) ? { ticker: sorted.at(-1).ticker, gain_loss_pct: sorted.at(-1).gain_loss_pct } : null,
  };
}

function watchlistItems(db, watchlistId) {
  return db.watchlist_items.filter((item) => item.watchlist_id === watchlistId).map((item) => {
    const stock = stockByTicker(item.ticker);
    const targetDistance = item.target_price ? stock.price - item.target_price : null;
    return {
      ...item,
      current_price: stock.price,
      change: stock.change,
      change_pct: stock.change_percent,
      target_distance: targetDistance,
      target_distance_pct: item.target_price ? (targetDistance / item.target_price) * 100 : null,
    };
  });
}

function watchlistSummary(db, watchlistId) {
  const items = watchlistItems(db, watchlistId);
  const sorted = [...items].sort((a, b) => b.change_pct - a.change_pct);
  return {
    summary: {
      total_items: items.length,
      tracked_value: items.reduce((sum, item) => sum + (item.current_price || 0), 0),
      avg_change_pct: items.length ? items.reduce((sum, item) => sum + item.change_pct, 0) / items.length : 0,
      best_performer: sorted[0] ? { ticker: sorted[0].ticker, change_pct: sorted[0].change_pct } : null,
      worst_performer: sorted.at(-1) ? { ticker: sorted.at(-1).ticker, change_pct: sorted.at(-1).change_pct } : null,
      targets_hit: items.filter((item) => item.target_price && Math.abs(item.target_distance_pct) <= 1).length,
      targets_near: items.filter((item) => item.target_price && Math.abs(item.target_distance_pct) <= 5).length,
    },
  };
}

async function handle(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const db = loadDb();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    if (path === "/" || path === "/health" || path === "/api/health") {
      return send(res, 200, { status: "healthy", app: "FundaKaMental Local API", port: PORT });
    }

    if (path === "/api/search" && req.method === "GET") {
      const q = url.searchParams.get("q") || "";
      const yahooUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0`;
      try {
        const response = await fetch(yahooUrl, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (!response.ok) throw new Error(`Yahoo returned status ${response.status}`);
        const data = await response.json();
        return send(res, 200, data);
      } catch (error) {
        console.error("Yahoo Finance search proxy error:", error);
        return send(res, 500, { detail: error.message || "Internal server error" });
      }
    }

    if (path === "/api/market/ticker" && req.method === "GET") {
      const requested = url.searchParams.get("symbols");
      const symbols = requested ? requested.split(",").map((symbol) => symbol.trim()).filter(Boolean) : yahooTickerSymbols;
      return send(res, 200, { quotes: await fetchYahooQuotes(symbols) });
    }

    if (path === "/api/auth/register" && req.method === "POST") {
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      if (!email || !body.password || !body.name) return send(res, 400, { detail: "Name, email and password are required" });
      if (String(body.password).length < 8) return send(res, 400, { detail: "Password must be at least 8 characters" });
      if (db.users.some((user) => user.email === email)) return send(res, 400, { detail: "Email already registered" });
      const user = { id: randomUUID(), name: body.name, email, password_hash: hashPassword(body.password), plan: "free", reports_used: 0, reports_limit: 5, created_at: now() };
      db.users.push(user);
      db.portfolios.push({ id: randomUUID(), user_id: user.id, name: "Main Portfolio", description: "", currency: "USD", is_default: true, created_at: now() });
      db.watchlists.push({ id: randomUUID(), user_id: user.id, name: "Core Watchlist", description: "", color: "#3b82f6", is_default: true, sort_order: 0, created_at: now() });
      saveDb(db);
      return send(res, 201, { access_token: createToken(user), token_type: "bearer", expires_in: TOKEN_TTL_SECONDS, user: publicUser(user) });
    }

    if (path === "/api/auth/login" && req.method === "POST") {
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const user = db.users.find((candidate) => candidate.email === email);
      if (!user || user.password_hash !== hashPassword(body.password || "")) return send(res, 401, { detail: "Invalid email or password" });
      return send(res, 200, { access_token: createToken(user), token_type: "bearer", expires_in: TOKEN_TTL_SECONDS, user: publicUser(user) });
    }

    if (path === "/api/auth/logout" && req.method === "POST") return send(res, 200, { message: "Successfully logged out" });

    if (path === "/api/auth/me") {
      const user = requireUser(req, res, db);
      if (!user) return;
      if (req.method === "GET") return send(res, 200, publicUser(user));
      if (req.method === "PATCH") {
        const body = await readBody(req);
        if (body.name) user.name = body.name;
        if (body.avatar_url) user.avatar_url = body.avatar_url;
        saveDb(db);
        return send(res, 200, publicUser(user));
      }
    }

    if (path === "/api/stocks/search" && req.method === "GET") {
      const query = (url.searchParams.get("query") || "").toLowerCase();
      const normalized = query.replace(/\.(ns|bo)$/i, "");
      return send(res, 200, {
        results: stocks.filter((stock) => {
          const haystack = `${stock.company} ${stock.ticker} ${stock.sector} ${stock.exchange}`.toLowerCase();
          return haystack.includes(normalized) || normalized.split("").every((char) => haystack.includes(char));
        }).slice(0, 12).map((stock) => ({
          id: stock.ticker,
          name: stock.company,
          ticker: stock.ticker,
          sector: stock.sector,
          exchange: stock.exchange || "NSE",
          price: stock.price,
          change_percent: stock.change_percent,
          pe_ratio: stock.pe_ratio,
          revenue_growth: stock.revenue_growth,
          profit_margin: stock.profit_margin,
          market_cap: stock.market_cap,
          marketCap: stock.market_cap,
        })),
      });
    }

    if (path === "/api/stocks/screener" && req.method === "POST") {
      const body = await readBody(req);
      const filters = body.filters || [];
      let results = [...stocks];
      for (const filter of filters) {
        results = results.filter((stock) => {
          const actual = stock[filter.field];
          const expected = filter.field === "sector" ? String(filter.value) : Number(filter.value);
          if (filter.operator === "eq") return String(actual).toLowerCase() === String(expected).toLowerCase();
          if (filter.operator === "gt") return Number(actual) > expected;
          if (filter.operator === "gte") return Number(actual) >= expected;
          if (filter.operator === "lt") return Number(actual) < expected;
          if (filter.operator === "lte") return Number(actual) <= expected;
          return true;
        });
      }
      const sortBy = body.sort_by || "match_score";
      results.sort((a, b) => (Number(a[sortBy]) - Number(b[sortBy])) * (body.sort_order === "asc" ? 1 : -1));
      return send(res, 200, { total: results.length, results: results.slice(0, body.limit || 100) });
    }

    const stockDetailMatch = path.match(/^\/api\/stocks\/details\/([^/]+)$/);
    if (stockDetailMatch && req.method === "GET") return send(res, 200, stockByTicker(stockDetailMatch[1]));

    const technicalMatch = path.match(/^\/api\/stocks\/([^/]+)\/technicals$/);
    if (technicalMatch && req.method === "GET") {
      const stock = stockByTicker(technicalMatch[1]);
      return send(res, 200, {
        ticker: stock.ticker,
        period: url.searchParams.get("period") || "1y",
        indicators: { rsi: 58.4, macd: 1.8, sma_50: stock.price * 0.96, sma_200: stock.price * 0.88 },
        signals: [{ type: "momentum", label: "Neutral Bullish", confidence: 72 }],
      });
    }

    const signalMatch = path.match(/^\/api\/stocks\/([^/]+)\/signals$/);
    if (signalMatch && req.method === "GET") return send(res, 200, { ticker: signalMatch[1].toUpperCase(), signals: [{ action: "HOLD", confidence: 74, reason: "Trend remains constructive but valuation should be watched." }] });

    if (path === "/api/analysis/upload" && req.method === "POST") {
      const user = requireUser(req, res, db);
      if (!user) return;
      const file = { file_id: randomUUID(), file_name: "uploaded-document", file_size: Number(req.headers["content-length"] || 0), uploaded_at: now(), user_id: user.id };
      db.uploaded_files.push(file);
      saveDb(db);
      return send(res, 200, file);
    }

    if (path === "/api/analysis/analyze" && req.method === "POST") {
      const user = requireUser(req, res, db);
      if (!user) return;
      const body = await readBody(req);
      const report = makeReport(user.id, body.ticker || body.company_ticker || "AAPL", body.company || body.company_name);
      db.reports.unshift(report);
      user.reports_used = (user.reports_used || 0) + 1;
      saveDb(db);
      return send(res, 200, { analysis_id: report.id, report_id: report.id, status: "completed" });
    }

    const statusMatch = path.match(/^\/api\/analysis\/status\/([^/]+)$/);
    if (statusMatch && req.method === "GET") return send(res, 200, { report_id: statusMatch[1], status: "completed", overall_progress: 100, steps: [] });

    if (path === "/api/reports" && req.method === "GET") {
      const user = requireUser(req, res, db);
      if (!user) return;
      const reports = db.reports.filter((report) => report.user_id === user.id);
      return send(res, 200, { total: reports.length, reports });
    }

    const reportMatch = path.match(/^\/api\/reports\/([^/]+)$/);
    if (reportMatch) {
      const user = requireUser(req, res, db);
      if (!user) return;
      const report = db.reports.find((item) => item.id === reportMatch[1] && item.user_id === user.id) || makeReport(user.id, reportMatch[1] === "2" ? "MSFT" : reportMatch[1] === "3" ? "TSLA" : "AAPL");
      if (req.method === "GET") return send(res, 200, report);
      if (req.method === "DELETE") {
        db.reports = db.reports.filter((item) => item.id !== reportMatch[1]);
        saveDb(db);
        return send(res, 200, { success: true });
      }
    }

    if (path === "/api/chat/message" && req.method === "POST") {
      const user = requireUser(req, res, db);
      if (!user) return;
      const body = await readBody(req);
      const response = `Based on the report, ${body.message?.toLowerCase().includes("risk") ? "the main risks are valuation, competition, and macro sensitivity." : "the company has solid fundamentals with a few valuation and execution points to monitor."}`;
      const msg = { id: randomUUID(), user_id: user.id, report_id: body.report_id, role: "assistant", content: response, created_at: now() };
      db.chat_messages.push({ ...msg, role: "user", content: body.message });
      db.chat_messages.push(msg);
      saveDb(db);
      return send(res, 200, { response, timestamp: now(), sources: [] });
    }

    const chatMatch = path.match(/^\/api\/chat\/history\/([^/]+)$/);
    if (chatMatch && req.method === "GET") return send(res, 200, { messages: db.chat_messages.filter((msg) => msg.report_id === chatMatch[1]) });

    if (path === "/api/portfolios/portfolios" && req.method === "GET") {
      const user = requireUser(req, res, db);
      if (!user) return;
      return send(res, 200, db.portfolios.filter((p) => p.user_id === user.id));
    }
    if (path === "/api/portfolios/portfolios" && req.method === "POST") {
      const user = requireUser(req, res, db);
      if (!user) return;
      const body = await readBody(req);
      const portfolio = { id: randomUUID(), user_id: user.id, name: body.name, description: body.description || "", currency: body.currency || "USD", is_default: !!body.is_default, created_at: now() };
      db.portfolios.push(portfolio);
      saveDb(db);
      return send(res, 201, portfolio);
    }

    const holdingsMatch = path.match(/^\/api\/portfolios\/portfolios\/([^/]+)\/holdings$/);
    if (holdingsMatch && req.method === "GET") return send(res, 200, holdingsFor(db, holdingsMatch[1]));

    const txMatch = path.match(/^\/api\/portfolios\/portfolios\/([^/]+)\/transactions$/);
    if (txMatch) {
      const user = requireUser(req, res, db);
      if (!user) return;
      if (req.method === "GET") return send(res, 200, db.portfolio_transactions.filter((tx) => tx.portfolio_id === txMatch[1]));
      if (req.method === "POST") {
        const body = await readBody(req);
        const stock = stockByTicker(body.ticker);
        const tx = { id: randomUUID(), portfolio_id: txMatch[1], user_id: user.id, company_name: body.company_name || stock.company, ...body, created_at: now() };
        db.portfolio_transactions.push(tx);
        saveDb(db);
        return send(res, 201, tx);
      }
    }

    const summaryMatch = path.match(/^\/api\/portfolios\/portfolios\/([^/]+)\/summary$/);
    if (summaryMatch && req.method === "GET") return send(res, 200, portfolioSummary(db, summaryMatch[1]));

    const portfolioExtraMatch = path.match(/^\/api\/portfolios\/portfolios\/([^/]+)\/(analytics|performance|realized-gains)$/);
    if (portfolioExtraMatch && req.method === "GET") return send(res, 200, { portfolio_id: portfolioExtraMatch[1], data: [], summary: portfolioSummary(db, portfolioExtraMatch[1]) });

    if (path === "/api/watchlists/watchlists" && req.method === "GET") {
      const user = requireUser(req, res, db);
      if (!user) return;
      return send(res, 200, db.watchlists.filter((w) => w.user_id === user.id).map((w) => ({ ...w, item_count: db.watchlist_items.filter((i) => i.watchlist_id === w.id).length })));
    }

    if (path === "/api/watchlists/watchlists" && req.method === "POST") {
      const user = requireUser(req, res, db);
      if (!user) return;
      const body = await readBody(req);
      const watchlist = { id: randomUUID(), user_id: user.id, name: body.name, description: body.description || null, color: body.color || "#3b82f6", is_default: !!body.is_default, sort_order: db.watchlists.length, created_at: now() };
      db.watchlists.push(watchlist);
      saveDb(db);
      return send(res, 201, watchlist);
    }

    const watchItemsMatch = path.match(/^\/api\/watchlists\/watchlists\/([^/]+)\/items$/);
    if (watchItemsMatch) {
      const user = requireUser(req, res, db);
      if (!user) return;
      if (req.method === "GET") return send(res, 200, watchlistItems(db, watchItemsMatch[1]));
      if (req.method === "POST") {
        const body = await readBody(req);
        const stock = stockByTicker(body.ticker);
        const item = { id: randomUUID(), watchlist_id: watchItemsMatch[1], user_id: user.id, ticker: stock.ticker, company_name: body.company_name || stock.company, added_price: stock.price, target_price: body.target_price ?? null, target_price_type: body.target_price_type ?? null, notes: body.notes ?? null, tags: body.tags || [], created_at: now() };
        db.watchlist_items.push(item);
        saveDb(db);
        return send(res, 201, item);
      }
    }

    const watchSummaryMatch = path.match(/^\/api\/watchlists\/watchlists\/([^/]+)\/summary$/);
    if (watchSummaryMatch && req.method === "GET") return send(res, 200, watchlistSummary(db, watchSummaryMatch[1]));

    const watchDeleteMatch = path.match(/^\/api\/watchlists\/watchlists\/([^/]+)\/items\/([^/]+)$/);
    if (watchDeleteMatch && req.method === "DELETE") {
      db.watchlist_items = db.watchlist_items.filter((item) => item.id !== watchDeleteMatch[2]);
      saveDb(db);
      return send(res, 200, { success: true });
    }

    if (path === "/api/subscription-plans" && req.method === "GET") {
      return send(res, 200, [
        { id: "free", name: "Free", price_monthly: 0, reports_limit: 5 },
        { id: "premium", name: "Premium", price_monthly: 19, reports_limit: 100 },
      ]);
    }
    if (path === "/api/subscription/status" && req.method === "GET") return send(res, 200, { plan: "free", status: "active", subscription_id: null });
    const usageMatch = path.match(/^\/api\/subscription\/usage\/([^/]+)$/);
    if (usageMatch && req.method === "GET") return send(res, 200, { type: usageMatch[1], used: 0, limit: 5, remaining: 5 });
    if (path === "/api/subscription/check-feature" && req.method === "POST") return send(res, 200, { allowed: true, feature_allowed: true, reason: "Local development mode" });
    if (path.startsWith("/api/subscription/") && req.method === "POST") return send(res, 200, { url: "http://127.0.0.1:5173/pricing", success: true });

    if (path.startsWith("/api/pdf/export/")) {
      const pdf = Buffer.from("%PDF-1.1\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n");
      return send(res, 200, pdf, { "Content-Disposition": "attachment; filename=\"fundakamental-report.pdf\"" });
    }

    return send(res, 404, { detail: `No local endpoint for ${req.method} ${path}` });
  } catch (error) {
    console.error(error);
    return send(res, 500, { detail: error.message || "Internal server error" });
  }
}

http.createServer(handle).listen(PORT, "127.0.0.1", () => {
  console.log(`FundaKaMental local API running at http://127.0.0.1:${PORT}`);
  console.log("Demo login: demo@fundakamental.local / password123");
});
