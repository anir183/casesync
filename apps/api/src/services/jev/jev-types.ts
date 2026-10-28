export interface JevCaseRef {
  reference: string
  bureau: string
  institution_id: string
  category?: string
  description?: string
  status: string
}

export interface JevState {
  task: string
  case_a: JevCaseRef
  case_b: JevCaseRef
}

export interface JevChoiceQuestion {
  type: 'choice'
  instructions: string
  criteria: Record<string, string>
}

export interface JevNoulQuestion {
  type: 'noul'
  instructions: string
}

export interface JevRequest {
  model: string
  state: JevState
  questions: Record<string, JevChoiceQuestion | JevNoulQuestion>
}

export interface JevChoiceAnswer {
  type: 'choice'
  choice: string
  probabilities?: Record<string, number>
  confidence?: number
}

export interface JevNoulAnswer {
  type: 'noul'
  noul: number
}

export interface JevResponse {
  model?: string
  answers: Record<string, JevChoiceAnswer | JevNoulAnswer>
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}
