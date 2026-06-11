const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');

const exportToCSV = (transactions) => {
  const data = transactions.map((t, index) => ({
    '#': index + 1,
    'Date': new Date(t.date).toLocaleDateString(),
    'Type': t.type,
    'Amount (Rs)': t.amount,
    'Category': t.category,
    'Description': t.description || '',
    'Recurring': t.isRecurring ? 'Yes' : 'No',
    'Tags': t.tags ? t.tags.join(', ') : '',
    'Extracted From': t.extractedFrom || 'manual'
  }));

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
};

const exportToPDF = (transactions, userName = 'User') => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Header
    doc.fontSize(20).text('Ledger App — Financial Statement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Statement generated for: ${userName}`, { align: 'left' });
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'left' });
    doc.moveDown(2);

    // Table Header
    const tableTop = 200;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Date', 50, tableTop);
    doc.text('Type', 120, tableTop);
    doc.text('Amount (Rs)', 180, tableTop);
    doc.text('Category', 260, tableTop);
    doc.text('Description', 360, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table Body
    let y = tableTop + 25;
    doc.font('Helvetica');

    transactions.forEach((t) => {
      if (y > 700) {
        doc.addPage();
        y = 50; // reset y on new page
      }
      doc.text(new Date(t.date).toLocaleDateString(), 50, y);
      doc.text(t.type, 120, y);
      doc.text(t.amount.toFixed(2), 180, y);
      doc.text(t.category, 260, y);
      doc.text(t.description ? t.description.substring(0, 30) : '', 360, y);
      y += 20;
    });

    doc.end();
  });
};

module.exports = { exportToCSV, exportToPDF };
