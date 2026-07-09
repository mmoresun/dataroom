import { useRef } from 'react';
import { FolderPlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  onCreateFolderClick: () => void;
  onFilesSelected: (files: FileList) => void;
}

export function Toolbar({ onCreateFolderClick, onFilesSelected }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onCreateFolderClick}>
        <FolderPlus className="size-4" />
        New folder
      </Button>
      <Button onClick={() => fileInputRef.current?.click()}>
        <Upload className="size-4" />
        Upload PDF
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFilesSelected(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
