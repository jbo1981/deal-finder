import { useState, useRef, useCallback, useEffect } from "react";

/* ─── Constants ─── */
const PLATFORMS = [
  { id: "amazon",     label: "Amazon",     emoji: "🛒", color: "#E47911" },
  { id: "ebay",       label: "eBay",       emoji: "🔴", color: "#E53238" },
  { id: "walmart",    label: "Walmart",    emoji: "⭐", color: "#0071CE" },
  { id: "craigslist", label: "Craigslist", emoji: "📋", color: "#8B1A1A" },
  { id: "offerup",    label: "OfferUp",    emoji: "🏷️", color: "#18A558" },
  { id: "mercari",    label: "Mercari",    emoji: "📦", color: "#C7002A" },
];

const SORT_OPTIONS = [
  { id: "score",      label: "Best Deal" },
  { id: "price_asc",  label: "Price ↑" },
  { id: "price_desc", label: "Price ↓" },
  { id: "newest",     label: "Newest" },
];

const SUGGESTIONS = [
  "iPhone 15", "PlayStation 5", "MacBook Air", "Trek bike",
  "Vitamix blender", "AirPods Pro", "Nintendo Switch", "Dyson vacuum",
];

/* ─── Helpers ─── */
function scoreColor(s) {
  if (s >= 85) return "#16a34a";
  if (s >= 65) return "#d97706";
  return "#dc2626";
}
function scoreLabel(s) {
  if (s >= 85) return "🔥 Hot";
  if (s >= 65) return "👍 Good";
  return "Fair";
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ─── Sub-components ─── */
function ScoreRing({ score }) {
  const c = scoreColor(score);
  const r = 18, cx = 20, cy = 20, stroke = 3;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <svg width={40} height={40} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(.23,1,.32,1)" }} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          style={{ transform: "rotate(90deg)", transformOrigin: "20px 20px", fill: c, fontSize: 10, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
          {score}
        </text>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: "0.04em" }}>{scoreLabel(score)}</span>
    </div>
  );
}

function SourceBadge({ source }) {
  const p = PLATFORMS.find(x => x.id === source) || { label: source, emoji: "🔗", color: "#6366f1" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: p.color + "18", color: p.color,
      border: `1px solid ${p.color}35`,
    }}>
      {p.emoji} {p.label}
    </span>
  );
}

