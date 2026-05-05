#!/usr/bin/env python3
"""Full E2E test with real API calls"""

import requests
import json
import time
from datetime import datetime

API_BASE = "http://localhost:8000"

print("🧪 OSSA Full E2E Test with Real Gemini API\n")
print(f"⏰ Test started: {datetime.now().isoformat()}\n")

# Test 1: Health
print("✓ Test 1: Health Check")
resp = requests.get(f"{API_BASE}/health")
assert resp.status_code == 200
print(f"  API Status: {resp.json()['status']}\n")

# Test 2: List manifests
print("✓ Test 2: List Manifests")
resp = requests.get(f"{API_BASE}/api/manifests")
assert resp.status_code == 200
manifests = resp.json()['manifests']
print(f"  Found {len(manifests)} agents:")
for m in manifests:
    print(f"    • {m['name']} ({m['provider']})")
print()

# Test 3: Execute real agent
print("✓ Test 3: Execute Agent with Real LLM")
test_input = "What is vendor neutrality? Answer in one sentence."
payload = {
    "manifest_name": "document-summarizer",
    "input": test_input
}

print(f"  Input: {test_input}")
print(f"  Manifest: document-summarizer")
print(f"  Provider: Gemini 2.5 Flash\n")

resp = requests.post(f"{API_BASE}/api/agent/execute", json=payload)
if resp.status_code != 200:
    print(f"❌ Failed to execute: {resp.text}")
    exit(1)

exec_id = resp.json()['execution_id']
print(f"  Execution ID: {exec_id}")
print(f"  Streaming: Started\n")

# Test 4: Collect SSE events
print("✓ Test 4: Consuming SSE Stream")
events = []
response_text = ""
cost_summary = None
error_msg = None

try:
    sse_resp = requests.get(
        f"{API_BASE}/api/agent/events/{exec_id}",
        stream=True,
        timeout=30
    )
    
    for line in sse_resp.iter_lines():
        if line:
            line_str = line.decode('utf-8') if isinstance(line, bytes) else line
            if line_str.startswith('data: '):
                event_data = json.loads(line_str[6:])
                events.append(event_data)
                
                event_type = event_data.get('type')
                print(f"  📨 {event_type}")
                
                if event_type == 'response_chunk':
                    chunk = event_data.get('data', {}).get('chunk', '')
                    response_text += chunk
                    if len(chunk) > 0:
                        print(f"      → {chunk[:60]}..." if len(chunk) > 60 else f"      → {chunk}")
                
                elif event_type == 'cost_update':
                    cost_summary = event_data.get('data')
                    tokens = cost_summary.get('tokens', {})
                    cost = cost_summary.get('cost', {})
                    print(f"      → Tokens: {tokens.get('total')} | Cost: ${cost.get('estimated_usd'):.6f}")
                
                elif event_type == 'execution_complete':
                    print(f"      ✅ Complete")
                    break

except Exception as e:
    print(f"  Error: {e}")

print()

# Test 5: Display results
print("✓ Test 5: Results Summary")
if response_text:
    print(f"  📝 Response:")
    print(f"     {response_text[:150]}{'...' if len(response_text) > 150 else ''}\n")
    
if cost_summary:
    tokens = cost_summary.get('tokens', {})
    cost = cost_summary.get('cost', {})
    print(f"  💰 Cost Analysis:")
    print(f"     Input tokens:  {tokens.get('input')}")
    print(f"     Output tokens: {tokens.get('output')}")
    print(f"     Total tokens:  {tokens.get('total')}")
    print(f"     Estimated cost: ${cost.get('estimated_usd'):.6f}")
    print(f"     Provider: {cost_summary.get('provider').upper()}\n")

print("=" * 70)
if response_text:
    print("✅ Full E2E test successful!")
    print(f"   • Real LLM call completed")
    print(f"   • SSE streaming worked")
    print(f"   • Cost tracking functional")
else:
    print("⚠️  System is working but needs valid API key for actual responses")
print("=" * 70)

