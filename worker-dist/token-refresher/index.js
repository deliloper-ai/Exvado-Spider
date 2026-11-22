"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// worker/token-refresher/index.ts
var token_refresher_exports = {};
__export(token_refresher_exports, {
  refreshAll: () => refreshAll,
  refreshOne: () => refreshOne
});
module.exports = __toCommonJS(token_refresher_exports);

// worker/token-refresher/refreshers.ts
var import_axios = __toESM(require("axios"));
var import_jsdom = require("jsdom");

// lib/db/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new import_client.PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// worker/helpers/logger.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var LOG_DIR = import_path.default.join(__dirname, "..", "logs");
if (!import_fs.default.existsSync(LOG_DIR)) {
  import_fs.default.mkdirSync(LOG_DIR, { recursive: true });
}
function getLogFilePath() {
  const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return import_path.default.join(LOG_DIR, `sync_${date}.log`);
}
function log(message, level = "info") {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}
`;
  const colors = { info: "\x1B[36m", warn: "\x1B[33m", error: "\x1B[31m" };
  console.log(`${colors[level]}${line.trim()}\x1B[0m`);
  try {
    import_fs.default.appendFileSync(getLogFilePath(), line);
  } catch (err) {
  }
}
var logger = {
  info: (msg) => log(msg, "info"),
  warn: (msg) => log(msg, "warn"),
  error: (msg) => log(msg, "error")
};

// worker/token-refresher/_base.ts
var turkishToMojibake = {
  "\u011E": "\xC4\u0178",
  "\xDC": "\xC3\u0153",
  "\u015E": "\xC5\u0178",
  "\u0130": "\xC4\xB0",
  "\xD6": "\xC3\u2013",
  "\xC7": "\xC3\u2021",
  "\u011F": "\xC4\u0178",
  "\xFC": "\xC3\xBC",
  "\u015F": "\xC5\u0178",
  "\u0131": "\xC4\xB1",
  "\xF6": "\xC3\xB6",
  "\xE7": "\xC3\xA7"
};
function applyMojibakeFix(s) {
  return s.replace(/[ĞÜŞİÖÇğüşıöç]/g, (m) => turkishToMojibake[m] || m);
}
async function saveTokenToDb(supplierName, token) {
  const now = /* @__PURE__ */ new Date();
  await prisma.supplier.updateMany({
    where: { name: supplierName },
    data: { token, token_updated_at: now, updated_at: now }
  });
  logger.info(`[token-refresher] ${supplierName} token DB'ye yaz\u0131ld\u0131 (${token.length} karakter)`);
}
async function getSupplierCredentials(name) {
  const sup = await prisma.supplier.findFirst({
    where: { name },
    select: { name: true, username: true, password: true, login_url: true }
  });
  if (!sup) return null;
  return sup;
}

