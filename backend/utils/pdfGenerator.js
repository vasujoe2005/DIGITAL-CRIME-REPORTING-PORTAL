const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');

class FIRPDFGenerator {
  constructor() {
    this.doc = new jsPDF();
  }

  generateFIR(complaint, officer, adminNotes = []) {
    const doc = this.doc;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRST INFORMATION REPORT (FIR)', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Police Station: ' + (officer?.postingSite || 'N/A'), 20, 35);
    doc.text('FIR No: ' + complaint._id.toString().slice(-8).toUpperCase(), pageWidth - 20, 35, { align: 'right' });
    doc.text('Date: ' + new Date().toLocaleDateString(), 20, 45);
    doc.text('Time: ' + new Date().toLocaleTimeString(), pageWidth - 20, 45, { align: 'right' });

    let yPosition = 60;

    // Case Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CASE INFORMATION', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const caseInfo = [
      ['Type of Crime:', complaint.type],
      ['Date of Incident:', new Date(complaint.date).toLocaleDateString()],
      ['Time of Incident:', complaint.time],
      ['Location:', complaint.location],
      ['Nearest Landmark:', complaint.nearestLandmark || 'N/A'],
      ['Status:', complaint.status],
      ['Reported By:', complaint.anonymous ? 'Anonymous' : (complaint.reporter?.fullName || 'N/A')],
      ['Assigned Officer:', officer?.fullName || 'N/A'],
      ['Officer Badge No:', officer?.badgeNumber || 'N/A']
    ];

    doc.autoTable({
      startY: yPosition,
      head: [],
      body: caseInfo,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 120 }
      }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Description
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INCIDENT DESCRIPTION', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const descriptionLines = doc.splitTextToSize(complaint.description, pageWidth - 40);
    doc.text(descriptionLines, 20, yPosition);
    yPosition += descriptionLines.length * 5 + 10;

    // Victim Details
    if (complaint.victimDetails && complaint.victimDetails.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('VICTIM DETAILS', 20, yPosition);
      yPosition += 10;

      const victimData = complaint.victimDetails.map(victim => [
        victim.name || 'N/A',
        victim.age || 'N/A',
        victim.gender || 'N/A',
        victim.contact || 'N/A',
        victim.address || 'N/A'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Name', 'Age', 'Gender', 'Contact', 'Address']],
        body: victimData,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Accused Details
    if (complaint.accusedDetails && complaint.accusedDetails.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ACCUSED DETAILS', 20, yPosition);
      yPosition += 10;

      const accusedData = complaint.accusedDetails.map(accused => [
        accused.name || 'N/A',
        accused.age || 'N/A',
        accused.gender || 'N/A',
        accused.contact || 'N/A',
        accused.address || 'N/A',
        accused.description || 'N/A'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Name', 'Age', 'Gender', 'Contact', 'Address', 'Description']],
        body: accusedData,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [192, 57, 43], textColor: 255 },
        columnStyles: {
          5: { cellWidth: 40 }
        }
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Case Updates/Investigation Notes
    if (complaint.updates && complaint.updates.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INVESTIGATION UPDATES', 20, yPosition);
      yPosition += 10;

      const updateData = complaint.updates.map(update => [
        new Date(update.createdAt).toLocaleString(),
        update.type.toUpperCase(),
        update.note,
        update.status
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Date & Time', 'Type', 'Note', 'Status']],
        body: updateData,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2, valign: 'top' },
        headStyles: { fillColor: [44, 62, 80], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 20 },
          2: { cellWidth: 80 },
          3: { cellWidth: 25 }
        }
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Admin Notes
    if (adminNotes && adminNotes.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ADMINISTRATIVE NOTES', 20, yPosition);
      yPosition += 10;

      const adminData = adminNotes.map(note => [
        new Date(note.createdAt).toLocaleString(),
        note.note
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Date & Time', 'Note']],
        body: adminData,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2, valign: 'top' },
        headStyles: { fillColor: [142, 68, 173], textColor: 255 }
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Evidence Summary
    if (complaint.evidence && complaint.evidence.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('EVIDENCE SUMMARY', 20, yPosition);
      yPosition += 10;

      const evidenceData = complaint.evidence.map(evidence => [
        evidence.filename,
        (evidence.size / 1024).toFixed(2) + ' KB',
        evidence.mimetype
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['File Name', 'Size', 'Type']],
        body: evidenceData,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [52, 73, 94], textColor: 255 }
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Footer
    const footerY = pageHeight - 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a system-generated FIR report. For official use only.', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Generated on: ' + new Date().toLocaleString(), pageWidth / 2, footerY + 5, { align: 'center' });

    // Officer Signature
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Investigating Officer: ___________________________', 20, footerY + 15);
    doc.text('Signature: ___________________________', pageWidth - 120, footerY + 15);

    return doc;
  }

  getBuffer() {
    return this.doc.output('arraybuffer');
  }

  save(filename) {
    this.doc.save(filename);
  }
}

module.exports = FIRPDFGenerator;
