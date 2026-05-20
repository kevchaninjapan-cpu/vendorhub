// ─────────────────────────────────────────────────────────────
// VendorHub — Territorial Authority → Region Mapper
//
// Maps LINZ DVR district_ta_code to NZ region names.
//
// ⚠️ LINZ DVR uses Valuer General TA codes, which differ
//    from Stats NZ codes. This map is built from observed
//    DVR data and may need extending as more TAs appear.
//
// Unknown TAs default to "New Zealand" (national index).
// ─────────────────────────────────────────────────────────────

const TA_REGION_MAP: Record<number, string> = {
  // ── Northland ────────────────────────────────────────
  1: "Northland",     // Far North
  2: "Northland",     // Whangarei
  3: "Northland",     // Kaipara

  // ── Auckland ─────────────────────────────────────────
  7: "Auckland",      // Auckland Council (LINZ VG code)
  76: "Auckland",     // Auckland Council (alternate code)

  // ── Waikato ──────────────────────────────────────────
  4: "Waikato",       // Thames-Coromandel
  5: "Waikato",       // Hauraki
  6: "Waikato",       // Waikato District
  8: "Waikato",       // Matamata-Piako
  9: "Waikato",       // Hamilton City
  10: "Waikato",      // Waipa
  11: "Waikato",      // Otorohanga
  12: "Waikato",      // South Waikato
  13: "Waikato",      // Waitomo
  14: "Waikato",      // Taupo

  // ── Bay of Plenty ────────────────────────────────────
  15: "Bay of Plenty", // Western Bay of Plenty
  16: "Bay of Plenty", // Tauranga City
  17: "Bay of Plenty", // Rotorua
  18: "Bay of Plenty", // Whakatane
  19: "Bay of Plenty", // Kawerau
  20: "Bay of Plenty", // Opotiki

  // ── Gisborne ─────────────────────────────────────────
  21: "Gisborne",

  // ── Hawke's Bay ──────────────────────────────────────
  22: "Hawke's Bay",   // Wairoa
  23: "Hawke's Bay",   // Hastings
  24: "Hawke's Bay",   // Napier City
  25: "Hawke's Bay",   // Central Hawke's Bay

  // ── Taranaki ─────────────────────────────────────────
  26: "Taranaki",      // New Plymouth
  27: "Taranaki",      // Stratford
  28: "Taranaki",      // South Taranaki

  // ── Manawatū-Whanganui ──────────────────────────────
  29: "Manawatū-Whanganui",  // Ruapehu
  30: "Manawatū-Whanganui",  // Whanganui
  31: "Manawatū-Whanganui",  // Rangitikei
  32: "Manawatū-Whanganui",  // Manawatu
  33: "Manawatū-Whanganui",  // Palmerston North City
  34: "Manawatū-Whanganui",  // Tararua
  35: "Manawatū-Whanganui",  // Horowhenua

  // ── Wellington ───────────────────────────────────────
  36: "Wellington",    // Kapiti Coast
  37: "Wellington",    // Porirua City
  38: "Wellington",    // Upper Hutt City
  39: "Wellington",    // Lower Hutt City
  40: "Wellington",    // Wellington City
  41: "Wellington",    // Masterton
  42: "Wellington",    // Carterton
  43: "Wellington",    // South Wairarapa

  // ── Nelson / Tasman / Marlborough ────────────────────
  46: "Nelson",
  47: "Tasman",
  48: "Marlborough",

  // ── West Coast ───────────────────────────────────────
  49: "West Coast",    // Buller
  50: "West Coast",    // Grey
  51: "West Coast",    // Westland

  // ── Canterbury ───────────────────────────────────────
  52: "Canterbury",    // Kaikoura
  53: "Canterbury",    // Hurunui
  54: "Canterbury",    // Waimakariri
  55: "Canterbury",    // Christchurch City
  56: "Canterbury",    // Selwyn
  57: "Canterbury",    // Ashburton
  58: "Canterbury",    // Timaru
  59: "Canterbury",    // Mackenzie
  60: "Canterbury",    // Waimate

  // ── Otago ────────────────────────────────────────────
  61: "Otago",         // Waitaki
  62: "Otago",         // Central Otago
  63: "Otago",         // Queenstown-Lakes
  64: "Otago",         // Dunedin City
  65: "Otago",         // Clutha

  // ── Southland ────────────────────────────────────────
  66: "Southland",     // Southland District
  67: "Southland",     // Gore
  68: "Southland",     // Invercargill City

  // ── Chatham Islands ──────────────────────────────────
  69: "Chatham Islands",

  // ── Additional codes seen in live DVR data ───────────
  70: "Northland",     // alternate code observed
  71: "Waikato",       // alternate code observed
  72: "Bay of Plenty", // alternate code observed
  73: "Taranaki",      // confirmed from live DVR data (604 Wilderness Rd)
  74: "Wellington",    // alternate code observed
  75: "Canterbury",    // alternate code observed
};

/**
 * Look up the region name for a LINZ DVR district_ta_code.
 * Returns "New Zealand" if the code is unknown — the engine
 * will still work, just using the national HPI index.
 */
export function getRegionByTaCode(taCode: number): string {
  return TA_REGION_MAP[taCode] ?? "New Zealand";
}