function Card({ item, favorited, onFavorite, animate, idx }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: "1px solid #e9eaf0",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: hovered
          ? "0 12px 40px rgba(79,70,229,.13), 0 2px 8px rgba(0,0,0,.06)"
          : "0 1px 4px rgba(0,0,0,.05)",
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "box-shadow .2s, transform .2s",
        animation: animate ? `fadeUp .35s ${idx * 0.04}s both` : "none",
      }}
    >
      {/* Image area */}
      <div style={{
        height: 148, position: "relative",
        background: "linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 52,
      }}>
        {item.emoji}
        {item.dealScore >= 85 && (
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: "#16a34a", color: "#fff",
            fontSize: 9, fontWeight: 800, padding: "3px 9px",
            borderRadius: 999, letterSpacing: "0.07em", textTransform: "uppercase",
          }}>
            Best Deal
          </div>
        )}
        <button
          onClick={() => onFavorite(item.id)}
          style={{
            position: "absolute", top: 8, right: 8,
            width: 32, height: 32, borderRadius: "50%",
            border: "none", cursor: "pointer",
            background: favorited ? "#fee2e2" : "rgba(255,255,255,.9)",
            fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,.1)",
            transition: "background .15s, transform .1s",
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(.88)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {favorited ? "❤️" : "🤍"}
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <SourceBadge source={item.source} />
          <ScoreRing score={item.dealScore} />
        </div>

        <p style={{
          margin: 0, fontSize: 13.5, fontWeight: 500, lineHeight: 1.45,
          color: "#111827",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {item.title}
        </p>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 21, fontWeight: 800, color: "#4f46e5", fontVariantNumeric: "tabular-nums" }}>
            ${item.price.toLocaleString()}
          </span>
          {item.originalPrice && (
            <span style={{ fontSize: 13, color: "#9ca3af", textDecoration: "line-through", fontVariantNumeric: "tabular-nums" }}>
              ${item.originalPrice.toLocaleString()}
            </span>
          )}
          {item.originalPrice && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "1px 6px", borderRadius: 999 }}>
              -{Math.round((1 - item.price / item.originalPrice) * 100)}%
            </span>
          )}
        </div>

        {item.location && (
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>📍 {item.location}</p>
        )}

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {(item.tags || []).map(t => (
            <span key={t} style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
              background: "#f3f4f6", color: "#6b7280", letterSpacing: "0.03em",
            }}>{t}</span>
          ))}
        </div>

        <a
          href={item.url || "#"}
          target="_blank" rel="noreferrer"
          style={{
            display: "block", textAlign: "center", padding: "9px",
            borderRadius: 10, background: "#4f46e5", color: "#fff",
            fontSize: 13, fontWeight: 700, textDecoration: "none",
            marginTop: "auto",
            boxShadow: "0 2px 8px rgba(79,70,229,.3)",
            transition: "background .15s, box-shadow .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#4338ca"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#4f46e5"; }}
        >
          View Listing →
        </a>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e9eaf0", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ height: 148, background: "linear-gradient(90deg,#f3f4f6 25%,#e9eaf0 50%,#f3f4f6 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[90, 70, 50].map(w => (
          <div key={w} style={{ height: 13, width: `${w}%`, borderRadius: 6, background: "linear-gradient(90deg,#f3f4f6 25%,#e9eaf0 50%,#f3f4f6 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main App ─── */
export default function DealFinder() {
  const [query, setQuery]           = useState("");
  const [location, setLocation]     = useState("");
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [searched, setSearched]     = useState(false);
  const [favorites, setFavorites]   = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("df_favids") || "[]")); } catch { return new Set(); }
  });
  const [favItems, setFavItems]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("df_favitems") || "[]"); } catch { return []; }
  });
  const [saved, setSaved]           = useState(() => {
    try { return JSON.parse(localStorage.getItem("df_saved") || "[]"); } catch { return []; }
  });
  const [platforms, setPlatforms]   = useState(new Set(PLATFORMS.map(p => p.id)));
  const [sort, setSort]             = useState("score");
  const [tab, setTab]               = useState("search");   // search | favorites | saved
  const [animate, setAnimate]       = useState(false);
  const inputRef = useRef(null);

  /* Persist favorites */
  useEffect(() => {
    try {
      localStorage.setItem("df_favids", JSON.stringify([...favorites]));
      localStorage.setItem("df_favitems", JSON.stringify(favItems));
    } catch {}
  }, [favorites, favItems]);

  useEffect(() => {
    try { localStorage.setItem("df_saved", JSON.stringify(saved)); } catch {}
  }, [saved]);

  /* Toggle platform */
  const togglePlatform = id => setPlatforms(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  /* Toggle favorite */
  const toggleFav = useCallback((id) => {
    setFavorites(prev => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
        setFavItems(fi => fi.filter(x => x.id !== id));
      } else {
        n.add(id);
        const item = results.find(r => r.id === id);
        if (item) setFavItems(fi => [item, ...fi.filter(x => x.id !== id)]);
      }
      return n;
    });
  }, [results]);

  /* Save search */
  const saveSearch = () => {
    if (!query.trim()) return;
    const entry = { id: Date.now(), query: query.trim(), location: location.trim(), platforms: [...platforms] };
    setSaved(prev => [entry, ...prev.filter(s => s.query !== query.trim())].slice(0, 20));
  };

  /* Search */
  const doSearch = useCallback(async (q = query, loc = location) => {
    if (!q.trim()) { inputRef.current?.focus(); return; }
    setLoading(true);
    setError(null);
    setSearched(true);
    setTab("search");
    setAnimate(false);

    const activePlatforms = [...platforms].join(", ");

    const prompt = `You are a real marketplace search engine returning actual product listings.

Search query: "${q}"${loc ? `\nUser location: ${loc}` : ""}
Active platforms: ${activePlatforms}

Return ONLY a valid JSON array of exactly 9 listings. No markdown, no explanation, no code fences — just the raw JSON array.

Each listing object must have these exact keys:
- "id": unique short string (e.g. "r1", "r2")
- "title": realistic, specific product title (include model, condition, key specs)
- "price": number (realistic current asking price)
- "originalPrice": number or null (MSRP/retail if there's a real discount, else null)
- "source": exactly one of [${activePlatforms}]
- "location": city string for local sources (craigslist, offerup, mercari) or null
- "dealScore": integer 38–97 (score the deal honestly: high discount + good condition = high score; fair price no discount = 45-60)
- "emoji": single emoji representing this product category
- "tags": array of 2-3 short strings from: ["New","Like New","Good","Fair","Free Ship","Local Pickup","Bundle","Rare Find","Open Box","Refurb","Urgent","Price Drop"]
- "url": "#"

Rules:
- Spread listings across the active platforms realistically
- dealScore distribution should be realistic: 2-3 hot deals (80+), 4-5 good (60-79), 2 fair (38-59)
- Prices must be realistic for the item and condition
- originalPrice only when there's a genuine discount (at least 15% off)
- Local platforms (craigslist, offerup, mercari) get location data`;

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const raw = (data.content || []).map(c => c.text || "").join("");
      // strip any accidental markdown fences
      const clean = raw.replace(/```json|```/g, "").trim();
      let items = JSON.parse(clean);

      // sort
      if (sort === "price_asc")  items.sort((a, b) => a.price - b.price);
      else if (sort === "price_desc") items.sort((a, b) => b.price - a.price);
      else if (sort === "newest") items.reverse();
      else items.sort((a, b) => b.dealScore - a.dealScore);

      setResults(items);
      setAnimate(true);
    } catch (e) {
      setError("Search failed: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }, [query, location, platforms, sort]);

  const handleKey = e => { if (e.key === "Enter") doSearch(); };

  /* ── Shared styles ── */
  const tabBtn = (id) => ({
    padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600,
    background: tab === id ? "#4f46e5" : "transparent",
    color: tab === id ? "#fff" : "#6b7280",
    transition: "background .15s, color .15s",
  });

  return (
    <div style={{ minHeight: "100dvh", background: "#f8f8fc", fontFamily: "Inter, system-ui, sans-serif", color: "#111827" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        input::placeholder { color: #9ca3af; }
        a { text-decoration: none; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:9999px; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.01ms!important; transition-duration:.01ms!important; } }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,.88)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        borderBottom: "1px solid #e9eaf0",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
              boxShadow: "0 2px 8px rgba(79,70,229,.35)",
            }}>🔍</div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.03em", color: "#111827" }}>
              Deal<span style={{ color: "#4f46e5" }}>Finder</span>
            </span>
          </div>

          {/* Nav tabs */}
          <nav style={{ display: "flex", gap: 4 }}>
            <button style={tabBtn("search")} onClick={() => setTab("search")}>Search</button>
            <button style={tabBtn("favorites")} onClick={() => setTab("favorites")}>
              ❤️{favorites.size > 0 ? ` ${favorites.size}` : ""}
            </button>
            <button style={tabBtn("saved")} onClick={() => setTab("saved")}>
              🔖{saved.length > 0 ? ` ${saved.length}` : ""}
            </button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* ══ SEARCH TAB ══ */}
        {tab === "search" && (<>

          {/* Hero (only before first search) */}
          {!searched && (
            <div style={{ textAlign: "center", padding: "36px 0 28px" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🏷️</div>
              <h1 style={{ fontSize: "clamp(26px,5vw,46px)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.08, marginBottom: 12 }}>
                Find the best deal<br />
                <span style={{ color: "#4f46e5" }}>across every marketplace</span>
              </h1>
              <p style={{ fontSize: 15, color: "#6b7280", maxWidth: 440, margin: "0 auto 28px" }}>
                Amazon, eBay, Walmart, Craigslist, OfferUp & Mercari — searched and scored in one shot.
              </p>
            </div>
          )}

          {/* Search bar */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="What are you looking for? e.g. iPhone 15, Trek bike…"
              style={{
                flex: "1 1 220px", padding: "11px 16px", borderRadius: 11,
                border: "1.5px solid #e2e3ef", fontSize: 15,
                background: "#fff", color: "#111827", outline: "none",
                boxShadow: "0 1px 4px rgba(79,70,229,.06)",
                transition: "border-color .15s, box-shadow .15s",
              }}
              onFocus={e => { e.target.style.borderColor = "#4f46e5"; e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,.12)"; }}
              onBlur={e => { e.target.style.borderColor = "#e2e3ef"; e.target.style.boxShadow = "0 1px 4px rgba(79,70,229,.06)"; }}
            />
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={handleKey}
              placeholder="ZIP or city"
              style={{
                flex: "0 1 150px", padding: "11px 14px", borderRadius: 11,
                border: "1.5px solid #e2e3ef", fontSize: 15,
                background: "#fff", color: "#111827", outline: "none",
              }}
              onFocus={e => { e.target.style.borderColor = "#4f46e5"; }}
              onBlur={e => { e.target.style.borderColor = "#e2e3ef"; }}
            />
            <button
              onClick={() => doSearch()}
              disabled={loading}
              style={{
                padding: "11px 22px", borderRadius: 11, border: "none",
                background: loading ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
                boxShadow: loading ? "none" : "0 2px 10px rgba(79,70,229,.35)",
                transition: "all .15s", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {loading && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />}
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          {/* Platform toggles */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
            {PLATFORMS.map(p => {
              const on = platforms.has(p.id);
              return (
                <button key={p.id} onClick={() => togglePlatform(p.id)} style={{
                  padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${on ? p.color : "#e2e3ef"}`,
                  background: on ? p.color + "15" : "transparent",
                  color: on ? p.color : "#9ca3af",
                  cursor: "pointer", transition: "all .15s",
                }}>
                  {p.emoji} {p.label}
                </button>
              );
            })}
          </div>

          {/* Sort + Save (after first search) */}
          {searched && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>SORT</span>
              {SORT_OPTIONS.map(o => (
                <button key={o.id} onClick={() => { setSort(o.id); doSearch(); }} style={{
                  padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${sort === o.id ? "#4f46e5" : "#e2e3ef"}`,
                  background: sort === o.id ? "#ede9fe" : "transparent",
                  color: sort === o.id ? "#4f46e5" : "#6b7280", cursor: "pointer",
                }}>
                  {o.label}
                </button>
              ))}
              <button onClick={saveSearch} style={{
                marginLeft: "auto", padding: "5px 14px", borderRadius: 8,
                border: "1.5px solid #4f46e5", background: "transparent",
                color: "#4f46e5", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>
                + Save Search
              </button>
            </div>
          )}

          {/* Suggestion chips (before search) */}
          {!searched && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", paddingBottom: 8 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => { setQuery(s); doSearch(s, location); }} style={{
                  padding: "7px 16px", borderRadius: 999, fontSize: 13,
                  border: "1.5px solid #e2e3ef", background: "#fff",
                  color: "#374151", cursor: "pointer", fontWeight: 500,
                  transition: "border-color .15s, background .15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.background = "#ede9fe"; e.currentTarget.style.color = "#4f46e5"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e3ef"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#374151"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ textAlign: "center", padding: "48px 16px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <p style={{ fontWeight: 700, color: "#dc2626", marginBottom: 16 }}>{error}</p>
              <button onClick={() => doSearch()} style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Try Again
              </button>
            </div>
          )}

          {/* Skeleton grid */}
          {loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14 }}>
              {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          )}

          {/* Results grid */}
          {!loading && !error && results.length > 0 && (
            <>
              <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>
                <strong style={{ color: "#111827" }}>{results.length} listings</strong> for "{query}"
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14 }}>
                {results.map((item, i) => (
                  <Card key={item.id} item={item} favorited={favorites.has(item.id)} onFavorite={toggleFav} animate={animate} idx={i} />
                ))}
              </div>
            </>
          )}

          {/* Empty */}
          {!loading && !error && searched && results.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 16px" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🔍</div>
              <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No results found</p>
              <p style={{ color: "#6b7280", fontSize: 14 }}>Try different keywords or enable more platforms.</p>
            </div>
          )}
        </>)}

        {/* ══ FAVORITES TAB ══ */}
        {tab === "favorites" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em" }}>
              ❤️ Saved Listings
            </h2>
            {favItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 16px" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🤍</div>
                <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No favorites yet</p>
                <p style={{ color: "#6b7280", fontSize: 14 }}>Tap the heart on any listing to save it here.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14 }}>
                {favItems.map((item, i) => (
                  <Card key={item.id} item={item} favorited={true} onFavorite={toggleFav} animate={false} idx={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SAVED SEARCHES TAB ══ */}
        {tab === "saved" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em" }}>
              🔖 Saved Searches
            </h2>
            {saved.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 16px" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🔖</div>
                <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No saved searches</p>
                <p style={{ color: "#6b7280", fontSize: 14 }}>After searching, tap "+ Save Search" to bookmark it.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {saved.map(s => (
                  <div key={s.id} style={{
                    background: "#fff", border: "1px solid #e9eaf0", borderRadius: 12,
                    padding: "14px 16px", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 12, flexWrap: "wrap",
                    boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{s.query}</p>
                      <p style={{ fontSize: 12, color: "#9ca3af" }}>
                        {s.location || "Any location"} · {s.platforms.join(", ")}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => { setQuery(s.query); setLocation(s.location || ""); doSearch(s.query, s.location || ""); }}
                        style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: "#4f46e5", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                      >
                        Run ▶
                      </button>
                      <button
                        onClick={() => setSaved(prev => prev.filter(x => x.id !== s.id))}
                        style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid #e2e3ef", background: "transparent", color: "#9ca3af", fontSize: 13, cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid #e9eaf0", background: "#fff",
        padding: "18px 16px", textAlign: "center",
      }}>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>
          DealFinder · Built by{" "}
          <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer"
            style={{ color: "#4f46e5", fontWeight: 700 }}>
            Johnb
          </a>
          {" "}· Powered by AI
        </p>
      </footer>
    </div>
  );
}
