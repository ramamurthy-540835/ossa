export interface ModelOption {
  id: string
  label: string
  maxTokens: number
  defaultTemp: number
}

export interface ProviderOption {
  id: string
  label: string
  icon: string
  color: string
  models: ModelOption[]
}

export interface ComplianceDetail {
  id: string
  name: string
  fullName: string
  description: string
  keyRequirements: string[]
  scope: string
  docsUrl: string
  color: string
  bg: string
}

export const PROVIDERS: ProviderOption[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    icon: 'G',
    color: '#60a5fa',
    models: [
      { id: 'gemini-2.5-flash',   label: 'Gemini 2.5 Flash',   maxTokens: 8192,  defaultTemp: 0.3 },
      { id: 'gemini-2.5-pro',     label: 'Gemini 2.5 Pro',     maxTokens: 8192,  defaultTemp: 0.4 },
      { id: 'gemini-1.5-flash',   label: 'Gemini 1.5 Flash',   maxTokens: 8192,  defaultTemp: 0.3 },
      { id: 'gemini-1.5-pro',     label: 'Gemini 1.5 Pro',     maxTokens: 8192,  defaultTemp: 0.4 },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    icon: 'A',
    color: '#a78bfa',
    models: [
      { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6',  maxTokens: 8192,  defaultTemp: 0.3 },
      { id: 'claude-opus-4-7',           label: 'Claude Opus 4.7',    maxTokens: 8192,  defaultTemp: 0.4 },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',   maxTokens: 4096,  defaultTemp: 0.3 },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    icon: 'O',
    color: '#34d399',
    models: [
      { id: 'gpt-4o',      label: 'GPT-4o',        maxTokens: 4096, defaultTemp: 0.3 },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini',   maxTokens: 4096, defaultTemp: 0.3 },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo',   maxTokens: 4096, defaultTemp: 0.4 },
      { id: 'o3-mini',     label: 'o3-mini',        maxTokens: 4096, defaultTemp: 0.3 },
    ],
  },
  {
    id: 'azure',
    label: 'Azure OpenAI',
    icon: 'Az',
    color: '#38bdf8',
    models: [
      { id: 'gpt-4o',      label: 'GPT-4o (Azure)',       maxTokens: 4096, defaultTemp: 0.3 },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo (Azure)',  maxTokens: 4096, defaultTemp: 0.3 },
    ],
  },
  {
    id: 'vertex',
    label: 'Google Vertex AI',
    icon: 'V',
    color: '#fb923c',
    models: [
      { id: 'gemini-2.5-flash-001', label: 'Gemini 2.5 Flash (Vertex)', maxTokens: 8192, defaultTemp: 0.3 },
      { id: 'gemini-2.5-pro-001',   label: 'Gemini 2.5 Pro (Vertex)',   maxTokens: 8192, defaultTemp: 0.4 },
    ],
  },
]

export const COMPLIANCE_DETAILS: Record<string, ComplianceDetail> = {
  SOC2: {
    id: 'SOC2',
    name: 'SOC 2',
    fullName: 'System and Organization Controls 2',
    description: 'AICPA auditing standard for service organizations. Evaluates controls relevant to security, availability, processing integrity, confidentiality, and privacy of customer data.',
    keyRequirements: ['Access controls & encryption', 'Incident response procedures', 'Risk monitoring & alerting', 'Change management policies'],
    scope: 'SaaS / cloud service providers',
    docsUrl: 'https://www.aicpa-cima.com/resources/landing/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security',
    color: '#60a5fa',
    bg: 'rgba(59,130,246,0.1)',
  },
  HIPAA: {
    id: 'HIPAA',
    name: 'HIPAA',
    fullName: 'Health Insurance Portability and Accountability Act',
    description: 'US federal law governing the use, storage, and disclosure of Protected Health Information (PHI). Applies to covered entities and their business associates handling health data.',
    keyRequirements: ['PHI minimum-use principle', 'Audit logs for PHI access', 'Encryption at rest & in transit', 'Business Associate Agreements (BAA)'],
    scope: 'US healthcare & health-adjacent AI',
    docsUrl: 'https://www.hhs.gov/hipaa/for-professionals/index.html',
    color: '#34d399',
    bg: 'rgba(16,185,129,0.1)',
  },
  GDPR: {
    id: 'GDPR',
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    description: 'EU regulation establishing rights for individuals over their personal data. Requires lawful basis for processing, data minimisation, and the right to erasure. Fines up to 4% of global turnover.',
    keyRequirements: ['Lawful basis for processing', 'Right to erasure ("be forgotten")', 'Data minimisation', 'Privacy by design & by default'],
    scope: 'Any org processing EU resident data',
    docsUrl: 'https://gdpr.eu/what-is-gdpr/',
    color: '#a78bfa',
    bg: 'rgba(139,92,246,0.1)',
  },
  ISO27001: {
    id: 'ISO27001',
    name: 'ISO 27001',
    fullName: 'ISO/IEC 27001 — Information Security Management',
    description: 'International standard specifying requirements for an Information Security Management System (ISMS). Covers risk assessment, treatment, and a comprehensive set of Annex A controls.',
    keyRequirements: ['ISMS risk register', 'Asset classification', 'Supplier security assessments', 'Security awareness training'],
    scope: 'Global — any industry',
    docsUrl: 'https://www.iso.org/standard/27001',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.1)',
  },
  'PCI-DSS': {
    id: 'PCI-DSS',
    name: 'PCI-DSS',
    fullName: 'Payment Card Industry Data Security Standard',
    description: 'Mandatory standard for all entities that store, process, or transmit cardholder data. Enforced by card brands. Non-compliance risks fines and revocation of card acceptance.',
    keyRequirements: ['Cardholder data never logged', 'Network segmentation', 'Vulnerability scanning (quarterly)', 'Strong cryptography (TLS 1.2+)'],
    scope: 'Payments / fintech',
    docsUrl: 'https://www.pcisecuritystandards.org/document_library/',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.1)',
  },
  NIST: {
    id: 'NIST',
    name: 'NIST CSF',
    fullName: 'NIST Cybersecurity Framework',
    description: 'Voluntary US framework of standards and best practices for managing cybersecurity risk. Structured around five functions: Identify, Protect, Detect, Respond, Recover. Widely adopted as a baseline.',
    keyRequirements: ['Asset inventory (Identify)', 'Access control policies (Protect)', 'Anomaly detection (Detect)', 'Incident response plan (Respond)'],
    scope: 'US critical infrastructure & federal contractors',
    docsUrl: 'https://www.nist.gov/cyberframework',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.1)',
  },
  FedRAMP: {
    id: 'FedRAMP',
    name: 'FedRAMP',
    fullName: 'Federal Risk and Authorization Management Program',
    description: 'US government program providing a standardised approach to security assessment, authorisation, and monitoring of cloud services used by federal agencies. Based on NIST 800-53 controls.',
    keyRequirements: ['Authority to Operate (ATO)', 'Continuous monitoring (ConMon)', 'FIPS 140-2 encryption', 'NIST 800-53 control baseline'],
    scope: 'Cloud services sold to US federal agencies',
    docsUrl: 'https://www.fedramp.gov/understanding-fedramp/',
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.1)',
  },
}

export const COMPLIANCE_OPTIONS = Object.keys(COMPLIANCE_DETAILS)

export const DATA_CLASSIFICATIONS = ['public', 'internal', 'confidential', 'restricted']

export const TRUST_TIERS = ['org-verified', 'community', 'experimental', 'sandbox']

export function getProvider(id: string): ProviderOption | undefined {
  return PROVIDERS.find(p => p.id === id)
}

export function getModel(providerId: string, modelId: string): ModelOption | undefined {
  return getProvider(providerId)?.models.find(m => m.id === modelId)
}

export function getCompliance(id: string): ComplianceDetail | undefined {
  return COMPLIANCE_DETAILS[id]
}
