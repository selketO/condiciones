const excelService = require('../services/excelService');
const odooService = require('../services/odooService');
const Form = require('../models/PdfModel');
const conditionsLoader = require('../utils/conditionsLoader');
const PDFDocument = require('pdfkit');

// Función para renderizar la página principal con los registros de Odoo.
exports.home = async (req, res) => {
  try {
    const { updatedRecords, uniqueClients, totals } = await odooService.getOdooRecords();
    res.render('index', { records: updatedRecords, uniqueClients, totals });
  } catch (error) {
    console.error('Error en la página principal:', error);
    res.status(500).send('Error al cargar la página principal');
  }
};
exports.getRecords = async (req, res) => {
  try {
      const { updatedRecords } = await odooService.getOdooRecords();
      res.json(updatedRecords);
  } catch (error) {
      console.error('Error al obtener los registros:', error);
      res.status(500).send('Error al obtener los datos');
  }
};
exports.form = async (req, res) => {
  try {
    const { updatedRecords: records } = await odooService.getOdooRecords();
    const generateUniqueFolio = async () => {
      let unique = false;
      let folio;
      while (!unique) {
        folio = `F-${Date.now()}`;
        const existingFolio = await Form.findOne({ folio: folio });
        if (!existingFolio) {
          unique = true;
        }
      }
      return folio;
    };
    const folio = await generateUniqueFolio();
    res.render('formulario', { records: records, folio: folio });
  } catch (error) {
    console.error('Error al cargar el formulario:', error);
    res.status(500).send('Error al cargar la página del formulario');
  }
};

// Función para manejar la descarga del reporte de Excel.
exports.descargar = async (req, res) => {
  try {
    // Obtén los registros desde Odoo
    const { updatedRecords: records } = await odooService.getOdooRecords();
    
    // Filtra los registros de Odoo basándose en los parámetros de la consulta (si los hay).
    let recordsFiltrados = records.filter(record => {
      let cumpleCliente = req.query.cliente ? record.partner_id === req.query.cliente : true;
      let cumpleFechaInicio = req.query.fechaInicio ? new Date(record.fecha) >= new Date(req.query.fechaInicio) : true;
      let cumpleFechaFin = req.query.fechaFin ? new Date(record.fecha) <= new Date(req.query.fechaFin) : true;
      let cumpleBusqueda = req.query.busqueda ? record.name.includes(req.query.busqueda) : true;
      return cumpleCliente && cumpleFechaInicio && cumpleFechaFin && cumpleBusqueda;
    });

    // Crea un libro de Excel con los registros filtrados.
    const workbook = await excelService.createExcel(recordsFiltrados);

    // Establece las cabeceras para la descarga del archivo Excel.
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte.xlsx"');

    // Escribe el libro de Excel en la respuesta y finaliza la solicitud.
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al descargar el reporte:', error);
    res.status(500).send('Error al generar el reporte');
  }
};
