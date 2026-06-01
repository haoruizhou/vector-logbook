import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import LogbookPage from "./pages/LogbookPage";
import FlightDetailPage from "./pages/FlightDetailPage";
import FlightFormPage from "./pages/FlightFormPage";
import DashboardPage from "./pages/DashboardPage";
import CurrencyPage from "./pages/CurrencyPage";
import AircraftPage from "./pages/AircraftPage";
import ImportPage from "./pages/ImportPage";
import JourneyPage from "./pages/JourneyPage";

const basename = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";

export const router = createBrowserRouter(
  [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <LogbookPage /> },
      { path: "journey", element: <JourneyPage /> },
      { path: "flight/new", element: <FlightFormPage /> },
      { path: "flight/:id", element: <FlightDetailPage /> },
      { path: "flight/:id/edit", element: <FlightFormPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "currency", element: <CurrencyPage /> },
      { path: "aircraft", element: <AircraftPage /> },
      { path: "import", element: <ImportPage /> },
    ],
  },
  ],
  { basename },
);
