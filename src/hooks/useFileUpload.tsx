import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export function useFileUpload(
  accept: string[] = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
  maxSize: number = 10 * 1024 * 1024
) {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!accept.some(type => type === '*' || file.type === type || (type.endsWith('/*') && file.type.startsWith(type.slice(0, -1))))) {
      return `Invalid file type. Allowed: ${accept.join(', ')}`;
    }
    if (file.size === 0) return 'File is empty';
    if (file.size > maxSize) {
      return `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`;
    }
    return null;
  }, [accept, maxSize]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const newErrors: Record<string, string> = {};
    const validFiles: File[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors[file.name] = error;
      } else {
        validFiles.push(file);
      }
    });

    setErrors(prev => ({ ...prev, ...newErrors }));
    setFiles(prev => [...prev, ...validFiles]);
  }, [validateFile]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (files[index]?.name === key) delete newErrors[key];
      });
      return newErrors;
    });
  }, [files]);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setErrors({});
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }, [addFiles]);

  return {
    files,
    errors,
    isDragging,
    fileInputRef,
    addFiles,
    removeFile,
    clearFiles,
    openFileDialog,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    validateFile,
  };
}

export function useImagePreview(file: File | null) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [file]);

  return preview;
}

export function useImageTransform() {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const zoomIn = useCallback(() => setZoom(z => Math.min(z * 1.2, 5)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(z / 1.2, 0.1)), []);
  const resetZoom = useCallback(() => setZoom(1), []);
  const rotate = useCallback((deg: number = 90) => setRotation(r => (r + deg) % 360), []);
  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, []);

  const transformStyle = useMemo(() => ({
    transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
    transformOrigin: 'center center',
  }), [pan, rotation, zoom]);

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
