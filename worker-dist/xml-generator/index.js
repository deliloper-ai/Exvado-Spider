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

// worker/xml-generator/index.ts
var xml_generator_exports = {};
__export(xml_generator_exports, {
  generateProductsXml: () => generateProductsXml
});
module.exports = __toCommonJS(xml_generator_exports);
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_xmlbuilder2 = require("xmlbuilder2");

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

// worker/xml-generator/index.ts
var OUTPUT_DIR = import_path2.default.join(process.cwd(), "public");
var OUTPUT_FILE = import_path2.default.join(OUTPUT_DIR, "tum_urunler.xml");
var PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "https://panel.bolbolbul.com").replace(/\/$/, "");
function absoluteImageUrl(src) {
  if (!src) return src;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return PUBLIC_BASE_URL + src;
  return `${PUBLIC_BASE_URL}/${src}`;
}
function sanitizeText(input) {
  if (input == null) return "";
  return String(input).replace(/&nbsp;/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;").replace(/"/g, "&quot;");
}
function buildKategoriTree(startId, startBaslik, catById) {
  let current = catById.get(startId);
  if (!current) return startBaslik;
  let tree = startBaslik;
  while (current?.ust_id && current.ust_id !== "0") {
    const ustId = parseInt(current.ust_id);
    if (isNaN(ustId)) break;
    const parent = catById.get(ustId);
    if (!parent) break;
    tree = `${parent.baslik}/${tree}`;
    current = parent;
  }
  return tree;
}
async function generateUrunArray() {
  const urunList = await prisma.product.findMany({
    where: {
      OR: [
        { eticaret: true },
        { send_eticaret_check: 1 }
      ]
    }
  });
  logger.info(`[XML] ${urunList.length} ham \xFCr\xFCn \xE7ekildi, lookup tablolar\u0131 y\xFCkleniyor...`);
  const [tedarikciler, categories, ozellikGroups, ozellikValues] = await Promise.all([
    prisma.supplier.findMany(),
    prisma.category.findMany({ select: { id: true, baslik: true, ust_id: true } }),
    prisma.specificationGroup.findMany({ select: { id: true, baslik: true } }),
    prisma.specification.findMany({ select: { id: true, baslik: true } })
  ]);
  const tedarikciObj = {};
  for (const t of tedarikciler) {
    if (t.name) tedarikciObj[t.name] = { discount: t.discount };
  }
  const catById = /* @__PURE__ */ new Map();
  for (const c of categories) catById.set(c.id, c);
  const grupByBaslik = /* @__PURE__ */ new Map();
  for (const g of ozellikGroups) if (g.baslik) grupByBaslik.set(g.baslik, g.id);
  const degerByBaslik = /* @__PURE__ */ new Map();
  for (const v of ozellikValues) if (v.baslik) degerByBaslik.set(v.baslik, v.id);
  const fiyatTercihStockCodes = urunList.filter((p) => p.isFiyatTercih === 1 && p.stock_code).map((p) => p.stock_code);
  const bizimhesapMap = /* @__PURE__ */ new Map();
  if (fiyatTercihStockCodes.length > 0) {
    const sps = await prisma.supplierProduct.findMany({
      where: { productCode: { in: fiyatTercihStockCodes } },
      select: { productCode: true, bizimhesap_fiyat: true, bizimhesap_stock: true }
    });
    for (const sp of sps) {
      if (sp.productCode) {
        bizimhesapMap.set(sp.productCode, {
          fiyat: sp.bizimhesap_fiyat,
          stock: sp.bizimhesap_stock
        });
      }
    }
  }
  logger.info(
    `[XML] Lookup haz\u0131r \u2014 Kategori: ${categories.length}, Tedarik\xE7i: ${tedarikciler.length}, OzellikGrup: ${ozellikGroups.length}, OzellikDeger: ${ozellikValues.length}, BizimHesap: ${bizimhesapMap.size}`
  );
  const products = [];
  let processed = 0;
  for (const element of urunList) {
    processed++;
    if (processed % 1e3 === 0) {
      logger.info(`[XML] \u0130\u015Fleniyor: ${processed}/${urunList.length}`);
    }
    if (element.images == null || !element.bolbolbul_fiyat) continue;
    let images = [];
    try {
      images = JSON.parse(element.images);
    } catch {
      continue;
    }
    if (!Array.isArray(images) || images.length === 0) continue;
    images = images.map(absoluteImageUrl);
    if (!element.kategori_id) continue;
    const kategoriDetay = catById.get(element.kategori_id);
    if (!kategoriDetay) {
      logger.warn(`hatali \xFCr\xFCn id: ${element.id}`);
      continue;
    }
    const katTree = buildKategoriTree(element.kategori_id, kategoriDetay.baslik || "", catById);
    const teknikDetayArr = [];
    let attr = [];
    try {
      attr = JSON.parse(element.attributes || "[]");
    } catch {
      attr = [];
    }
    for (const a of attr) {
      const hasGroup = typeof a.Group === "string" && a.Group.trim().length > 0;
      const grupBaslik = hasGroup ? a.Group.trim() : String(a.Name || "").trim();
      const degerBaslik = hasGroup ? String(a.Name || "").trim() : String(a.Value || "").trim();
      if (!grupBaslik || !degerBaslik) continue;
      const ozellikId = grupByBaslik.get(grupBaslik);
      const degerId = degerByBaslik.get(degerBaslik);
      teknikDetayArr.push({
        OzellikID: ozellikId || "",
        OzellikTanim: grupBaslik,
        DegerId: degerId || "",
        DegerTanim: degerBaslik
      });
    }
    const product = {
      id: element.id,
      UrunAdi: element.name,
      OnYazi: element.meta_title,
      Aciklama: sanitizeText(element.detay_bilgileri),
      Marka: element.brand,
      SatisBirimi: "Adet",
      Kategori: kategoriDetay.baslik || "",
      KategoriTree: katTree,
      UrunUrl: images[0],
      Resimler: images,
      SeoTitle: element.meta_title || "",
      marketplace: element.send_sopyo_check,
      desi: parseInt(String(element.desi ?? 0)),
      SeoDescription: element.meta_desc || "",
      UrunSecenek: [
        {
          VaryasyonID: 1,
          gtin: element.barcode,
          StokKodu: element.stock_code,
          StokAdedi: element.send_eticaret_check === 0 ? 0 : element.bolbolbul_stock ?? 0,
          KdvOrani: element.kdv ?? 20,
          AlisFiyati: parseFloat(String(element.tedarikci_fiyat ?? 0)),
          SatisFiyati: parseFloat(String(element.bolbolbul_fiyat ?? 0)),
          UyeTipiFiyat1: element.send_sopyo_check === 0 ? 0 : parseFloat(String(element.trendyol_fiyat ?? 0)),
          UyeTipiFiyat2: element.send_sopyo_check === 0 ? 0 : parseFloat(String(element.n11_fiyat ?? 0)),
          UyeTipiFiyat3: element.send_sopyo_check === 0 ? 0 : parseFloat(String(element.pazarama_fiyat ?? 0)),
          UyeTipiFiyat4: element.send_sopyo_check === 0 ? 0 : parseFloat(String(element.hepsiburada_fiyat ?? 0)),
          ParaBirimi: "TRY"
        }
      ],
      TeknikDetaylar: teknikDetayArr
    };
    if (element.isFiyatTercih) {
      const bh = element.stock_code ? bizimhesapMap.get(element.stock_code) : null;
      if (bh) {
        product.UrunSecenek[0].AlisFiyati = parseFloat(String(bh.fiyat ?? 0));
        product.UrunSecenek[0].StokAdedi = bh.stock ?? 0;
      }
    } else {
      const supplier = element.supplier ? tedarikciObj[element.supplier] : null;
      const discount = supplier?.discount ? parseFloat(String(supplier.discount)) : 0;
      const tedFiyat = parseFloat(String(element.tedarikci_fiyat ?? 0));
      product.UrunSecenek[0].AlisFiyati = tedFiyat - discount * tedFiyat / 100;
    }
    products.push(product);
  }
  logger.info(`[XML] ${products.length} \xFCr\xFCn XML i\xE7in haz\u0131rland\u0131 (${urunList.length - products.length} atland\u0131)`);
  return products;
}
function createXML(products) {
  const root = (0, import_xmlbuilder2.create)({ version: "1.0", encoding: "UTF-8" }).ele("Root");
  const urunler = root.ele("Urunler");
  products.forEach((product) => {
    const urun = urunler.ele("Urun");
    urun.ele("UrunKartiID").txt(product.id.toString()).up();
    urun.ele("UrunAdi").txt(product.UrunAdi).up();
    urun.ele("OnYazi").txt(`<![CDATA[]]>`).up();
    urun.ele("Aciklama").txt(`<![CDATA[${product.Aciklama}]]>`).up();
    urun.ele("Marka").txt(product.Marka).up();
    urun.ele("SatisBirimi").txt(product.SatisBirimi).up();
    urun.ele("Kategori").txt(product.Kategori).up();
    urun.ele("KategoriTree").txt(product.KategoriTree).up();
    urun.ele("UrunUrl").txt(product.UrunUrl).up();
    urun.ele("Desi").txt(product.desi.toString()).up();
    urun.ele("Marketplace").txt(product.marketplace.toString()).up();
    urun.ele("SeoTitle").txt(product.SeoTitle).up();
    urun.ele("SeoDescription").txt(product.SeoDescription).up();
    const images = urun.ele("Resimler");
    product.Resimler.forEach((resim) => {
      images.ele("Resim").txt(resim).up();
    });
    images.up();
    const options = urun.ele("UrunSecenek");
    product.UrunSecenek.forEach((option) => {
      const secenek = options.ele("Secenek");
      secenek.ele("gtin").txt(option.gtin?.toString() ?? "").up();
      secenek.ele("VaryasyonID").txt(option.VaryasyonID.toString()).up();
      secenek.ele("StokKodu").txt(option.StokKodu ?? "").up();
      secenek.ele("StokAdedi").txt(option.StokAdedi.toString()).up();
      secenek.ele("KdvOrani").txt(option.KdvOrani.toString()).up();
      secenek.ele("AlisFiyati").txt(option.AlisFiyati.toFixed(2)).up();
      secenek.ele("SatisFiyati").txt(option.SatisFiyati.toFixed(2)).up();
      secenek.ele("UyeTipiFiyat1").txt(option.UyeTipiFiyat1.toFixed(2)).up();
      secenek.ele("UyeTipiFiyat2").txt(option.UyeTipiFiyat2.toFixed(2)).up();
      secenek.ele("UyeTipiFiyat3").txt(option.UyeTipiFiyat3.toFixed(2)).up();
      secenek.ele("UyeTipiFiyat4").txt(option.UyeTipiFiyat4.toFixed(2)).up();
      secenek.ele("ParaBirimi").txt(option.ParaBirimi).up();
      secenek.up();
    });
    options.up();
    const details = urun.ele("TeknikDetaylar");
    product.TeknikDetaylar.forEach((detail) => {
      const tech = details.ele("TeknikDetay");
      tech.ele("OzellikID").txt(String(detail.OzellikID ?? "")).up();
      tech.ele("OzellikTanim").txt(detail.OzellikTanim || "").up();
      tech.ele("DegerId").txt(String(detail.DegerId ?? "")).up();
      tech.ele("DegerTanim").txt(detail.DegerTanim || "").up();
      tech.up();
    });
    details.up();
  });
  return root.end({ prettyPrint: true });
}
async function generateProductsXml() {
  const start = Date.now();
  logger.info("========== XML Generator ba\u015Flad\u0131 ==========");
  if (!import_fs2.default.existsSync(OUTPUT_DIR)) {
    import_fs2.default.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const errors = [];
  const urunList = await generateUrunArray();
  logger.info(`[XML] XML serile\u015Ftirme ba\u015Fl\u0131yor (${urunList.length} \xFCr\xFCn)...`);
  const xmlContent = createXML(urunList);
  import_fs2.default.writeFileSync(OUTPUT_FILE, xmlContent, "utf-8");
  const stat = import_fs2.default.statSync(OUTPUT_FILE);
  const durationMs = Date.now() - start;
  await prisma.supplierCron.create({
    data: {
      name: "XML Generator",
      status: 1,
      created_count: 0,
      updated_count: 0,
      total_count: urunList.length,
      exist_count: 0,
      time: String(Math.round(durationMs / 1e3)),
      response_time: durationMs / 1e3,
      products_processed: urunList.length
    }
  });
  logger.info(
    `========== XML TAMAMLANDI ==========
  S\xFCre        : ${(durationMs / 1e3).toFixed(1)}s
  Toplam      : ${urunList.length}
  Boyut       : ${(stat.size / 1024 / 1024).toFixed(2)} MB
  Dosya       : ${OUTPUT_FILE}`
  );
  return {
    success: true,
    totalProducts: urunList.length,
    generatedProducts: urunList.length,
    failedProducts: errors.length,
    fileSize: stat.size,
    filePath: OUTPUT_FILE,
    durationMs,
    errors
  };
}
var __isXmlEntry = !!process.argv[1]?.match(/xml-generator[\/\\]index\.(js|ts)$/);
if (__isXmlEntry) {
  ;
  (async () => {
    try {
      const result = await generateProductsXml();
      process.exit(result.success ? 0 : 1);
    } catch (err) {
      logger.error(`XML hatas\u0131: ${err.message}`);
      process.exit(1);
    }
  })();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateProductsXml
});
