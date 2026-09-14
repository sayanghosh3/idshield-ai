import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';

import documentService from '../services/documentService';
import type { DocumentFile } from '../types';


// ============================================================
// TYPES
// ============================================================

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}


// ============================================================
// FILE UPLOAD HOOK
// ============================================================

export function useFileUpload(
  accept: string[] = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/pdf',
  ],
  maxSize: number = 10 * 1024 * 1024
) {
  // Files selected in the browser
  const [files, setFiles] = useState<File[]>([]);

  // Validation/upload errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);

  // Backend upload state
  const [isUploading, setIsUploading] = useState(false);

  // Successfully uploaded files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null);


  // ============================================================
  // VALIDATE FILE
  // ============================================================

  const validateFile = useCallback(
    (file: File): string | null => {
      const isAccepted = accept.some(
        (type) =>
          type === '*' ||
          file.type === type ||
          file.type.startsWith(type.replace('*', ''))
      );

      if (!isAccepted) {
        return `Invalid file type. Allowed: ${accept.join(', ')}`;
      }

      if (file.size > maxSize) {
        return `File too large. Maximum size: ${
          maxSize / (1024 * 1024)
        }MB`;
      }

      return null;
    },
    [accept, maxSize]
  );


  // ============================================================
  // ADD FILES
  // ============================================================

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      const newErrors: Record<string, string> = {};
      const validFiles: File[] = [];

      fileArray.forEach((file) => {
        const error = validateFile(file);

        if (error) {
          newErrors[file.name] = error;
        } else {
          validFiles.push(file);
        }
      });

      setErrors((prev) => ({
        ...prev,
        ...newErrors,
      }));

      setFiles((prev) => [
        ...prev,
        ...validFiles,
      ]);
    },
    [validateFile]
  );


  // ============================================================
  // REMOVE FILE
  // ============================================================

  const removeFile = useCallback(
    (index: number) => {
      const fileToRemove = files[index];

      setFiles((prev) =>
        prev.filter((_, i) => i !== index)
      );

      if (fileToRemove) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[fileToRemove.name];
          return next;
        });
      }
    },
    [files]
  );


  // ============================================================
  // CLEAR FILES
  // ============================================================

  const clearFiles = useCallback(() => {
    setFiles([]);
    setErrors({});
    setUploadedFiles([]);
  }, []);


  // ============================================================
  // UPLOAD FILES TO BACKEND
  // ============================================================

  const uploadSelectedFiles = useCallback(
    async (): Promise<UploadedFile[]> => {
      if (files.length === 0) {
        return [];
      }

      setIsUploading(true);

      const successfulUploads: UploadedFile[] = [];

      try {
        for (const file of files) {
          try {
            const uploaded: DocumentFile =
              await documentService.uploadDocument(file);

            const uploadedFile: UploadedFile = {
              id: uploaded.id,
              name: uploaded.name,
              size: uploaded.size,
              type: uploaded.type,
              uploadedAt: uploaded.uploadedAt.toISOString(),
            };

            successfulUploads.push(uploadedFile);

            setUploadedFiles((prev) => [
              ...prev,
              uploadedFile,
            ]);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Upload failed';

            setErrors((prev) => ({
              ...prev,
              [file.name]: message,
            }));
          }
        }

        return successfulUploads;
      } finally {
        setIsUploading(false);
      }
    },
    [files]
  );


  // ============================================================
  // OPEN FILE DIALOG
  // ============================================================

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);


  // ============================================================
  // DRAG OVER
  // ============================================================

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
    },
    []
  );


  // ============================================================
  // DRAG LEAVE
  // ============================================================

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(false);
    },
    []
  );


  // ============================================================
  // DROP
  // ============================================================

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );


  // ============================================================
  // FILE INPUT CHANGE
  // ============================================================

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);

        // Allows selecting the same file again
        e.target.value = '';
      }
    },
    [addFiles]
  );


  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Selected browser files
    files,

    // Successfully uploaded backend files
    uploadedFiles,

    // Errors
    errors,

    // State
    isDragging,
    isUploading,

    // Input
    fileInputRef,

    // File management
    addFiles,
    removeFile,
    clearFiles,

    // Backend upload
    uploadSelectedFiles,

    // File dialog
    openFileDialog,

    // Drag and drop
    handleDragOver,
    handleDragLeave,
    handleDrop,

    // File input
    handleFileSelect,

    // Validation
    validateFile,
  };
}


// ============================================================
// IMAGE PREVIEW
// ============================================================

export function useImagePreview(file: File | null) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);

    setPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return preview;
}


// ============================================================
// IMAGE TRANSFORMATION
// ============================================================

export function useImageTransform() {
  const [zoom, setZoom] = useState(1);

  const [rotation, setRotation] = useState(0);

  const [pan, setPan] = useState({
    x: 0,
    y: 0,
  });


  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.2, 5));
  }, []);


  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.2, 0.1));
  }, []);


  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);


  const rotate = useCallback(
    (deg: number = 90) => {
      setRotation((r) => (r + deg) % 360);
    },
    []
  );


  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);

    setPan({
      x: 0,
      y: 0,
    });
  }, []);


  const transformStyle = useMemo(
    () => ({
      transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
      transformOrigin: 'center center',
    }),
    [pan, rotation, zoom]
  );


  return {
    zoom,
    rotation,
    pan,

    setPan,

    zoomIn,
    zoomOut,
    resetZoom,

    rotate,
    resetTransform,

    transformStyle,
  };
}