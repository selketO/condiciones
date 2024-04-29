const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Suponiendo que las condiciones comerciales no cambiarán con cada llamada, puedes cargarlas una vez al inicio.
const condicionesComercialesPath = path.join(__dirname, '..', '..', 'condiciones_comerciales.json');
const condicionesComerciales = JSON.parse(fs.readFileSync(condicionesComercialesPath, 'utf8'));

const createExcel = async (records) => {
  let workbook = new ExcelJS.Workbook();
  let worksheet = workbook.addWorksheet('Datos');
  
  // Definir los encabezados de la hoja de Excel y su correspondiente clave
  worksheet.columns = [
    { header: 'Factura', key: 'move_id', width: 15 },
    { header: 'Cliente', key: 'partner_id', width: 30 },
    { header: 'SKU', key: 'SKU', width: 20 },
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Venta Bruta', key: 'price_subtotal', width: 15 },
    { header: 'Fee For Service', key: 'feeForServiceAmount', width: 18 },
    { header: 'Recuperacion de Costo', key: 'recuperacionCostoAmount', width: 20 },
    { header: 'Fee Logistico', key: 'feeLogisticoAmount', width: 15 },
    { header: 'Publicidad', key: 'publicidadAmount', width: 15 },
    { header: 'Factoraje', key: 'factorajeAmount', width: 15 },
    { header: 'Pronto pago', key: 'prontoPagoAmount', width: 15 },
    { header: 'Total Descuentos', key: 'TotalDescuentos', width: 15 },
    { header: 'Venta Neta', key: 'VentaNeta', width: 15 },
    // ... más columnas según sea necesario ...
  ];

  // Agregar los datos a la hoja de Excel
  records.forEach(record => {
    // Aplicar condiciones comerciales
    let condiciones = condicionesComerciales.find(cond => cond.field1 === record.partner_id && cond.field2 === record.SKU);

    if (condiciones) {
      // Asignar valores a partir de las condiciones comerciales
      record.feeForServiceAmount = parseFloat(condiciones.field4) * record.price_subtotal / 100;
      record.recuperacionCostoAmount = parseFloat(condiciones.field5) * record.price_subtotal / 100;
      record.feeLogisticoAmount = parseFloat(condiciones.field6) * record.price_subtotal / 100;
      record.publicidadAmount = parseFloat(condiciones.field7) * record.price_subtotal / 100;
      record.factorajeAmount = parseFloat(condiciones.field8) * record.price_subtotal / 100;
      record.prontoPagoAmount = parseFloat(condiciones.field9) * record.price_subtotal / 100;
      record.TotalDescuentos = (record.feeForServiceAmount + record.recuperacionCostoAmount + record.feeLogisticoAmount + record.publicidadAmount + record.factorajeAmount + record.prontoPagoAmount);
      record.VentaNeta = record.price_subtotal - (record.feeForServiceAmount + record.recuperacionCostoAmount + record.feeLogisticoAmount + record.publicidadAmount + record.factorajeAmount + record.prontoPagoAmount);
    } else {
      // Valores por defecto si no se encuentran condiciones
      record.feeForServiceAmount = 0;
      record.recuperacionCostoAmount = 0;
      record.feeLogisticoAmount = 0;
      record.publicidadAmount = 0;
      record.factorajeAmount = 0;
      record.prontoPagoAmount = 0;
      record.VentaNeta = record.price_subtotal;
    }

    worksheet.addRow(record);
  });

  // Ajustar el ancho de las columnas basado en el contenido
  worksheet.columns.forEach(column => {
    column.width = column.width < 20 ? 20 : column.width;
  });

  return workbook;
};

module.exports = { createExcel };
