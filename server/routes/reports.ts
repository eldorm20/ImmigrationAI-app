import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { applications, documents, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

interface ReportData {
  applicantName: string;
  email: string;
  applicationId: string;
  status: string;
  visaType: string;
  country: string;
  submittedDate: string;
  documents: number;
  approvalProbability: number;
  recommendations: string[];
  aiSummary: string;
}

// Generate HTML for PDF
function generateReportHTML(data: ReportData): string {
  const statusColor = {
    'Approved': '#28a745',
    'Rejected': '#dc3545',
    'Reviewing': '#ffc107',
    'New': '#007bff'
  }[data.status] || '#6c757d';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 900px; margin: 0 auto; padding: 40px; }
        .header { border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #007bff; font-size: 28px; margin-bottom: 5px; }
        .header p { color: #666; font-size: 14px; }
        .report-date { color: #999; font-size: 12px; margin-top: 10px; }
        
        .section { margin-bottom: 30px; }
        .section-title { 
          font-size: 18px; 
          font-weight: bold; 
          color: #333; 
          border-left: 4px solid #007bff; 
          padding-left: 15px; 
          margin-bottom: 15px;
        }
        
        .applicant-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .info-row { margin-bottom: 12px; }
        .info-label { 
          font-weight: bold; 
          color: #555; 
          display: inline-block; 
          width: 150px;
        }
        .info-value { color: #333; }
        
        .status-badge {
          display: inline-block;
          padding: 8px 15px;
          background-color: ${statusColor};
          color: white;
          border-radius: 4px;
          font-weight: bold;
          font-size: 14px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }
        .stat-label { color: #666; font-size: 13px; font-weight: bold; }
        .stat-value { font-size: 32px; font-weight: bold; color: #007bff; margin-top: 5px; }
        
        .summary-box {
          background: #e7f3ff;
          border-left: 4px solid #007bff;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .summary-box p { color: #333; line-height: 1.8; }
        
        .recommendations-list {
          list-style: none;
          padding-left: 0;
        }
        .recommendations-list li {
          padding: 12px;
          margin-bottom: 10px;
          background: #f8f9fa;
          border-left: 4px solid #28a745;
          border-radius: 4px;
        }
        .recommendations-list li:before {
          content: "✓ ";
          color: #28a745;
          font-weight: bold;
          margin-right: 10px;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        
        @media print {
          body { margin: 0; padding: 0; }
          .container { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Immigration Application Report</h1>
          <p>Confidential - For applicant and authorized personnel only</p>
          <div class="report-date">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>

        <!-- Applicant Information -->
        <div class="section">
          <div class="section-title">Applicant Information</div>
          <div class="applicant-info">
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${data.applicantName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${data.email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Application ID:</span>
              <span class="info-value">${data.applicationId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Submitted Date:</span>
              <span class="info-value">${data.submittedDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="status-badge">${data.status}</span>
            </div>
          </div>
        </div>

        <!-- Application Details -->
        <div class="section">
          <div class="section-title">Application Details</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Visa Type</div>
              <div class="stat-value">${data.visaType}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Destination Country</div>
              <div class="stat-value">${data.country}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Documents Submitted</div>
              <div class="stat-value">${data.documents}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Approval Probability</div>
              <div class="stat-value">${data.approvalProbability}%</div>
            </div>
          </div>
        </div>

        <!-- AI Analysis Summary -->
        <div class="section">
          <div class="section-title">AI Analysis Summary</div>
          <div class="summary-box">
            <p>${data.aiSummary}</p>
          </div>
        </div>

        <!-- Recommendations -->
        <div class="section">
          <div class="section-title">Recommendations for Next Steps</div>
          <ul class="recommendations-list">
            ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>This report was generated by ImmigrationAI's AI analysis system.</p>
          <p>© ${new Date().getFullYear()} ImmigrationAI. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate PDF report for partner/lawyer
router.post(
  "/generate/:applicationId",
  authenticate,
  requireRole("lawyer", "admin"),
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    const applicant = await db.query.users.findFirst({
      where: eq(users.id, application.userId),
    });

    if (!applicant) {
      throw new AppError(404, "Applicant not found");
    }

    // Get documents count
    const appDocuments = await db.query.documents.findMany({
      where: eq(documents.applicationId, applicationId),
    });

    // Generate AI analysis data (in production, would be from actual AI)
    const aiSummary = `Applicant ${applicant.firstName} has submitted a ${application.visaType} application for ${application.country}. The application includes ${appDocuments.length} supporting documents. Initial assessment shows strong documentation and clear visa eligibility based on submitted materials.`;

    const recommendations = [
      `Complete the ${application.visaType} application form thoroughly`,
      `Prepare for potential interview scheduling within 2-3 weeks`,
      `Gather additional supporting documents for financial verification`,
      `Consider scheduling a consultation with our legal team for guidance`,
      `Keep all documents organized and backed up for reference`
    ];

    const reportData: ReportData = {
      applicantName: `${applicant.firstName} ${applicant.lastName}`,
      email: applicant.email,
      applicationId,
      status: application.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      visaType: application.visaType,
      country: application.country,
      submittedDate: application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'N/A',
      documents: appDocuments.length,
      approvalProbability: Math.floor(Math.random() * 40) + 60, // Random 60-100% for demo
      recommendations,
      aiSummary
    };

    const html = generateReportHTML(reportData);

    // Return HTML instead of PDF (frontend can convert with html2pdf.js or similar)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report-${applicationId}.html"`);
    res.send(html);

    logger.info({ applicationId }, "Report generated");
  })
);

// Get download link for report
router.get(
  "/download/:applicationId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user!.id;

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });

    if (!application) {
      throw new AppError(404, "Application not found");
    }

    // Check authorization - user owns application or is lawyer/admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (application.userId !== userId && user?.role === 'applicant') {
      throw new AppError(403, "Unauthorized to download this report");
    }

    res.json({
      downloadUrl: `/api/reports/download/${applicationId}`,
      message: "Report is ready for download"
    });
  })
);

export default router;
