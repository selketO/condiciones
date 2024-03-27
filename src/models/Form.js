// models/Form.js
const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
  requestDate: {
    type: String,
    required: true,
  },
  requestFolio: {
    type: String,
    required: true,
    unique: true,
  },
  applicantName: {
    type: String,
    required: true,
  },
  discountReason: {
    type: String,
    required: true,
  },
  numItems: {
    type: Number,
    required: true,
  },
  totalDiscountAmount: {
    type: Number,
    required: true,
  },

});

module.exports = mongoose.model('Val', formSchema);
