const express = require('express');
const path = require('path');
require('dotenv').config();
const reportsController = require('./src/controllers/reportsController');
const FormController = require('./src/controllers/FormController');
const connectDB = require('./src/config/db');
const favicon = require('serve-favicon');
connectDB();
const PDF = require('./src/models/PdfModel'); // Asegúrate de ajustar la ruta según tu estructura de directorios
const MailService = require('./src/services/MailService');

const app = express();
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Asegúrate de agregar esto para poder analizar el cuerpo de las solicitudes POST
app.use(express.urlencoded({ extended: true })); // para parsear application/x-www-form-urlencoded

app.post('/send-form', FormController.processFormAndSendEmail);
// Ruta para cargar la página del formulario sin generar un folio
app.get('/formulario',reportsController.form);

app.get('/autorizar/:token',FormController.autorizar);

app.get('/no-autorizar/:token',FormController.noautorizar );

app.get('/', reportsController.home);
app.get('/descargar', reportsController.descargar);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

