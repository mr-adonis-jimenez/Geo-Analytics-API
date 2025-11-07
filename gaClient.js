// gaClient.js

const { BetaAnalyticsDataClient } = require("@google-analytics/data");

const propertyId = process.env.GA_PROPERTY_ID;
if (!propertyId) {
  throw new Error("GA_PROPERTY_ID env var is required");
}

// GOOGLE_APPLICATION_CREDENTIALS should point to your service account JSON
const analyticsDataClient = new BetaAnalyticsDataClient();

function getDateStringsLastNDays(days) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  const toISODate = (d) => d.toISOString().slice(0, 10);

  return {
    start: toISODate(start),
    end: toISODate(end),
  };
}

function shiftDateRange(startStr, endStr) {
  const toDate = (s) => new Date(s + "T00:00:00Z");

  const start = toDate(startStr);
  const end = toDate(endStr);

  const deltaDays = Math.round((end - start) / (1000 * 60 * 60 * 24));

  const prevEnd = new Date(start);
  prevEnd.setDate(start.getDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - deltaDays);

  const toISODate = (d) => d.toISOString().slice(0, 10);

  return {
    start: toISODate(prevStart),
    end: toISODate(prevEnd),
  };
}

async function runRange(startDate, endDate) {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dimensions: [
      { name: "country" },
      { name: "region" },
      { name: "date" },
    ],
    metrics: [
      { name: "sessions" },
      { name: "conversions" },       // make sure your GA4 has this defined properly
      { name: "purchaseRevenue" },   // adjust if you use totalRevenue or another metric
    ],
    dateRanges: [
      {
        startDate,
        endDate,
      },
    ],
  });

  const rows = (response.rows || []).map((row) => {
    const [country, region, date] = row.dimensionValues.map((d) => d.value || "");
    const [sessions, conversions, revenue] = row.metricValues.map((m) =>
      parseFloat(m.value || "0")
    );

    return {
      country,
      region,
      date,
      sessions,
      conversions,
      revenue,
    };
  });

  return rows;
}

async function fetchGeoReport(days = 30) {
  const { start: currStart, end: currEnd } = getDateStringsLastNDays(days);
  const { start: prevStart, end: prevEnd } = shiftDateRange(currStart, currEnd);

  const [currentRows, previousRows] = await Promise.all([
    runRange(currStart, currEnd),
    runRange(prevStart, prevEnd),
  ]);

  return {
    current: {
      start: currStart,
      end: currEnd,
      rows: currentRows,
    },
    previous: {
      start: prevStart,
      end: prevEnd,
      rows: previousRows,
    },
  };
}

module.exports = {
  fetchGeoReport,
};
