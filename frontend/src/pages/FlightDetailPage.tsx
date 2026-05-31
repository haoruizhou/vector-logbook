import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { cleanText, num, parsePerson } from "../lib/foreflight";
import { DEMO } from "../demo";
import type { Flight } from "../types";
import PageHeader from "../components/PageHeader";
import FlightMap from "../components/FlightMap";
import { IconBack, IconEdit, IconTrash } from "../components/icons";

type Row = [label: string, field: keyof Flight, accent?: boolean];

function KV({ flight, rows }: { flight: Flight; rows: Row[] }) {
  const shown = rows.filter(([, f]) => {
    const v = flight[f];
    return v !== null && v !== undefined && String(v).trim() !== "";
  });
  if (shown.length === 0) return null;
  return (
    <div className="kv">
      {shown.map(([label, f, accent]) => (
        <div key={String(f)}>
          <div className="k">{label}</div>
          <div className={`v${accent ? " accent" : ""}`}>{String(flight[f])}</div>
        </div>
      ))}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="group">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function FlightDetailPage() {
  const { id } = useParams();
  const fid = Number(id);
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: flight, isLoading } = useQuery({
    queryKey: ["flight", fid],
    queryFn: () => api.getFlight(fid),
  });

  const del = useMutation({
    mutationFn: () => api.deleteFlight(fid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flights"] });
      nav("/");
    },
  });

  if (isLoading || !flight)
    return (
      <>
        <PageHeader title="Flight" left={<BackBtn />} />
        <div className="page empty">Loading…</div>
      </>
    );

  const persons = [
    flight.person1,
    flight.person2,
    flight.person3,
    flight.person4,
    flight.person5,
    flight.person6,
  ]
    .map(parsePerson)
    .filter((p): p is NonNullable<typeof p> => !!p && !!p.name);

  const approaches = [
    flight.approach1,
    flight.approach2,
    flight.approach3,
    flight.approach4,
    flight.approach5,
    flight.approach6,
  ].filter((a) => a && String(a).trim());

  const endorsements: [string, keyof Flight][] = [
    ["Flight Review", "flight_review"],
    ["IPC", "ipc"],
    ["Checkride", "checkride"],
    ["FAR 61.58", "faa_6158"],
    ["NVG Prof.", "nvg_proficiency"],
  ];
  const activeEndorsements = endorsements.filter(([, f]) => {
    const v = String(flight[f] ?? "").toUpperCase();
    return v === "TRUE" || v === "1";
  });

  return (
    <>
      <PageHeader title="Flight" left={<BackBtn />}>
        {!DEMO && (
          <>
            <Link to={`/flight/${fid}/edit`} className="btn">
              <IconEdit /> Edit
            </Link>
            <button
              className="btn danger"
              onClick={() => confirm("Delete this flight?") && del.mutate()}
            >
              <IconTrash /> Delete
            </button>
          </>
        )}
      </PageHeader>

      <div className="page fade-in">
        <div className="detail-hero">
          <div className="big">
            {flight.from_ ?? "—"} <span className="arrow">→</span> {flight.to ?? flight.from_ ?? "—"}
          </div>
          <div className="mono muted">{flight.date}</div>
          <span className="tag">{flight.aircraft_id}</span>
        </div>

        <div className="detail">
          <div>
            <Group title="Time">
              <KV
                flight={flight}
                rows={[
                  ["Total", "total_time", true],
                  ["PIC", "pic"],
                  ["SIC", "sic"],
                  ["Solo", "solo"],
                  ["Night", "night"],
                  ["Cross-Country", "cross_country"],
                  ["Dual Recv", "dual_received"],
                  ["Dual Given", "dual_given"],
                  ["PICUS", "picus"],
                  ["Multi-Pilot", "multi_pilot"],
                  ["IFR", "ifr"],
                ]}
              />
            </Group>

            {(num(flight.actual_instrument) > 0 ||
              num(flight.simulated_instrument) > 0 ||
              approaches.length > 0 ||
              num(flight.holds) > 0) && (
              <Group title="Instrument">
                <KV
                  flight={flight}
                  rows={[
                    ["Actual", "actual_instrument"],
                    ["Simulated", "simulated_instrument"],
                    ["Holds", "holds"],
                  ]}
                />
                {approaches.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="k" style={{ marginBottom: 6 }}>
                      Approaches
                    </div>
                    {approaches.map((a, i) => (
                      <span key={i} className="tag" style={{ marginRight: 6 }}>
                        {cleanText(String(a))}
                      </span>
                    ))}
                  </div>
                )}
              </Group>
            )}

            <Group title="Takeoffs / Landings">
              <KV
                flight={flight}
                rows={[
                  ["Day T/O", "day_takeoffs"],
                  ["Day Ldg", "day_landings_full_stop"],
                  ["Night T/O", "night_takeoffs"],
                  ["Night Ldg", "night_landings_full_stop"],
                  ["All Landings", "all_landings", true],
                ]}
              />
            </Group>

            {(flight.hobbs_start || flight.tach_start || num(flight.distance) > 0) && (
              <Group title="Engine / Distance">
                <KV
                  flight={flight}
                  rows={[
                    ["Hobbs Start", "hobbs_start"],
                    ["Hobbs End", "hobbs_end"],
                    ["Tach Start", "tach_start"],
                    ["Tach End", "tach_end"],
                    ["Distance (nm)", "distance"],
                    ["Out", "time_out"],
                    ["Off", "time_off"],
                    ["On", "time_on"],
                    ["In", "time_in"],
                  ]}
                />
              </Group>
            )}

            {(persons.length > 0 || flight.instructor_name) && (
              <Group title="Crew">
                {flight.instructor_name && (
                  <div style={{ marginBottom: 10 }}>
                    <div className="k">Instructor</div>
                    <div className="v">{flight.instructor_name}</div>
                  </div>
                )}
                {persons.map((p, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <span className="v">{p.name}</span>{" "}
                    <span className="muted mono">· {p.role || "—"}</span>
                  </div>
                ))}
              </Group>
            )}

            {activeEndorsements.length > 0 && (
              <Group title="Endorsements">
                {activeEndorsements.map(([label]) => (
                  <span key={label} className="tag" style={{ marginRight: 6, color: "var(--good)" }}>
                    ✓ {label}
                  </span>
                ))}
              </Group>
            )}

            {cleanText(flight.pilot_comments) && (
              <Group title="Remarks">
                <p className="remark">{cleanText(flight.pilot_comments)}</p>
              </Group>
            )}
          </div>

          <FlightMap flight={flight} />
        </div>
      </div>
    </>
  );
}

function BackBtn() {
  const nav = useNavigate();
  return (
    <button className="btn" onClick={() => nav("/")} style={{ padding: "7px 10px" }}>
      <IconBack />
    </button>
  );
}
