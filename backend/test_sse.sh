#!/bin/bash
# Test SSE streaming with timeout

# Execute agent first
RESPONSE=$(curl -s -X POST http://localhost:8000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "manifest_name": "document-summarizer",
    "input": "Explain quantum computing in simple terms."
  }')

EXEC_ID=$(echo $RESPONSE | grep -o '"execution_id":"[^"]*"' | cut -d'"' -f4)

echo "Execution ID: $EXEC_ID"
echo "Connecting to SSE stream..."
echo ""

# Connect to SSE with 15 second timeout
timeout 15 curl -s -N "http://localhost:8000/api/agent/events/$EXEC_ID" | head -20

