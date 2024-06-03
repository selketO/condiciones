const xmlrpc = require('xmlrpc');
const { odooConfig } = require('../config/config');
const fs = require('fs');
const condicionesComerciales = JSON.parse(fs.readFileSync('./condiciones_comerciales.json', 'utf8'));
const mongoose = require('mongoose');
const Form = require('../models/PdfModel');

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
// Función para buscar un formulario autorizado que coincida con los criterios dados.
async function buscarFormularioAutorizado(nameClient, upc, month, year) {
  try {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const formAutorizado = await Form.find({
      state: 'FormularioAutorizado',
      'formData.nameClient': nameClient,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      $or: [
        {'formData.upc1': upc},
        {'formData.upc2': upc},
        {'formData.upc3': upc},
        {'formData.upc4': upc},
        {'formData.upc5': upc},
      ]
    });
    return formAutorizado;
  } catch (error) {
    console.error('Error buscando los formularios autorizados del mes:', error);
    throw error;
  }
}

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
    const uniqueClients = [];
    const totals = {
      totalVentaBruta: 0,
      totalFeeForService: 0,
      totalRecuperacionCosto: 0,
      totalFeeLogistico: 0,
      totalPublicidad: 0,
      totalProvision: 0,
      totalFactoraje: 0,
      totalProntoPago: 0,
      totalDescuento: 0,
      totalVentaNeta: 0,
    };
    const updatedRecords = records.map(record => {
      const { move_id, partner_id, product_id, price_subtotal, invoice_date } = record;
      const clientName = partner_id ? partner_id[1].split(',')[0].trim() : '';
      const productString = product_id ? product_id[1] : '';
      const skuMatch = productString.match(/^\[(\d+)\]\s(.+)$/);
      const sku = skuMatch ? skuMatch[1] : '';
      const name = skuMatch ? skuMatch[2] : productString;

      if (!uniqueClients.includes(clientName)) uniqueClients.push(clientName);

      const feeForServiceAmount = calculateFeeForService(clientName, sku, price_subtotal);
      const recuperacionCostoAmount = calculateRecuperacionCosto(clientName, sku, price_subtotal);
      const feeLogisticoAmount = calculateFeeLogistico(clientName, sku, price_subtotal);
      const publicidadAmount = calculatePublicidad(clientName, sku, price_subtotal, invoice_date);
      const provisionAmount = calculateProvision(clientName, sku, price_subtotal);
      const factorajeAmount = calculateFactoraje(clientName, sku, price_subtotal);
      const prontoPagoAmount = calculateProntoPago(clientName, sku, price_subtotal);

      const totalDescuentos = feeForServiceAmount + recuperacionCostoAmount + feeLogisticoAmount + publicidadAmount + factorajeAmount + prontoPagoAmount + provisionAmount;
      const VentaNeta = price_subtotal - totalDescuentos;

      totals.totalVentaBruta += price_subtotal;
      totals.totalFeeForService += feeForServiceAmount;
      totals.totalRecuperacionCosto += recuperacionCostoAmount;
      totals.totalFeeLogistico += feeLogisticoAmount;
      totals.totalPublicidad += publicidadAmount;
      totals.totalFactoraje += factorajeAmount;
      totals.totalProntoPago += prontoPagoAmount;
      totals.totalDescuento += totalDescuentos;
      totals.totalVentaNeta += VentaNeta;
      totals.totalProvision += provisionAmount;

      return {
        move_id: move_id ? move_id[1].replace(/\s*\(.*?\)\s*/g, '').trim() : '',
        partner_id: clientName,
        SKU: sku,
        name: name,
        price_subtotal: price_subtotal.toFixed(2),
        feeForServiceAmount: feeForServiceAmount.toFixed(2),
        recuperacionCostoAmount: recuperacionCostoAmount.toFixed(2),
        feeLogisticoAmount: feeLogisticoAmount.toFixed(2),
        publicidadAmount: publicidadAmount.toFixed(2),
        provisionAmount: provisionAmount.toFixed(2),
        factorajeAmount: factorajeAmount.toFixed(2),
        prontoPagoAmount: prontoPagoAmount.toFixed(2),
        totalDescuentos: totalDescuentos.toFixed(2),
        VentaNeta: VentaNeta.toFixed(2),
        fecha: invoice_date,
      };
    });

    return { updatedRecords, uniqueClients, totals };
  } catch (error) {
    console.error('Error fetching Odoo records:', error);
    throw error;
  }
};

const calculateFeeForService = (clientName, sku, subtotal) => {
  const condition = condicionesComerciales.find(c => c.field1 === clientName && c.field2 === sku);
  return condition ? (parseFloat(condition.field4) * subtotal / 100) : 0;
};

const calculateRecuperacionCosto = (clientName, sku, subtotal) => {
  const condition = condicionesComerciales.find(c => c.field1 === clientName && c.field2 === sku);
  return condition ? (parseFloat(condition.field5) * subtotal / 100) : 0;
};

const calculateFeeLogistico = (clientName, sku, subtotal) => {
  const condition = condicionesComerciales.find(c => c.field1 === clientName && c.field2 === sku);
  return condition ? (parseFloat(condition.field6) * subtotal / 100) : 0;
};

const calculatePublicidad = (clientName, sku, subtotal, invoiceDate) => {
  const formAutorizado = buscarFormularioAutorizado(clientName, sku, new Date(invoiceDate).getMonth() + 1, new Date(invoiceDate).getFullYear());
  if (formAutorizado.length > 0) {
    const totalDiscountAmount = formAutorizado.reduce((acc, form) => acc + parseFloat(form.formData.discountAmount1), 0);
    const countOfRecords = recordsByClientProductMonth[`${clientName}-${sku}-${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`];
    return totalDiscountAmount / countOfRecords;
  }
  return 0;
};

const calculateFactoraje = (clientName, sku, subtotal) => {
  const condition = condicionesComerciales.find(c => c.field1 === clientName && c.field2 === sku);
  return condition ? (parseFloat(condition.field8) * subtotal / 100) : 0;
};

const calculateProvision = (clientName, sku, subtotal) => {
  const condition = condicionesComerciales.find(c => c.field1 === clientName && c.field2 === sku);
  return condition ? (parseFloat(condition.field7) * subtotal / 100) : 0;
};

const calculateProntoPago = (clientName, sku, subtotal) => {
  const condition = condicionesComerciales.find(c => c.field1 === clientName && c.field2 === sku);
  return condition ? (parseFloat(condition.field9) * subtotal / 100) : 0;
};

module.exports = {
  fetchData,
  getOdooRecords
};

module.exports = {
  fetchData,
  getOdooRecords
};
