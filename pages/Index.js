import { useState, useRef } from "react";
import Head from "next/head";

const demoListings = [
  "Trek Marlin 7 mountain bike | 320 | 650 | 8 | 2 | moving, must sell, helmet included",
  "Specialized Rockhopper 29 | 540 | 700 | 18 | 8 | firm price, excellent condition",
  "Giant Talon hardtail | 260 | 575 | 32 | 1 | obo, leaving town, quick pickup",
  "Schwinn Axum bike | 220 | 310 | 6 | 22 | lightly used",
  "Cannondale Trail 5 | 475 | 850 | 44 | 3 | need gone today, cash only",
  "Old mountain bike project | 90 | 180 | 12 | 96 | needs work, as-is"
].join("\n");

const urgencyKeywords = ["moving","must sell","need gone","obo","leaving town","quick pickup","today","cash only","priced to sell"];
const conditionRiskKeywords = ["needs work","broken","as-is","parts only","repair","not working"];

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
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

function scoreListing(listing, sensitivity) {
  const discountPercent = Math.max(0, (listing.typicalValue - listing.price) / listing.typicalValue);
  const rawSavings = Math.max(0, listing.typicalValue - listing.price);
  const distancePenalty = Math.min(18, (listing.distance || 0) * 0.28);
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

export default function DealFinder() {
  const [query, setQuery] = useState("used mountain bike");
  const [location, setLocation] = useState("Austin TX");
  const [radius, setRadius] = useState("25");
  const [maxPrice, setMaxPrice] = useState("500");
  const [sensitivity, setSensitivity] = useState("balanced");
  const [listingInput, setListingInput] = useState("");
  const [results, setResults] = useState([]);
  const [searchUrl, setSearchUrl] = useState("");
  const [stats, setStats] = useState({ best: "—", avg: "—", count: 0 });

  function generateSearch() {
    const url = `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(query)}&maxPrice=${encodeURIComponent(maxPrice)}&radius=${encodeURIComponent(radius)}`;
    setSearchUrl(url);
  }

  function scoreListings() {
    const max = Number(maxPrice || Infinity);
    const scored = listingInput.split("\n").map(l => l.trim()).filter(Boolean)
      .map(parseListing).filter(Boolean)
      .filter(l => l.price <= max)
      .map(l => scoreListing(l, sensitivity))
      .sort((a, b) => b.score - a.score || b.rawSavings - a.rawSavings);
    setResults(scored);
    if (scored.length) {
      const best = Math.max(...scored.map(s => s.score));
      const avg = Math.round(scored.reduce((s, i) => s + i.discountPercent, 0) / scored.length * 100);
      setStats({ best, avg: avg + "%", count: scored.length });
    } else {
      setStats({ best: "—", avg: "—", count: 0 });
    }
  }

  function loadDemo() {
    setListingInput(demoListings);
    const url = `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(query)}&maxPrice=${encodeURIComponent(maxPrice)}&radius=${encodeURIComponent(radius)}`;
    setSearchUrl(url);
    const max = Number(maxPrice || Infinity);
    const scored = demoListings.split("\n").map(l => l.trim()).filter(Boolean)
      .map(parseListing).filter(Boolean)
      .filter(l => l.price <= max)
      .map(l => scoreListing(l, sensitivity))
      .sort((a, b) => b.score - a.score || b.rawSavings - a.rawSavings);
    setResults(scored);
    if (scored.length) {
      const best = Math.max(...scored.map(s => s.score));
      const avg = Math.round(scored.reduce((s, i) => s + i.discountPercent, 0) / scored.length * 100);
      setStats({ best, avg: avg + "%", count: scored.length });
    }
  }

  const scoreColor = { good: "#16a34a", ok: "#f59e0b", bad: "#dc2626" };

  return (
    <>
      <Head><title>Marketplace Deal Finder</title></Head>
      <div style={{ fontFamily: "system-ui,sans-serif", background: "#f4f7fb", minHeight: "100vh", padding: "24px 16px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 28px 24px", marginBottom: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "inline-block", background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "6px 14px", fontWeight: 700, fontSize: 13, marginBottom: 14 }}>⚡ Facebook Marketplace deal scanner</div>
            <h1 style={{ fontSize: "clamp(28px,5vw,52px)", margin: "0 0 12px", letterSpacing: "-0.04em", lineHeight: 1 }}>Find underpriced local listings faster.</h1>
            <p style={{ color: "#637083", fontSize: 16, margin: "0 0 20px" }}>Build targeted searches, paste listing data, and rank by discount, distance, urgency, and resale potential.</p>
            <button onClick={loadDemo} style={{ background: "#1877f2", color: "#fff", border: 0, borderRadius: 12, padding: "11px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Load demo listings</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
            {[["Best deal score", stats.best], ["Avg discount", stats.avg], ["Ranked listings", stats.count]].map(([label, val]) => (
              <div key={label} style={{ background: "#fff", borderRadius: 16, padding: "18px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em" }}>{val}</div>
                <div style={{ color: "#637083", fontSize: 13 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", alignSelf: "start" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 20 }}>Search setup</h2>
              {[["What are you hunting for?", query, setQuery, "text", "e.g. iPhone 14"],["Location or city", location, setLocation, "text", "e.g. Denver CO"],["Max listing price", maxPrice, setMaxPrice, "number", "500"]].map(([label, val, setter, type, placeholder]) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{label}</label>
                  <input value={val} onChange={e => setter(e.target.value)} type={type} placeholder={placeholder} style={{ width: "100%", border: "1px solid #dbe4ef", borderRadius: 10, padding: "10px 12px", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Search radius</label>
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
              <button onClick={generateSearch} style={{ width: "100%", background: "#1877f2", color: "#fff", border: 0, borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Generate search link</button>
            </div>
            <div style={{ background: "#fff", borderRadius: 20, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Deal ranking</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={scoreListings} style={{ background: "#eff6ff", color: "#1d4ed8", border: 0, borderRadius: 10, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Score listings</button>
                  <button onClick={() => { setListingInput(""); setResults([]); setStats({ best: "—", avg: "—", count: 0 }); }} style={{ background: "#f1f5f9", color: "#334155", border: 0, borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Clear</button>
                </div>
              </div>
              {searchUrl && (
                <div style={{ background: "#eff6ff", border: "1px dashed #93c5fd", borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, lineHeight: 1.6, wordBreak: "break-all" }}>
                  <strong>Search link:</strong><br />
                  <a href={searchUrl} target="_blank" rel="noopener noreferrer">{searchUrl}</a>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Listing data</label>
                <textarea value={listingInput} onChange={e => setListingInput(e.target.value)} placeholder="Trek Marlin 7 | 320 | 650 | 8 | 2 | moving, must sell" style={{ width: "100%", minHeight: 120, border: "1px solid #dbe4ef", borderRadius: 10, padding: "10px 12px", fontSize: 13, boxSizing: "border-box", resize: "vertical", lineHeight: 1.5 }} />
                <p style={{ color: "#637083", fontSize: 12, margin: "6px 0 0" }}>Format: Title | Price | Typical value | Distance miles | Posted hours ago | Keywords</p>
              </div>
              {results.length === 0 && (
                <div style={{ border: "1px dashed #dbe4ef", borderRadius: 14, padding: 24, textAlign: "center", color: "#637083" }}>
                  No listings scored yet. Load the demo or paste your own data above.
                </div>
              )}
              <div style={{ display: "grid", gap: 12 }}>
                {results.map((item, i) => (
                  <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ background: "#f1f5f9", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>#{i + 1} · {item.grade}</span>
                      <h3 style={{ margin: "10px 0 6px", fontSize: 17 }}>{escapeHtml(item.title)}</h3>
                      <div style={{ color: "#637083", fontSize: 13, marginBottom: 8, display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
                        <span>{money(item.price)} asking</span>
                        <span>{money(item.typicalValue)} typical</span>
                        <span>{item.distance || 0} mi</span>
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
