// server.js

const express = require("express");
const cors = require("cors");
const { fetchGeoReport } = require("./gaClient");
const { buildDashboardPayload } = require("./geoService");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/geo/summary", async (req, res) => {
  const daysParam = req.query.days;
  let days = 30;

  if (daysParam !== undefined) {
    const parsed = parseInt(daysParam, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 90) {
      return res
        .status(400)
        .json({ error: "days must be an integer between 1 and 90" });
    }
    days = parsed;
  }

  try {
    const gaResult = await fetchGeoReport(days);
    const payload = buildDashboardPayload(gaResult);
    res.json(payload);
  } catch (err) {
    console.error("Error in /api/geo/summary:", err);
    res.status(500).json({
      error: "Internal server error",
      detail: err.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("Regional Analytics API is running");
});

app.listen(PORT, () => {
  console.log(`Regional Analytics API listening on http://localhost:${PORT}`);
});
