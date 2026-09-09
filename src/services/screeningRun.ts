import type { ScreeningCase, ScreeningStep } from '../types/screening.ts';
import { STEP_ORDER, withoutResults, hasCompleteResult } from '../utils/screeningStatus.ts';
export class SkippedStep extends Error {}
export function waitForStep(signal: AbortSignal, milliseconds = 800): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); clearTimeout(timer); reject(new DOMException('Screening cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}
export type StepOperation = (step: ScreeningStep, record: ScreeningCase, signal: AbortSignal) => Promise<Partial<ScreeningCase>>;
const resultField = { extraction: 'ocrResult', validation: 'validationResult', forensics: 'tamperingResult', face_verification: 'faceResult', risk_assessment: 'riskResult' } as const;
export function createScreeningRunner() {
  let active: { controller: AbortController; cancel: () => void } | null = null;
  return {
    cancel() { active?.cancel(); },
    async run(record: ScreeningCase, operation: StepOperation, onUpdate: (record: ScreeningCase) => void): Promise<ScreeningCase> {
      if (active) throw new Error('A screening is already running');
      const controller = new AbortController();
      let current = { ...withoutResults(record), status: 'processing' as ScreeningCase['status'] };
      let settled = false;
      const publish = () => onUpdate({ ...current, stepStatuses: { ...current.stepStatuses! } });
      const stop = (failed: boolean) => {
        if (settled) return;
        settled = true;
        const statuses = { ...current.stepStatuses! };
        for (const step of STEP_ORDER) {
          if (statuses[step] === 'processing') statuses[step] = failed ? 'failed' : 'skipped';
          else if (statuses[step] === 'pending') statuses[step] = 'skipped';
        }
        if (failed && statuses[current.currentStep] === 'completed') statuses[current.currentStep] = 'failed';
        current = { ...current, status: failed ? 'failed' : 'incomplete', stepStatuses: statuses, riskResult: undefined, riskScore: null, riskLevel: 'unknown', completedAt: undefined, updatedAt: new Date() };
        publish();
      };
      const run = { controller, cancel: () => { controller.abort(); stop(false); } };
      active = run;
      try {
        publish();
        for (const step of STEP_ORDER) {
          if (controller.signal.aborted) break;
          current = { ...current, currentStep: step, stepStatuses: { ...current.stepStatuses!, [step]: 'processing' } };
          publish();
          const patch = await operation(step, current, controller.signal);
          if (controller.signal.aborted || settled) break;
          if (step in resultField && !patch[resultField[step as keyof typeof resultField]]) throw new SkippedStep('No result available for ' + step);
          // A stage can update only its own output; it cannot change identity or later evidence.
          const output = step in resultField ? { [resultField[step as keyof typeof resultField]]: patch[resultField[step as keyof typeof resultField]] } : {};
          current = { ...current, ...output,
            evidence: step === 'result' ? patch.evidence : current.evidence,
            documents: step === 'upload' ? patch.documents ?? current.documents : current.documents,
            stepStatuses: { ...current.stepStatuses!, [step]: 'completed' }, updatedAt: new Date() };
          publish();
        }
        if (!settled && !controller.signal.aborted) {
          if (!current.riskResult || !STEP_ORDER.every(step => current.stepStatuses?.[step] === 'completed')) throw new SkippedStep('Screening is incomplete');
          current = { ...current, status: 'completed', riskScore: current.riskResult.score, riskLevel: current.riskResult.level, completedAt: new Date() };
          if (!hasCompleteResult(current)) throw new Error('Invalid final risk result');
          settled = true; publish();
        }
        return current;
      } catch (error) {
        stop(!(error instanceof SkippedStep) && !controller.signal.aborted);
        if (controller.signal.aborted) return current;
        throw error;
      } finally { if (active === run) active = null; }
    },
  };
}
