import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { DEMO, setImported } from "../demo";
import { parseForeflightCsv } from "../lib/foreflightCsv";
import PageHeader from "../components/PageHeader";
import { IconDownload, IconImport, IconRefresh } from "../components/icons";

export default function ImportPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const importM = useMutation({
    mutationFn: async (file: File) => {
      if (DEMO) {
        const parsed = parseForeflightCsv(await file.text());
        setImported({ flights: parsed.flights, aircraft: parsed.aircraft });
        return { aircraft_count: parsed.aircraft.length, flight_count: parsed.flights.length, skipped_count: parsed.skipped };
      }
      return api.importCsv(file);
    },
    onSuccess: (r) => {
      qc.clear();
      if (DEMO) {
        nav("/");
        return;
      }
      setResult(
        `Imported ${r.flight_count} new flight(s), ${r.aircraft_count} aircraft. ${r.skipped_count} row(s) skipped.`,
      );
    },
    onError: () => setResult("Couldn't read that file — make sure it's a ForeFlight CSV export."),
  });

  const refreshM = useMutation({
    mutationFn: () => api.refreshDatasets(),
    onSuccess: (r) =>
      setResult(`Coordinate datasets refreshed: ${r.airports ?? 0} airports, ${r.navaids ?? 0} navaids.`),
  });

  function handleFiles(files: FileList | null) {
    if (files && files[0]) importM.mutate(files[0]);
  }

  return (
    <>
      <PageHeader title={DEMO ? "Import & Preview" : "Import / Export"}>
        {!DEMO && (
          <a className="btn" href="/api/export">
            <IconDownload /> Export CSV
          </a>
        )}
      </PageHeader>

      <div className="page fade-in" style={{ maxWidth: 720 }}>
        {DEMO && (
          <div className="banner">
            Public preview — your CSV is parsed entirely in your browser and held only in memory.
            Nothing is uploaded or stored, and it's gone when you reload. Run your own instance
            (Docker + cloudflared) for a persistent logbook with editing and export.
          </div>
        )}
        {result && <div className="banner">{result}</div>}

        <div
          className={`dropzone${over ? " over" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <IconImport style={{ width: 30, height: 30, color: "var(--accent)" }} />
          <p className="display" style={{ marginTop: 12, fontSize: 16, letterSpacing: "0.06em" }}>
            {importM.isPending ? "READING…" : "DROP FOREFLIGHT CSV"}
          </p>
          <p className="muted mono" style={{ marginTop: 6, fontSize: 12 }}>
            {DEMO ? "parsed locally — preview your own logbook" : "or click to choose a file · re-imports dedupe automatically"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {!DEMO && (
          <div className="group" style={{ marginTop: 28 }}>
            <h3>Coordinate Data</h3>
            <p className="muted mono" style={{ fontSize: 12, marginBottom: 12 }}>
              Airports & navaids are bundled and auto-refresh weekly. Trigger a manual refresh below.
            </p>
            <button className="btn" onClick={() => refreshM.mutate()} disabled={refreshM.isPending}>
              <IconRefresh className={refreshM.isPending ? "spin" : ""} /> Refresh datasets
            </button>
          </div>
        )}
      </div>
    </>
  );
}
