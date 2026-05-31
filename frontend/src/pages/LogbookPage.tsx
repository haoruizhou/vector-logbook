import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { num, routeIdents } from "../lib/foreflight";
import { DEMO } from "../demo";
import { useIsMobile } from "../lib/useMediaQuery";
import type { Flight } from "../types";
import PageHeader from "../components/PageHeader";
import { IconPlus, IconSearch } from "../components/icons";

type SortKey = "date" | "total_time" | "from_" | "aircraft_id";

function RouteCell({ f }: { f: Flight }) {
  const idents = routeIdents(f);
  if (idents.length === 0) return <span className="muted">—</span>;
  return (
    <span>
      {idents.map((id, i) => (
        <span key={i}>
          {i > 0 && <span className="route-arrow">›</span>}
          {id}
        </span>
      ))}
    </span>
  );
}

export default function LogbookPage() {
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const [q, setQ] = useState("");
  const [aircraftId, setAircraftId] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const aircraftQ = useQuery({ queryKey: ["aircraft"], queryFn: api.listAircraft });
  const flightsQ = useQuery({
    queryKey: ["flights", { q, aircraftId, sort, order }],
    queryFn: () =>
      api.listFlights({
        ...(q ? { q } : {}),
        ...(aircraftId ? { aircraft_id: aircraftId } : {}),
        sort,
        order,
        limit: "1000",
      }),
  });

  const items = useMemo(() => flightsQ.data?.items ?? [], [flightsQ.data]);

  function toggleSort(k: SortKey) {
    if (sort === k) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(k);
      setOrder("desc");
    }
  }

  const cols: { key: SortKey | null; label: string; num?: boolean }[] = [
    { key: "date", label: "Date" },
    { key: "aircraft_id", label: "Aircraft" },
    { key: null, label: "Route" },
    { key: "total_time", label: "Total", num: true },
    { key: null, label: "PIC", num: true },
    { key: null, label: "Night", num: true },
    { key: null, label: "XC", num: true },
    { key: null, label: "Inst", num: true },
    { key: null, label: "Ldg", num: true },
    { key: null, label: "Remarks" },
  ];

  return (
    <>
      <PageHeader title="Logbook">
        {!DEMO && (
          <Link to="/flight/new" className="btn primary">
            <IconPlus /> New
          </Link>
        )}
      </PageHeader>

      <div className="page fade-in">
        <div className="toolbar">
          <div className="search">
            <IconSearch />
            <input
              placeholder="Search airports, route, remarks…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select value={aircraftId} onChange={(e) => setAircraftId(e.target.value)} style={{ width: "auto" }}>
            <option value="">All aircraft</option>
            {aircraftQ.data?.map((a) => (
              <option key={a.aircraft_id} value={a.aircraft_id}>
                {a.aircraft_id} · {a.type_code ?? a.model ?? ""}
              </option>
            ))}
          </select>
          <span className="mono muted">{flightsQ.data?.total ?? 0} flights</span>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            {flightsQ.isLoading ? "Loading…" : "No flights. Import a ForeFlight CSV or add one."}
          </div>
        ) : isMobile ? (
          <div className="cards">
            {items.map((f) => {
              const idents = routeIdents(f);
              return (
                <div key={f.id} className="fcard" onClick={() => nav(`/flight/${f.id}`)}>
                  <div>
                    <div className="date">{f.date}</div>
                    <div className="route">
                      {idents.join(" › ") || f.aircraft_id || "—"}
                    </div>
                  </div>
                  <div className="hrs">{f.total_time ?? "—"}</div>
                  <div className="meta">
                    <span>{f.aircraft_id}</span>
                    {num(f.night) > 0 && <span>NIGHT {f.night}</span>}
                    {num(f.all_landings) > 0 && <span>{f.all_landings} LDG</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="log">
              <thead>
                <tr>
                  {cols.map((c, i) => (
                    <th
                      key={i}
                      className={c.num ? "num" : ""}
                      onClick={() => c.key && toggleSort(c.key)}
                    >
                      {c.label}
                      {c.key && sort === c.key ? (order === "asc" ? " ▲" : " ▼") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <tr key={f.id} onClick={() => nav(`/flight/${f.id}`)}>
                    <td>{f.date}</td>
                    <td>
                      <span className="tag">{f.aircraft_id ?? "—"}</span>
                    </td>
                    <td>
                      <RouteCell f={f} />
                    </td>
                    <td className="num">{f.total_time ?? "—"}</td>
                    <td className="num">{f.pic ?? ""}</td>
                    <td className="num">{f.night ?? ""}</td>
                    <td className="num">{f.cross_country ?? ""}</td>
                    <td className="num">{f.actual_instrument ?? ""}</td>
                    <td className="num">{f.all_landings ?? ""}</td>
                    <td className="muted" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {(f.pilot_comments ?? "").replace(/^"+|"+$/g, "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
