const express = require('express');
const xmlrpc = require('xmlrpc');
const app = express();

// Configura el motor de plantillas EJS y la carpeta pública
app.set('view engine', 'ejs');
app.use(express.static('public')); // Para archivos estáticos como CSS y JS

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
  
    return {
      move_id: secondMoveId,
      partner_id: clientName,
      SKU: sku,
      name: name,
      price_subtotal: record.price_subtotal,
      fecha: record.invoice_date
    };
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
