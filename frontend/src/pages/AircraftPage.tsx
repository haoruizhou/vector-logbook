import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { DEMO } from "../demo";
import type { Aircraft } from "../types";
import PageHeader from "../components/PageHeader";
import { IconPlus, IconTrash } from "../components/icons";

const BLANK: Partial<Aircraft> = { aircraft_id: "", make: "", model: "", type_code: "" };

export default function AircraftPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["aircraft"], queryFn: api.listAircraft });
  const [form, setForm] = useState<Partial<Aircraft>>(BLANK);
  const [adding, setAdding] = useState(false);

  const create = useMutation({
    mutationFn: () => api.createAircraft(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aircraft"] });
      setForm(BLANK);
      setAdding(false);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteAircraft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aircraft"] }),
  });

  return (
    <>
      <PageHeader title="Aircraft">
        {!DEMO && (
          <button className="btn primary" onClick={() => setAdding((a) => !a)}>
            <IconPlus /> Add
          </button>
        )}
      </PageHeader>

      <div className="page fade-in">
        {adding && (
          <div className="panel" style={{ padding: 18, marginBottom: 18 }}>
            <div className="kv" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
              {(["aircraft_id", "type_code", "make", "model", "year", "gear_type", "engine_type"] as const).map(
                (k) => (
                  <div className="field" key={k}>
                    <label>{k.replace("_", " ")}</label>
                    <input
                      value={String(form[k] ?? "")}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                    />
                  </div>
                ),
              )}
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button
                className="btn primary"
                disabled={!form.aircraft_id || create.isPending}
                onClick={() => create.mutate()}
              >
                Save aircraft
              </button>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table className="log">
            <thead>
              <tr>
                <th>Tail #</th>
                <th>Type</th>
                <th>Make</th>
                <th>Model</th>
                <th>Class</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.map((a) => (
                <tr key={a.aircraft_id} style={{ cursor: "default" }}>
                  <td>
                    <span className="tag">{a.aircraft_id}</span>
                  </td>
                  <td>{a.type_code}</td>
                  <td>{a.make}</td>
                  <td>{a.model}</td>
                  <td className="muted">{a.aircraft_class?.replace(/_/g, " ")}</td>
                  <td className="num">
                    {!DEMO && (
                      <button
                        className="btn danger"
                        style={{ padding: "5px 8px" }}
                        onClick={() =>
                          confirm(`Delete ${a.aircraft_id}?`) && remove.mutate(a.aircraft_id)
                        }
                      >
                        <IconTrash />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
