// PdfModel.js
const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now,
    },
    formData: {
        type: mongoose.Schema.Types.Mixed, // Esto te permite guardar un objeto con cualquier estructura
        required: true
    },
    pdfData: Buffer,
    token: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        enum: ['solicitudesPendientes', 'FormularioAutorizado', 'FormularioNoAutorizado'],
        default: 'solicitudesPendientes'
    },
    folio: {
        type: String,
        required: true,
        unique: true // Asegura que cada folio sea único
      },
});

module.exports = mongoose.model('Form', formSchema);
