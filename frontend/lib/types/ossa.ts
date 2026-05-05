export interface OSSAManifest {
  name: string
  version: string
  description: string
  provider: string
  model: string
  temperature: number
  maxTokens: number
  role: string
  compliance: {
    frameworks: string[]
    classification: string
  }
  cost: {
    daily: number
    alert_threshold?: number
  }
  hitl_enabled: boolean
  trust_tier: string
}

export interface ExecutionEvent {
  type: 'execution_started' | 'execution_status' | 'hitl_required' | 'hitl_approved' | 'response_chunk' | 'cost_update' | 'execution_complete' | 'error'
  data: Record<string, any>
}

export interface ExecutionStatus {
  execution_id: string
  manifest_name: string
  status: 'initializing' | 'waiting_for_approval' | 'running' | 'completed' | 'rejected' | 'error'
  hitl_required: boolean
  hitl_approved: boolean
  response_text: string
  error?: string
  cost_summary: {
    provider: string
    tokens: {
      input: number
      output: number
      total: number
    }
    cost: {
      estimated_usd: number
      input_price_per_1k: number
      output_price_per_1k: number
    }
  }
}
