const mongoose = require('mongoose');

const folioSchema = new mongoose.Schema({
  folioNumber: { type: Number, required: true, unique: true },
});

module.exports = mongoose.model('Folio', folioSchema);
