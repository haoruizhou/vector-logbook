import { useMemo } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../theme";
import { DEMO } from "../demo";
import { IconChart, IconCurrency, IconImport, IconLog, IconPlane } from "./icons";

function Atmosphere() {
  // Minimal: a few faint constellations, each a short run of small star points
  // connected by hairlines. Only a handful of loose 1–2px dots besides those.
  const constellations = useMemo(
    () =>
      Array.from({ length: 4 }, () => {
        const cx = 10 + Math.random() * 80;
        const cy = 10 + Math.random() * 80;
        const n = 3 + Math.floor(Math.random() * 2);
        return Array.from({ length: n }, () => ({
          x: cx + (Math.random() - 0.5) * 22,
          y: cy + (Math.random() - 0.5) * 22,
          r: Math.random() * 0.05 + 0.06,
        }));
      }),
    [],
  );
  const loose = useMemo(
    () =>
      Array.from({ length: 10 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        r: Math.random() * 0.04 + 0.04,
        d: (Math.random() * 5).toFixed(2),
      })),
    [],
  );
  return (
    <div className="atmos" aria-hidden>
      <svg className="atmos-stars" preserveAspectRatio="none" viewBox="0 0 100 100">
        {constellations.map((pts, i) => (
          <g
            key={i}
            className="constel"
            style={{ animationDuration: `${48 + i * 11}s`, animationDelay: `${i * -7}s` }}
          >
            <polyline
              points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#ffd54a"
              strokeWidth="0.07"
              opacity="0.22"
            />
            {pts.map((p, j) => (
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
      <svg className="atmos-wind" preserveAspectRatio="none" viewBox="0 0 100 100">
        {[18, 30, 44, 62, 78].map((y, i) => (
          <path
            key={i}
            d={`M-5 ${y} C 25 ${y - 8}, 55 ${y + 8}, 105 ${y - 4}`}
            fill="none"
            stroke="#1f8fff"
            strokeWidth="0.12"
            opacity={0.12 - i * 0.012}
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
            {DEMO && <div className="demo-chip">Demo · sample data · read-only</div>}
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
