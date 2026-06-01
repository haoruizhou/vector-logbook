import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import JourneyMap from "../components/JourneyMap";
import PilotIdBand from "../components/PilotIdBand";
import StripBay from "../components/StripBay";
import PageHeader from "../components/PageHeader";

export default function JourneyPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["journey"], queryFn: () => api.journey() });

  if (isLoading || !data)
    return (
      <div className="page journey-page">
        <PageHeader title="Journey" />
        <div className="map-placeholder">Charting your journey…</div>
      </div>
    );

  return (
    <div className="page journey-page">
      <PageHeader title="Journey" />
      <JourneyMap journey={data} selected={selected} />
      <PilotIdBand journey={data} />
      <StripBay journey={data} selected={selected} onSelect={setSelected} />
    </div>
  );
}
