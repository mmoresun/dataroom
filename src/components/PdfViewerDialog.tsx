import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FileNode } from '@/lib/db/schema';
import { getFileBlob } from '@/lib/store/repository';
import { holdViewLock } from '@/lib/store/viewLock';

interface PdfViewerDialogProps {
  file: FileNode | null;
  onOpenChange: (open: boolean) => void;
}

export function PdfViewerDialog({ file, onOpenChange }: PdfViewerDialogProps) {
  return (
    <Dialog open={file !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[95vw] flex-col sm:max-w-4xl">
        {/* Keyed by file id so the blob is (re)loaded fresh for each file, and the previous object URL is revoked. */}
        {file && <PdfViewerBody key={file.id} file={file} />}
      </DialogContent>
    </Dialog>
  );
}

function PdfViewerBody({ file }: { file: FileNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    void getFileBlob(file.id).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        setError('This file could not be loaded.');
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id]);

  // Hold a cross-tab "in use" lock for as long as this file is open in the viewer,
  // so another tab can't delete it out from under this one. Released automatically
  // on unmount, and by the browser itself if this tab closes or crashes.
  useEffect(() => holdViewLock(file.id), [file.id]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="truncate">{file.name}</DialogTitle>
      </DialogHeader>
      <div className="min-h-0 flex-1 rounded-md border border-border bg-muted">
        {error && <p className="p-4 text-sm text-muted-foreground">{error}</p>}
        {url && <iframe src={url} title={file.name} className="size-full rounded-md" />}
      </div>
    </>
  );
}
