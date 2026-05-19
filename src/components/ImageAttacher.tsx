"use client";

import { useRef } from "react";
import { Paperclip, X } from "lucide-react";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageAttacher({ images, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newImages = await Promise.all(
      Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .map(fileToBase64)
    );
    onChange([...images, ...newImages]);
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`attachment ${i + 1}`}
                className="h-24 w-24 object-cover rounded border border-gray-200 cursor-pointer"
                onClick={() => window.open(src, "_blank")}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-md px-3 py-2 hover:border-gray-400 transition-colors"
      >
        <Paperclip className="w-3.5 h-3.5" />
        Attach screenshots
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="text-[11px] text-gray-400">
        You can also paste screenshots directly into the notes field (Ctrl+V / Cmd+V)
      </p>
    </div>
  );
}
