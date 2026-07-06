import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Upload, Download, CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BulkImport() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const bulkImportMutation = trpc.kpis.bulkImport.useMutation();

  if (user?.roleId !== 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Only ADFA can perform bulk imports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setSelectedFile(file);
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split("\n").filter((line) => line.trim());
        
        if (lines.length < 2) {
          toast.error("CSV must have header and at least one data row");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const expectedHeaders = ["kpi name", "perspective", "target value", "period", "assigned to"];

        // Validate headers
        const hasRequiredHeaders = expectedHeaders.every((h) => headers.includes(h));
        if (!hasRequiredHeaders) {
          toast.error(`CSV must include columns: ${expectedHeaders.join(", ")}`);
          return;
        }

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          if (!values[0]) continue;

          const headerMap: { [key: string]: number } = {};
          headers.forEach((h, idx) => {
            headerMap[h] = idx;
          });

          rows.push({
            kpiName: values[headerMap["kpi name"]] || "",
            perspective: values[headerMap["perspective"]] || "",
            targetValue: values[headerMap["target value"]] || "",
            period: values[headerMap["period"]] || "",
            assignedTo: values[headerMap["assigned to"]] || "",
            notes: values[headerMap["notes"]] || "",
          });
        }

        if (rows.length === 0) {
          toast.error("No valid data rows found");
          return;
        }

        setParsedRows(rows);
        setShowPreview(true);
        toast.success(`Parsed ${rows.length} KPI rows`);
      } catch (error) {
        toast.error(`Failed to parse CSV: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      toast.error("No rows to import");
      return;
    }

    try {
      const result = await bulkImportMutation.mutateAsync({ rows: parsedRows });
      
      setImportResults(result);
      toast.success(`Import complete: ${result.successCount} succeeded, ${result.failureCount} failed`);
      
      if (result.errors.length > 0) {
        const errorMsg = result.errors.slice(0, 3).join("\n");
        toast.error(`Some errors occurred:\n${errorMsg}`);
      }

      if (result.successCount > 0) {
        setParsedRows([]);
        setShowPreview(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error(`Import failed: ${(error as Error).message}`);
    }
  };

  const downloadTemplate = () => {
    const template = `KPI Name,Perspective,Target Value,Period,Assigned To,Notes
Revenue Growth,FINANCIAL,15%,Q1 2026,John Doe,Expected growth from new markets
Customer Satisfaction,CUSTOMER,90%,Q1 2026,Jane Smith,Net Promoter Score target
Process Efficiency,INTERNAL,85%,Q1 2026,Bob Johnson,Operational efficiency improvement
Employee Development,LEARNING,80%,Q1 2026,Alice Brown,Training completion rate`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kpi_bulk_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bulk KPI Import</h1>
        <p className="text-gray-600 mt-1">Import multiple KPIs at once via CSV file</p>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <p>1. Download the CSV template below</p>
          <p>2. Fill in your KPI data with the required columns</p>
          <p>3. Ensure the "Assigned To" names match existing user names in the system</p>
          <p>4. Upload the CSV file and review the preview</p>
          <p>5. Click "Import" to create all KPIs and assignments</p>
        </CardContent>
      </Card>

      {/* Upload Section */}
      {!showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>Select your CSV file to import KPIs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-lg font-medium text-gray-900">
                {selectedFile ? selectedFile.name : "Click to select or drag and drop"}
              </p>
              <p className="text-sm text-gray-600 mt-1">CSV format only</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".csv"
              onChange={handleFileSelect}
            />

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" /> Download Template
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" /> Select File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {showPreview && parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Preview</CardTitle>
            <CardDescription>{parsedRows.length} KPIs ready to import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">KPI Name</th>
                    <th className="px-4 py-2 text-left font-semibold">Perspective</th>
                    <th className="px-4 py-2 text-left font-semibold">Target</th>
                    <th className="px-4 py-2 text-left font-semibold">Period</th>
                    <th className="px-4 py-2 text-left font-semibold">Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{row.kpiName}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{row.perspective}</Badge>
                      </td>
                      <td className="px-4 py-2">{row.targetValue}</td>
                      <td className="px-4 py-2">{row.period}</td>
                      <td className="px-4 py-2">{row.assignedTo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 10 && (
              <p className="text-xs text-gray-600 text-center">... and {parsedRows.length - 10} more rows</p>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleImport}
                disabled={bulkImportMutation.isPending}
                className="gap-2"
              >
                {bulkImportMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Import KPIs
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setParsedRows([]);
                  setShowPreview(false);
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>Summary of the import operation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Successful</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{importResults.successCount}</p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-900">Warnings</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{importResults.warningCount || 0}</p>
              </div>

              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-900">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{importResults.failureCount || 0}</p>
              </div>
            </div>

            {importResults.errors && importResults.errors.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="space-y-1">
                    {importResults.errors.slice(0, 5).map((error: string, idx: number) => (
                      <div key={idx} className="text-sm">{error}</div>
                    ))}
                    {importResults.errors.length > 5 && (
                      <div className="text-sm">... and {importResults.errors.length - 5} more errors</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={() => {
              setImportResults(null);
              setParsedRows([]);
              setShowPreview(false);
              setSelectedFile(null);
            }} className="w-full">
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* CSV Format Guide */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> CSV Format Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-3">
          <div>
            <p className="font-semibold mb-2">Required Columns:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>KPI Name</strong> - Unique name of the KPI</li>
              <li><strong>Perspective</strong> - FINANCIAL, CUSTOMER, INTERNAL, or LEARNING</li>
              <li><strong>Target Value</strong> - Numeric target (e.g., 15%, 1000000)</li>
              <li><strong>Period</strong> - Fiscal period (e.g., Q1 2026)</li>
              <li><strong>Assigned To</strong> - Name of existing user in system</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Optional Columns:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Notes</strong> - Additional context or comments</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Assignee names must match existing users exactly</li>
              <li>Use uppercase perspective names</li>
              <li>Maximum 1000 records per import</li>
              <li>Duplicate KPI names will reuse existing KPIs</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
