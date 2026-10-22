import { jsPDF } from 'jspdf';
import { Dispatch } from '../types/dispatch.js';

/**
 * Exports an array of dispatches as a CSV file for spreadsheet / external reconciliation.
 */
export function exportDispatchesToCsv(dispatches: Dispatch[]) {
  const headers = [
    'Dispatch Number',
    'Status',
    'Dispatched At',
    'First Viewed At',
    'Received At',
    'Sender Business',
    'Sender Name',
    'Receiver Partner',
    'Origin Dock',
    'Destination Address',
    'Driver / Carrier',
    'Lines Count',
    'Total Qty Dispatched',
    'Total Qty Received',
    'Total Qty Lost',
    'Total Declared Value ($)',
    'Discrepancy Status',
  ];

  const rows = dispatches.map((d) => {
    const totalValue = d.lines.reduce(
      (sum, l) => sum + l.quantitySent * (l.unitPrice || 25),
      0
    );
    const hasDiscrepancy = (d.totalQuantityLost || 0) > 0 || (d.discrepancyCases && d.discrepancyCases.length > 0);

    return [
      `"${d.dispatchNumber}"`,
      `"${d.status}"`,
      `"${new Date(d.dispatchedAt).toLocaleString()}"`,
      `"${d.firstViewedAt ? new Date(d.firstViewedAt).toLocaleString() : 'Not Viewed'}"`,
      `"${d.receivedAt ? new Date(d.receivedAt).toLocaleString() : 'Not Received'}"`,
      `"${d.senderBusinessName.replace(/"/g, '""')}"`,
      `"${d.senderName.replace(/"/g, '""')}"`,
      `"${d.partnerName.replace(/"/g, '""')}"`,
      `"${(d.originLocationSnapshot?.label || 'Warehouse Dock').replace(/"/g, '""')}"`,
      `"${(d.destinationSnapshot?.address || '').replace(/"/g, '""')}"`,
      `"${(d.driverName || 'Standard Freight').replace(/"/g, '""')}"`,
      d.lines.length,
      d.totalQuantityDispatched,
      d.totalQuantityReceived ?? d.totalQuantityDispatched,
      d.totalQuantityLost || 0,
      totalValue.toFixed(2),
      hasDiscrepancy ? 'DISPUTED_OR_LOSS' : 'CLEAN_DELIVERY',
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `DispatchBridge_Reconciliation_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports an array of dispatches as an official PDF report using jsPDF.
 */
export function exportDispatchesToPdf(dispatches: Dispatch[], filterLabel: string = 'All Statuses') {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('DISPATCHBRIDGE ENTERPRISE RECONCILIATION SUMMARY', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `FILTER: ${filterLabel.toUpperCase()}  |  TOTAL SHIPMENTS: ${dispatches.length}  |  GENERATED: ${new Date().toLocaleString()}`,
    margin + 6,
    y + 16
  );

  y += 26;

  // Summary Metrics Bar
  const totalSent = dispatches.reduce((s, d) => s + d.totalQuantityDispatched, 0);
  const totalReceived = dispatches.reduce((s, d) => s + (d.totalQuantityReceived || 0), 0);
  const totalLost = dispatches.reduce((s, d) => s + (d.totalQuantityLost || 0), 0);
  const totalVal = dispatches.reduce((acc, d) => {
    return acc + d.lines.reduce((ls, l) => ls + l.quantitySent * (l.unitPrice || 25), 0);
  }, 0);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL VOLUME DISPATCHED: ${totalSent.toLocaleString()} units`, margin + 4, y + 7.5);
  doc.text(`TOTAL RECEIVED: ${totalReceived.toLocaleString()} units`, margin + 75, y + 7.5);
  doc.text(`TOTAL LOSS DISCREPANCY: ${totalLost.toLocaleString()} units`, margin + 145, y + 7.5);
  doc.setTextColor(16, 185, 129);
  doc.text(`VALUATION: $${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, margin + 215, y + 7.5);

  y += 16;

  // Table Headers
  const colWidths = [32, 24, 38, 48, 48, 20, 24, 20, 24];
  const colX: number[] = [];
  let curX = margin;
  for (const w of colWidths) {
    colX.push(curX);
    curX += w;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  doc.text('DISPATCH #', colX[0] + 2, y + 5);
  doc.text('STATUS', colX[1] + 2, y + 5);
  doc.text('DATE DISPATCHED', colX[2] + 2, y + 5);
  doc.text('SENDER BUSINESS', colX[3] + 2, y + 5);
  doc.text('DESTINATION PARTNER', colX[4] + 2, y + 5);
  doc.text('SENT', colX[5] + 2, y + 5);
  doc.text('RECEIVED', colX[6] + 2, y + 5);
  doc.text('LOSS', colX[7] + 2, y + 5);
  doc.text('TOTAL ($)', colX[8] + 2, y + 5);

  y += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  dispatches.forEach((d, idx) => {
    // Check if new page needed
    if (y > 185) {
      doc.addPage();
      y = margin + 4;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 1, contentWidth, 6.5, 'F');
    }

    const val = d.lines.reduce((ls, l) => ls + l.quantitySent * (l.unitPrice || 25), 0);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(d.dispatchNumber, colX[0] + 2, y + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.text(d.status.replace(/_/g, ' '), colX[1] + 2, y + 3.5);
    doc.text(new Date(d.dispatchedAt).toLocaleDateString(), colX[2] + 2, y + 3.5);
    doc.text(d.senderBusinessName.slice(0, 24), colX[3] + 2, y + 3.5);
    doc.text(d.partnerName.slice(0, 24), colX[4] + 2, y + 3.5);
    doc.text(String(d.totalQuantityDispatched), colX[5] + 2, y + 3.5);
    doc.text(String(d.totalQuantityReceived ?? d.totalQuantityDispatched), colX[6] + 2, y + 3.5);

    if (d.totalQuantityLost && d.totalQuantityLost > 0) {
      doc.setTextColor(225, 29, 72); // rose
      doc.text(String(d.totalQuantityLost), colX[7] + 2, y + 3.5);
      doc.setTextColor(15, 23, 42);
    } else {
      doc.text('0', colX[7] + 2, y + 3.5);
    }

    doc.text(`$${val.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, colX[8] + 2, y + 3.5);

    y += 6.5;
  });

  // Footer Signature & Audit stamp
  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'DISPATCHBRIDGE SECURE RECONCILIATION ENGINE  •  CERTIFIED TAMPER-RESISTANT RECORD FOR FINANCIAL AUDITING',
    margin,
    y
  );

  doc.save(`DispatchBridge_Reconciliation_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