// worker/token-refresher/refreshers.ts
async function axiosLogin(supplierName, loginUrl) {
  const start = Date.now();
  logger.info(`[token-refresher] ${supplierName} login ba\u015Flat\u0131l\u0131yor (axios)...`);
  const creds = await getSupplierCredentials(supplierName);
  if (!creds || !creds.username || !creds.password) {
    return { success: false, error: "Eksik credentials (username/password)", durationMs: Date.now() - start };
  }
  try {
    const formBody = new URLSearchParams({
      adi: creds.username,
      Sifre: creds.password,
      SmsSifre: ""
    }).toString();
    const res = await import_axios.default.post(loginUrl, formBody, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 15e3
    });
    if (res.status !== 200 || !res.data?.success) {
      return {
        success: false,
        error: `Login ba\u015Far\u0131s\u0131z: status=${res.status} body=${JSON.stringify(res.data).slice(0, 200)}`,
        durationMs: Date.now() - start
      };
    }
    const oid = res.data.token;
    if (!oid) {
      return { success: false, error: "Token JSON'da yok", durationMs: Date.now() - start };
    }
    const cookieToken = `nlogin=oid=${oid}`;
    await saveTokenToDb(supplierName, cookieToken);
    return { success: true, token: cookieToken, durationMs: Date.now() - start };
  } catch (err) {
    return { success: false, error: err.message || "Bilinmeyen hata", durationMs: Date.now() - start };
  }
}
async function refreshCivaner() {
  const result = await axiosLogin("Civaner", "https://b4b.civaner.com/Giris");
  if (result.success && result.token) {
    try {
      await fetchCivanerCurrencyRates(result.token);
    } catch (err) {
      logger.warn(`[Civaner] Kur g\xFCncelleme hatas\u0131: ${err.message}`);
    }
  }
  return result;
}
async function fetchCivanerCurrencyRates(token) {
  const response = await import_axios.default.get("https://b4b.civaner.com/", {
    headers: { Cookie: token },
    timeout: 3e4
  });
  const dom = new import_jsdom.JSDOM(response.data);
  const items = dom.window.document.querySelectorAll(".Doviz-Bar");
  let euroKur = null;
  let dolarKur = null;
  items.forEach((item) => {
    const spans = item.querySelectorAll("span");
    if (spans.length < 2) return;
    const dovizAdi = spans[0].textContent?.trim();
    const dovizDeger = spans[1].textContent?.trim() || "";
    const parsed = parseFloat(dovizDeger.replace(/\./g, "").replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return;
    if (dovizAdi === "EUR") euroKur = parsed;
    if (dovizAdi === "USD") dolarKur = parsed;
  });
  if (euroKur === null && dolarKur === null) {
    logger.warn(`[Civaner] .Doviz-Bar bulunamad\u0131 veya parse edilemedi`);
    return;
  }
  await prisma.supplier.updateMany({
    where: { name: "Civaner" },
    data: {
      ...euroKur !== null ? { euro_kur: euroKur } : {},
      ...dolarKur !== null ? { dolar_kur: dolarKur } : {}
    }
  });
  logger.info(`[Civaner] Kur g\xFCncellendi \u2192 EUR: ${euroKur}, USD: ${dolarKur}`);
}
async function refreshAbmHirdavat() {
  return axiosLogin("AbmHirdavat", "https://b2b.abmhirdavat.com.tr/Giris");
}
async function refreshAkinziraat() {
  return axiosAngularLogin("Akinziraat", "https://b4b.akinziraat.com", "empty");
}
async function refreshCatpower() {
  return axiosLogin("Catpower", "https://bayi.catpower.com.tr/Giris");
}
async function axiosAngularLogin(supplierName, baseUrl, customerCodeMode = "same") {
  const start = Date.now();
  logger.info(`[token-refresher] ${supplierName} login ba\u015Flat\u0131l\u0131yor (axios)...`);
  const creds = await getSupplierCredentials(supplierName);
  if (!creds || !creds.username || !creds.password) {
    return { success: false, error: "Eksik credentials", durationMs: Date.now() - start };
  }
  try {
    const pre = await import_axios.default.get(`${baseUrl}/Login`, {
      validateStatus: () => true,
      maxRedirects: 0,
      timeout: 1e4
    });
    const preCookies = (pre.headers["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ");
    const loginRes = await import_axios.default.post(`${baseUrl}/Login/Index`, {
      model: {
        CustomerCode: customerCodeMode === "same" ? creds.username : "",
        UserCode: creds.username,
        Password: creds.password,
        LanguageId: "1",
        Captcha: "",
        NewPassword: "",
        NewPasswordRepeat: "",
        ChangePassword: false
      }
    }, {
      headers: {
        "Content-Type": "application/json",
        "Origin": baseUrl,
        "Referer": `${baseUrl}/Login`,
        "X-Requested-With": "XMLHttpRequest",
        ...preCookies ? { "Cookie": preCookies } : {}
      },
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 15e3
    });
    if (loginRes.status !== 200 || !loginRes.data?.Redirect) {
      return {
        success: false,
        error: `Login ba\u015Far\u0131s\u0131z: status=${loginRes.status} body=${JSON.stringify(loginRes.data).slice(0, 200)}`,
        durationMs: Date.now() - start
      };
    }
    const newCookies = (loginRes.headers["set-cookie"] || []).map((c) => c.split(";")[0]);
    const allCookies = applyMojibakeFix(
      [preCookies, ...newCookies].filter(Boolean).join("; ")
    );
    await saveTokenToDb(supplierName, allCookies);
    return { success: true, token: allCookies, durationMs: Date.now() - start };
  } catch (err) {
    return { success: false, error: err.message || "Bilinmeyen hata", durationMs: Date.now() - start };
  }
}
async function refreshMapas() {
  return axiosAngularLogin("Mapas", "https://b4b.mapas.com.tr", "same");
}
async function refreshItal() {
  const start = Date.now();
  logger.info(`[token-refresher] Ital login ba\u015Flat\u0131l\u0131yor (axios)...`);
  const creds = await getSupplierCredentials("Ital");
  if (!creds || !creds.username || !creds.password) {
    return { success: false, error: "Eksik credentials", durationMs: Date.now() - start };
  }
  const baseUrl = "https://b4b.italmakina.com.tr";
  try {
    const pre = await import_axios.default.get(`${baseUrl}/`, {
      validateStatus: () => true,
      maxRedirects: 0,
      timeout: 1e4
    });
    const preCookies = (pre.headers["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ");
    const html = typeof pre.data === "string" ? pre.data : "";
    const csrfMatch = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
    const csrf = csrfMatch?.[1];
    if (!csrf) {
      return { success: false, error: "CSRF (__RequestVerificationToken) bulunamad\u0131", durationMs: Date.now() - start };
    }
    const formBody = new URLSearchParams({
      __RequestVerificationToken: csrf,
      group1: "CustomerLoginId",
      CustomerCode: "",
      UserCode: creds.username,
      Password: creds.password
    }).toString();
    const res = await import_axios.default.post(`${baseUrl}/`, formBody, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": baseUrl,
        "Referer": `${baseUrl}/`,
        ...preCookies ? { "Cookie": preCookies } : {}
      },
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 15e3
    });
    const location = res.headers.location || "";
    if (res.status !== 302 || location.includes("Unauthorized") || location.includes("Login")) {
      return {
        success: false,
        error: `Login ba\u015Far\u0131s\u0131z: status=${res.status} location=${location}`,
        durationMs: Date.now() - start
      };
    }
    const newCookies = (res.headers["set-cookie"] || []).map((c) => c.split(";")[0]);
    const allCookies = applyMojibakeFix(
      [preCookies, ...newCookies].filter(Boolean).join("; ")
    );
    await saveTokenToDb("Ital", allCookies);
    return { success: true, token: allCookies, durationMs: Date.now() - start };
  } catch (err) {
    return { success: false, error: err.message || "Bilinmeyen hata", durationMs: Date.now() - start };
  }
}
var refresherMap = {
  "Civaner": refreshCivaner,
  "AbmHirdavat": refreshAbmHirdavat,
  "Akinziraat": refreshAkinziraat,
  "Catpower": refreshCatpower,
  "Mapas": refreshMapas,
  "Ital": refreshItal
};
var SUPPORTED_SUPPLIERS = Object.keys(refresherMap);

// worker/helpers/token-progress.ts
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var PROGRESS_FILE = import_path2.default.join(__dirname, "..", "logs", "token-progress.json");
var DEFAULT = {
  isRunning: false,
  startedAt: null,
  finishedAt: null,
  updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
  current: null,
  total: 0,
  successCount: 0,
  errorCount: 0,
  suppliers: []
};
var buffer = { ...DEFAULT, suppliers: [] };
function flush() {
  buffer.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    import_fs2.default.writeFileSync(PROGRESS_FILE, JSON.stringify(buffer, null, 2));
  } catch {
  }
}
function startTokenRefresh(suppliers) {
  buffer = {
    isRunning: true,
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    finishedAt: null,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    current: null,
    total: suppliers.length,
    successCount: 0,
    errorCount: 0,
    suppliers: suppliers.map((s) => ({
      supplier: s,
      status: "pending",
      startedAt: null,
      finishedAt: null
    }))
  };
  flush();
}
function markSupplierRunning(supplier) {
  buffer.current = supplier;
  const entry = buffer.suppliers.find((s) => s.supplier === supplier);
  if (entry) {
    entry.status = "running";
    entry.startedAt = (/* @__PURE__ */ new Date()).toISOString();
  } else {
    buffer.suppliers.push({
      supplier,
      status: "running",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      finishedAt: null
    });
  }
  flush();
}
function markSupplierDone(supplier, result) {
  const entry = buffer.suppliers.find((s) => s.supplier === supplier);
  const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (entry) {
    entry.status = result.success ? "success" : "error";
    entry.finishedAt = finishedAt;
    entry.durationSec = result.durationSec;
    entry.tokenLength = result.tokenLength;
    entry.error = result.error;
  }
  if (result.success) buffer.successCount++;
  else buffer.errorCount++;
  flush();
}
function endTokenRefresh() {
  buffer.isRunning = false;
  buffer.current = null;
  buffer.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
  flush();
}

