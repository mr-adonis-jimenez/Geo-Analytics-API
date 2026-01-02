from fastapi import FastAPI
from routes import router

app = FastAPI(title="Geo-Analytics API")
app.include_router(router, prefix="/api")
