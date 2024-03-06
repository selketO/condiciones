const express = require('express');
const xmlrpc = require('xmlrpc');
const app = express();
const fs = require('fs');
const ExcelJS = require('exceljs');

// Cargar el JSON de condiciones comerciales
let condicionesComerciales = JSON.parse(fs.readFileSync('./condiciones_comerciales.json', 'utf8'));

// Configura el motor de plantillas EJS y la carpeta pública
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));

// Datos de conexión a tu instancia de Odoo
const url = 'https://biancorelab.odoo.com';
const db = 'biancorelab';
const username = 'erodriguez@biancorelab.com';
const password = '2iUaFfRinJTf6w4';

// Crea un cliente XML-RPC para la autenticación
const commonClient = xmlrpc.createSecureClient({
  host: url.replace('https://', ''),
  port: 443,
  path: '/xmlrpc/2/common'
});

// Autenticar
commonClient.methodCall('authenticate', [db, username, password, {}], (error, uid) => {
  if (error) {
    console.error('Error en la autenticación:', error);
    return;
  }

  // Crea un cliente para el modelo
  const modelsClient = xmlrpc.createSecureClient({
    host: url.replace('https://', ''),
    port: 443,
    path: '/xmlrpc/2/object'
  });

  const domain = [
    ["state", "not in", ["draft", "cancel"]],
    "|", ["move_type", "=", "out_invoice"], ["move_type", "=", "out_refund"],
    "|", ["move_type", "=", "out_invoice"], ["move_type", "=", "in_invoice"],
    ["invoice_date", ">=", "2024-01-01"]
  ];
  

  const fields = ['move_id', 'partner_id', 'product_id','price_subtotal', 'invoice_date'];

  // Llamar al método search_read
  modelsClient.methodCall('execute_kw', [db, uid, password, 'account.invoice.report', 'search_read', [domain], { fields: fields }], (error, records) => {
    if (error) {
      console.error('Error al obtener los registros:', error);
      return;
    }

// Procesar los registros para separar SKU y nombre del producto
const processedRecords = records.map(record => {
    let sku = '';
    let name = '';
    let secondMoveId = '';
    let clientName = '';
  
    // Procesar move_id
    if (Array.isArray(record.move_id) && record.move_id.length > 1) {
      secondMoveId = record.move_id[1].trim();
      secondMoveId = secondMoveId.replace(/\s*\(.*?\)\s*/g, '').trim();
    }
  
    // Procesar partner_id para obtener el texto antes de la coma
    if (Array.isArray(record.partner_id) && record.partner_id.length > 1) {
      clientName = record.partner_id[1].trim();
      // Quitar todo lo que está después de la coma, incluida la coma
      clientName = clientName.split(',')[0].trim();
    }
  
    // Procesar product_id
    if (Array.isArray(record.product_id) && record.product_id.length > 1) {
      const productString = record.product_id[1];
      const match = productString.match(/^\[(\d+)\]\s(.+)$/);
      if (match) {
        sku = match[1];
        name = match[2];
      } else {
        name = productString;
      }
    }
    // Ahora que tenemos clientName y sku, buscamos las condiciones

    let condiciones = condicionesComerciales.find(condicion => {
      return condicion.field1 === clientName && condicion.field2 === sku;
    });
  
    if (condiciones) {
    //   console.log(`Condiciones encontradas: ${JSON.stringify(condiciones)}`);
      record.feeForServiceAmount = parseFloat(condiciones.field4) * record.price_subtotal / 100;
      record.recuperacionCostoAmount = parseFloat(condiciones.field5) * record.price_subtotal / 100;
      record.feeLogisticoAmount = parseFloat(condiciones.field6) * record.price_subtotal / 100;
      record.publicidadAmount = parseFloat(condiciones.field7) * record.price_subtotal / 100;
      record.factorajeAmount = parseFloat(condiciones.field8) * record.price_subtotal / 100;
      record.prontoPagoAmount = parseFloat(condiciones.field9) * record.price_subtotal / 100;    
    } else {
        record.feeForServiceAmount = 0;
        record.recuperacionCostoAmount = 0;
        record.feeLogisticoAmount = 0;
        record.publicidadAmount = 0;
        record.factorajeAmount = 0;
        record.prontoPagoAmount = 0;
    }
    return {
      move_id: secondMoveId,
      partner_id: clientName,
      SKU: sku,
      name: name,
      feeForServiceAmount: record.feeForServiceAmount,
      recuperacionCostoAmount: record.recuperacionCostoAmount,
      feeLogisticoAmount: record.feeLogisticoAmount,
      publicidadAmount: record.publicidadAmount,
      factorajeAmount: record.factorajeAmount,
      prontoPagoAmount: record.prontoPagoAmount,
      price_subtotal: record.price_subtotal,
      VentaNeta: record.price_subtotal - record.feeForServiceAmount - record.recuperacionCostoAmount - record.feeLogisticoAmount - record.publicidadAmount - record.factorajeAmount - record.prontoPagoAmount,
      fecha: record.invoice_date
    };
  });
  
  app.get('/descargar', async (req, res) => {
    // Crear un nuevo libro de trabajo y una hoja
    let workbook = new ExcelJS.Workbook();
    let worksheet = workbook.addWorksheet('Datos');
    // Leer los filtros de la solicitud
    const { cliente, fechaInicio, fechaFin, busqueda } = req.query;

    // Filtrar `processedRecords` basado en los criterios. Ajusta esta lógica basada en cómo necesitas filtrar los datos.
    let recordsFiltrados = processedRecords.filter(record => {
      let cumpleCliente = cliente ? record.partner_id === cliente : true;
      let cumpleFechaInicio = fechaInicio ? new Date(record.fecha) >= new Date(fechaInicio) : true;
      let cumpleFechaFin = fechaFin ? new Date(record.fecha) <= new Date(fechaFin) : true;
      let cumpleBusqueda = busqueda ? record.name.includes(busqueda) : true;
      return cumpleCliente && cumpleFechaInicio && cumpleFechaFin && cumpleBusqueda;
    });
    // Agregar encabezados de columna
    worksheet.columns = [
      { header: 'Factura', key: 'move_id', width: 10 },
      { header: 'Cliente', key: 'partner_id', width: 30 },
      { header: 'SKU', key: 'SKU', width: 30 },
      { header: 'Nombre', key: 'name', width: 30 },
      { header: 'Venta Bruta', key: 'price_subtotal', width: 15 },
      { header: 'Fee For Service', key: 'feeForServiceAmount', width: 15 },
      { header: 'Recuperacion de Costo', key: 'recuperacionCostoAmount', width: 15 },
      { header: 'Fee Logistico', key: 'feeLogisticoAmount', width: 15 },
      { header: 'Publicidad', key: 'publicidadAmount', width: 15 },
      { header: 'Factoraje', key: 'factorajeAmount', width: 15 },
      { header: 'Pronto pago', key: 'prontoPagoAmount', width: 15 },
      { header: 'Venta neta', key: 'VentaNeta', width: 15 },
      // Añade más columnas según tus datos
    ];
  
    // Agregar los datos a la hoja
    recordsFiltrados.forEach(record => {
      worksheet.addRow(record);
    });
  
    // Ajustar las celdas a los datos
    worksheet.columns.forEach(column => {
      column.width = column.width < 20 ? 20 : column.width;
    });
  
    // Configurar la respuesta para descargar el archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte.xlsx"');
  
    // Escribir el libro de trabajo en la respuesta
    await workbook.xlsx.write(res);
  
    // Finalizar la respuesta
    res.end();
  });

    // Inicia el servidor y muestra los registros en la ruta raíz
    app.get('/', (req, res) => {
      res.render('index', { records: processedRecords });
    });

    const port = 3000;
    app.listen(port, () => {
      console.log(`Servidor ejecutándose en http://localhost:${port}`);
    });
  });
});
