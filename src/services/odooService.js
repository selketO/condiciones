const xmlrpc = require('xmlrpc');
const { odooConfig } = require('../config/config');
const fs = require('fs');
const condicionesComerciales = JSON.parse(fs.readFileSync('./condiciones_comerciales.json', 'utf8'));
const mongoose = require('mongoose');
const Form = require('../models/PdfModel');

async function buscarFormularioAutorizado(nameClient, upc) {
  try {
    const formAutorizado = await Form.findOne({
      state: 'FormularioAutorizado',
      'formData.nameClient': nameClient,
      $or: [
        {'formData.upc1': upc},
        {'formData.upc2': upc},
        {'formData.upc3': upc},
        {'formData.upc4': upc},
        {'formData.upc5': upc},
      ]
    }).sort({ 'createdAt': -1 }); // Ordena por la fecha de creación en orden descendente
    return formAutorizado;
  } catch (error) {
    console.error('Error buscando el formulario autorizado más reciente:', error);
    throw error;
  }
}
// Crear un cliente XML-RPC para la autenticación
const createClient = (path) => {
  return xmlrpc.createSecureClient({
    host: odooConfig.url.replace(/^https?:\/\//, ''), // Elimina el protocolo (http/https)
    port: 443,
    path: path,
  });
};

const authenticateOdoo = async () => {
  return new Promise((resolve, reject) => {
    const commonClient = createClient('/xmlrpc/2/common');  
    commonClient.methodCall('authenticate', [odooConfig.db, odooConfig.username, odooConfig.password, {}], (error, uid) => {
      if (error) {
        reject(error);
      } else {
        resolve(uid);
      }
    });
  });
};

const fetchData = async (model, domain, fields) => {
  const uid = await authenticateOdoo(); // Asegúrate de manejar errores aquí
  return new Promise((resolve, reject) => {
    const modelsClient = createClient('/xmlrpc/2/object');
    modelsClient.methodCall('execute_kw', [odooConfig.db, uid, odooConfig.password, model, 'search_read', [domain], { fields: fields }], (error, records) => {
      if (error) {
        reject(error);
      } else {
        resolve(records);
      }
    });
  });
};

// Nueva función que obtiene registros de Odoo.
const getOdooRecords = async () => {
  const domain = [
    ["state", "not in", ["draft", "cancel"]],
    "|", ["move_type", "=", "out_invoice"], ["move_type", "=", "out_refund"],
    "|", ["move_type", "=", "out_invoice"], ["move_type", "=", "in_invoice"],
    ["invoice_date", ">=", "2024-01-01"]
  ];
  const fields = ['move_id', 'partner_id', 'product_id', 'price_subtotal', 'invoice_date'];
  try {
    const records = await fetchData('account.invoice.report', domain, fields);
    const updatedRecords = await Promise.all(records.map(async (record) => {
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
        const formAutorizado = await buscarFormularioAutorizado(clientName, sku);

        // Si se encuentra un formulario autorizado, usarlo para establecer publicidadAmount
        if (formAutorizado) {
          record.publicidadAmount = parseFloat(formAutorizado.formData.discountAmount1);
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
      }));
      return updatedRecords;
  } catch (error) {
    console.error('Error fetching Odoo records:', error);
    throw error; // Re-throw the error to handle it in the calling function
  }
};

module.exports = {
  fetchData,
  getOdooRecords
};
