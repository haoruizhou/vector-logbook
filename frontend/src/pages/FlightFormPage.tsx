import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Flight } from "../types";
import PageHeader from "../components/PageHeader";
import { IconBack } from "../components/icons";

type FieldType = "text" | "date" | "num" | "bool";
interface FieldDef {
  key: keyof Flight;
  label: string;
  type?: FieldType;
}
interface FormGroup {
  title: string;
  fields: FieldDef[];
}

const GROUPS: FormGroup[] = [
  {
    title: "Flight",
    fields: [
      { key: "date", label: "Date", type: "date" },
      { key: "from_", label: "From" },
      { key: "to", label: "To" },
      { key: "route", label: "Route" },
    ],
  },
  {
    title: "Times",
    fields: [
      { key: "time_out", label: "Out" },
      { key: "time_off", label: "Off" },
      { key: "time_on", label: "On" },
      { key: "time_in", label: "In" },
      { key: "total_time", label: "Total", type: "num" },
      { key: "pic", label: "PIC", type: "num" },
      { key: "sic", label: "SIC", type: "num" },
      { key: "night", label: "Night", type: "num" },
      { key: "solo", label: "Solo", type: "num" },
      { key: "cross_country", label: "Cross-Country", type: "num" },
      { key: "dual_received", label: "Dual Recv", type: "num" },
      { key: "dual_given", label: "Dual Given", type: "num" },
      { key: "ifr", label: "IFR", type: "num" },
    ],
  },
  {
    title: "Instrument",
    fields: [
      { key: "actual_instrument", label: "Actual", type: "num" },
      { key: "simulated_instrument", label: "Simulated", type: "num" },
      { key: "holds", label: "Holds", type: "num" },
      { key: "approach1", label: "Approach 1" },
      { key: "approach2", label: "Approach 2" },
      { key: "approach3", label: "Approach 3" },
    ],
  },
  {
    title: "Takeoffs / Landings",
    fields: [
      { key: "day_takeoffs", label: "Day T/O", type: "num" },
      { key: "day_landings_full_stop", label: "Day Ldg", type: "num" },
      { key: "night_takeoffs", label: "Night T/O", type: "num" },
      { key: "night_landings_full_stop", label: "Night Ldg", type: "num" },
      { key: "all_landings", label: "All Landings", type: "num" },
    ],
  },
  {
    title: "Engine / Distance",
    fields: [
      { key: "hobbs_start", label: "Hobbs Start", type: "num" },
      { key: "hobbs_end", label: "Hobbs End", type: "num" },
      { key: "tach_start", label: "Tach Start", type: "num" },
      { key: "tach_end", label: "Tach End", type: "num" },
      { key: "distance", label: "Distance (nm)", type: "num" },
    ],
  },
  {
    title: "Crew & Remarks",
    fields: [
      { key: "instructor_name", label: "Instructor" },
      { key: "person1", label: "Person 1 (Name;Role;email;phone)" },
      { key: "person2", label: "Person 2" },
      { key: "pilot_comments", label: "Remarks" },
    ],
  },
  {
    title: "Endorsements",
    fields: [
      { key: "flight_review", label: "Flight Review", type: "bool" },
      { key: "ipc", label: "IPC", type: "bool" },
      { key: "checkride", label: "Checkride", type: "bool" },
    ],
  },
];

export default function FlightFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const fid = Number(id);
  const nav = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<Partial<Flight>>({});

  const aircraftQ = useQuery({ queryKey: ["aircraft"], queryFn: api.listAircraft });
  const flightQ = useQuery({
    queryKey: ["flight", fid],
    queryFn: () => api.getFlight(fid),
    enabled: editing,
  });

  useEffect(() => {
    if (flightQ.data) setForm(flightQ.data);
  }, [flightQ.data]);

  const save = useMutation({
    mutationFn: (body: Partial<Flight>) =>
      editing ? api.updateFlight(fid, body) : api.createFlight(body),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["flights"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      nav(editing ? `/flight/${fid}` : `/flight/${saved.id}`);
    },
  });

  function set(k: keyof Flight, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(form);
  }

  return (
    <>
      <PageHeader
        title={editing ? "Edit Flight" : "New Flight"}
        left={
          <button className="btn" onClick={() => nav(-1)} style={{ padding: "7px 10px" }}>
            <IconBack />
          </button>
        }
      >
        <button className="btn primary" onClick={submit} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </PageHeader>

      <form className="page fade-in" onSubmit={submit}>
        <div className="field" style={{ maxWidth: 280, marginBottom: 22 }}>
          <label>Aircraft</label>
          <select value={form.aircraft_id ?? ""} onChange={(e) => set("aircraft_id", e.target.value)}>
            <option value="">— select —</option>
            {aircraftQ.data?.map((a) => (
              <option key={a.aircraft_id} value={a.aircraft_id}>
                {a.aircraft_id} · {a.type_code ?? a.model ?? ""}
              </option>
            ))}
          </select>
        </div>

        {GROUPS.map((g) => (
          <div className="group" key={g.title}>
            <h3>{g.title}</h3>
            <div className="kv" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
              {g.fields.map((fld) => {
                const val = String(form[fld.key] ?? "");
                if (fld.type === "bool") {
                  const on = val.toUpperCase() === "TRUE";
                  return (
                    <label key={String(fld.key)} className="row" style={{ cursor: "pointer", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => set(fld.key, e.target.checked ? "TRUE" : "")}
                        style={{ width: 16, height: 16 }}
                      />
                      <span className="k">{fld.label}</span>
                    </label>
                  );
                }
                return (
                  <div className="field" key={String(fld.key)}>
                    <label>{fld.label}</label>
                    <input
                      type={fld.type === "date" ? "date" : "text"}
                      inputMode={fld.type === "num" ? "decimal" : undefined}
                      value={val}
                      onChange={(e) => set(fld.key, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </form>
    </>
  );
}
