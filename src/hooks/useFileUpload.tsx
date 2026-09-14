import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';

import documentService from '../services/documentService';

import type {
  DocumentFile,
  DocumentType,
} from '../types';


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
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  // Backend upload state
  const [isUploading, setIsUploading] = useState(false);

  // Successfully uploaded backend files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

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
          file.type.startsWith(
            type.replace('*', '')
          )
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

      setErrors((previous) => ({
        ...previous,
        ...newErrors,
      }));

      setFiles((previous) => [
        ...previous,
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

      setFiles((previous) =>
        previous.filter(
          (_, currentIndex) =>
            currentIndex !== index
        )
      );

      if (fileToRemove) {
        setErrors((previous) => {
          const next = { ...previous };
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
  // UPLOAD SELECTED FILES
  // ============================================================

  const uploadSelectedFiles = useCallback(
    async (
      documentType: DocumentType = 'passport'
    ): Promise<UploadedFile[]> => {
      if (files.length === 0) {
        return [];
      }

      setIsUploading(true);

      const successfulUploads: UploadedFile[] = [];

      try {
        for (const file of files) {
          try {
            const uploaded: DocumentFile =
              await documentService.uploadDocument(
                file,
                documentType
              );

            const uploadedFile: UploadedFile = {
              id: uploaded.id,
              name: uploaded.name,
              size: uploaded.size,
              type: uploaded.type,
              uploadedAt:
                uploaded.uploadedAt.toISOString(),
            };

            successfulUploads.push(uploadedFile);

            setUploadedFiles((previous) => [
              ...previous,
              uploadedFile,
            ]);

          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Upload failed';

            setErrors((previous) => ({
              ...previous,
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
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragging(true);
    },
    []
  );


  // ============================================================
  // DRAG LEAVE
  // ============================================================

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragging(false);
    },
    []
  );


  // ============================================================
  // DROP
  // ============================================================

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragging(false);

      if (event.dataTransfer.files.length > 0) {
        addFiles(event.dataTransfer.files);
      }
    },
    [addFiles]
  );


  // ============================================================
  // FILE INPUT
  // ============================================================

  const handleFileSelect = useCallback(
    (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      if (event.target.files) {
        addFiles(event.target.files);

        // Allows selecting the same file again.
        event.target.value = '';
      }
    },
    [addFiles]
  );


  // ============================================================
  // RETURN
  // ============================================================

  return {
    files,
    uploadedFiles,
    errors,

    isDragging,
    isUploading,

    fileInputRef,

    addFiles,
    removeFile,
    clearFiles,

    uploadSelectedFiles,

    openFileDialog,

    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,

    validateFile,
  };
}


// ============================================================
// IMAGE PREVIEW
// ============================================================

export function useImagePreview(
  file: File | null
) {
  const [preview, setPreview] =
    useState<string | null>(null);

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
// IMAGE TRANSFORM
// ============================================================

export function useImageTransform() {
  const [zoom, setZoom] = useState(1);

  const [rotation, setRotation] = useState(0);

  const [pan, setPan] = useState({
    x: 0,
    y: 0,
  });


  const zoomIn = useCallback(() => {
    setZoom((value) =>
      Math.min(value * 1.2, 5)
    );
  }, []);


  const zoomOut = useCallback(() => {
    setZoom((value) =>
      Math.max(value / 1.2, 0.1)
    );
  }, []);


  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);


  const rotate = useCallback(
    (degrees: number = 90) => {
      setRotation(
        (value) =>
          (value + degrees) % 360
      );
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
      transform:
        `translate(${pan.x}px, ${pan.y}px) ` +
        `rotate(${rotation}deg) ` +
        `scale(${zoom})`,

      transformOrigin:
        'center center',
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
