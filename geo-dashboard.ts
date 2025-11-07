// src/components/GeoDashboard.tsx
import React, { useEffect, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

mapboxgl.accessToken = "<YOUR_MAPBOX_TOKEN>";

type RegionMetric = {
  region_code: string;
  region_name: string;
  country: string;
  sessions: number;
  conversions: number;
  conversion_rate: number; // 0.031 = 3.1%
  revenue: number;
  lat: number;
  lng: number;
  delta_vs_prev: number; // 0.14 = +14%
};

type TimeseriesPoint = {
  date: string; // "2025-10-01"
  region_code: string; // "FL"
  sessions: number;
  conversion_rate: number;
};

type GeoPayload = {
  metric: string;
  date_range: string;
  regions: RegionMetric[];
  timeseries: TimeseriesPoint[];
  insights: string[];
};

const GeoDashboard: React.FC = () => {
  const [data, setData] = useState<GeoPayload | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/geo/summary");
      const json = await res.json();
      setData(json);
    };
    fetchData();
  }, []);

  // pick active region (fallback: top sessions)
  const activeRegion: RegionMetric | null = useMemo(() => {
    if (!data) return null;
    if (selectedRegion) {
      return data.regions.find(r => r.region_code === selectedRegion) || null;
    }
    // default pick: region with most sessions
    return [...data.regions].sort((a, b) => b.sessions - a.sessions)[0] || null;
  }, [data, selectedRegion]);

  // filter timeseries for the active region
  const regionTimeseries: TimeseriesPoint[] = useMemo(() => {
    if (!data || !activeRegion) return [];
    return data.timeseries
      .filter(p => p.region_code === activeRegion.region_code)
      .map(p => ({
        ...p,
        // convert 0.031 -> 3.1 for nicer chart labels
        conversion_rate: p.conversion_rate * 100,
      }));
  }, [data, activeRegion]);

  // map setup
  useEffect(() => {
    if (!data) return;

    const map = new mapboxgl.Map({
      container: "geo-map-container",
      style: "mapbox://styles/mapbox/light-v11",
      center: [-95, 37], // continental US center-ish
      zoom: 3
    });

    // We’ll render each region as a circle layer for now
    // (You can upgrade later to proper choropleth polygons using GeoJSON shapes per state)
    const features = data.regions.map(r => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [r.lng, r.lat]
      },
      properties: {
        region_code: r.region_code,
        region_name: r.region_name,
        sessions: r.sessions,
        conversion_rate: r.conversion_rate,
        intensity: r.sessions // you can normalize this for color scaling
      }
    }));

    map.on("load", () => {
      map.addSource("regions", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features
        }
      });

      map.addLayer({
        id: "region-bubbles",
        type: "circle",
        source: "regions",
        paint: {
          // circle radius ~ sqrt(sessions)
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["sqrt", ["get", "sessions"]],
            0, 4,
            200, 12,
            1000, 24,
            5000, 40
          ],
          // circle color driven by "intensity"
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "intensity"],
            0, "#d1d5db",
            1000, "#60a5fa",
            5000, "#1d4ed8"
          ],
          "circle-opacity": 0.7,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1
        }
      });

      // hover tooltip
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
      });

      map.on("mousemove", "region-bubbles", (e: any) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features[0];
        const { region_name, sessions, conversion_rate } = f.properties;
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:12px;">
              <strong>${region_name}</strong><br/>
              Sessions: ${Number(sessions).toLocaleString()}<br/>
              Conv Rate: ${(Number(conversion_rate) * 100).toFixed(2)}%
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "region-bubbles", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // click selects region
      map.on("click", "region-bubbles", (e: any) => {
        const f = e.features[0];
        setSelectedRegion(f.properties.region_code);
      });
    });

    return () => {
      map.remove();
    };
  }, [data]);

  if (!data || !activeRegion) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-600 text-sm">
        Loading regional analytics…
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top filter bar */}
      <header className="w-full border-b border-slate-200 bg-white px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-slate-800">
            Regional Performance Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            {data.date_range} • Metric: {data.metric}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <select className="bg-white border border-slate-300 rounded-lg px-3 py-2">
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>Custom…</option>
          </select>
          <select className="bg-white border border-slate-300 rounded-lg px-3 py-2">
            <option>All Channels</option>
            <option>Organic</option>
            <option>Paid</option>
            <option>Social</option>
          </select>
          <select className="bg-white border border-slate-300 rounded-lg px-3 py-2">
            <option>State / Region</option>
            <option>City</option>
            <option>DMA Market</option>
            <option>Country</option>
          </select>
        </div>
      </header>

      {/* Main content grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Map card */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Geographic Activity
              </h2>
              <p className="text-[11px] text-slate-500">
                Bubble size = Sessions • Color = Intensity
              </p>
            </div>
            <div className="text-[11px] text-slate-500">
              Click a region to drill down
            </div>
          </div>
          <div className="flex-1 min-h-[320px]">
            <div id="geo-map-container" className="w-full h-full rounded-b-2xl" />
          </div>
        </section>

        {/* Right side: Region detail + Line chart + Insights */}
        <section className="flex flex-col gap-4">
          {/* Region KPI card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                  Focus Region
                </div>
                <div className="text-lg font-semibold text-slate-800">
                  {activeRegion.region_name} ({activeRegion.region_code})
                </div>
                <div className="text-[11px] text-slate-500">
                  {activeRegion.country}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Δ vs prev period</div>
                <div
                  className={`text-sm font-semibold ${
                    activeRegion.delta_vs_prev >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {activeRegion.delta_vs_prev >= 0 ? "+" : ""}
                  {(activeRegion.delta_vs_prev * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="text-[10px] text-slate-500">Sessions</div>
                <div className="text-base font-semibold text-slate-800">
                  {activeRegion.sessions.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="text-[10px] text-slate-500">Conv Rate</div>
                <div className="text-base font-semibold text-slate-800">
                  {(activeRegion.conversion_rate * 100).toFixed(2)}%
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="text-[10px] text-slate-500">Revenue</div>
                <div className="text-base font-semibold text-slate-800">
                  ${activeRegion.revenue.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Trend chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                  Trend
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {(activeRegion.conversion_rate * 100).toFixed(2)}% Conversion Rate
                </div>
                <div className="text-[11px] text-slate-500">
                  {data.date_range}
                </div>
              </div>
            </div>

            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={regionTimeseries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickMargin={8}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => v.toFixed(1) + "%"}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value: any, key: any) => {
                      if (key === "conversion_rate") {
                        return [`${value.toFixed(2)}%`, "Conv Rate"];
                      }
                      return [value, key];
                    }}
                    labelStyle={{ fontSize: 11 }}
                    itemStyle={{ fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversion_rate"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 text-xs">
            <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-2">
              Notable Changes
            </div>
            <ul className="space-y-2 text-slate-700 leading-relaxed">
              {data.insights.map((insight, idx) => (
                <li
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12px]"
                >
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* Bottom table of regions */}
      <section className="p-6 pt-0">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
                Regional Leaderboard
              </div>
              <div className="text-sm font-semibold text-slate-800">
                Top traffic & performance zones
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-2 pr-4 font-medium">Region</th>
                  <th className="py-2 pr-4 font-medium">Sessions</th>
                  <th className="py-2 pr-4 font-medium">Conv Rate</th>
                  <th className="py-2 pr-4 font-medium">Revenue</th>
                  <th className="py-2 pr-4 font-medium">Δ vs Prev</th>
                </tr>
              </thead>
              <tbody>
                {data.regions
                  .sort((a, b) => b.sessions - a.sessions)
                  .map((r) => (
                    <tr
                      key={r.region_code}
                      className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                        r.region_code === activeRegion.region_code
                          ? "bg-emerald-50/40"
                          : ""
                      }`}
                      onClick={() => setSelectedRegion(r.region_code)}
                    >
                      <td className="py-2 pr-4 text-slate-800 font-medium">
                        {r.region_name}{" "}
                        <span className="text-slate-400">
                          ({r.region_code})
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {r.sessions.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        {(r.conversion_rate * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 pr-4">
                        ${r.revenue.toLocaleString()}
                      </td>
                      <td
                        className={`py-2 pr-4 font-semibold ${
                          r.delta_vs_prev >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {r.delta_vs_prev >= 0 ? "+" : ""}
                        {(r.delta_vs_prev * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

        </div>
      </section>
    </div>
  );
};

export default GeoDashboard;

