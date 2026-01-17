# Geo-Analytics API Documentation

## Overview

The Geo-Analytics API is a FastAPI-based service for processing and analyzing geographic data. It provides endpoints for dataset management, regional analytics, trend analysis, and executive summaries.

## Base URL

```
http://localhost:8000/api
```

## Authentication

Currently, the API operates in open mode for development. Production deployments should implement authentication (API keys, OAuth2, etc.).

## API Endpoints

### Health Check

#### GET /health

Returns API health status.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-17T07:00:00Z"
}
```

### Dataset Management

#### GET /datasets

List all available datasets.

**Response:**
```json
{
  "datasets": [
    {
      "id": "sample",
      "name": "Sample Dataset",
      "records": 100,
      "columns": ["region", "date", "revenue", "lat", "lon"]
    }
  ]
}
```

#### POST /datasets/json

Upload a dataset from JSON.

**Query Parameters:**
- `name` (required): Dataset name

**Request Body:**
```json
[
  {
    "region": "North",
    "lat": 40.7128,
    "lon": -74.0060,
    "date": "2026-01-01",
    "revenue": 50000
  }
]
```

**Response:**
```json
{
  "dataset_id": "my-dataset",
  "records_loaded": 1,
  "message": "Dataset uploaded successfully"
}
```

#### POST /datasets/csv

Upload a dataset from CSV file.

**Query Parameters:**
- `name` (required): Dataset name

**Request:**
- Content-Type: multipart/form-data
- Field: `file` (CSV file)

**Response:**
```json
{
  "dataset_id": "my-csv-dataset",
  "records_loaded": 250,
  "message": "Dataset uploaded successfully"
}
```

### Regional Analytics

#### GET /analytics/regions

Aggregate data by region.

**Query Parameters:**
- `dataset_id` (required): Dataset identifier
- `value_col` (required): Column to aggregate
- `agg` (optional): Aggregation function (sum, mean, median, count). Default: sum

**Example:**
```
GET /api/analytics/regions?dataset_id=sample&value_col=revenue&agg=sum
```

**Response:**
```json
{
  "data": [
    {
      "region": "North",
      "value": 150000,
      "lat": 40.7128,
      "lon": -74.0060
    },
    {
      "region": "South",
      "value": 120000,
      "lat": 33.7490,
      "lon": -84.3880
    }
  ],
  "metadata": {
    "aggregation": "sum",
    "value_column": "revenue"
  }
}
```

### Trend Analysis

#### GET /analytics/trends

Analyze temporal trends.

**Query Parameters:**
- `dataset_id` (required): Dataset identifier
- `date_col` (required): Date column name
- `value_col` (required): Value column to analyze
- `freq` (optional): Time frequency (D=daily, W=weekly, M=monthly). Default: M

**Example:**
```
GET /api/analytics/trends?dataset_id=sample&date_col=date&value_col=revenue&freq=M
```

**Response:**
```json
{
  "trends": [
    {
      "period": "2026-01",
      "value": 450000
    },
    {
      "period": "2026-02",
      "value": 520000
    }
  ],
  "metadata": {
    "frequency": "M",
    "value_column": "revenue"
  }
}
```

### Executive Summary

#### GET /analytics/executive-summary

Generate executive-level insights.

**Query Parameters:**
- `dataset_id` (required): Dataset identifier
- `metric` (required): Metric name (e.g., "revenue", "sales")
- `value_col` (required): Value column
- `date_col` (optional): Date column for temporal analysis

**Example:**
```
GET /api/analytics/executive-summary?dataset_id=sample&metric=revenue&value_col=revenue&date_col=date
```

**Response:**
```json
{
  "summary": {
    "metric": "revenue",
    "total": 2450000,
    "average": 122500,
    "top_region": {
      "name": "North",
      "value": 580000
    },
    "growth_trend": "increasing",
    "period_covered": {
      "start": "2026-01-01",
      "end": "2026-12-31"
    }
  }
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-01-17T07:00:00Z",
    "status_code": 404,
    "error_code": "DATASET_NOT_FOUND",
    "message": "Dataset 'invalid-id' not found",
    "details": {
      "dataset_id": "invalid-id"
    }
  }
}
```

### Common Error Codes

- `DATASET_NOT_FOUND` (404): Requested dataset doesn't exist
- `INVALID_DATA_FORMAT` (400): Data format validation failed
- `VALIDATION_ERROR` (422): Request parameters invalid
- `ANALYTICS_PROCESSING_ERROR` (500): Analytics computation failed
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error
- `RATE_LIMIT_EXCEEDED` (429): Too many requests

## Rate Limiting

Currently no rate limiting is enforced. Production deployments should implement rate limiting per client/IP.

## Interactive Documentation

Access interactive API docs:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Examples

### Complete Workflow Example

```bash
# 1. Upload dataset
curl -X POST "http://localhost:8000/api/datasets/json?name=my-data" \
  -H "Content-Type: application/json" \
  -d '[{
    "region": "East",
    "lat": 40.7128,
    "lon": -74.0060,
    "date": "2026-01-15",
    "revenue": 75000
  }]'

# 2. Get regional analytics
curl "http://localhost:8000/api/analytics/regions?dataset_id=my-data&value_col=revenue&agg=sum"

# 3. Analyze trends
curl "http://localhost:8000/api/analytics/trends?dataset_id=my-data&date_col=date&value_col=revenue&freq=M"

# 4. Get executive summary
curl "http://localhost:8000/api/analytics/executive-summary?dataset_id=my-data&metric=revenue&value_col=revenue"
```

## SDKs and Client Libraries

Python client example:

```python
import requests

BASE_URL = "http://localhost:8000/api"

# Upload dataset
data = [
    {"region": "West", "lat": 34.0522, "lon": -118.2437, 
     "date": "2026-01-15", "revenue": 85000}
]
response = requests.post(
    f"{BASE_URL}/datasets/json?name=west-region",
    json=data
)
print(response.json())

# Get analytics
response = requests.get(
    f"{BASE_URL}/analytics/regions",
    params={"dataset_id": "west-region", "value_col": "revenue", "agg": "sum"}
)
print(response.json())
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/mr-adonis-jimenez/Geo-Analytics-API/issues
- Documentation: https://github.com/mr-adonis-jimenez/Geo-Analytics-API/wiki
