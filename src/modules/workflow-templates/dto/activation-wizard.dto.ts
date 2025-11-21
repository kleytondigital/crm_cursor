export interface ActivationWizardStep {
  step: number
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  details?: any
}

export interface ActivationWizardResult {
  success: boolean
  steps: ActivationWizardStep[]
  error?: string
  connectedAt?: Date
}

