const { query } = require('../config/database');

const generateBoxIdentifier = async (branchCode) => {
  const year = new Date().getFullYear().toString().slice(-2);
  
  const result = await query(
    'SELECT COUNT(*) FROM boxes WHERE branch_code = $1 AND year = $2',
    [branchCode, year]
  );
  
  const count = parseInt(result.rows[0].count);
  const nextSequence = (count + 1).toString().padStart(4, '0');
  
  return `AI/${branchCode}/${nextSequence}/${year}`;
};

const generateArchiveReferenceNumber = async () => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  const ref = `ARC-${year}-${random}`;
  
  // Check if exists
  const result = await query(
    'SELECT id FROM documents WHERE archive_reference_number = $1',
    [ref]
  );
  
  if (result.rows.length > 0) {
    return generateArchiveReferenceNumber(); // Recursive retry
  }
  
  return ref;
};

module.exports = {
  generateBoxIdentifier,
  generateArchiveReferenceNumber
};