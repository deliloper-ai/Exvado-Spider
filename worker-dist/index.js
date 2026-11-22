"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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

// lib/db/prisma.ts
var import_client, globalForPrisma, prisma;
var init_prisma = __esm({
  "lib/db/prisma.ts"() {
    "use strict";
    import_client = require("@prisma/client");
    globalForPrisma = globalThis;
    prisma = globalForPrisma.prisma ?? new import_client.PrismaClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  }
});

// worker/helpers/logger.ts
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
var import_fs, import_path, LOG_DIR, logger;
var init_logger = __esm({
  "worker/helpers/logger.ts"() {
    "use strict";
    import_fs = __toESM(require("fs"));
    import_path = __toESM(require("path"));
    LOG_DIR = import_path.default.join(__dirname, "..", "logs");
    if (!import_fs.default.existsSync(LOG_DIR)) {
      import_fs.default.mkdirSync(LOG_DIR, { recursive: true });
    }
    logger = {
      info: (msg) => log(msg, "info"),
      warn: (msg) => log(msg, "warn"),
      error: (msg) => log(msg, "error")
    };
  }
});

// worker/helpers/progress.ts
function flushSync() {
  buffer.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    import_fs2.default.writeFileSync(PROGRESS_FILE, JSON.stringify(buffer, null, 2));
  } catch {
  }
  lastWrite = Date.now();
}
function updateProgress(patch, force = false) {
  buffer = { ...buffer, ...patch };
  const now = Date.now();
  if (force || now - lastWrite >= WRITE_THROTTLE_MS) {
    flushSync();
  }
}
function startProgress(supplier = null) {
  buffer = {
    ...DEFAULT_PROGRESS,
    isRunning: true,
    currentSupplier: supplier,
    currentStep: "idle",
    startedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  flushSync();
}
function endProgress(message) {
  buffer = {
    ...buffer,
    isRunning: false,
    currentStep: "idle",
    currentSupplier: null,
    message: message || null
  };
  flushSync();
}
var import_fs2, import_path2, PROGRESS_FILE, DEFAULT_PROGRESS, buffer, lastWrite, WRITE_THROTTLE_MS;
var init_progress = __esm({
  "worker/helpers/progress.ts"() {
    "use strict";
    import_fs2 = __toESM(require("fs"));
    import_path2 = __toESM(require("path"));
    PROGRESS_FILE = import_path2.default.join(__dirname, "..", "logs", "progress.json");
    DEFAULT_PROGRESS = {
      isRunning: false,
      currentSupplier: null,
      currentStep: "idle",
      processed: 0,
      total: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      startedAt: null,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      message: null
    };
    buffer = { ...DEFAULT_PROGRESS };
    lastWrite = 0;
    WRITE_THROTTLE_MS = 300;
  }
});

// worker/helpers/product-mapper.ts
function parseTurkishNumber(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const str = String(value).replace(/\./g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}
function stockStatusToNumber(status) {
  if (typeof status === "number") return status;
  const s = String(status || "").toLowerCase().trim();
  if (s === "var" || s === "available" || s === "stokta") return 50;
  if (s === "az var" || s.includes("az")) return 1;
  if (s === "yok" || s === "t\xFCkendi" || s === "out of stock") return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function getMappedValue(raw, mapper) {
  if (typeof mapper === "function") return mapper(raw);
  if (typeof mapper === "string") {
    return mapper.split(".").reduce((obj, key) => obj?.[key], raw);
  }
  return mapper;
}
function mapProducts(rawProducts, keyMap) {
  return rawProducts.map((raw) => {
    try {
      const product = {
        productTitle: String(getMappedValue(raw, keyMap.productTitle) || "").trim(),
        productCode: String(getMappedValue(raw, keyMap.productCode) || "").trim(),
        netPriceWithVAT: parseTurkishNumber(getMappedValue(raw, keyMap.netPriceWithVAT)),
        productPictures: String(getMappedValue(raw, keyMap.productPictures) || ""),
        productStockStatus: String(getMappedValue(raw, keyMap.productStockStatus) || "Yok"),
        stock: stockStatusToNumber(getMappedValue(raw, keyMap.stock)),
        brand: String(getMappedValue(raw, keyMap.brand) || "").trim()
      };
      return product;
    } catch {
      return null;
    }
  }).filter((p) => p !== null && !!p.productCode);
}
var init_product_mapper = __esm({
  "worker/helpers/product-mapper.ts"() {
    "use strict";
  }
});

// worker/plugin-base.ts
var PluginBase;
var init_plugin_base = __esm({
  "worker/plugin-base.ts"() {
    "use strict";
    init_product_mapper();
    init_logger();
    PluginBase = class {
      supplier;
      constructor(supplier) {
        this.supplier = supplier;
      }
      /**
       * Public entry point — orchestrator bunu çağırır.
       * Ham veriyi çeker, standart formata dönüştürür.
       */
      async run() {
        logger.info(`[${this.name}] Plugin ba\u015Flad\u0131`);
        try {
          const raw = await this.fetchProducts();
          logger.info(`[${this.name}] Ham \xFCr\xFCn say\u0131s\u0131: ${raw.length}`);
          const normalized = mapProducts(raw, this.keyMap);
          logger.info(`[${this.name}] Normalize edilmi\u015F \xFCr\xFCn say\u0131s\u0131: ${normalized.length}`);
          return normalized;
        } catch (err) {
          logger.error(`[${this.name}] HATA: ${err.message}`);
          throw err;
        }
      }
    };
  }
});

// worker/plugins/ital.ts
var ital_exports = {};
__export(ital_exports, {
  default: () => ItalPlugin
});
function cleanPriceString(value) {
  if (value === null || value === void 0) return "0";
  if (typeof value === "number") return String(value);
  let str = String(value);
  str = str.split("&")[0];
  str = str.replace(/<[^>]*>/g, "").replace(/\s*&nbsp;/g, "").trim();
  if (str === "-" || str === "") return "0";
  return str;
}
var import_axios, ITAL_API_URL, PAGE_SIZE, MAX_RETRIES, RETRY_DELAY_MS, REQUEST_TIMEOUT_MS, ItalPlugin;
var init_ital = __esm({
  "worker/plugins/ital.ts"() {
    "use strict";
    import_axios = __toESM(require("axios"));
    init_plugin_base();
    init_logger();
    ITAL_API_URL = "https://b4b.italmakina.com.tr/Search/SearchProduct";
    PAGE_SIZE = 24;
    MAX_RETRIES = 3;
    RETRY_DELAY_MS = 2e3;
    REQUEST_TIMEOUT_MS = 3e4;
    ItalPlugin = class extends PluginBase {
      name = "Ital";
      keyMap = {
        productTitle: "Name",
        productCode: "Code",
        netPriceWithVAT: (raw) => cleanPriceString(raw.PriceNetWithVatCustomerStr),
        productPictures: "PicturePath",
        productStockStatus: "AvailabilityText",
        stock: "AvailabilityText",
        brand: "Manufacturer"
      };
      async fetchProducts() {
        const token = this.supplier.token;
        if (!token) {
          throw new Error("Ital token bulunamad\u0131 (this.supplier.token bo\u015F)");
        }
        const fetchWithRetry = async (params, retries) => {
          try {
            const res = await import_axios.default.post(ITAL_API_URL, params, {
              headers: { Cookie: token },
              timeout: REQUEST_TIMEOUT_MS
            });
            return res.data;
          } catch (err) {
            logger.warn(`[${this.name}] \u0130stek hatas\u0131: ${err.message}`);
            if (retries > 0) {
              logger.warn(`[${this.name}] Tekrar denenecek (${retries} hak kald\u0131)`);
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
              return fetchWithRetry(params, retries - 1);
            }
            throw err;
          }
        };
        const allProducts = [];
        let dataCount = 0;
        while (true) {
          const params = {
            dataCount,
            manufacturer: null,
            vehicleBrand: null,
            vehicleModel: null,
            productGroup1: null,
            productGroup2: null,
            productGroup3: null,
            campaign: false,
            newArrival: false,
            newProduct: false,
            comparsionProduct: false,
            onQuantity: false,
            onWay: false,
            image: false
          };
          logger.info(`[${this.name}] Veri \xE7ekiliyor: ${dataCount} - ${dataCount + PAGE_SIZE}`);
          let data;
          try {
            data = await fetchWithRetry(params, MAX_RETRIES);
          } catch (err) {
            logger.error(`[${this.name}] Son deneme ba\u015Far\u0131s\u0131z, durduruluyor: ${err.message}`);
            break;
          }
          const list = Array.isArray(data) ? data : [];
          if (list.length === 0) break;
          for (const element of list) {
            allProducts.push(element);
          }
          dataCount += PAGE_SIZE;
          if (list.length < PAGE_SIZE) break;
        }
        return allProducts;
      }
    };
  }
});

// worker/plugins/mapas.ts
var mapas_exports = {};
__export(mapas_exports, {
  default: () => MapasPlugin
});
function cleanPriceString2(value) {
  if (value === null || value === void 0) return "0";
  if (typeof value === "number") return String(value);
  let str = String(value);
  str = str.replace(/<[^>]*>/g, "").replace(/\s*&nbsp;/g, "").trim();
  if (str === "-" || str === "") return "0";
  return str;
}
var import_axios2, MAPAS_API_URL, PAGE_SIZE2, MAX_RETRIES2, RETRY_DELAY_MS2, REQUEST_TIMEOUT_MS2, MapasPlugin;
var init_mapas = __esm({
  "worker/plugins/mapas.ts"() {
    "use strict";
    import_axios2 = __toESM(require("axios"));
    init_plugin_base();
    init_logger();
    MAPAS_API_URL = "https://b4b.mapas.com.tr/Search/SearchProduct";
    PAGE_SIZE2 = 24;
    MAX_RETRIES2 = 3;
    RETRY_DELAY_MS2 = 2e3;
    REQUEST_TIMEOUT_MS2 = 3e4;
    MapasPlugin = class extends PluginBase {
      name = "Mapas";
      keyMap = {
        productTitle: "Name",
        productCode: "Code",
        netPriceWithVAT: (raw) => cleanPriceString2(raw.PriceNetWithVatCustomerStr),
        productPictures: "PicturePath",
        productStockStatus: "AvailabilityText",
        stock: "AvailabilityText",
        brand: "Manufacturer"
      };
      async fetchProducts() {
        const token = this.supplier.token;
        if (!token) {
          throw new Error("Mapas token bulunamad\u0131 (this.supplier.token bo\u015F)");
        }
        const fetchWithRetry = async (params, retries) => {
          try {
            const res = await import_axios2.default.post(MAPAS_API_URL, params, {
              headers: { Cookie: token },
              timeout: REQUEST_TIMEOUT_MS2
            });
            return res.data;
          } catch (err) {
            logger.warn(`[${this.name}] \u0130stek hatas\u0131: ${err.message}`);
            if (retries > 0) {
              logger.warn(`[${this.name}] Tekrar denenecek (${retries} hak kald\u0131)`);
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS2));
              return fetchWithRetry(params, retries - 1);
            }
            throw err;
          }
        };
        const allProducts = [];
        let dataCount = 0;
        while (true) {
          const params = {
            dataCount,
            manufacturer: "Se\xE7iniz",
            vehicleBrand: null,
            vehicleModel: null,
            productGroup1: null,
            productGroup2: null,
            productGroup3: null,
            campaign: false,
            chkMamul: false,
            chkSpare: false,
            chkOther: false,
            newArrival: false,
            newProduct: false,
            comparsionProduct: false,
            onQuantity: false,
            onWay: false,
            isEndofSeries: false
          };
          logger.info(`[${this.name}] Veri \xE7ekiliyor: ${dataCount} - ${dataCount + PAGE_SIZE2}`);
          let data;
          try {
            data = await fetchWithRetry(params, MAX_RETRIES2);
          } catch (err) {
            logger.error(`[${this.name}] Son deneme ba\u015Far\u0131s\u0131z, durduruluyor: ${err.message}`);
            break;
          }
          const list = Array.isArray(data?.ProductList) ? data.ProductList : [];
          if (list.length === 0) break;
          for (const element of list) {
            allProducts.push(element);
          }
          dataCount += PAGE_SIZE2;
          if (list.length < PAGE_SIZE2) break;
        }
        return allProducts;
      }
    };
  }
});

// worker/plugins/cullas.ts
var cullas_exports = {};
__export(cullas_exports, {
  default: () => CullasPlugin
});
function cleanPriceString3(value) {
  if (value === null || value === void 0) return "0";
  if (typeof value === "number") return String(value);
  let str = String(value);
  str = str.split("&")[0];
  str = str.replace(/<[^>]*>/g, "").replace(/\s*&nbsp;/g, "").trim();
  if (str === "-" || str === "") return "0";
  return str;
}
var import_axios3, CULLAS_API_URL, PAGE_SIZE3, MAX_RETRIES3, RETRY_DELAY_MS3, REQUEST_TIMEOUT_MS3, CullasPlugin;
var init_cullas = __esm({
  "worker/plugins/cullas.ts"() {
    "use strict";
    import_axios3 = __toESM(require("axios"));
    init_plugin_base();
    init_logger();
    CULLAS_API_URL = "https://b4b.cullas.com.tr/Search/SearchProduct";
    PAGE_SIZE3 = 24;
    MAX_RETRIES3 = 3;
    RETRY_DELAY_MS3 = 2e3;
    REQUEST_TIMEOUT_MS3 = 3e4;
    CullasPlugin = class extends PluginBase {
      name = "Cullas";
      keyMap = {
        productTitle: "Name",
        productCode: "Code",
        netPriceWithVAT: (raw) => cleanPriceString3(raw.PriceNetWithVatCustomerStr),
        productPictures: "PicturePath",
        productStockStatus: "AvailabilityText",
        stock: "AvailabilityText",
        brand: "Manufacturer"
      };
      async fetchProducts() {
        const token = this.supplier.token;
        if (!token) {
          throw new Error("Cullas token bulunamad\u0131 (this.supplier.token bo\u015F)");
        }
        const fetchWithRetry = async (params, retries) => {
          try {
            const res = await import_axios3.default.post(CULLAS_API_URL, params, {
              headers: { Cookie: token },
              timeout: REQUEST_TIMEOUT_MS3
            });
            return res.data;
          } catch (err) {
            logger.warn(`[${this.name}] \u0130stek hatas\u0131: ${err.message}`);
            if (retries > 0) {
              logger.warn(`[${this.name}] Tekrar denenecek (${retries} hak kald\u0131)`);
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS3));
              return fetchWithRetry(params, retries - 1);
            }
            throw err;
          }
        };
        const allProducts = [];
        let dataCount = 0;
        while (true) {
          const params = {
            dataCount,
            manufacturer: null,
            vehicleBrand: null,
            vehicleModel: null,
            productGroup1: null,
            productGroup2: null,
            productGroup3: null,
            campaign: false,
            newArrival: false,
            newProduct: false,
            comparsionProduct: false,
            onQuantity: false,
            onWay: false,
            image: false
          };
          logger.info(`[${this.name}] Veri \xE7ekiliyor: ${dataCount} - ${dataCount + PAGE_SIZE3}`);
          let data;
          try {
            data = await fetchWithRetry(params, MAX_RETRIES3);
          } catch (err) {
            logger.error(`[${this.name}] Son deneme ba\u015Far\u0131s\u0131z, durduruluyor: ${err.message}`);
            break;
          }
          const list = Array.isArray(data) ? data : [];
          if (list.length === 0) break;
          for (const element of list) {
            allProducts.push(element);
          }
          dataCount += PAGE_SIZE3;
          if (list.length < PAGE_SIZE3) break;
        }
        return allProducts;
      }
    };
  }
});

