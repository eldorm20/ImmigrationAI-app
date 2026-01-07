import requests
import json
import time

SOURCES = [
    {"url": "https://www.gov.uk/government/organisations/uk-visas-and-immigration", "jurisdiction": "UK", "title": "UKVI Overview"},
    {"url": "https://www.uscis.gov/news", "jurisdiction": "USA", "title": "USCIS Updates"},
    {"url": "https://lex.uz/ru/docs/-3190889", "jurisdiction": "Uzbekistan", "title": "Immigration Law"},
    {"url": "https://e-visa.gov.uz", "jurisdiction": "Uzbekistan", "title": "E-Visa Portal"}
]

BACKEND_URL = "http://localhost:8000"

def refresh_all():
    for source in SOURCES:
        print(f"Refreshing {source['title']}...")
        try:
            res = requests.post(f"{BACKEND_URL}/ingest", json=source)
            print(f"Result: {res.json()}")
        except Exception as e:
            print(f"Failed to refresh {source['title']}: {e}")

if __name__ == "__main__":
    # In production, this would be triggered by a Railway CRON job
    refresh_all()
