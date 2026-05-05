// Relative paths — Next.js rewrites in next.config.js proxy /api/* → backend.
// This way the browser only needs port 3001; no direct cross-origin calls to 8000.
const API = '/api'

export async function fetchManifests() {
  const response = await fetch(`${API}/manifests`)
  if (!response.ok) throw new Error('Failed to fetch manifests')
  const data = await response.json()
  return data.manifests
}

export async function fetchManifest(name: string) {
  const response = await fetch(`${API}/manifests/${name}`)
  if (!response.ok) throw new Error(`Failed to fetch manifest: ${name}`)
  return await response.json()
}

export async function executeAgent(manifestName: string, input: string) {
  const response = await fetch(`${API}/agent/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manifest_name: manifestName, input }),
  })
  if (!response.ok) throw new Error('Failed to execute agent')
  return await response.json()
}

export async function getExecutionStatus(executionId: string) {
  const response = await fetch(`${API}/agent/status/${executionId}`)
  if (!response.ok) throw new Error('Failed to get execution status')
  return await response.json()
}

export async function approveExecution(executionId: string) {
  const response = await fetch(`${API}/agent/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ execution_id: executionId, approved: true }),
  })
  if (!response.ok) throw new Error('Failed to approve execution')
  return await response.json()
}

export async function getAuditLogs(executionId?: string) {
  const url = executionId
    ? `${API}/audit/logs?execution_id=${executionId}`
    : `${API}/audit/logs`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch audit logs')
  return await response.json()
}

export async function subscribeToEvents(
  executionId: string,
  onEvent: (event: any) => void,
  onError?: (error: string) => void
): Promise<() => void> {
  const eventSource = new EventSource(`${API}/agent/events/${executionId}`)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onEvent(data)
    } catch (error) {
      console.error('Failed to parse event:', error)
    }
  }

  eventSource.onerror = () => {
    eventSource.close()
    onError?.('Connection closed')
  }

  return () => eventSource.close()
}
