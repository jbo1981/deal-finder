import { useState } from "react";
import Head from "next/head";

const PLATFORMS = {
  facebook: {
    label: "Facebook Marketplace",
    color: "#1877f2",
    bg: "#eff6ff",
    buildUrl: (query, maxPrice, radius) =>
      `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(query)}&maxPrice=${encodeURIComponent(maxPrice)}&radius=${encodeURIComponent(radius)}`,
  },
  ebay: {
    label: "eBay",
    color: "#e53238",
    bg: "#fff0f0",
    buildUrl: (query, maxPrice) =>
      `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_udhi=${encodeURIComponent(maxPrice)}&LH_ItemCondition=3000&LH_BIN=1`,
  },
  offerup: {
    label: "OfferUp",
    color: "#0ab56b",
    bg: "#f0fdf4",
    buildUrl: (query, maxPrice, radius) =>
      `https://offerup.com/search/?q=${encodeURIComponent(query)}&price_max=${encodeURIComponent(maxPrice)}&radius=${encodeURIComponent(radius)}`,
  },
  amazon: {
    label: "Amazon",
    color: "#ff9900",
    bg: "#fffbeb",
    buildUrl: (query, maxPrice) =>
      `https://www.amazon.com/s?k=${encodeURIComponent(query)}&rh=p_36%3A..${encodeURIComponent(maxPrice * 100)}&condition=used`,
  },
};

const demoListings = {
  facebook: [
    "Trek Marlin 7 mountain bike | 320 | 650 | 8 | 2 | moving, must sell, helmet included",
    "Giant Talon hardtail | 260 | 575 | 32 | 1 | obo, leaving town, quick pickup",
    "Old mountain bike project | 90 | 180 | 12 | 96 | needs work, as-is",
  ].join("\n"),
  ebay: [
    "Trek Marlin 7 mountain bike | 310 | 650 | 0 | 1 | buy it now, free shipping",
    "Specialized Rockhopper 29 | 499 | 700 | 0 | 4 | excellent condition",
    "Schwinn Axum mountain bike | 189 | 310 | 0 | 48 | good used condition",
  ].join("\n"),
  offerup: [
    "Cannondale Trail 5 | 400 | 850 | 15 | 3 | need gone today, cash only",
    "Mongoose mountain bike | 120 | 250 | 7 | 10 | lightly used",
    "GT Aggressor Pro | 275 | 480 | 22 | 6 | obo",
  ].join("\n"),
  amazon: [
    "Schwinn High Timber mountain bike | 280 | 420 | 0 | 2 | used - very good",
    "Huffy Stone Mountain bike | 150 | 230 | 0 | 5 | used - good",
    "Kent Bayside cruiser | 90 | 160 | 0 | 12 | used - acceptable",
  ].join("\n"),
};

const urgencyKeywords = ["moving","must sell","need gone","obo","leaving town","quick pickup","today","cash only","priced to sell","free shipping","buy it now"];
const conditionRiskKeywords = ["needs work","broken","as-is","parts only","repair","not working","acceptable","fair"];

