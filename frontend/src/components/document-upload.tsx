"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, DocumentItem } from "@/lib/api";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "sonner";

export function DocumentUpload({ onUploaded }: { onUploaded?: () => void }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch {
      toast.error("Failed to load documents");
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadDocument(file);
        toast.success(`Uploaded ${file.name}`);
      }
      await loadDocuments();
      onUploaded?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteDocument(id);
      toast.success("Document deleted");
      await loadDocuments();
    } catch {
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Upload PDF, DOCX, or PPTX files to use as source material for question generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".pdf,.docx,.pptx";
              input.multiple = true;
              input.onchange = () => handleUpload(input.files);
              input.click();
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploading && <LoadingSpinner className="h-6 w-6 text-primary" />}
              <p className="text-sm font-medium">
                {uploading ? "Processing document..." : "Drop files here or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX up to 50MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Documents ({documents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{doc.filename}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{doc.file_type.toUpperCase()}</Badge>
                        <Badge variant="outline">{doc.language.toUpperCase()}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {doc.processed_chunks.length} chunks
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
