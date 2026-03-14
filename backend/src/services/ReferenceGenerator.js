// backend/src/services/ReferenceGenerator.js
const { query } = require('../config/database');

class ReferenceGenerator {
  static async generateFileReference(branchCode, productCode) {
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get the next sequence number
    const result = await query(
      `SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_number
       FROM documents 
       WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      []
    );
    
    const nextNumber = parseInt(result.rows[0].next_number);
    const formattedNumber = nextNumber.toString().padStart(6, '0');
    
    return `FL/${branchCode}/${productCode}/${formattedNumber}/${year}`;
  }

  static async generateBoxIdentifier(branchCode) {
    const year = new Date().getFullYear().toString().slice(-2);
    
    const result = await query(
      `SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_number
       FROM boxes 
       WHERE branch_code = $1 AND year = $2`,
      [branchCode, year]
    );
    
    const nextNumber = parseInt(result.rows[0].next_number);
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    
    return `AIC/${branchCode}/${formattedNumber}/${year}`;
  }
}

module.exports = ReferenceGenerator;