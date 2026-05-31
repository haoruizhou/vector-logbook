import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { computeCurrency, type Region } from "../lib/currency";
import PageHeader from "../components/PageHeader";

const STATUS_LABEL: Record<string, string> = {
  current: "Current",
  expiring: "Expiring soon",
  expired: "Not current",
  unknown: "Unknown",
};

export default function CurrencyPage() {
  const [region, setRegion] = useState<Region>("FAA");
  const { data, isLoading } = useQuery({
    queryKey: ["flights", "all-for-currency"],
    queryFn: () => api.listFlights({ limit: "1000" }),
  });

  const items = useMemo(
    () => (data ? computeCurrency(data.items, region) : []),
    [data, region],
  );

  return (
    <>
      <PageHeader title="Currency">
        <div className="reg-switch">
          <button className={region === "FAA" ? "on" : ""} onClick={() => setRegion("FAA")}>
            FAA
          </button>
          <button className={region === "CANADA" ? "on" : ""} onClick={() => setRegion("CANADA")}>
            Canada
          </button>
        </div>
      </PageHeader>

      <div className="page fade-in">
        <div className="banner">
          Computed from your logbook as of today. {region === "FAA" ? "U.S. 14 CFR Part 61" : "Transport Canada CARs Part 401"} —
          verify against the regulations; this is an aid, not legal authority.
        </div>

        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : (
          <div className="cur-grid">
            {items.map((it) => (
              <div className={`cur-card ${it.status}`} key={it.title}>
                <h4>{it.title}</h4>
                <div className="cur-status">{STATUS_LABEL[it.status]}</div>
                <div className="cur-detail">
                  <div>{it.detail}</div>
                  {it.expires && (
                    <div>
                      {it.status === "expired" ? "Lapsed" : "Valid through"} <b>{it.expires}</b>
                    </div>
                  )}
                  <div className="muted" style={{ fontSize: 10, marginTop: 6 }}>
                    {it.regulation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
