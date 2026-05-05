'use client'

import { useState, useCallback } from 'react'
import { ExecutionEvent, ExecutionStatus } from '../types/ossa'
import * as api from '../api/client'

export function useExecution() {
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [status, setStatus] = useState<ExecutionStatus | null>(null)
  const [events, setEvents] = useState<ExecutionEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [costSummary, setCostSummary] = useState<any>(null)

  const startExecution = useCallback(async (manifestName: string, input: string) => {
    try {
      setIsLoading(true)
      setError(null)
      setResponseText('')
      setEvents([])

      const result = await api.executeAgent(manifestName, input)
      setExecutionId(result.execution_id)

      // Subscribe to events
      const unsubscribe = await api.subscribeToEvents(
        result.execution_id,
        (event: ExecutionEvent) => {
          setEvents((prev) => [...prev, event])

          // Handle specific event types
          if (event.type === 'response_chunk') {
            setResponseText((prev) => prev + (event.data.chunk || ''))
          } else if (event.type === 'cost_update') {
            setCostSummary(event.data)
          } else if (event.type === 'execution_complete') {
            setIsLoading(false)
            if (event.data.response) {
              setResponseText(event.data.response)
            }
            if (event.data.cost_summary) {
              setCostSummary(event.data.cost_summary)
            }
          } else if (event.type === 'error') {
            setError(event.data.error || 'Unknown error')
            setIsLoading(false)
          }
        },
        (err) => {
          setError(err)
          setIsLoading(false)
        }
      )

      return () => unsubscribe()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute agent'
      setError(message)
      setIsLoading(false)
    }
  }, [])

  const approveHITL = useCallback(async () => {
    if (!executionId) return
    try {
      await api.approveExecution(executionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve'
      setError(message)
    }
  }, [executionId])

  const reset = useCallback(() => {
    setExecutionId(null)
    setStatus(null)
    setEvents([])
    setError(null)
    setResponseText('')
    setCostSummary(null)
  }, [])

  return {
    executionId,
    status,
    events,
    isLoading,
    error,
    responseText,
    costSummary,
    startExecution,
    approveHITL,
    reset
  }
}
