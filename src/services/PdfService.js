const PDFDocument = require('pdfkit');
const path = require('path');

function generatePDF(formData) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        const margin = 50;
        const pageWidth = doc.page.width - 2 * margin;

        // Header Image (assumes imagePath is correct and image exists)
        const imagePath = path.join("public", "img", "LOGO BCL H.png");
        doc.image(imagePath, margin, 40, { width: 100 });

        // Document Title
        doc.fontSize(18)
           .font('Times-Bold')
           .text('Solicitud de Descuento', margin, 150, { align: 'center' })
           .moveDown(2);

        // Divider Line
        doc.moveTo(margin, 200)
           .lineTo(pageWidth + margin, 200)
           .stroke()
           .moveDown(2);

        // Meta Information
        doc.fontSize(10)
           .font('Times-Roman')
           .text(`Fecha: ${formData.requestDate}`, margin, 210)
           .text(`Folio: ${formData.requestFolio}`, pageWidth + margin - 160, 210, { align: 'right' })
           .text(`Nombre del Cliente: ${formData.nameClient}`, margin, 225)
           .text(`Descuento: ${formData.discountReason}`, margin, 240)
           .text(`Motivo del Descuento: ${formData.discountDescription}`, margin, 255)
           .text(`Solicitante: ${formData.applicantName}`, margin, 270)
           .text(`Monto Total del Descuento: ${formData.totalDiscountAmount}`, margin, 285)
           .moveDown(2);

        // Divider Line after Meta
        doc.moveTo(margin, 300)
           .lineTo(pageWidth + margin, 300)
           .stroke()
           .moveDown(2);

        // Items
        let yPos = 300;
        const numItems = parseInt(formData.numItems);
        const columnWidths = [50, 220, 100, 90, 90]; // Define el ancho de las columnas
        const tableHeader = ['Partida', 'Descripción', 'UPC', '% Descuento', 'Monto'];
        const cellHeight = 40; // Aumenta la altura de la celda para dar más espacio al texto
        
        // Dibuja los encabezados de la tabla
        doc.fontSize(12)
           .font('Times-Bold');
        tableHeader.forEach((header, i) => {
            doc.text(header, margin + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), yPos, { width: columnWidths[i], align: 'center' });
        });
        
        yPos += cellHeight;
        
        // Dibuja las líneas de la tabla
        for (let i = 1; i <= numItems; i++) {
            let xOffset = margin;
            doc.fontSize(10)
               .font('Times-Roman');
        
            // Ajusta el interlineado si es necesario
            doc.text('', xOffset, yPos).lineGap(4);
        
            // Dibuja las celdas de la fila
            doc.rect(xOffset, yPos, columnWidths[0], cellHeight).stroke();
            doc.text(i.toString(), xOffset + 5, yPos + 5, { width: columnWidths[0] - 10 });
            xOffset += columnWidths[0];
        
            doc.rect(xOffset, yPos, columnWidths[1], cellHeight).stroke();
            doc.text(formData['productDescription' + i], xOffset + 5, yPos + 5, { width: columnWidths[1] - 10 });
            xOffset += columnWidths[1];
        
            doc.rect(xOffset, yPos, columnWidths[2], cellHeight).stroke();
            doc.text(formData['upc' + i], xOffset + 5, yPos + 5, { width: columnWidths[2] - 10 });
            xOffset += columnWidths[2];
        
            doc.rect(xOffset, yPos, columnWidths[3], cellHeight).stroke();
            doc.text(`${formData['discountPercentage' + i]}%`, xOffset + 5, yPos + 5, { width: columnWidths[3] - 10 });
            xOffset += columnWidths[3];
        
            doc.rect(xOffset, yPos, columnWidths[4], cellHeight).stroke();
            doc.text(formData['discountAmount' + i].toString(), xOffset + 5, yPos + 5, { width: columnWidths[4] - 10 });
        
            yPos += cellHeight + 10; // Incrementa la posición en Y para la siguiente fila y añade un espacio adicional
        }
        

        doc.end();
    });
}

module.exports = generatePDF;
