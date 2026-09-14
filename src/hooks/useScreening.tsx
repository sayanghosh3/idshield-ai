import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  ReactNode,
} from 'react';

import {
  ScreeningCase,
  ScreeningStep,
  ScreeningStatus,
  DocumentFile,
  OCRResult,
  ValidationResult,
  TamperingResult,
  FaceVerificationResult,
  RiskResult,
  AuditEvent,
} from '../types';

interface ScreeningState {
  currentCase: ScreeningCase | null;
  uploadedDocuments: DocumentFile[];
  extractedData: OCRResult | null;
  validationResults: ValidationResult | null;
  tamperingResults: TamperingResult | null;
  faceResults: FaceVerificationResult | null;
  riskResult: RiskResult | null;
  auditEvents: AuditEvent[];
  screeningStatus: ScreeningStatus;
  currentStep: ScreeningStep;
  progress: number;
  progressMessage: string;
  error: string | null;
}

type ScreeningAction =
  | {
      type: 'SET_CURRENT_CASE';
      payload: ScreeningCase | null;
    }
  | {
      type: 'SET_UPLOADED_DOCUMENTS';
      payload: DocumentFile[];
    }
  | {
      type: 'ADD_DOCUMENT';
      payload: DocumentFile;
    }
  | {
      type: 'REMOVE_DOCUMENT';
      payload: string;
    }
  | {
      type: 'SET_EXTRACTED_DATA';
      payload: OCRResult | null;
    }
  | {
      type: 'SET_VALIDATION_RESULTS';
      payload: ValidationResult | null;
    }
  | {
      type: 'SET_TAMPERING_RESULTS';
      payload: TamperingResult | null;
    }
  | {
      type: 'SET_FACE_RESULTS';
      payload: FaceVerificationResult | null;
    }
  | {
      type: 'SET_RISK_RESULT';
      payload: RiskResult | null;
    }
  | {
      type: 'ADD_AUDIT_EVENT';
      payload: AuditEvent;
    }
  | {
      type: 'SET_AUDIT_EVENTS';
      payload: AuditEvent[];
    }
  | {
      type: 'SET_SCREENING_STATUS';
      payload: ScreeningStatus;
    }
  | {
      type: 'SET_CURRENT_STEP';
      payload: ScreeningStep;
    }
  | {
      type: 'SET_PROGRESS';
      payload: {
        progress: number;
        message: string;
      };
    }
  | {
      type: 'SET_ERROR';
      payload: string | null;
    }
  | {
      type: 'RESET_SCREENING';
    }
  | {
      type: 'LOAD_DEMO_SCENARIO';
      payload: ScreeningCase;
    };

const initialState: ScreeningState = {
  currentCase: null,
  uploadedDocuments: [],
  extractedData: null,
  validationResults: null,
  tamperingResults: null,
  faceResults: null,
  riskResult: null,
  auditEvents: [],
  screeningStatus: 'draft',
  currentStep: 'upload',
  progress: 0,
  progressMessage: '',
  error: null,
};

function screeningReducer(
  state: ScreeningState,
  action: ScreeningAction
): ScreeningState {
  switch (action.type) {
    case 'SET_CURRENT_CASE':
      return {
        ...state,
        currentCase: action.payload,
      };

    case 'SET_UPLOADED_DOCUMENTS':
      return {
        ...state,
        uploadedDocuments: action.payload,
      };

    case 'ADD_DOCUMENT':
      return {
        ...state,
        uploadedDocuments: [
          ...state.uploadedDocuments,
          action.payload,
        ],
      };

    case 'REMOVE_DOCUMENT':
      return {
        ...state,
        uploadedDocuments: state.uploadedDocuments.filter(
          (document) => document.id !== action.payload
        ),
      };

    case 'SET_EXTRACTED_DATA':
      return {
        ...state,
        extractedData: action.payload,
      };

    case 'SET_VALIDATION_RESULTS':
      return {
        ...state,
        validationResults: action.payload,
      };

    case 'SET_TAMPERING_RESULTS':
      return {
        ...state,
        tamperingResults: action.payload,
      };

    case 'SET_FACE_RESULTS':
      return {
        ...state,
        faceResults: action.payload,
      };

    case 'SET_RISK_RESULT':
      return {
        ...state,
        riskResult: action.payload,
      };

    case 'ADD_AUDIT_EVENT':
      return {
        ...state,
        auditEvents: [
          ...state.auditEvents,
          action.payload,
        ],
      };

    case 'SET_AUDIT_EVENTS':
      return {
        ...state,
        auditEvents: action.payload,
      };

    case 'SET_SCREENING_STATUS':
      return {
        ...state,
        screeningStatus: action.payload,
      };

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };

    case 'SET_PROGRESS':
      return {
        ...state,
        progress: action.payload.progress,
        progressMessage: action.payload.message,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'RESET_SCREENING':
      return initialState;

    case 'LOAD_DEMO_SCENARIO':
      return {
        ...state,
        currentCase: action.payload,
        uploadedDocuments: action.payload.documents,
        extractedData: action.payload.ocrResult || null,
        validationResults: action.payload.validationResult || null,
        tamperingResults: action.payload.tamperingResult || null,
        faceResults: action.payload.faceResult || null,
        riskResult: action.payload.riskResult || null,
        screeningStatus: action.payload.status,
        currentStep: action.payload.currentStep,
        progress: 100,
        progressMessage: 'Demo scenario loaded',
        error: null,
      };

    default:
      return state;
  }
}