// worker/token-refresher/index.ts
async function refreshOne(supplier, reportProgress = false) {
  const fn = refresherMap[supplier];
  if (!fn) {
    return { supplierName: supplier, success: false, durationSec: 0, error: `Desteklenmeyen tedarik\xE7i: ${supplier}. Desteklenenler: ${SUPPORTED_SUPPLIERS.join(", ")}` };
  }
  if (reportProgress) markSupplierRunning(supplier);
  const result = await fn();
  const summary = {
    supplierName: supplier,
    success: result.success,
    durationSec: result.durationMs / 1e3,
    tokenLength: result.token?.length,
    error: result.error
  };
  if (reportProgress) {
    markSupplierDone(supplier, {
      success: summary.success,
      durationSec: summary.durationSec,
      tokenLength: summary.tokenLength,
      error: summary.error
    });
  }
  return summary;
}
async function refreshAll() {
  const results = [];
  startTokenRefresh(SUPPORTED_SUPPLIERS);
  try {
    for (const supplier of SUPPORTED_SUPPLIERS) {
      logger.info(`========== ${supplier} token yenileme ==========`);
      try {
        const r = await refreshOne(supplier, true);
        results.push(r);
        logger.info(
          `[${supplier}] ${r.success ? "\u2713" : "\u2717"} (${r.durationSec.toFixed(1)}s) ` + (r.success ? `${r.tokenLength} karakter` : `HATA: ${r.error}`)
        );
      } catch (err) {
        const summary = { supplierName: supplier, success: false, durationSec: 0, error: err.message };
        results.push(summary);
        markSupplierDone(supplier, { success: false, durationSec: 0, error: err.message });
        logger.error(`[${supplier}] FATAL: ${err.message}`);
      }
    }
  } finally {
    endTokenRefresh();
  }
  return results;
}
var __isTokenRefresherEntry = !!process.argv[1]?.match(/token-refresher[\/\\]index\.(js|ts)$/);
if (__isTokenRefresherEntry) {
  ;
  (async () => {
    const args = process.argv.slice(2);
    const supplierArg = args.find((a) => a.startsWith("--supplier="));
    if (args.includes("--all")) {
      const results = await refreshAll();
      const ok = results.filter((r) => r.success).length;
      logger.info(`
========== TAMAMLANDI: ${ok}/${results.length} ba\u015Far\u0131l\u0131 ==========`);
      process.exit(ok === results.length ? 0 : 1);
    } else if (supplierArg) {
      const supplier = supplierArg.split("=")[1];
      startTokenRefresh([supplier]);
      try {
        const result = await refreshOne(supplier, true);
        logger.info(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      } finally {
        endTokenRefresh();
      }
    } else {
      console.log(`
Token Refresher

Kullan\u0131m:
  npx tsx worker/token-refresher/index.ts --all
  npx tsx worker/token-refresher/index.ts --supplier=Ital

Desteklenen tedarik\xE7iler: ${SUPPORTED_SUPPLIERS.join(", ")}
`);
      process.exit(0);
    }
  })();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  refreshAll,
  refreshOne
});
