from fastapi import APIRouter

router = APIRouter()

@router.get("/regions")
def get_regions():
    return [
        {
            "region": "North America",
            "metric": "revenue",
            "value": 1200000,
            "lat": 37.09,
            "lon": -95.71
        },
        {
            "region": "Europe",
            "metric": "revenue",
            "value": 850000,
            "lat": 54.52,
            "lon": 15.25
        }
    ]
