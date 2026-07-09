import { useState, type DragEvent, type ReactNode } from 'react';

interface UploadDropzoneProps {
  onFilesDropped: (files: FileList) => void;
  children: ReactNode;
}

/** Wraps folder contents in a drop target so PDFs can be dragged in directly from the OS. */
export function UploadDropzone({ onFilesDropped, children }: UploadDropzoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files.length > 0) onFilesDropped(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`min-h-64 flex-1 rounded-lg border-2 border-dashed p-2 transition-colors ${
        isDraggingOver ? 'border-primary bg-accent/50' : 'border-transparent'
      }`}
    >
      {children}
    </div>
  );
}