// worker/plugins/akinziraat.ts
var akinziraat_exports = {};
__export(akinziraat_exports, {
  default: () => AkinziraatPlugin
});
function cleanPriceString4(value) {
  if (value === null || value === void 0) return "0";
  if (typeof value === "number") return String(value);
  let str = String(value);
  str = str.replace(/<[^>]*>/g, "").replace(/\s*&nbsp;/g, "").trim();
  if (str === "-" || str === "") return "0";
  return str;
}
function pickPrice(raw) {
  const campaign = raw.CampaignPriceWithVatCustomerStr;
  const net = raw.PriceNetWithVatCustomerStr;
  const campaignClean = cleanPriceString4(campaign);
  if (campaignClean && campaignClean !== "0" && campaignClean !== "-") {
    return campaignClean;
  }
  return cleanPriceString4(net);
}
var import_axios4, BASE_URL, CATEGORY_URL, SEARCH_URL, PAGE_SIZE4, MAX_RETRIES4, RETRY_DELAY_MS4, REQUEST_TIMEOUT_MS4, COMMON_HEADERS, AkinziraatPlugin;
var init_akinziraat = __esm({
  "worker/plugins/akinziraat.ts"() {
    "use strict";
    import_axios4 = __toESM(require("axios"));
    init_plugin_base();
    init_logger();
    init_progress();
    BASE_URL = "https://b4b.akinziraat.com";
    CATEGORY_URL = `${BASE_URL}/Search/GetCategoryMenuList`;
    SEARCH_URL = `${BASE_URL}/Search/SearchProduct`;
    PAGE_SIZE4 = 24;
    MAX_RETRIES4 = 3;
    RETRY_DELAY_MS4 = 2e3;
    REQUEST_TIMEOUT_MS4 = 3e4;
    COMMON_HEADERS = {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${BASE_URL}/Search/Index`
    };
    AkinziraatPlugin = class extends PluginBase {
      name = "Akinziraat";
      keyMap = {
        productTitle: "Name",
        productCode: "Code",
        netPriceWithVAT: (raw) => pickPrice(raw),
        productPictures: "PicturePath",
        productStockStatus: "AvailabilityText",
        stock: "AvailabilityText",
        brand: "Manufacturer"
      };
      async postWithRetry(url, body, token, retries = MAX_RETRIES4) {
        try {
          const res = await import_axios4.default.post(url, body, {
            headers: { ...COMMON_HEADERS, Cookie: token },
            timeout: REQUEST_TIMEOUT_MS4,
            maxRedirects: 0,
            validateStatus: (s) => s >= 200 && s < 400
          });
          return res.data;
        } catch (err) {
          if (err.response?.status === 302) {
            throw new Error("Akinziraat session expired (302 \u2192 /Login/Logout). Token yenilemesi gerek.");
          }
          logger.warn(`[${this.name}] \u0130stek hatas\u0131 (${url}): ${err.message}`);
          if (retries > 0) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS4));
            return this.postWithRetry(url, body, token, retries - 1);
          }
          throw err;
        }
      }
      /**
       * Kategori ağacını iki seviyeli olarak çeker.
       * Dönüş: tüm (ana, alt) çiftlerinin düz listesi
       */
      async fetchCategoryPairs(token) {
        const rootList = await this.postWithRetry(CATEGORY_URL, { categoryCode: "102" }, token);
        if (!Array.isArray(rootList) || rootList.length === 0) {
          throw new Error("Ana kategori listesi al\u0131namad\u0131 (root=102 bo\u015F)");
        }
        const pairs = [];
        for (const root of rootList) {
          const anaCode = root.SubCategoryCode;
          const anaName = root.CategoryValue;
          if (!anaCode) continue;
          const subList = await this.postWithRetry(
            CATEGORY_URL,
            { categoryCode: "104", subCategoryCode: anaCode },
            token
          );
          if (!Array.isArray(subList) || subList.length === 0) {
            logger.warn(`[${this.name}] Alt kategori bulunamad\u0131: ${anaCode} (${anaName})`);
            continue;
          }
          for (const sub of subList) {
            if (!sub.SubCategoryCode) continue;
            pairs.push({
              ana: { code: anaCode, name: anaName || "" },
              alt: { code: sub.SubCategoryCode, name: sub.CategoryValue || "" }
            });
          }
        }
        logger.info(`[${this.name}] Kategori a\u011Fac\u0131: ${rootList.length} ana, ${pairs.length} (ana,alt) \xE7ifti`);
        return pairs;
      }
      /**
       * Belirli bir (ana, alt) kategori için tüm sayfaları çek
       */
      async fetchProductsForCategory(token, pair) {
        const collected = [];
        let dataCount = 0;
        while (true) {
          const params = {
            dataCount,
            mainSearch: true,
            productType1: pair.ana.code,
            productType2: pair.alt.code,
            productType3: "",
            t9Text: "",
            productBrand: "Se\xE7iniz",
            campaign: false,
            newArrival: false,
            newProduct: false,
            comparsionProduct: false,
            onQuantity: false,
            onWay: false,
            orderBy: null,
            subCategoryCode: [pair.ana.code, pair.alt.code],
            specialCode1: null,
            categoryList: []
          };
          let data;
          try {
            data = await this.postWithRetry(SEARCH_URL, params, token);
          } catch (err) {
            logger.error(`[${this.name}] [${pair.ana.name}/${pair.alt.name}] sayfa hatas\u0131 dataCount=${dataCount}: ${err.message}`);
            break;
          }
          const list = Array.isArray(data?.ProductList) ? data.ProductList : [];
          if (list.length === 0) break;
          for (const item of list) collected.push(item);
          dataCount += PAGE_SIZE4;
          if (list.length < PAGE_SIZE4) break;
        }
        return collected;
      }
      async fetchProducts() {
        const token = this.supplier.token;
        if (!token) {
          throw new Error(
            "Akinziraat token bulunamad\u0131. tedarikciler.token DB s\xFCtununa session cookie kaydedilmelidir."
          );
        }
        const pairs = await this.fetchCategoryPairs(token);
        const dedupe = /* @__PURE__ */ new Map();
        let pairIdx = 0;
        for (const pair of pairs) {
          pairIdx++;
          const list = await this.fetchProductsForCategory(token, pair);
          let added = 0;
          for (const item of list) {
            const code = item.Code;
            if (code && !dedupe.has(code)) {
              dedupe.set(code, item);
              added++;
            }
          }
          logger.info(
            `[${this.name}] (${pairIdx}/${pairs.length}) ${pair.ana.name}/${pair.alt.name}: ${list.length} \xFCr\xFCn geldi, ${added} yeni (toplam: ${dedupe.size})`
          );
          updateProgress({
            message: `Akinziraat: ${pairIdx}/${pairs.length} ${pair.ana.name}/${pair.alt.name} (${dedupe.size} \xFCr\xFCn)`
          }, true);
        }
        logger.info(`[${this.name}] Toplam tekil \xFCr\xFCn: ${dedupe.size}`);
        return Array.from(dedupe.values());
      }
    };
  }
});

// worker/plugins/civaner.ts
var civaner_exports = {};
__export(civaner_exports, {
  default: () => CivanerPlugin
});
var import_axios5, import_jsdom, CIVANER_BASE, CivanerPlugin;
var init_civaner = __esm({
  "worker/plugins/civaner.ts"() {
    "use strict";
    import_axios5 = __toESM(require("axios"));
    import_jsdom = require("jsdom");
    init_plugin_base();
    init_logger();
    CIVANER_BASE = "https://b4b.civaner.com";
    CivanerPlugin = class extends PluginBase {
      name = "Civaner";
      keyMap = {
        productTitle: "productTitle",
        productCode: "productCode",
        netPriceWithVAT: "netPriceWithVAT",
        productPictures: "productPictures",
        productStockStatus: "productStockStatus",
        stock: "stock",
        brand: "brand"
      };
      async fetchProducts() {
        const token = this.supplier.token;
        if (!token) {
          throw new Error("Civaner token tan\u0131ms\u0131z");
        }
        const dolarKur = Number(this.supplier.dolar_kur || 0);
        const euroKur = Number(this.supplier.euro_kur || 0);
        if (!dolarKur || !euroKur) {
          logger.warn(`[${this.name}] dolar_kur veya euro_kur tan\u0131ml\u0131 de\u011Fil (USD=${dolarKur}, EUR=${euroKur})`);
        }
        const allProducts = [];
        let page = 0;
        let detectLastPage = false;
        while (!detectLastPage) {
          const url = `${CIVANER_BASE}/Arama/_Prbx?q=&Page=${page}&page=0&Cat=&_StokBoxCount=&Paging=true`;
          logger.info(`[${this.name}] Sayfa \xE7ekiliyor: page=${page}`);
          let response;
          try {
            response = await import_axios5.default.get(url, {
              headers: { Cookie: token },
              timeout: 6e4
            });
          } catch (err) {
            throw new Error(`Civaner sayfa \xE7ekilemedi (page=${page}): ${err.message}`);
          }
          const dom = new import_jsdom.JSDOM(response.data);
          const document = dom.window.document;
          const items = document.querySelectorAll(".prbx-item");
          if (items.length === 0) {
            detectLastPage = true;
            break;
          }
          items.forEach((item) => {
            const productTitle = item.querySelector(".prbx-ad.detay")?.textContent?.trim() ?? "";
            const productCode = item.querySelector(".prbx-alt-ad")?.textContent?.trim() ?? "";
            const productPicturesRaw = item.querySelector(".prbx-image img")?.getAttribute("data-src") ?? "";
            const stockStatusRaw = item.querySelector(".prbx-fiyat.clr1.text-center .prbx-value")?.textContent?.trim() ?? "";
            const brand = item.querySelector(".prbx-fiyat.clr1 .prbx-value")?.textContent?.trim() ?? "";
            const priceElements = item.querySelectorAll(".price.net-price.tl-fiyat");
            let priceRaw = "";
            priceElements.forEach((priceElement) => {
              const priceText = priceElement?.textContent?.trim();
              if (priceText && (priceText.includes("USD") || priceText.includes("EUR"))) {
                priceRaw = priceText.replace(".", "").replace(",", ".").trim();
              }
            });
            const priceParts = priceRaw.split(" ");
            const priceValue = parseFloat(priceParts[0]) || 0;
            const currency = priceParts[1] ?? "";
            const kur = currency === "USD" ? dolarKur : currency === "EUR" ? euroKur : 0;
            const netPriceWithVAT = priceValue * kur;
            const stockStatus = stockStatusRaw === "Yok" ? "Yok" : "Var";
            const stock = stockStatusRaw === "Yok" ? 0 : 10;
            const productPictures = productPicturesRaw ? `${CIVANER_BASE}/${productPicturesRaw.replace(/^\/+/, "")}` : "";
            allProducts.push({
              productTitle,
              productCode,
              netPriceWithVAT,
              productPictures,
              productStockStatus: stockStatus,
              stock,
              brand,
              currency
            });
          });
          page++;
        }
        logger.info(`[${this.name}] Toplam \xE7ekilen \xFCr\xFCn: ${allProducts.length}`);
        return allProducts;
      }
    };
  }
});

// worker/plugins/catpower.ts
var catpower_exports = {};
__export(catpower_exports, {
  default: () => CatpowerPlugin
});
var import_axios6, import_jsdom2, CATPOWER_BASE, CatpowerPlugin;
var init_catpower = __esm({
  "worker/plugins/catpower.ts"() {
    "use strict";
    import_axios6 = __toESM(require("axios"));
    import_jsdom2 = require("jsdom");
    init_plugin_base();
    init_logger();
    CATPOWER_BASE = "https://bayi.catpower.com.tr";
    CatpowerPlugin = class extends PluginBase {
      name = "Catpower";
      keyMap = {
        productTitle: "productTitle",
        productCode: "productCode",
        netPriceWithVAT: "netPriceWithVAT",
        productPictures: "productPictures",
        productStockStatus: "productStockStatus",
        stock: "stock",
        brand: "brand"
      };
      async fetchProducts() {
        const token = this.supplier.token;
        if (!token) {
          throw new Error("Catpower token tan\u0131ms\u0131z");
        }
        const allProducts = [];
        let page = 1;
        let detectLastPage = false;
        while (!detectLastPage) {
          const url = `${CATPOWER_BASE}/Arama/_Prbx?page=${page}`;
          logger.info(`[${this.name}] Sayfa \xE7ekiliyor: page=${page}`);
          let response;
          try {
            response = await import_axios6.default.get(url, {
              headers: { Cookie: token },
              timeout: 6e4
            });
          } catch (err) {
            throw new Error(`Catpower sayfa \xE7ekilemedi (page=${page}): ${err.message}`);
          }
          const dom = new import_jsdom2.JSDOM(response.data);
          const document = dom.window.document;
          const items = document.querySelectorAll(".prbx-item");
          if (items.length === 0) {
            detectLastPage = true;
            break;
          }
          items.forEach((item) => {
            const productTitle = item.querySelector(".prbx-ad.detay")?.textContent?.trim() ?? "";
            const productCode = item.querySelector(".prbx-value[title]")?.textContent?.trim() ?? "";
            const productPicturesRaw = item.querySelector(".prbx-image img")?.getAttribute("data-src") ?? "";
            const stockStatusRaw = item.querySelector(".prbx-value.bg-success")?.textContent?.trim() ?? "";
            const brand = item.querySelector(".prbx-fiyat .prbx-value.text-right")?.textContent?.trim() ?? "";
            let priceText = item.querySelector(".stkbox-kdv-text-up .prbx-value")?.textContent?.trim() ?? "";
            if (!priceText) {
              const popupEl = item.querySelector(".stkbox-kdv-pop-up .stkbox-kdv-text-up .prbx-value");
              priceText = popupEl?.textContent?.trim() ?? "";
            }
            if (priceText) {
              priceText = priceText.replace("TL", "").trim();
            }
            const netPriceWithVAT = priceText ? parseFloat(priceText.replace(/\./g, "").replace(",", ".")) || 0 : 0;
            const stockStatus = stockStatusRaw === "STOK VAR" ? "Var" : "Yok";
            const stock = stockStatusRaw === "STOK VAR" ? 20 : 0;
            const productPictures = productPicturesRaw ? `${CATPOWER_BASE}/${productPicturesRaw.replace(/^\/+/, "")}` : "";
            allProducts.push({
              productTitle,
              productCode,
              netPriceWithVAT,
              productPictures,
              productStockStatus: stockStatus,
              stock,
              brand
            });
          });
          page++;
        }
        logger.info(`[${this.name}] Toplam \xE7ekilen \xFCr\xFCn: ${allProducts.length}`);
        return allProducts;
      }
    };
  }
});

// worker/plugins/abmhirdavat.ts
var abmhirdavat_exports = {};
__export(abmhirdavat_exports, {
  default: () => AbmHirdavatPlugin
});
function parsePrice(price) {
  if (!price) return 0;
  if (typeof price === "string") {
    const clean = price.replace(/[^\d.,]/g, "").replace(",", ".");
    return parseFloat(clean) || 0;
  }
  return parseFloat(price) || 0;
}
function parseStockStatus(status) {
  if (!status) return "Yok";
  const s = status.toString().toLowerCase();
  if (s.includes("var") || s.includes("mevcut") || s === "true" || s === "1") {
    if (s.includes("az") || s.includes("d\xFC\u015F\xFCk")) return "Az Var";
    return "Var";
  }
  if (s.includes("az") || s.includes("d\xFC\u015F\xFCk")) return "Az Var";
  return "Yok";
}
var import_axios7, import_xml2js, ABM_XML_URL, MAX_RETRIES5, RETRY_DELAY_MS5, RATE_LIMIT_WAIT_MS, sleep, AbmHirdavatPlugin;
var init_abmhirdavat = __esm({
  "worker/plugins/abmhirdavat.ts"() {
    "use strict";
    import_axios7 = __toESM(require("axios"));
    import_xml2js = __toESM(require("xml2js"));
    init_plugin_base();
    init_logger();
    ABM_XML_URL = "https://b2b.abmhirdavat.com.tr/Genel/Xml/8E5500B7-FA76-40A1-99C6-741C4E7D10B2";
    MAX_RETRIES5 = 3;
    RETRY_DELAY_MS5 = 5e3;
    RATE_LIMIT_WAIT_MS = 15 * 60 * 1e3;
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    AbmHirdavatPlugin = class extends PluginBase {
      name = "AbmHirdavat";
      keyMap = {
        productTitle: "Adi",
        productCode: "Kod",
        netPriceWithVAT: (raw) => parsePrice(raw.KdvDahilNetFiyat),
        productPictures: "Resim1",
        productStockStatus: (raw) => parseStockStatus(raw.StokDurumu),
        stock: (raw) => parseStockStatus(raw.StokDurumu),
        brand: (raw) => raw.Marka || "Genel"
      };
      async fetchProducts() {
        const xmlData = await this.fetchXmlData();
        return await this.parseXmlData(xmlData);
      }
      async fetchXmlData() {
        let lastError;
        let lastDetails = "";
        for (let attempt = 1; attempt <= MAX_RETRIES5; attempt++) {
          try {
            logger.info(`[${this.name}] XML \xE7ekme denemesi ${attempt}/${MAX_RETRIES5}`);
            const response = await import_axios7.default.get(ABM_XML_URL, {
              timeout: 3e4,
              // axios non-2xx durumda da response döndürsün, böylece status kodunu loglarız
              validateStatus: () => true,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/xml, text/xml, */*",
                "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
              }
            });
            const status = response.status;
            const contentType = response.headers?.["content-type"] || "unknown";
            const dataLength = typeof response.data === "string" ? response.data.length : JSON.stringify(response.data || "").length;
            logger.info(
              `[${this.name}] HTTP ${status} | content-type: ${contentType} | uzunluk: ${dataLength} byte`
            );
            if (status >= 400) {
              lastDetails = `HTTP ${status} ${contentType} (${dataLength}b)`;
              throw new Error(`ABM sunucusu ${status} d\xF6nd\xFC`);
            }
            if (!response.data || dataLength === 0) {
              lastDetails = `Bo\u015F response (HTTP ${status}, content-type: ${contentType})`;
              throw new Error(`ABM bo\u015F cevap d\xF6nd\xFC (HTTP ${status})`);
            }
            if (dataLength < 50) {
              const preview = String(response.data).substring(0, 200);
              lastDetails = `Anormal k\u0131sa response (${dataLength}b): ${preview}`;
              throw new Error(`ABM k\u0131sa cevap d\xF6nd\xFC (${dataLength} byte): ${preview}`);
            }
            const responseText = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
            if (responseText.includes("Maximum Sorgu Limitine Ula\u015Ft\u0131n\u0131z") || responseText.includes("Maxmimum Sorgu Limitine Ula\u015Ft\u0131n\u0131z")) {
              let nextTime = "Bilinmiyor";
              try {
                const parser = new import_xml2js.default.Parser({ explicitArray: false, trim: true });
                const errorResult = await parser.parseStringPromise(response.data);
                if (errorResult?.Hata?.HataMi === "True") {
                  nextTime = errorResult.Hata.SonrakiXmlTarihi || nextTime;
                }
              } catch {
              }
              logger.warn(
                `[${this.name}] Rate limit. Sonraki deneme: ${nextTime}. 15dk bekleniyor...`
              );
              if (attempt < MAX_RETRIES5) {
                await sleep(RATE_LIMIT_WAIT_MS);
                continue;
              }
              throw new Error(
                `ABM H\u0131rdavat rate limit a\u015F\u0131ld\u0131. Sonraki deneme: ${nextTime}`
              );
            }
            logger.info(`[${this.name}] XML ba\u015Far\u0131yla \xE7ekildi (${dataLength} byte)`);
            return response.data;
          } catch (err) {
            lastError = err;
            const code = err.code || "UNKNOWN";
            const errMsg = err.message || "(bo\u015F hata mesaj\u0131)";
            const status = err.response?.status;
            const respPreview = err.response?.data ? String(err.response.data).substring(0, 200) : "";
            const details = [];
            details.push(`code=${code}`);
            if (status) details.push(`status=${status}`);
            if (errMsg) details.push(`msg="${errMsg}"`);
            if (lastDetails) details.push(`detay="${lastDetails}"`);
            if (respPreview) details.push(`response="${respPreview}"`);
            logger.error(
              `[${this.name}] Deneme ${attempt} ba\u015Far\u0131s\u0131z: ${details.join(" | ")}`
            );
            if (attempt < MAX_RETRIES5) {
              await sleep(RETRY_DELAY_MS5);
            }
          }
        }
        const finalMsg = lastError?.message || lastDetails || "t\xFCm denemeler ba\u015Far\u0131s\u0131z (sebep belirsiz)";
        throw new Error(`ABM H\u0131rdavat XML \xE7ekilemedi: ${finalMsg}`);
      }
      async parseXmlData(xmlData) {
        try {
          const parser = new import_xml2js.default.Parser({
            explicitArray: false,
            ignoreAttrs: false,
            trim: true
          });
          const result = await parser.parseStringPromise(xmlData);
          if (result?.Hata?.HataMi === "True") {
            const errorMsg = result.Hata.HataMesaj || "Bilinmeyen hata";
            const nextTime = result.Hata.SonrakiXmlTarihi || "Bilinmiyor";
            throw new Error(`ABM H\u0131rdavat API hatas\u0131: ${errorMsg}. Sonraki: ${nextTime}`);
          }
          let products = [];
          if (result?.Stoklar?.Stok) {
            products = Array.isArray(result.Stoklar.Stok) ? result.Stoklar.Stok : [result.Stoklar.Stok];
          } else {
            for (const key of Object.keys(result || {})) {
              const node = result[key];
              if (node && typeof node === "object") {
                for (const subKey of Object.keys(node)) {
                  if (Array.isArray(node[subKey])) {
                    products = node[subKey];
                    logger.info(`[${this.name}] \xDCr\xFCnler fallback ile bulundu: ${key}.${subKey}`);
                    break;
                  }
                }
                if (products.length > 0) break;
              }
            }
          }
          if (products.length === 0) {
            logger.warn(`[${this.name}] XML i\xE7inde \xFCr\xFCn bulunamad\u0131`);
          }
          return products;
        } catch (err) {
          throw new Error(`ABM H\u0131rdavat XML parse hatas\u0131: ${err.message}`);
        }
      }
    };
  }
});

// worker/plugins/pars.ts
var pars_exports = {};
__export(pars_exports, {
  default: () => ParsPlugin
});
var import_axios8, import_xml2js2, PARS_XML_URL, ParsPlugin;
var init_pars = __esm({
  "worker/plugins/pars.ts"() {
    "use strict";
    import_axios8 = __toESM(require("axios"));
    import_xml2js2 = __toESM(require("xml2js"));
    init_plugin_base();
    init_logger();
    PARS_XML_URL = "https://b2b.parsendustri.com.tr/export/1/45S4586M43";
    ParsPlugin = class extends PluginBase {
      name = "Pars";
      keyMap = {
        productTitle: "productTitle",
        productCode: "productCode",
        netPriceWithVAT: (raw) => parseFloat(raw.netPriceWithVAT),
        productPictures: "productPictures",
        productStockStatus: "productStockStatus",
        stock: "productStockStatus",
        brand: "brand"
      };
      async fetchProducts() {
        try {
          logger.info(`[${this.name}] XML \xE7ekiliyor: ${PARS_XML_URL}`);
          const response = await import_axios8.default.get(PARS_XML_URL, { timeout: 6e4 });
          const parser = new import_xml2js2.default.Parser();
          const result = await parser.parseStringPromise(response.data);
          if (!result?.products?.product) {
            logger.warn(`[${this.name}] XML i\xE7inde \xFCr\xFCn bulunamad\u0131`);
            return [];
          }
          const products = result.products.product.map((element) => {
            const quantity = parseFloat(element.quantity?.[0] ?? "0") || 0;
            return {
              productTitle: element.name?.[0] ?? "",
              productCode: element.productCode?.[0] ?? "",
              netPriceWithVAT: element.price?.[0] ?? "0",
              productPictures: element.image1?.[0] ?? "",
              productStockStatus: quantity > 0 ? "Var" : "Yok",
              brand: element.brand?.[0] ?? ""
            };
          });
          return products;
        } catch (err) {
          throw new Error(`Pars XML \xE7ekme/parse hatas\u0131: ${err.message}`);
        }
      }
    };
  }
});

// worker/plugins/bizimhesap.ts
var bizimhesap_exports = {};
__export(bizimhesap_exports, {
  default: () => BizimhesapPlugin
});
var import_axios9, BIZIMHESAP_URL, BIZIMHESAP_KEY, BizimhesapPlugin;
var init_bizimhesap = __esm({
  "worker/plugins/bizimhesap.ts"() {
    "use strict";
    import_axios9 = __toESM(require("axios"));
    init_plugin_base();
    init_logger();
    BIZIMHESAP_URL = "https://bizimhesap.com/api/b2b/products";
    BIZIMHESAP_KEY = "BZMHB2B724018943908D0B82491F203F";
    BizimhesapPlugin = class extends PluginBase {
      name = "Bizimhesap";
      keyMap = {
        productTitle: "title",
        productCode: "code",
        netPriceWithVAT: (raw) => parseFloat(raw.buyingPrice) || 0,
        productPictures: (raw) => {
          if (!raw.photo) return "";
          try {
            const photos = JSON.parse(raw.photo);
            return photos?.[0]?.PhotoUrlOriginal ?? "";
          } catch {
            return "";
          }
        },
        productStockStatus: () => "Var",
        stock: (raw) => {
          const price = parseFloat(raw.buyingPrice) || 0;
          if (price === 0) return 0;
          return parseInt(raw.quantity, 10) || 0;
        },
        brand: "brand"
      };
      async fetchProducts() {
        const token = this.supplier.token;
        if (!token) {
          throw new Error("Bizimhesap token tan\u0131ml\u0131 de\u011Fil (supplier.token)");
        }
        try {
          logger.info(`[${this.name}] API \xE7a\u011Fr\u0131s\u0131: ${BIZIMHESAP_URL}`);
          const response = await import_axios9.default.get(BIZIMHESAP_URL, {
            timeout: 6e4,
            headers: {
              Key: BIZIMHESAP_KEY,
              Token: token
            }
          });
          const products = response.data?.data?.products;
          if (!Array.isArray(products)) {
            logger.warn(`[${this.name}] API yan\u0131t\u0131nda \xFCr\xFCn listesi bulunamad\u0131`);
            return [];
          }
          return products.filter((item) => item);
        } catch (err) {
          throw new Error(`Bizimhesap API hatas\u0131: ${err.message}`);
        }
      }
    };
  }
});

// worker/plugins/googlesheets.ts
var googlesheets_exports = {};
__export(googlesheets_exports, {
  default: () => GoogleSheetsPlugin
});
function parseSheetPrice(value) {
  if (value === null || value === void 0) return 0;
  if (typeof value === "number") return value;
  let cleaned = String(value).replace(/<[^>]*>/g, "").replace(/\s*&nbsp;/g, "").trim();
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
var import_path3, import_googleapis, GoogleSheetsPlugin;
var init_googlesheets = __esm({
  "worker/plugins/googlesheets.ts"() {
    "use strict";
    import_path3 = __toESM(require("path"));
    import_googleapis = require("googleapis");
    init_plugin_base();
    init_logger();
    GoogleSheetsPlugin = class extends PluginBase {
      name = "GoogleSheets";
      keyMap = {
        productTitle: "Urun Adi",
        productCode: "Stok Kodu",
        netPriceWithVAT: (raw) => parseSheetPrice(raw["Alis Fiyati"]),
        productPictures: "Urun Gorseli",
        productStockStatus: "Stok Durumu",
        stock: "Stok Adedi",
        brand: "Marka"
      };
      async fetchProducts() {
        const credPath = process.env.GOOGLE_CREDENTIALS_PATH;
        const sheetId = process.env.GOOGLE_SHEETS_ID;
        if (!credPath) {
          throw new Error(
            `[${this.name}] GOOGLE_CREDENTIALS_PATH env de\u011Fi\u015Fkeni gerekli (Google service account JSON yolu)`
          );
        }
        if (!sheetId) {
          throw new Error(`[${this.name}] GOOGLE_SHEETS_ID env de\u011Fi\u015Fkeni gerekli`);
        }
        const auth = new import_googleapis.google.auth.GoogleAuth({
          keyFile: import_path3.default.resolve(credPath),
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        });
        const sheets = import_googleapis.google.sheets({ version: "v4", auth });
        const range = "Sayfa1!A1:H10000";
        logger.info(`[${this.name}] Google Sheets \xE7ekiliyor: ${range}`);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range
        });
        const rows = response.data.values;
        if (!rows || rows.length <= 1) {
          logger.warn(`[${this.name}] Sheet bo\u015F veya yaln\u0131zca ba\u015Fl\u0131k var`);
          return [];
        }
        const headers = rows[0];
        const dataRows = rows.slice(1);
        const products = dataRows.map((row) => {
          const obj = {};
          headers.forEach((header, idx) => {
            if (header) obj[header] = row[idx];
          });
          return obj;
        }).filter((item) => Object.keys(item).length > 0);
        logger.info(`[${this.name}] Sheet'ten ${products.length} ham \xFCr\xFCn okundu`);
        return products;
      }
    };
  }
});

