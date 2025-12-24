import requests
import json

BACKEND_URL = "http://localhost:8000"

def test_pipeline():
    # 1. Test Ingest
    test_src = {
        "url": "https://www.gov.uk/skilled-worker-visa",
        "jurisdiction": "UK",
        "section_title": "Skilled Worker Visa Eligibility"
    }
    print("Testing Ingest...")
    try:
        res = requests.post(f"{BACKEND_URL}/ingest", json=test_src)
        print(f"Ingest Result: {res.status_code} - {res.text}")
    except:
        print("Ingest failed (server might be down)")

    # 2. Test Answer with Citation
    print("\nTesting Answer with Citation...")
    query = {"query": "What are the eligibility requirements for a skilled worker visa?", "jurisdiction": "UK"}
    try:
        res = requests.post(f"{BACKEND_URL}/answer", json=query)
        data = res.json()
        print(f"Answer: {data.get('answer')}")
        print(f"Citations: {json.dumps(data.get('citations'), indent=2)}")
        
        # Verify citation structure
        if data.get('citations') and len(data.get('citations')) > 0:
            print("✅ Citation validation passed.")
        else:
            print("❌ Citation validation failed.")
    except:
        print("Answer failed.")

if __name__ == "__main__":
    test_pipeline()
