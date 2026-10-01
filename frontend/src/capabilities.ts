export type EvidenceClassification = 'Current' | 'Target' | 'Blocked';

export interface CapabilityEvidence {
  classification: EvidenceClassification;
  statement: string;
}

export const capabilityMatrix = [
  {
    name: 'Platform',
    availability: 'Available',
    mode: 'Backend runtime',
    evidence: { classification: 'Current', statement: 'Health and capability endpoints exist.' }
  },
  {
    name: 'Library',
    availability: 'Runtime-dependent',
    mode: 'Backend when configured; local mock in this shell',
    evidence: { classification: 'Current', statement: 'Backend Library implementation is preserved.' }
  },
  {
    name: 'Frontend',
    availability: 'Available',
    mode: 'Local application',
    evidence: { classification: 'Current', statement: 'This React application is running locally.' }
  },
  {
    name: 'Recognition',
    availability: 'Unavailable',
    mode: 'Deferred',
    evidence: { classification: 'Blocked', statement: 'No approved model or inference contract exists.' }
  },
  {
    name: 'Learning',
    availability: 'Prototype only',
    mode: 'Local/mock',
    evidence: { classification: 'Target', statement: 'Durable learning remains gated by product and contract decisions.' }
  }
] satisfies ReadonlyArray<{
  name: string;
  availability: string;
  mode: string;
  evidence: CapabilityEvidence;
}>;
