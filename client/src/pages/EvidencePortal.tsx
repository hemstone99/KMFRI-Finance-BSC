import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, Download, Trash2, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function EvidencePortal() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    kpiDataId: null,
    assignmentId: null,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: documents, isLoading, refetch } = trpc.evidence.list.useQuery({ kpiDataId: null, assignmentId: null });
  const uploadMutation = trpc.evidence.upload.useMutation();
  const deleteMutation = trpc.evidence.delete.useMutation();

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/jpeg", "image/png"];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 50MB limit");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("File type not supported. Please upload PDF, Word, Excel, or Image files.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.description) {
      toast.error("Please select a file and add a description");
      return;
    }

    setIsUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileData = event.target?.result as string;
          
          await uploadMutation.mutateAsync({
            fileName: selectedFile.name,
            fileUrl: fileData, // In production, this would be uploaded to S3
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            description: formData.description,
            kpiDataId: formData.kpiDataId,
            assignmentId: formData.assignmentId,
          });

          toast.success("Document uploaded successfully");
          setFormData({ description: "", kpiDataId: null, assignmentId: null });
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          setOpenDialog(false);
          refetch();
        } catch (error: any) {
          toast.error(error.message || "Failed to upload document");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      toast.error(error.message || "Failed to process file");
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Document deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete document");
    }
  };

  const handleDownload = (doc: any) => {
    try {
      // If fileUrl is a data URL, download directly
      if (doc.fileUrl?.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = doc.fileUrl;
        link.download = doc.fileName;
        link.click();
        toast.success("Download started");
      } else {
        // Otherwise open in new tab
        window.open(doc.fileUrl, "_blank");
      }
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("word") || fileType.includes("document")) return "📝";
    if (fileType.includes("sheet") || fileType.includes("excel")) return "📊";
    return "📎";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Evidence Portal</h1>
          <p className="text-gray-600 mt-1">Upload and manage supporting documents for KPI submissions</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Evidence Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select File</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : "Click to select or drag and drop"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel, or Images (Max 50MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the document and its relevance to KPI submission"
                  rows={4}
                />
              </div>

              <Button
                onClick={handleUpload}
                disabled={isUploading || !selectedFile}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isUploading ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents?.filter((d: any) => d.status === "ACTIVE").length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(documents?.reduce((sum: number, d: any) => sum + (d.fileSize || 0), 0) || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Evidence Documents</CardTitle>
          <CardDescription>All uploaded supporting documents</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : documents && documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="border rounded-lg p-4 flex items-start justify-between hover:bg-gray-50 transition">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-3xl">{getFileIcon(doc.fileType)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{doc.fileName}</h3>
                      <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">{formatFileSize(doc.fileSize || 0)}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <Badge className={doc.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{doc.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-600 hover:text-blue-700"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No documents uploaded yet</div>
          )}
        </CardContent>
      </Card>

      {/* Upload Guidelines */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertCircle className="w-5 h-5" /> Upload Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>• Upload clear, legible documents that support your KPI submissions</p>
          <p>• Accepted formats: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Images (JPG, PNG)</p>
          <p>• Maximum file size: 50 MB per document</p>
          <p>• Ensure documents are properly labeled and dated</p>
          <p>• Include relevant metadata and descriptions for easy reference</p>
          <p>• Keep original copies for audit purposes</p>
        </CardContent>
      </Card>
    </div>
  );
}