// worker/plugins/dovizsheet.ts
var dovizsheet_exports = {};
__export(dovizsheet_exports, {
  default: () => DovizsheetPlugin
});
function parseSheetPrice2(value) {
  if (value === null || value === void 0) return 0;
  if (typeof value === "number") return value;
  let cleaned = String(value).replace(/<[^>]*>/g, "").replace(/\s*&nbsp;/g, "").trim();
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
var import_path4, import_googleapis2, DovizsheetPlugin;
var init_dovizsheet = __esm({
  "worker/plugins/dovizsheet.ts"() {
    "use strict";
    import_path4 = __toESM(require("path"));
    import_googleapis2 = require("googleapis");
    init_plugin_base();
    init_logger();
    DovizsheetPlugin = class extends PluginBase {
      name = "Dovizsheet";
      keyMap = {
        productTitle: "Urun Adi",
        productCode: "Stok Kodu",
        netPriceWithVAT: (raw) => parseSheetPrice2(raw["Alis Fiyati"]),
        productPictures: "Urun Gorseli",
        productStockStatus: "Stok Durumu",
        stock: "Stok Adedi",
        brand: "Marka"
      };
      async fetchProducts() {
        const credPath = process.env.GOOGLE_CREDENTIALS_PATH;
        const sheetId = process.env.DOVIZSHEET_ID || process.env.GOOGLE_SHEETS_ID;
        if (!credPath) {
          throw new Error(
            `[${this.name}] GOOGLE_CREDENTIALS_PATH env de\u011Fi\u015Fkeni gerekli (Google service account JSON yolu)`
          );
        }
        if (!sheetId) {
          throw new Error(
            `[${this.name}] DOVIZSHEET_ID (veya GOOGLE_SHEETS_ID) env de\u011Fi\u015Fkeni gerekli`
          );
        }
        const auth = new import_googleapis2.google.auth.GoogleAuth({
          keyFile: import_path4.default.resolve(credPath),
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        });
        const sheets = import_googleapis2.google.sheets({ version: "v4", auth });
        const range = "Doviz!A1:H10000";
        logger.info(`[${this.name}] Google Sheets \xE7ekiliyor: ${range}`);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range
        });
        const rows = response.data.values;
        if (!rows || rows.length <= 1) {
          logger.warn(`[${this.name}] Sheet bo\u015F veya yaln\u0131zca ba\u015Fl\u0131k var`);
          return [];
        }
        const headers = rows[0];
        const dataRows = rows.slice(1);
        const products = dataRows.map((row) => {
          const obj = {};
          headers.forEach((header, idx) => {
            if (header) obj[header] = row[idx];
          });
          return obj;
        }).filter((item) => Object.keys(item).length > 0);
        logger.info(`[${this.name}] Sheet'ten ${products.length} ham \xFCr\xFCn okundu`);
        return products;
      }
    };
  }
});

