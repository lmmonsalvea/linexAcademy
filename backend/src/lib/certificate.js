const PDFDocument = require('pdfkit');

// Streams a landscape A4 completion certificate straight into `res`.
// Visual design ported from courses_service/index.js (old prototype),
// rebranded "Linex Academy" and taking a resolved display name instead of
// a raw email/uid.
function renderCertificate(res, { studentName, courseTitle, courseId }) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="certificado-${courseId}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
  doc.pipe(res);

  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#DDE1FF');
  doc.fillColor('#17153B').fontSize(20).font('Helvetica-Bold').text('Linex', 50, 50, { continued: true });
  doc.fillColor('#5B5CFF').text(' Academy');
  doc.fillColor('#17153B').fontSize(30).font('Helvetica-Bold')
    .text('Certificado de finalización', 0, 160, { align: 'center' });
  doc.fontSize(16).font('Helvetica')
    .text('Este certificado acredita que', 0, 220, { align: 'center' });
  doc.fontSize(22).font('Helvetica-Bold')
    .text(studentName, 0, 250, { align: 'center' });
  doc.fontSize(16).font('Helvetica')
    .text('completó satisfactoriamente el curso', 0, 290, { align: 'center' });
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#5B5CFF')
    .text(courseTitle, 0, 320, { align: 'center' });
  doc.fillColor('#17153B').fontSize(12).font('Helvetica')
    .text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`, 0, doc.page.height - 100, { align: 'center' });

  doc.end();
}

module.exports = { renderCertificate };
