import mongoose, { Schema, type Document } from 'mongoose'

export const JOB_RUN_STATUS = {
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const

export const JOB_TRIGGER = {
  SCHEDULED: 'SCHEDULED',
  MANUAL: 'MANUAL',
} as const

export interface IJobRun extends Document {
  jobName: string
  trigger: string
  status: string
  startedAt: Date
  finishedAt?: Date
  counts?: Record<string, unknown>
  error?: string
}

const JobRunSchema = new Schema<IJobRun>(
  {
    jobName: { type: String, required: true },
    trigger: { type: String, enum: Object.values(JOB_TRIGGER), required: true },
    status: { type: String, enum: Object.values(JOB_RUN_STATUS), required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    counts: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { timestamps: false },
)

JobRunSchema.index({ jobName: 1, startedAt: -1 })

export const JobRun = mongoose.model<IJobRun>('JobRun', JobRunSchema, 'job_runs')
