const Folio = require('../models/Folio');

const generateNextFolio = async () => {
  const lastFolio = await Folio.findOne().sort({ folioNumber: -1 });
  const nextFolioNumber = lastFolio ? lastFolio.folioNumber + 1 : 1;
  const newFolio = new Folio({ folioNumber: nextFolioNumber });
  await newFolio.save();
  return newFolio.folioNumber;
};

module.exports = generateNextFolio;
