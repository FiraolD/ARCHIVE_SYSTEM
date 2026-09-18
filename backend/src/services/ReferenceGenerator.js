const { query } = require('../config/database');

class ReferenceGenerator {
  /**
   * Generate a sequential file reference number
   * Format: BRANCH_CODE/SEQUENCE/YY
   */
  static async generateFileReference(branchCode, productCode) {
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get the next sequence number for this branch and year
    const result = await query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(archive_reference_number FROM '[^/]+/[^/]+/([0-9]+)/') AS INTEGER)), 0) + 1 as next_number
       FROM documents 
       WHERE archive_reference_number LIKE $1
       AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [`${branchCode}/%`]
    );
    
    const nextNumber = parseInt(result.rows[0].next_number);
    const formattedNumber = nextNumber.toString().padStart(6, '0');
    
    return `${branchCode}/${productCode}/${formattedNumber}/${year}`;
  }

  /**
   * Generate a request reference number
   * Format: REQ-YYYYMM-SEQUENCE
   */
  static async generateRequestReference() {
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    const result = await query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(request_reference FROM 'REQ-\\d{4}-\\d{2}-(\\d+)') AS INTEGER)), 0) + 1 as next_number
       FROM file_requests 
       WHERE request_reference LIKE $1`,
      [`REQ-${year}${month}%`]
    );
    
    const nextNumber = parseInt(result.rows[0].next_number);
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    
    return `REQ-${year}${month}-${formattedNumber}`;
  }

  /**
   * Generate a box identifier
   * Format: AI/BRANCH_CODE/SEQUENCE/YY
   */
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
    
    return `AI/${branchCode}/${formattedNumber}/${year}`;
  }
}

module.exports = ReferenceGenerator;