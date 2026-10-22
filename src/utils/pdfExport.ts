import { jsPDF } from 'jspdf';
import { Dispatch } from '../types/dispatch.js';

export function exportDispatchManifestPdf(dispatch: Dispatch) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('DISPATCHBRIDGE ENTERPRISE', margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('OFFICIAL B2B DISPATCH MANIFEST & WAYBILL', margin + 6, y + 18);

  // Dispatch Number & Status Badge in Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text(dispatch.dispatchNumber, pageWidth - margin - 6, y + 11, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`STATUS: ${dispatch.status.replace(/_/g, ' ')}`, pageWidth - margin - 6, y + 18, { align: 'right' });

  y += 29;

  // Metadata Bar
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('DISPATCH DATE:', margin + 4, y + 6);
  doc.text('ISSUED BY:', margin + 65, y + 6);
  doc.text('CARRIER / VEHICLE:', margin + 125, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const dispDate = new Date(dispatch.dispatchedAt).toLocaleString();
  doc.text(dispDate, margin + 4, y + 11);
  doc.text(`${dispatch.senderName} (${dispatch.senderBusinessName})`, margin + 65, y + 11);
  doc.text(`${dispatch.driverName || 'Standard Freight'} ${dispatch.vehicleReg ? `[${dispatch.vehicleReg}]` : ''}`, margin + 125, y + 11);

  y += 18;

  // Two Column Box: Origin & Destination Snapshots
  const boxWidth = (contentWidth - 6) / 2;
  const boxHeight = 36;

  // Origin Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229); // indigo
  doc.text('1. ORIGIN LOADING TERMINAL', margin + 4, y + 6);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(dispatch.originLocationSnapshot.label || 'Origin Terminal', margin + 4, y + 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const originLines = doc.splitTextToSize(dispatch.originLocationSnapshot.address || 'Standard Warehouse Dock', boxWidth - 8);
  doc.text(originLines, margin + 4, y + 19);

  // Destination Box
  const destX = margin + boxWidth + 6;
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(destX, y, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text('2. RECEIVING DESTINATION PARTNER', destX + 4, y + 6);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(dispatch.destinationSnapshot.partnerName || dispatch.partnerName, destX + 4, y + 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const destLines = doc.splitTextToSize(dispatch.destinationSnapshot.address || 'Partner Receiving Facility', boxWidth - 8);
  doc.text(destLines, destX + 4, y + 19);
  doc.text(`Contact: ${dispatch.destinationSnapshot.contactPerson || 'Dock Manager'} (${dispatch.destinationSnapshot.phone || 'N/A'})`, destX + 4, y + 31);

  y += boxHeight + 6;

  // Cargo Line Items Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CARGO MANIFEST ITEMS', margin, y + 4);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Dispatched: ${dispatch.totalQuantityDispatched} Units across ${dispatch.lines.length} Line(s)`, pageWidth - margin, y + 4, { align: 'right' });

  y += 7;

  // Table Headers
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  const colX = {
    num: margin + 3,
    sku: margin + 14,
    desc: margin + 48,
    unit: margin + 115,
    sent: margin + 135,
    recv: margin + 155,
    condition: margin + 172,
  };

  doc.text('#', colX.num, y + 5);
  doc.text('SKU / CODE', colX.sku, y + 5);
  doc.text('DESCRIPTION', colX.desc, y + 5);
  doc.text('UNIT', colX.unit, y + 5);
  doc.text('SENT', colX.sent, y + 5);
  doc.text('RECV', colX.recv, y + 5);
  doc.text('STATUS', colX.condition, y + 5);

  y += 7;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  dispatch.lines.forEach((line, index) => {
    // Check if new page needed
    if (y > 245) {
      doc.addPage();
      y = margin;
    }

    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 7, margin + contentWidth, y + 7);

    doc.setTextColor(71, 85, 105);
    doc.text(String(line.ordinal || index + 1), colX.num, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(line.sku, colX.sku, y + 5);

    doc.setFont('helvetica', 'normal');
    const descText = line.itemName.length > 38 ? line.itemName.substring(0, 36) + '...' : line.itemName;
    doc.text(descText, colX.desc, y + 5);

    doc.setTextColor(71, 85, 105);
    doc.text(line.unit || 'units', colX.unit, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(line.quantitySent), colX.sent, y + 5);

    const recvText = line.quantityReceived !== undefined ? String(line.quantityReceived) : '-';
    doc.text(recvText, colX.recv, y + 5);

    // Condition indicator
    if (line.condition === 'DAMAGED' || (line.lossQty && line.lossQty > 0)) {
      doc.setTextColor(225, 29, 72); // rose
      doc.text(`${line.condition || 'LOSS'} (${line.lossQty || 0})`, colX.condition, y + 5);
    } else if (line.quantityReceived !== undefined) {
      doc.setTextColor(16, 185, 129); // emerald
      doc.text(line.condition || 'GOOD', colX.condition, y + 5);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('PENDING', colX.condition, y + 5);
    }

    y += 7;
  });

  y += 4;

  // Notes / Instructions
  if (dispatch.notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('SPECIAL DISPATCH INSTRUCTIONS:', margin, y + 4);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    const notesLines = doc.splitTextToSize(dispatch.notes, contentWidth);
    doc.text(notesLines, margin, y + 8);
    y += (notesLines.length * 4) + 6;
  }

  // Receiver Sign-off and Delivery Verification Section
  if (y > 230) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('RECEIVING DOCK VERIFICATION & SIGNOFF', margin + 4, y + 7);

  if (dispatch.receiverSignoff) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129);
    doc.text('CONFIRMED & SIGNED BY RECEIVER', margin + 4, y + 14);

    doc.setTextColor(15, 23, 42);
    doc.text(`Signer Name: ${dispatch.receiverSignoff.signerName}`, margin + 4, y + 21);
    doc.text(`Role / Title: ${dispatch.receiverSignoff.signerRole}`, margin + 4, y + 27);
    doc.text(`Signed Timestamp: ${new Date(dispatch.receiverSignoff.signedAt).toLocaleString()}`, margin + 4, y + 33);

    if (dispatch.receiverSignoff.comments) {
      doc.text(`Comments: ${dispatch.receiverSignoff.comments}`, margin + 90, y + 21);
    }
  } else {
    // Blank signoff lines for physical pen signoff if offline
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Receiver Printed Name: ________________________________', margin + 4, y + 17);
    doc.text('Signature: __________________________________________', margin + 4, y + 26);
    doc.text('Date & Time: ________________________________________', margin + 4, y + 33);

    doc.text('Receiver Badge / ID: _________________________________', margin + 95, y + 17);
    doc.text('Dock Seal Intact?  [  ] YES   [  ] NO', margin + 95, y + 26);
    doc.text('Damages / Shortfalls Noted?  [  ] YES   [  ] NO', margin + 95, y + 33);
  }

  y += 44;

  // Footer / Cryptographic Verification Token
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 280, pageWidth - margin, 280);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `DispatchBridge Kernel Manifest • Share Token: ${dispatch.shareToken} • Version: ${dispatch.version} • Printed: ${new Date().toUTCString()}`,
    margin,
    284
  );
  doc.text('Page 1 of 1', pageWidth - margin, 284, { align: 'right' });

  // Save the PDF
  const filename = `Manifest_${dispatch.dispatchNumber}.pdf`;
  doc.save(filename);
}
