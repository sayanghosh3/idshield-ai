import { useSyncExternalStore } from 'react';
import { caseRepository } from '../services/caseRepository';
export function useCases() { return useSyncExternalStore(caseRepository.subscribe, caseRepository.getSnapshot, caseRepository.getSnapshot); }