// worker/plugins/gedizstoksheet.ts
var gedizstoksheet_exports = {};
__export(gedizstoksheet_exports, {
  default: () => GedizStokSheetPlugin
});
function parseSheetPrice3(value) {
  if (value === null || value === void 0) return 0;
  if (typeof value === "number") return value;
  let cleaned = String(value).replace(/<[^>]*>/g, "").replace(/\s*&nbsp;/g, "").trim();
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
var import_path5, import_googleapis3, GedizStokSheetPlugin;
var init_gedizstoksheet = __esm({
  "worker/plugins/gedizstoksheet.ts"() {
    "use strict";
    import_path5 = __toESM(require("path"));
    import_googleapis3 = require("googleapis");
    init_plugin_base();
    init_logger();
    GedizStokSheetPlugin = class extends PluginBase {
      // Eski projede class adı GedizstokSheet, SupplierLogger çağrısında 'GedizstokSheet'
      // Yeni projede konvansiyona uygun olarak 'GedizStokSheet' kullanıyoruz —
      // tedarikciler.name DB değeri ile birebir eşleşmeli.
      name = "GedizStokSheet";
      keyMap = {
        productTitle: "Urun Adi",
        productCode: "Stok Kodu",
        netPriceWithVAT: (raw) => parseSheetPrice3(raw["Alis Fiyati"]),
        productPictures: "Urun Gorseli",
        productStockStatus: "Stok Durumu",
        stock: "Stok Adedi",
        brand: "Marka"
      };
      async fetchProducts() {
        const credPath = process.env.GOOGLE_CREDENTIALS_PATH;
        const sheetId = process.env.GEDIZSTOKSHEET_ID || process.env.GOOGLE_SHEETS_ID;
        if (!credPath) {
          throw new Error(
            `[${this.name}] GOOGLE_CREDENTIALS_PATH env de\u011Fi\u015Fkeni gerekli (Google service account JSON yolu)`
          );
        }
        if (!sheetId) {
          throw new Error(
            `[${this.name}] GEDIZSTOKSHEET_ID (veya GOOGLE_SHEETS_ID) env de\u011Fi\u015Fkeni gerekli`
          );
        }
        const auth = new import_googleapis3.google.auth.GoogleAuth({
          keyFile: import_path5.default.resolve(credPath),
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        });
        const sheets = import_googleapis3.google.sheets({ version: "v4", auth });
        const range = "Gedizstok!A1:H10000";
        logger.info(`[${this.name}] Google Sheets \xE7ekiliyor: ${range}`);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range
        });
        const rows = response.data.values;
        if (!rows || rows.length <= 1) {
          logger.warn(`[${this.name}] Sheet bo\u015F veya yaln\u0131zca ba\u015Fl\u0131k var`);
          return [];
        }
        const headers = rows[0];
        const dataRows = rows.slice(1);
        const products = dataRows.map((row) => {
          const obj = {};
          headers.forEach((header, idx) => {
            if (header) obj[header] = row[idx];
          });
          return obj;
        }).filter((item) => Object.keys(item).length > 0);
        logger.info(`[${this.name}] Sheet'ten ${products.length} ham \xFCr\xFCn okundu`);
        return products;
      }
    };
  }
});