interface ScreeningContextType extends ScreeningState {
  setCurrentCase: (caseData: ScreeningCase | null) => void;
  setUploadedDocuments: (documents: DocumentFile[]) => void;
  addDocument: (document: DocumentFile) => void;
  removeDocument: (documentId: string) => void;
  setExtractedData: (data: OCRResult | null) => void;
  setValidationResults: (
    results: ValidationResult | null
  ) => void;
  setTamperingResults: (
    results: TamperingResult | null
  ) => void;
  setFaceResults: (
    results: FaceVerificationResult | null
  ) => void;
  setRiskResult: (result: RiskResult | null) => void;
  addAuditEvent: (event: AuditEvent) => void;
  setAuditEvents: (events: AuditEvent[]) => void;
  setScreeningStatus: (status: ScreeningStatus) => void;
  setCurrentStep: (step: ScreeningStep) => void;
  setProgress: (
    progress: number,
    message: string
  ) => void;
  setError: (error: string | null) => void;
  resetScreening: () => void;
  loadDemoScenario: (
    scenarioCase: ScreeningCase
  ) => void;
}

const ScreeningContext =
  createContext<ScreeningContextType | undefined>(undefined);

export function ScreeningProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    screeningReducer,
    initialState
  );

  const actions = useMemo(
    () => ({
      setCurrentCase: (
        payload: ScreeningCase | null
      ) =>
        dispatch({
          type: 'SET_CURRENT_CASE',
          payload,
        }),

      setUploadedDocuments: (
        payload: DocumentFile[]
      ) =>
        dispatch({
          type: 'SET_UPLOADED_DOCUMENTS',
          payload,
        }),

      addDocument: (
        payload: DocumentFile
      ) =>
        dispatch({
          type: 'ADD_DOCUMENT',
          payload,
        }),

      removeDocument: (
        payload: string
      ) =>
        dispatch({
          type: 'REMOVE_DOCUMENT',
          payload,
        }),

      setExtractedData: (
        payload: OCRResult | null
      ) =>
        dispatch({
          type: 'SET_EXTRACTED_DATA',
          payload,
        }),

      setValidationResults: (
        payload: ValidationResult | null
      ) =>
        dispatch({
          type: 'SET_VALIDATION_RESULTS',
          payload,
        }),

      setTamperingResults: (
        payload: TamperingResult | null
      ) =>
        dispatch({
          type: 'SET_TAMPERING_RESULTS',
          payload,
        }),

      setFaceResults: (
        payload: FaceVerificationResult | null
      ) =>
        dispatch({
          type: 'SET_FACE_RESULTS',
          payload,
        }),

      setRiskResult: (
        payload: RiskResult | null
      ) =>
        dispatch({
          type: 'SET_RISK_RESULT',
          payload,
        }),

      addAuditEvent: (
        payload: AuditEvent
      ) =>
        dispatch({
          type: 'ADD_AUDIT_EVENT',
          payload,
        }),

      setAuditEvents: (
        payload: AuditEvent[]
      ) =>
        dispatch({
          type: 'SET_AUDIT_EVENTS',
          payload,
        }),

      setScreeningStatus: (
        payload: ScreeningStatus
      ) =>
        dispatch({
          type: 'SET_SCREENING_STATUS',
          payload,
        }),

      setCurrentStep: (
        payload: ScreeningStep
      ) =>
        dispatch({
          type: 'SET_CURRENT_STEP',
          payload,
        }),

      setProgress: (
        progress: number,
        message: string
      ) =>
        dispatch({
          type: 'SET_PROGRESS',
          payload: {
            progress,
            message,
          },
        }),

      setError: (
        payload: string | null
      ) =>
        dispatch({
          type: 'SET_ERROR',
          payload,
        }),

      resetScreening: () =>
        dispatch({
          type: 'RESET_SCREENING',
        }),

      loadDemoScenario: (
        payload: ScreeningCase
      ) =>
        dispatch({
          type: 'LOAD_DEMO_SCENARIO',
          payload,
        }),
    }),
    []
  );

  return (
    <ScreeningContext.Provider
      value={{
        ...state,
        ...actions,
      }}
    >
      {children}
    </ScreeningContext.Provider>
  );
}

export function useScreening() {
  const context = useContext(ScreeningContext);

  if (!context) {
    throw new Error(
      'useScreening must be used within a ScreeningProvider'
    );
  }

  return context;
}