import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Download, FileText, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ExportReports() {
  const { user } = useAuth();
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [selectedReport, setSelectedReport] = useState("kpi");
  const [isExporting, setIsExporting] = useState(false);

  const { data: kpiReport } = trpc.export.kpiReport.useQuery({ format: exportFormat });
  const { data: dashboardReport } = trpc.export.dashboardReport.useQuery({ format: exportFormat });

  const generateExcel = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      // Dynamically import xlsx
      const XLSX = require("xlsx");
      
      // Create a new workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      
      // Set column widths
      const colWidths = Object.keys(data[0]).map(() => 20);
      ws["!cols"] = colWidths.map((w) => ({ wch: w }));
      
      // Write file
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success(`${filename} exported successfully as Excel`);
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to export as Excel. Please try PDF format.");
    }
  };

  const generatePDF = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ margin: 40 });
      
      // Create a blob stream
      const chunks: any[] = [];
      doc.on("data", (chunk: any) => chunks.push(chunk));
      doc.on("end", () => {
        const blob = new Blob(chunks, { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(`${filename} exported successfully as PDF`);
      });

      // Add title
      doc.fontSize(16).font("Helvetica-Bold").text(filename, { underline: true });
      doc.moveDown();
      
      // Add timestamp
      doc.fontSize(10).font("Helvetica").text(`Generated: ${new Date().toLocaleString()}`, { color: "#666" });
      doc.moveDown();
      
      // Add table
      const headers = Object.keys(data[0]);
      const colWidth = (doc.page.width - 80) / headers.length;
      
      // Header row
      doc.fontSize(9).font("Helvetica-Bold");
      headers.forEach((header, i) => {
        doc.text(header, 40 + i * colWidth, doc.y, { width: colWidth, align: "left" });
      });
      doc.moveDown();
      
      // Data rows
      doc.fontSize(8).font("Helvetica");
      data.slice(0, 100).forEach((row) => {
        headers.forEach((header, i) => {
          const value = String(row[header] || "").substring(0, 30);
          doc.text(value, 40 + i * colWidth, doc.y, { width: colWidth, align: "left" });
        });
        doc.moveDown(0.5);
      });
      
      if (data.length > 100) {
        doc.fontSize(8).text(`... and ${data.length - 100} more records`, { color: "#999" });
      }
      
      doc.end();
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export as PDF. Please try Excel format.");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (selectedReport === "kpi" && kpiReport) {
        if (exportFormat === "excel") {
          generateExcel(kpiReport.data, "KPI_Report");
        } else {
          generatePDF(kpiReport.data, "KPI_Report");
        }
      } else if (selectedReport === "dashboard" && dashboardReport) {
        const dashData = Array.isArray(dashboardReport.data) ? dashboardReport.data : [dashboardReport.data];
        if (exportFormat === "excel") {
          generateExcel(dashData, "Dashboard_Report");
        } else {
          generatePDF(dashData, "Dashboard_Report");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Export Reports</h1>
        <p className="text-gray-600 mt-1">Download your KPI and performance reports in PDF or Excel format</p>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Settings</CardTitle>
          <CardDescription>Select report type and format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Report Type</label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kpi">KPI Performance Report</SelectItem>
                  <SelectItem value="dashboard">Dashboard Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Export Format</label>
              <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleExport} disabled={isExporting} className="w-full bg-blue-600 hover:bg-blue-700">
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" /> Export Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> KPI Performance Report
            </CardTitle>
            <CardDescription>Your assigned KPIs and performance data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Includes:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• KPI names and targets</li>
                <li>• Actual values submitted</li>
                <li>• Performance periods</li>
                <li>• Current status</li>
                <li>• BSC perspective classification</li>
              </ul>
            </div>
            <Badge className="w-fit bg-blue-100 text-blue-800">
              {kpiReport?.data?.length || 0} records
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Dashboard Summary
            </CardTitle>
            <CardDescription>Organization-wide KPI statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Includes:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Total KPIs in system</li>
                <li>• Total assignments</li>
                <li>• Approved submissions</li>
                <li>• Performance metrics</li>
                <li>• System overview</li>
              </ul>
            </div>
            <Badge className="w-fit bg-green-100 text-green-800">
              Summary Report
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>Recently exported reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Export history will appear here after your first download</p>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-900">Export Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 space-y-2">
          <p>• PDF format is ideal for printing and sharing with stakeholders</p>
          <p>• Excel format allows further analysis and customization in spreadsheet applications</p>
          <p>• Reports are generated with current data at the time of export</p>
          <p>• Include export date and your name when sharing reports</p>
          <p>• Keep backups of important reports for audit purposes</p>
        </CardContent>
      </Card>
    </div>
  );
}