// worker/token-refresher/_base.ts
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
var turkishToMojibake;
var init_base = __esm({
  "worker/token-refresher/_base.ts"() {
    "use strict";
    init_prisma();
    init_logger();
    turkishToMojibake = {
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
  }
});

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
    const res = await import_axios10.default.post(loginUrl, formBody, {
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
  const response = await import_axios10.default.get("https://b4b.civaner.com/", {
    headers: { Cookie: token },
    timeout: 3e4
  });
  const dom = new import_jsdom3.JSDOM(response.data);
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
    const pre = await import_axios10.default.get(`${baseUrl}/Login`, {
      validateStatus: () => true,
      maxRedirects: 0,
      timeout: 1e4
    });
    const preCookies = (pre.headers["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ");
    const loginRes = await import_axios10.default.post(`${baseUrl}/Login/Index`, {
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
    const pre = await import_axios10.default.get(`${baseUrl}/`, {
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
    const res = await import_axios10.default.post(`${baseUrl}/`, formBody, {
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
var import_axios10, import_jsdom3, refresherMap, SUPPORTED_SUPPLIERS;
var init_refreshers = __esm({
  "worker/token-refresher/refreshers.ts"() {
    "use strict";
    import_axios10 = __toESM(require("axios"));
    import_jsdom3 = require("jsdom");
    init_base();
    init_logger();
    init_prisma();
    refresherMap = {
      "Civaner": refreshCivaner,
      "AbmHirdavat": refreshAbmHirdavat,
      "Akinziraat": refreshAkinziraat,
      "Catpower": refreshCatpower,
      "Mapas": refreshMapas,
      "Ital": refreshItal
    };
    SUPPORTED_SUPPLIERS = Object.keys(refresherMap);
  }
});

// worker/helpers/token-progress.ts
function flush() {
  buffer2.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    import_fs3.default.writeFileSync(PROGRESS_FILE2, JSON.stringify(buffer2, null, 2));
  } catch {
  }
}
function startTokenRefresh(suppliers) {
  buffer2 = {
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
  buffer2.current = supplier;
  const entry = buffer2.suppliers.find((s) => s.supplier === supplier);
  if (entry) {
    entry.status = "running";
    entry.startedAt = (/* @__PURE__ */ new Date()).toISOString();
  } else {
    buffer2.suppliers.push({
      supplier,
      status: "running",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      finishedAt: null
    });
  }
  flush();
}
function markSupplierDone(supplier, result) {
  const entry = buffer2.suppliers.find((s) => s.supplier === supplier);
  const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (entry) {
    entry.status = result.success ? "success" : "error";
    entry.finishedAt = finishedAt;
    entry.durationSec = result.durationSec;
    entry.tokenLength = result.tokenLength;
    entry.error = result.error;
  }
  if (result.success) buffer2.successCount++;
  else buffer2.errorCount++;
  flush();
}
function endTokenRefresh() {
  buffer2.isRunning = false;
  buffer2.current = null;
  buffer2.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
  flush();
}
var import_fs3, import_path6, PROGRESS_FILE2, DEFAULT, buffer2;
var init_token_progress = __esm({
  "worker/helpers/token-progress.ts"() {
    "use strict";
    import_fs3 = __toESM(require("fs"));
    import_path6 = __toESM(require("path"));
    PROGRESS_FILE2 = import_path6.default.join(__dirname, "..", "logs", "token-progress.json");
    DEFAULT = {
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
    buffer2 = { ...DEFAULT, suppliers: [] };
  }
});

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
var __isTokenRefresherEntry;
var init_token_refresher = __esm({
  "worker/token-refresher/index.ts"() {
    "use strict";
    init_refreshers();
    init_logger();
    init_token_progress();
    __isTokenRefresherEntry = !!process.argv[1]?.match(/token-refresher[\/\\]index\.(js|ts)$/);
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
  }
});

// worker/cron.ts
var cron_exports = {};
function spawnScript(label, args) {
  return new Promise((resolve) => {
    const child = (0, import_child_process.spawn)(NODE_PATH, args, {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      env: { ...process.env }
    });
    child.on("error", (err) => {
      logger.error(`[${label}] spawn hatas\u0131: ${err.message}`);
      resolve({ ok: false, code: null });
    });
    child.on("exit", (code) => {
      resolve({ ok: code === 0, code });
    });
  });
}
async function refreshTokensThenSync(label) {
  logger.info(`Cron (${label}) tetiklendi`);
  logger.info(`Cron (${label}): Token yenileme ba\u015Fl\u0131yor`);
  try {
    const tokens = await refreshAll();
    const tokenOk = tokens.filter((t) => t.success).length;
    const tokenErr = tokens.length - tokenOk;
    logger.info(`Cron (${label}): Token yenileme tamamland\u0131 \u2014 ${tokenOk}/${tokens.length} ba\u015Far\u0131l\u0131${tokenErr ? ` (${tokenErr} hatal\u0131)` : ""}`);
  } catch (err) {
    logger.error(`Cron (${label}): Token yenileme hatas\u0131: ${err.message} (sync devam ediyor)`);
  }
  const mode = label === "FULL" ? "full" : "inventory-only";
  const syncArgs = [WORKER_ENTRY, "--all"];
  if (mode === "inventory-only") syncArgs.push("--inventory-only");
  logger.info(`Cron (${label}): Sync spawn ediliyor (mode=${mode})`);
  const syncRes = await spawnScript(`${label}-sync`, syncArgs);
  logger.info(`Cron (${label}) sync bitti (exit=${syncRes.code})`);
  logger.info(`Cron (${label}): XML \xFCretimi spawn ediliyor`);
  const xmlRes = await spawnScript(`${label}-xml`, [XML_ENTRY]);
  logger.info(`Cron (${label}) XML bitti (exit=${xmlRes.code})`);
  logger.info(`Cron (${label}) ============= AKI\u015E TAMAMLANDI =============`);
}
var import_node_cron, import_child_process, import_path7, FULL_SCHEDULE, INVENTORY_SCHEDULE, PROJECT_ROOT, NODE_PATH, WORKER_ENTRY, XML_ENTRY;
var init_cron = __esm({
  "worker/cron.ts"() {
    "use strict";
    import_node_cron = __toESM(require("node-cron"));
    import_child_process = require("child_process");
    import_path7 = __toESM(require("path"));
    init_token_refresher();
    init_logger();
    FULL_SCHEDULE = process.env.SYNC_CRON_FULL || "0 0 * * *";
    INVENTORY_SCHEDULE = process.env.SYNC_CRON_INVENTORY || "0 5,14 * * *";
    PROJECT_ROOT = import_path7.default.resolve(__dirname, "..");
    NODE_PATH = process.execPath;
    WORKER_ENTRY = import_path7.default.join(PROJECT_ROOT, "worker-dist", "index.js");
    XML_ENTRY = import_path7.default.join(PROJECT_ROOT, "worker-dist", "xml-generator", "index.js");
    logger.info(`Cron scheduler ba\u015Flat\u0131ld\u0131`);
    logger.info(`  Full sync      : ${FULL_SCHEDULE} (gece 12)`);
    logger.info(`  Inventory sync : ${INVENTORY_SCHEDULE} (sabah 5 + \xF6\u011Flen 2)`);
    logger.info(`  Her sync \xF6ncesi t\xFCm tedarik\xE7i tokenleri yenilenir`);
    logger.info(`  Sync ve XML fresh child process olarak spawn edilir`);
    import_node_cron.default.schedule(FULL_SCHEDULE, () => refreshTokensThenSync("FULL"));
    import_node_cron.default.schedule(INVENTORY_SCHEDULE, () => refreshTokensThenSync("INVENTORY"));
    process.on("SIGTERM", () => {
      logger.info("SIGTERM al\u0131nd\u0131, \xE7\u0131k\u0131l\u0131yor");
      process.exit(0);
    });
    process.on("SIGINT", () => {
      logger.info("SIGINT al\u0131nd\u0131, \xE7\u0131k\u0131l\u0131yor");
      process.exit(0);
    });
  }
});

// lib/services/sync.service.ts
init_prisma();
var SYNC_LOCK_KEY = "sync_running";
var syncService = {
  /**
   * Sync şu anda çalışıyor mu?
   */
  async isRunning() {
    const setting = await prisma.$queryRawUnsafe(
      `SELECT status FROM settings WHERE name = ? LIMIT 1`,
      SYNC_LOCK_KEY
    );
    return Array.isArray(setting) && setting[0]?.status === 1;
  },
  /**
   * Lock al — eğer zaten çalışıyorsa false döner
   */
  async acquireLock() {
    const running = await this.isRunning();
    if (running) return false;
    await prisma.$executeRawUnsafe(
      `INSERT INTO settings (name, status) VALUES (?, 1)
       ON DUPLICATE KEY UPDATE status = 1`,
      SYNC_LOCK_KEY
    );
    return true;
  },
  /**
   * Lock'u serbest bırak
   */
  async releaseLock() {
    await prisma.$executeRawUnsafe(
      `UPDATE settings SET status = 0 WHERE name = ?`,
      SYNC_LOCK_KEY
    );
  },
  /**
   * Mevcut tedarikçi adını sakla (frontend'de polling için)
   */
  async setCurrentSupplier(supplierName) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO settings (name, status) VALUES ('sync_current', ?)
       ON DUPLICATE KEY UPDATE status = ?`,
      supplierName ? 1 : 0,
      supplierName ? 1 : 0
    );
  },
  /**
   * Aktif tedarikçileri sıralı olarak getir
   */
  async getActiveSuppliers() {
    return prisma.supplier.findMany({
      where: { status: 1 },
      orderBy: { sira: "asc" }
    });
  },
  /**
   * Sync log'unu tedarikci_cron tablosuna yaz
   */
  async logSync(data) {
    await prisma.supplierCron.create({
      data: {
        name: data.name,
        status: data.status,
        error: data.error,
        created_count: data.createdCount ?? 0,
        updated_count: data.updatedCount ?? 0,
        total_count: data.totalCount,
        exist_count: data.existCount,
        time: data.durationSeconds ? String(data.durationSeconds) : null,
        response_time: data.durationSeconds,
        error_category: data.errorCategory,
        products_processed: data.productsProcessed ?? 0
      }
    });
  }
};

// lib/services/product-update.service.ts
init_prisma();

// lib/utils/pricing.ts
init_prisma();
async function getCommissionRate(categoryId, basePrice) {
  const tier = await prisma.priceTier.findFirst({
    where: {
      min_fiyat: { lte: basePrice },
      max_fiyat: { gt: basePrice }
    },
    orderBy: { sira: "asc" }
  });
  if (!tier) return 0;
  const commission = await prisma.categoryCommission.findUnique({
    where: {
      kategori_id_kademe_id: {
        kategori_id: categoryId,
        kademe_id: tier.id
      }
    }
  });
  return commission?.oran ?? 0;
}
async function calculateProductPrice(input) {
  const { basePrice, categoryId, supplierDiscount, desiPrice } = input;
  const baseFiyat = basePrice - basePrice * supplierDiscount / 100;
  const kategoriOran = await getCommissionRate(categoryId, baseFiyat);
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      sopyo_oran: true,
      n11_oran: true,
      trendyol_oran: true,
      hepsiburada_oran: true,
      pazarama_oran: true
    }
  });
  const sopyoOran = category?.sopyo_oran ?? 0;
  const n11Oran = category?.n11_oran ?? 0;
  const trendyolOran = category?.trendyol_oran ?? 0;
  const hepsiburadaOran = category?.hepsiburada_oran ?? 0;
  const pazaramaOran = category?.pazarama_oran ?? 0;
  const bolbolbulFiyat = baseFiyat + baseFiyat * kategoriOran / 100 + desiPrice;
  let sopyoFiyat = baseFiyat + baseFiyat * kategoriOran / 100;
  sopyoFiyat = sopyoFiyat + sopyoFiyat * sopyoOran / 100 + desiPrice;
  const n11Fiyat = sopyoFiyat + sopyoFiyat * n11Oran / 100;
  const trendyolFiyat = sopyoFiyat + sopyoFiyat * trendyolOran / 100;
  const hepsiburadaFiyat = sopyoFiyat + sopyoFiyat * hepsiburadaOran / 100;
  const pazaramaFiyat = sopyoFiyat + sopyoFiyat * pazaramaOran / 100;
  return {
    baseFiyat: Math.round(baseFiyat * 100) / 100,
    kategoriOran,
    bolbolbulFiyat: Math.round(bolbolbulFiyat * 100) / 100,
    sopyoFiyat: Math.round(sopyoFiyat * 100) / 100,
    n11Fiyat: Math.round(n11Fiyat * 100) / 100,
    trendyolFiyat: Math.round(trendyolFiyat * 100) / 100,
    hepsiburadaFiyat: Math.round(hepsiburadaFiyat * 100) / 100,
    pazaramaFiyat: Math.round(pazaramaFiyat * 100) / 100
  };
}

// lib/services/product-update.service.ts
async function upsertSupplierProduct(supplierName, product) {
  if (!product.productCode) return "skipped";
  const existing = await prisma.supplierProduct.findFirst({
    where: { productCode: product.productCode },
    select: { id: true, netPriceWithVAT: true, stock: true, productStockStatus: true, supplier_name: true }
  });
  const data = {
    supplier_name: supplierName,
    productTitle: product.productTitle || null,
    productCode: product.productCode,
    netPriceWithVAT: product.netPriceWithVAT,
    productPictures: product.productPictures || null,
    productStockStatus: product.productStockStatus || null,
    stock: product.stock,
    brand: product.brand || null,
    bizimhesap_fiyat: product.bizimhesap_fiyat ?? null,
    bizimhesap_stock: product.bizimhesap_stock ?? null,
    isFiyatTercih: product.isFiyatTercih ?? 0
  };
  if (!existing) {
    await prisma.supplierProduct.create({ data });
    return "created";
  }
  const hasChange = Number(existing.netPriceWithVAT) !== Number(product.netPriceWithVAT) || existing.stock !== product.stock || existing.productStockStatus !== product.productStockStatus || existing.supplier_name !== supplierName;
  if (!hasChange) return "skipped";
  await prisma.supplierProduct.update({
    where: { id: existing.id },
    data
  });
  await recalculateProductForSupplierProduct(supplierName, existing.id, product);
  return "updated";
}
async function recalculateProductForSupplierProduct(supplierName, supplierProductId, newData) {
  const product = await prisma.product.findFirst({
    where: { tedarikci_product_id: supplierProductId }
  });
  if (!product || !product.kategori_id) return;
  const supplier = await prisma.supplier.findFirst({ where: { name: supplierName } });
  const supplierDiscount = supplier?.discount ?? 0;
  let desiPrice = 0;
  if (product.desi) {
    const desiRecord = await prisma.desi.findFirst({
      where: { name: String(Math.floor(Number(product.desi))) }
    });
    desiPrice = desiRecord?.price ? Number(desiRecord.price) : 0;
  }
  let basePrice = newData.netPriceWithVAT;
  let effectiveDiscount = supplierDiscount;
  if (product.isFiyatTercih === 1 && newData.bizimhesap_fiyat) {
    basePrice = Number(newData.bizimhesap_fiyat);
    effectiveDiscount = 0;
  }
  const prices = await calculateProductPrice({
    basePrice,
    categoryId: product.kategori_id,
    supplierDiscount: effectiveDiscount,
    desiPrice
  });
  await prisma.product.update({
    where: { id: product.id },
    data: {
      // Son yazan tedarikçi kazanır — products.supplier de güncellenir
      supplier: supplierName,
      tedarikci_fiyat: basePrice,
      product_discount: effectiveDiscount,
      bolbolbul_fiyat: prices.bolbolbulFiyat,
      sopyo_fiyat: prices.sopyoFiyat,
      n11_fiyat: prices.n11Fiyat,
      trendyol_fiyat: prices.trendyolFiyat,
      hepsiburada_fiyat: prices.hepsiburadaFiyat,
      pazarama_fiyat: prices.pazaramaFiyat,
      // Stok eşitleme: eski projeyle aynı (tüm pazaryeri stokları = supplier stok)
      toplam_stock: newData.stock,
      bolbolbul_stock: newData.stock,
      sopyo_stock: newData.stock
    }
  });
}

// worker/orchestrator.ts
init_prisma();
init_logger();
init_progress();
var DEFAULT_OPTIONS = {
  mode: "full",
  enableSafetyThreshold: false,
  // şimdilik kapalı — hepsini sweep et
  thresholdPercent: 0.8
};
var PLUGIN_CLASSES = {};
var pluginsPreloaded = false;
async function preloadPlugins() {
  if (pluginsPreloaded) return;
  const loaders = {
    "Ital": () => Promise.resolve().then(() => (init_ital(), ital_exports)),
    "Mapas": () => Promise.resolve().then(() => (init_mapas(), mapas_exports)),
    "Cullas": () => Promise.resolve().then(() => (init_cullas(), cullas_exports)),
    "Akinziraat": () => Promise.resolve().then(() => (init_akinziraat(), akinziraat_exports)),
    "Civaner": () => Promise.resolve().then(() => (init_civaner(), civaner_exports)),
    "Catpower": () => Promise.resolve().then(() => (init_catpower(), catpower_exports)),
    "AbmHirdavat": () => Promise.resolve().then(() => (init_abmhirdavat(), abmhirdavat_exports)),
    "Pars": () => Promise.resolve().then(() => (init_pars(), pars_exports)),
    "Bizimhesap": () => Promise.resolve().then(() => (init_bizimhesap(), bizimhesap_exports)),
    "GoogleSheets": () => Promise.resolve().then(() => (init_googlesheets(), googlesheets_exports)),
    "Dovizsheet": () => Promise.resolve().then(() => (init_dovizsheet(), dovizsheet_exports)),
    "GedizStokSheet": () => Promise.resolve().then(() => (init_gedizstoksheet(), gedizstoksheet_exports))
  };
  const failures = [];
  for (const [name, loader] of Object.entries(loaders)) {
    try {
      const mod = await loader();
      const PluginClass = mod.default || mod[`${name}Plugin`];
      if (!PluginClass) {
        failures.push(`${name} (default export yok)`);
        continue;
      }
      PLUGIN_CLASSES[name] = PluginClass;
    } catch (err) {
      failures.push(`${name} (${err.message})`);
    }
  }
  const ok = Object.keys(PLUGIN_CLASSES).length;
  const total = Object.keys(loaders).length;
  pluginsPreloaded = ok === total;
  logger.info(`Plugin preload: ${ok}/${total} ba\u015Far\u0131l\u0131${failures.length ? " \u2014 ba\u015Far\u0131s\u0131z: " + failures.join(", ") : ""}${pluginsPreloaded ? "" : " (sonraki sync'te retry edilecek)"}`);
}
function loadPlugin(supplier) {
  const PluginClass = PLUGIN_CLASSES[supplier.name];
  if (!PluginClass) {
    logger.warn(`Plugin bulunamad\u0131 veya y\xFCklenmedi: ${supplier.name}`);
    return null;
  }
  try {
    return new PluginClass(supplier);
  } catch (err) {
    logger.error(`Plugin instance olu\u015Fturulamad\u0131 (${supplier.name}): ${err.message}`);
    return null;
  }
}
async function sweepMissingProducts(supplier, touchedProductCodes, receivedCount, opts) {
  const baselineCount = await prisma.supplierProduct.count({
    where: { supplier_name: supplier.name }
  });
  if (opts.enableSafetyThreshold && baselineCount > 0) {
    const ratio = receivedCount / baselineCount;
    if (ratio < opts.thresholdPercent) {
      const reason = `Sweep atland\u0131: tedarik\xE7i ${(ratio * 100).toFixed(1)}% \xFCr\xFCn g\xF6nderdi (e\u015Fik: ${(opts.thresholdPercent * 100).toFixed(0)}%)`;
      logger.warn(`[${supplier.name}] ${reason}`);
      return { swept: 0, skipped: true, reason };
    }
  }
  const inventoryProducts = await prisma.product.findMany({
    where: {
      supplier: supplier.name,
      tedarikci_product_id: { not: null }
    },
    select: { id: true, stock_code: true, toplam_stock: true }
  });
  const missing = inventoryProducts.filter(
    (p) => p.stock_code && !touchedProductCodes.has(p.stock_code) && (p.toplam_stock ?? 0) > 0
  );
  const supplierProductsToSweep = await prisma.supplierProduct.findMany({
    where: {
      supplier_name: supplier.name,
      OR: [
        { stock: { gt: 0 } },
        { productStockStatus: { not: "Yok" } }
      ]
    },
    select: { id: true, productCode: true }
  });
  const missingSupplierProducts = supplierProductsToSweep.filter(
    (sp) => sp.productCode && !touchedProductCodes.has(sp.productCode)
  );
  if (missing.length === 0 && missingSupplierProducts.length === 0) {
    return { swept: 0, skipped: false };
  }
  if (missing.length > 0) {
    const ids = missing.map((p) => p.id);
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: {
        toplam_stock: 0,
        bolbolbul_stock: 0,
        sopyo_stock: 0
      }
    });
  }
  if (missingSupplierProducts.length > 0) {
    const spIds = missingSupplierProducts.map((sp) => sp.id);
    await prisma.supplierProduct.updateMany({
      where: { id: { in: spIds } },
      data: {
        stock: 0,
        productStockStatus: "Yok"
      }
    });
  }
  logger.warn(
    `[${supplier.name}] Sweep: products=${missing.length}, tedarikci_urunler=${missingSupplierProducts.length} stok=0 yap\u0131ld\u0131 (tedarik\xE7ide bulunmad\u0131)`
  );
  return { swept: missing.length, skipped: false };
}
async function applyInventoryOnlyUpdate(supplier, product, inventoryProductCodeSet) {
  if (!inventoryProductCodeSet.has(product.productCode)) return "skipped";
  const existing = await prisma.supplierProduct.findFirst({
    where: { productCode: product.productCode },
    select: { id: true }
  });
  if (!existing) return "skipped";
  await prisma.supplierProduct.update({
    where: { id: existing.id },
    data: {
      supplier_name: supplier.name,
      // son yazan kazanır
      netPriceWithVAT: product.netPriceWithVAT,
      productStockStatus: product.productStockStatus || null,
      stock: product.stock,
      bizimhesap_fiyat: product.bizimhesap_fiyat ?? null
    }
  });
  const invProduct = await prisma.product.findFirst({
    where: { stock_code: product.productCode }
  });
  if (!invProduct || !invProduct.kategori_id) return "updated";
  const supplierDiscount = supplier.discount ?? 0;
  let desiPrice = 0;
  if (invProduct.desi) {
    const desiRecord = await prisma.desi.findFirst({
      where: { name: String(Math.floor(Number(invProduct.desi))) }
    });
    desiPrice = desiRecord?.price ? Number(desiRecord.price) : 0;
  }
  let basePrice = product.netPriceWithVAT;
  let effectiveDiscount = supplierDiscount;
  if (invProduct.isFiyatTercih === 1 && product.bizimhesap_fiyat) {
    basePrice = Number(product.bizimhesap_fiyat);
    effectiveDiscount = 0;
  }
  const prices = await calculateProductPrice({
    basePrice,
    categoryId: invProduct.kategori_id,
    supplierDiscount: effectiveDiscount,
    desiPrice
  });
  await prisma.product.update({
    where: { id: invProduct.id },
    data: {
      supplier: supplier.name,
      // son yazan kazanır
      tedarikci_fiyat: basePrice,
      product_discount: effectiveDiscount,
      bolbolbul_fiyat: prices.bolbolbulFiyat,
      sopyo_fiyat: prices.sopyoFiyat,
      n11_fiyat: prices.n11Fiyat,
      trendyol_fiyat: prices.trendyolFiyat,
      hepsiburada_fiyat: prices.hepsiburadaFiyat,
      pazarama_fiyat: prices.pazaramaFiyat,
      toplam_stock: product.stock,
      bolbolbul_stock: product.stock,
      sopyo_stock: product.stock
    }
  });
  return "updated";
}
async function syncSupplier(supplier, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let createdCount = 0;
  let updatedCount = 0;
  let totalCount = 0;
  let existCount = 0;
  const touchedProductCodes = /* @__PURE__ */ new Set();
  logger.info(`========== ${supplier.name} sync ba\u015Flad\u0131 (mode=${opts.mode}) ==========`);
  try {
    updateProgress({
      currentSupplier: supplier.name,
      currentStep: "fetching",
      processed: 0,
      total: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      message: `${supplier.name}: Plugin y\xFCkleniyor (${opts.mode})`
    }, true);
    const plugin = loadPlugin(supplier);
    if (!plugin) {
      throw new Error("Plugin y\xFCklenemedi");
    }
    updateProgress({ message: `${supplier.name}: Tedarik\xE7iden \xFCr\xFCnler \xE7ekiliyor` }, true);
    const heartbeatId = setInterval(() => {
      updateProgress({}, true);
    }, 5e3);
    let products;
    try {
      products = await plugin.run();
    } finally {
      clearInterval(heartbeatId);
    }
    totalCount = products.length;
    if (totalCount === 0) {
      logger.warn(`[${supplier.name}] Hi\xE7 \xFCr\xFCn gelmedi, sync atland\u0131`);
    }
    let inventoryProductCodeSet = null;
    if (opts.mode === "inventory-only") {
      const invProducts = await prisma.product.findMany({
        where: { supplier: supplier.name, tedarikci_product_id: { not: null } },
        select: { stock_code: true }
      });
      inventoryProductCodeSet = new Set(
        invProducts.map((p) => p.stock_code).filter((c) => !!c)
      );
      logger.info(`[${supplier.name}] Inventory-only: ${inventoryProductCodeSet.size} envanter \xFCr\xFCn\xFC hedeflenecek`);
    }
    updateProgress({
      currentStep: "upserting",
      total: totalCount,
      message: `${supplier.name}: ${totalCount} \xFCr\xFCn i\u015Fleniyor (${opts.mode})`
    }, true);
    let i = 0;
    for (const product of products) {
      try {
        if (opts.mode === "inventory-only") {
          const result = await applyInventoryOnlyUpdate(supplier, product, inventoryProductCodeSet);
          if (result === "updated") updatedCount++;
          else existCount++;
        } else {
          const result = await upsertSupplierProduct(supplier.name, product);
          if (result === "created") createdCount++;
          else if (result === "updated") updatedCount++;
          else existCount++;
        }
        if (product.productCode) touchedProductCodes.add(product.productCode);
      } catch (err) {
        logger.error(`[${supplier.name}] \xDCr\xFCn i\u015Flenemedi (${product.productCode}): ${err.message}`);
      }
      i++;
      updateProgress({
        processed: i,
        createdCount,
        updatedCount,
        skippedCount: existCount
      });
    }
    updateProgress({ processed: totalCount, currentStep: "finalizing", message: `${supplier.name}: Eksik \xFCr\xFCnler tespit ediliyor` }, true);
    let sweepResult = { swept: 0, skipped: false, reason: void 0 };
    if (totalCount > 0) {
      sweepResult = await sweepMissingProducts(supplier, touchedProductCodes, totalCount, opts);
    }
    const duration = (Date.now() - startTime) / 1e3;
    logger.info(
      `[${supplier.name}] \u2713 Tamamland\u0131 \u2014 ${duration.toFixed(1)}s | Yeni: ${createdCount}, G\xFCncel: ${updatedCount}, Atland\u0131: ${existCount}, Sweep: ${sweepResult.skipped ? "atland\u0131" : sweepResult.swept + " stok=0"}, Toplam: ${totalCount}`
    );
    await syncService.logSync({
      name: supplier.name,
      status: 1,
      createdCount,
      updatedCount,
      totalCount,
      existCount,
      durationSeconds: duration,
      productsProcessed: createdCount + updatedCount + sweepResult.swept
    });
    return {
      supplierName: supplier.name,
      status: "success",
      createdCount,
      updatedCount,
      totalCount,
      existCount,
      duration,
      sweptCount: sweepResult.swept,
      sweepSkipped: sweepResult.skipped,
      mode: opts.mode
    };
  } catch (err) {
    const duration = (Date.now() - startTime) / 1e3;
    logger.error(`[${supplier.name}] HATA: ${err.message}`);
    await syncService.logSync({
      name: supplier.name,
      status: 0,
      error: err.message?.substring(0, 500),
      createdCount,
      updatedCount,
      totalCount,
      durationSeconds: duration,
      errorCategory: "plugin_error"
    });
    return {
      supplierName: supplier.name,
      status: "error",
      createdCount,
      updatedCount,
      totalCount,
      existCount,
      duration,
      error: err.message,
      mode: opts.mode
    };
  }
}
async function syncAllSuppliers(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const acquired = await syncService.acquireLock();
  if (!acquired) {
    logger.warn("Sync zaten \xE7al\u0131\u015F\u0131yor, atland\u0131");
    throw new Error("Sync zaten \xE7al\u0131\u015F\u0131yor");
  }
  startProgress(null);
  const results = [];
  try {
    await preloadPlugins();
    const suppliers = await syncService.getActiveSuppliers();
    logger.info(`Aktif tedarik\xE7i: ${suppliers.length} (mode=${opts.mode})`);
    for (const supplier of suppliers) {
      const result = await syncSupplier(supplier, opts);
      results.push(result);
    }
    logger.info(`========== T\xDCM SYNC TAMAMLANDI (${opts.mode}) ==========`);
    logger.info(`Toplam: ${results.length} | Ba\u015Far\u0131l\u0131: ${results.filter((r) => r.status === "success").length} | Hatal\u0131: ${results.filter((r) => r.status === "error").length}`);
    endProgress(`${results.filter((r) => r.status === "success").length}/${results.length} tedarik\xE7i ba\u015Far\u0131l\u0131 (${opts.mode})`);
  } finally {
    await syncService.releaseLock();
  }
  return results;
}
async function syncSingleSupplier(supplierName, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const acquired = await syncService.acquireLock();
  if (!acquired) {
    throw new Error("Sync zaten \xE7al\u0131\u015F\u0131yor");
  }
  startProgress(supplierName);
  try {
    await preloadPlugins();
    const suppliers = await syncService.getActiveSuppliers();
    const supplier = suppliers.find((s) => s.name === supplierName);
    if (!supplier) {
      throw new Error(`Tedarik\xE7i bulunamad\u0131 veya pasif: ${supplierName}`);
    }
    const result = await syncSupplier(supplier, opts);
    endProgress(result.status === "success" ? `${supplierName} (${opts.mode}) tamamland\u0131: ${result.createdCount} yeni, ${result.updatedCount} g\xFCncel` : `${supplierName} hata: ${result.error}`);
    return result;
  } catch (err) {
    endProgress("Hata olu\u015Ftu");
    throw err;
  } finally {
    await syncService.releaseLock();
  }
}

// worker/index.ts
init_logger();
function parseArgs() {
  const args = process.argv.slice(2);
  const syncMode = args.includes("--inventory-only") ? "inventory-only" : "full";
  if (args.includes("--all")) return { mode: "all", syncMode };
  if (args.includes("--cron")) return { mode: "cron", syncMode };
  const supplierArg = args.find((a) => a.startsWith("--supplier="));
  if (supplierArg) {
    return { mode: "single", supplier: supplierArg.split("=")[1], syncMode };
  }
  return { mode: "help", syncMode };
}
async function main() {
  const { mode, supplier, syncMode } = parseArgs();
  switch (mode) {
    case "all":
      logger.info(`--all: T\xFCm tedarik\xE7iler sync ediliyor (mode=${syncMode})`);
      try {
        const results = await syncAllSuppliers({ mode: syncMode });
        logger.info(`Sonu\xE7: ${JSON.stringify(results, null, 2)}`);
        process.exit(0);
      } catch (err) {
        logger.error(`Sync hatas\u0131: ${err.message}`);
        process.exit(1);
      }
      break;
    case "single":
      if (!supplier) {
        logger.error("--supplier= gereklidir");
        process.exit(1);
      }
      logger.info(`--supplier=${supplier} (mode=${syncMode}): Tek tedarik\xE7i sync ediliyor`);
      try {
        const result = await syncSingleSupplier(supplier, { mode: syncMode });
        logger.info(`Sonu\xE7: ${JSON.stringify(result, null, 2)}`);
        process.exit(0);
      } catch (err) {
        logger.error(`Sync hatas\u0131: ${err.message}`);
        process.exit(1);
      }
      break;
    case "cron":
      logger.info("--cron: Cron scheduler ba\u015Flat\u0131l\u0131yor");
      await Promise.resolve().then(() => (init_cron(), cron_exports));
      break;
    default:
      console.log(`
Exvado Spider Worker

Kullan\u0131m:
  npx tsx worker/index.ts --all                  T\xFCm aktif tedarik\xE7ileri sync et
  npx tsx worker/index.ts --supplier=Ital        Tek tedarik\xE7i sync et
  npx tsx worker/index.ts --cron                 Cron scheduler ba\u015Flat
`);
      process.exit(0);
  }
}
main().catch((err) => {
  logger.error(`Fatal: ${err.message}`);
  process.exit(1);
});
