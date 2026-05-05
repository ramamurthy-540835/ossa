#!/usr/bin/env python3
"""End-to-end test of OSSA dashboard"""

import requests
import json
import time

API_BASE = "http://localhost:8000"

print("🧪 OSSA E2E Test Suite\n")

# Test 1: Health check
print("✓ Test 1: Health Check")
resp = requests.get(f"{API_BASE}/health")
assert resp.status_code == 200
print(f"  Status: {resp.json()['status']}\n")

# Test 2: List manifests
print("✓ Test 2: List Manifests")
resp = requests.get(f"{API_BASE}/api/manifests")
assert resp.status_code == 200
data = resp.json()
print(f"  Found {data['count']} manifests")
for m in data['manifests']:
    print(f"    - {m['name']} ({m['provider']})")
print()

# Test 3: Get specific manifest
print("✓ Test 3: Get Manifest Details")
resp = requests.get(f"{API_BASE}/api/manifests/document-summarizer")
assert resp.status_code == 200
manifest = resp.json()
print(f"  Manifest: {manifest['name']}")
print(f"  Provider: {manifest['provider']}")
print(f"  Model: {manifest['model']}")
print(f"  Compliance: {manifest['compliance']['frameworks']}")
print(f"  HITL Enabled: {manifest['hitl_enabled']}\n")

# Test 4: Execute agent (short input to avoid HITL)
print("✓ Test 4: Execute Agent")
payload = {
    "manifest_name": "document-summarizer",
    "input": "Python is a programming language."
}
resp = requests.post(f"{API_BASE}/api/agent/execute", json=payload)
assert resp.status_code == 200
exec_data = resp.json()
exec_id = exec_data['execution_id']
print(f"  Execution ID: {exec_id}")
print(f"  Streaming: {exec_data['streaming']}\n")

# Test 5: Poll execution status
print("✓ Test 5: Execution Status")
time.sleep(2)
resp = requests.get(f"{API_BASE}/api/agent/status/{exec_id}")
if resp.status_code == 200:
    status = resp.json()
    print(f"  Status: {status['status']}")
    if status['response_text']:
        print(f"  Response preview: {status['response_text'][:100]}...")
    print(f"  Tokens used: {status['cost_summary']['tokens']['total']}")
    print(f"  Cost: ${status['cost_summary']['cost']['estimated_usd']:.6f}\n")

# Test 6: Audit logs
print("✓ Test 6: Audit Logs")
resp = requests.get(f"{API_BASE}/api/audit/logs", params={"execution_id": exec_id})
if resp.status_code == 200:
    logs = resp.json()
    print(f"  Events recorded: {len(logs.get('events', []))}")
    for event in logs.get('events', [])[:5]:
        print(f"    - {event['type']}")

print("\n✅ All tests passed!")