function money(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function parseListing(line) {
  const parts = line.split("|").map(p => p.trim());
  if (parts.length < 5) return null;
  const [title, priceRaw, valueRaw, distanceRaw, hoursRaw, keywordsRaw = ""] = parts;
  const price = Number(priceRaw.replace(/[^0-9.]/g, ""));
  const typicalValue = Number(valueRaw.replace(/[^0-9.]/g, ""));
  const distance = Number(distanceRaw.replace(/[^0-9.]/g, ""));
  const hoursAgo = Number(hoursRaw.replace(/[^0-9.]/g, ""));
  const keywords = keywordsRaw.toLowerCase();
  if (!title || !Number.isFinite(price) || !Number.isFinite(typicalValue) || typicalValue <= 0) return null;
  return { title, price, typicalValue, distance, hoursAgo, keywords };
}

function scoreListing(listing, sensitivity, platform) {
  const discountPercent = Math.max(0, (listing.typicalValue - listing.price) / listing.typicalValue);
  const rawSavings = Math.max(0, listing.typicalValue - listing.price);
  const distancePenalty = platform === "ebay" || platform === "amazon" ? 0 : Math.min(18, (listing.distance || 0) * 0.28);
  const freshnessBonus = listing.hoursAgo <= 4 ? 10 : listing.hoursAgo <= 24 ? 5 : listing.hoursAgo <= 72 ? 1 : -5;
  const urgencyBonus = urgencyKeywords.filter(k => listing.keywords.includes(k)).length * 4;
  const riskPenalty = conditionRiskKeywords.filter(k => listing.keywords.includes(k)).length * 8;
  let score = discountPercent * 82 + Math.min(14, rawSavings / 35) - distancePenalty + freshnessBonus + urgencyBonus - riskPenalty;
  if (sensitivity === "flipper") score += Math.min(16, rawSavings / 28) + urgencyBonus * 0.5;
  if (sensitivity === "personal") { score += listing.distance <= 10 ? 6 : 0; score -= riskPenalty * 0.5; }
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { ...listing, discountPercent, rawSavings, score, grade: score >= 72 ? "Strong deal" : score >= 48 ? "Worth checking" : "Low priority", tone: score >= 72 ? "good" : score >= 48 ? "ok" : "bad" };
}

function escapeHtml(v) {
  return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

const scoreColor = { good: "#16a34a", ok: "#f59e0b", bad: "#dc2626" };

export default function DealFinder() {
  const [query, setQuery] = useState("mountain bike");
  const [location, setLocation] = useState("Austin TX");
  const [radius, setRadius] = useState("25");
  const [maxPrice, setMaxPrice] = useState("500");
  const [sensitivity, setSensitivity] = useState("balanced");
  const [activePlatform, setActivePlatform] = useState("facebook");
  const [inputs, setInputs] = useState({ facebook: "", ebay: "", offerup: "", amazon: "" });
  const [results, setResults] = useState({ facebook: [], ebay: [], offerup: [], amazon: [] });
  const [searchUrls, setSearchUrls] = useState({});

  function generateAllLinks() {
    const urls = {};
    Object.entries(PLATFORMS).forEach(([key, p]) => {
      urls[key] = p.buildUrl(query, maxPrice, radius);
    });
    setSearchUrls(urls);
  }

  function scoreCurrentPlatform() {
    const max = Number(maxPrice || Infinity);
    const scored = (inputs[activePlatform] || "").split("\n").map(l => l.trim()).filter(Boolean)
      .map(parseListing).filter(Boolean)
      .filter(l => l.price <= max)
      .map(l => scoreListing(l, sensitivity, activePlatform))
      .sort((a, b) => b.score - a.score || b.rawSavings - a.rawSavings);
    setResults(prev => ({ ...prev, [activePlatform]: scored }));
  }

  function loadDemo() {
    setInputs(prev => ({ ...prev, [activePlatform]: demoListings[activePlatform] }));
    generateAllLinks();
    const max = Number(maxPrice || Infinity);
    const scored = demoListings[activePlatform].split("\n").map(l => l.trim()).filter(Boolean)
      .map(parseListing).filter(Boolean)
      .filter(l => l.price <= max)
      .map(l => scoreListing(l, sensitivity, activePlatform))
      .sort((a, b) => b.score - a.score || b.rawSavings - a.rawSavings);
    setResults(prev => ({ ...prev, [activePlatform]: scored }));
  }

  const allResults = Object.values(results).flat();
  const bestScore = allResults.length ? Math.max(...allResults.map(r => r.score)) : "—";
  const avgDiscount = allResults.length ? Math.round(allResults.reduce((s, r) => s + r.discountPercent, 0) / allResults.length * 100) + "%" : "—";
  const totalCount = allResults.length;

  const platform = PLATFORMS[activePlatform];
  const currentResults = results[activePlatform] || [];

  return (
    <>
      <Head><title>Marketplace Deal Finder</title></Head>
      <div style={{ fontFamily: "system-ui,sans-serif", background: "#f4f7fb", minHeight: "100vh", padding: "24px 16px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Hero */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 28px 24px", marginBottom: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "inline-block", background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "6px 14px", fontWeight: 700, fontSize: 13, marginBottom: 14 }}>⚡ Multi-platform deal scanner</div>
            <h1 style={{ fontSize: "clamp(28px,5vw,52px)", margin: "0 0 12px", letterSpacing: "-0.04em", lineHeight: 1 }}>Find underpriced listings faster.</h1>
            <p style={{ color: "#637083", fontSize: 16, margin: "0 0 20px" }}>Search Facebook Marketplace, eBay, OfferUp, and Amazon. Paste listings and rank by discount, urgency, and resale potential.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={loadDemo} style={{ background: "#1877f2", color: "#fff", border: 0, borderRadius: 12, padding: "11px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Load demo listings</button>
              <button onClick={generateAllLinks} style={{ background: "#f1f5f9", color: "#334155", border: 0, borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Generate all search links</button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
            {[["Best deal score", bestScore], ["Avg discount", avgDiscount], ["Total ranked", totalCount]].map(([label, val]) => (
              <div key={label} style={{ background: "#fff", borderRadius: 16, padding: "18px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em" }}>{val}</div>
                <div style={{ color: "#637083", fontSize: 13 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Platform tabs */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {Object.entries(PLATFORMS).map(([key, p]) => (
              <button key={key} onClick={() => setActivePlatform(key)} style={{
                background: activePlatform === key ? p.color : "#fff",
                color: activePlatform === key ? "#fff" : "#334155",
                border: `2px solid ${activePlatform === key ? p.color : "#dbe4ef"}`,
                borderRadius: 12, padding: "10px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer",
                boxShadow: activePlatform === key ? `0 4px 14px ${p.color}44` : "none"
              }}>
                {p.label}
                {results[key].length > 0 && (
                  <span style={{ marginLeft: 8, background: activePlatform === key ? "rgba(255,255,255,0.3)" : p.color, color: "#fff", borderRadius: 999, padding: "2px 7px", fontSize: 12 }}>
                    {results[key].length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Main grid */}
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>

            {/* Sidebar */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", alignSelf: "start" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 20 }}>Search setup</h2>
              {[["What are you hunting for?", query, setQuery, "text", "e.g. iPhone 14"],["Location or city", location, setLocation, "text", "e.g. Denver CO"],["Max price", maxPrice, setMaxPrice, "number", "500"]].map(([label, val, setter, type, ph]) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{label}</label>
                  <input value={val} onChange={e => setter(e.target.value)} type={type} placeholder={ph} style={{ width: "100%", border: "1px solid #dbe4ef", borderRadius: 10, padding: "10px 12px", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Search radius <span style={{ color: "#aaa", fontWeight: 400 }}>(local platforms)</span></label>
                <select value={radius} onChange={e => setRadius(e.target.value)} style={{ width: "100%", border: "1px solid #dbe4ef", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}>
                  {["5","10","25","50","100"].map(r => <option key={r} value={r}>{r} miles</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Deal sensitivity</label>
                <select value={sensitivity} onChange={e => setSensitivity(e.target.value)} style={{ width: "100%", border: "1px solid #dbe4ef", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}>
                  <option value="balanced">Balanced</option>
                  <option value="flipper">Resale / flipper focused</option>
                  <option value="personal">Personal-use focused</option>
                </select>
              </div>
              <button onClick={generateAllLinks} style={{ width: "100%", background: platform.color, color: "#fff", border: 0, borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>Generate all search links</button>

              {/* Search links */}
              {Object.keys(searchUrls).length > 0 && (
                <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                  {Object.entries(PLATFORMS).map(([key, p]) => searchUrls[key] && (
                    <a key={key} href={searchUrls[key]} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: p.bg, color: p.color, borderRadius: 10, padding: "9px 12px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                      🔗 {p.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Results panel */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>{platform.label} listings</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={scoreCurrentPlatform} style={{ background: platform.bg, color: platform.color, border: 0, borderRadius: 10, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Score listings</button>
                  <button onClick={() => { setInputs(p => ({ ...p, [activePlatform]: "" })); setResults(p => ({ ...p, [activePlatform]: [] })); }} style={{ background: "#f1f5f9", color: "#334155", border: 0, borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Clear</button>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Paste {platform.label} listing data</label>
                <textarea value={inputs[activePlatform]} onChange={e => setInputs(p => ({ ...p, [activePlatform]: e.target.value }))}
                  placeholder={activePlatform === "amazon" ? "Used Schwinn bike | 280 | 420 | 0 | 2 | used - very good" : "Trek Marlin 7 | 320 | 650 | 8 | 2 | moving, must sell"}
                  style={{ width: "100%", minHeight: 110, border: "1px solid #dbe4ef", borderRadius: 10, padding: "10px 12px", fontSize: 13, boxSizing: "border-box", resize: "vertical", lineHeight: 1.5 }} />
                <p style={{ color: "#637083", fontSize: 12, margin: "6px 0 0" }}>
                  Format: Title | Price | Typical value | Distance miles | Posted hours ago | Keywords
                  {(activePlatform === "ebay" || activePlatform === "amazon") && " (use 0 for distance on online platforms)"}
                </p>
              </div>

              {currentResults.length === 0 && (
                <div style={{ border: "1px dashed #dbe4ef", borderRadius: 14, padding: 24, textAlign: "center", color: "#637083" }}>
                  No listings scored yet for {platform.label}. Load the demo or paste your own data above.
                </div>
              )}

              <div style={{ display: "grid", gap: 12 }}>
                {currentResults.map((item, i) => (
                  <div key={i} style={{ border: `1px solid ${platform.color}33`, borderRadius: 16, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ background: platform.bg, color: platform.color, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>#{i + 1} · {item.grade}</span>
                      <h3 style={{ margin: "10px 0 6px", fontSize: 17 }}>{escapeHtml(item.title)}</h3>
                      <div style={{ color: "#637083", fontSize: 13, marginBottom: 8, display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
                        <span>{money(item.price)} asking</span>
                        <span>{money(item.typicalValue)} typical</span>
                        {activePlatform !== "ebay" && activePlatform !== "amazon" && <span>{item.distance || 0} mi</span>}
                        <span>{item.hoursAgo || 0}h old</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>Savings: {money(item.rawSavings)} ({Math.round(item.discountPercent * 100)}% off)</div>
                      {item.keywords && <p style={{ color: "#637083", fontSize: 13, margin: "6px 0 0" }}>Signals: {escapeHtml(item.keywords)}</p>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor[item.tone], letterSpacing: "-0.05em" }}>{item.score}</div>
                      <div style={{ fontSize: 12, color: "#637083" }}>Deal score</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
