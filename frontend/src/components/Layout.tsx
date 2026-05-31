import { useMemo } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../theme";
import { DEMO } from "../demo";
import { randomSky } from "../lib/constellations";
import { IconChart, IconCurrency, IconImport, IconLog, IconPlane } from "./icons";

function Atmosphere() {
  // Real constellations (Orion, the Big Dipper, Cassiopeia, Cygnus, the
  // Southern Cross) projected from actual star coordinates and connected by
  // their canonical stick-figure hairlines. A scatter of dim loose stars
  // fills the rest of the sky. Canvas is 160×90 (16:9) with the aspect ratio
  // preserved so the shapes stay true; constellations sit clear of the edges
  // that get cropped on non-widescreen viewports.
  //
  // randomSky() picks a fresh random subset + layout each mount, so every
  // page refresh shows a different sky (shapes stay real — only placement,
  // size and a slight rotation vary).
  const constellations = useMemo(() => randomSky(), []);
  const loose = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        x: Math.random() * 160,
        y: Math.random() * 90,
        r: Math.random() * 0.06 + 0.05,
        d: (Math.random() * 5).toFixed(2),
      })),
    [],
  );
  return (
    <div className="atmos" aria-hidden>
      <svg className="atmos-stars" preserveAspectRatio="xMidYMid slice" viewBox="0 0 160 90">
        {constellations.map((c, i) => (
          <g
            key={c.name}
            className="constel"
            style={{ animationDuration: `${52 + i * 9}s`, animationDelay: `${i * -7}s` }}
          >
            {c.segments.map((s, j) => (
              <line
                key={j}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="#ffd54a"
                strokeWidth="0.12"
                opacity="0.2"
              />
            ))}
            {c.stars.map((p, j) => (
              <circle key={j} className="star" cx={p.x} cy={p.y} r={p.r} fill="#ffe690" />
            ))}
          </g>
        ))}
        {loose.map((s, i) => (
          <circle
            key={i}
            className="star"
            cx={s.x}
            cy={s.y}
            r={s.r}
            style={{ animationDelay: `${s.d}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const opts: { m: typeof mode; label: string }[] = [
    { m: "auto", label: "Auto" },
    { m: "light", label: "Light" },
    { m: "dark", label: "Dark" },
  ];
  return (
    <div className="theme-toggle">
      {opts.map(({ m, label }) => (
        <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
          {label}
        </button>
      ))}
    </div>
  );
}

const NAV = [
  { to: "/", label: "Logbook", Icon: IconLog, end: true },
  { to: "/dashboard", label: "Totals", Icon: IconChart },
  { to: "/currency", label: "Currency", Icon: IconCurrency },
  { to: "/aircraft", label: "Aircraft", Icon: IconPlane },
  { to: "/import", label: "Import", Icon: IconImport },
];

export default function Layout() {
  return (
    <>
      <Atmosphere />
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              VEC<b>TOR</b>
            </div>
            <div className="brand-sub">Flight Logbook</div>
          </div>
          <nav className="nav">
            {NAV.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end}>
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-foot">
            {DEMO && <div className="demo-chip">Demo · add, edit &amp; import freely · nothing saved · resets on refresh</div>}
            <ThemeToggle />
          </div>
        </aside>

        <main className="main">
          <Outlet />
        </main>

        <nav className="mobile-nav">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
