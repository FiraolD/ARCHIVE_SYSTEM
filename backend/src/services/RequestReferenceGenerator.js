// backend/src/services/RequestReferenceGenerator.js

const { query } = require('../config/database');

class RequestReferenceGenerator {
  /**
   * Generate a unique request reference number
   * Format: REQ/YY/000001 (e.g., REQ/26/000001)
   */
  static async generateRequestReference() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Get last 2 digits of year
    
    // Create sequence table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS request_sequences (
        id VARCHAR(10) PRIMARY KEY,
        last_number INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const client = await query('BEGIN');
    
    try {
      // Lock the row for this year to prevent duplicates
      const sequenceResult = await query(
        `INSERT INTO request_sequences (id, last_number, updated_at)
         VALUES ($1, 1, CURRENT_TIMESTAMP)
         ON CONFLICT (id) 
         DO UPDATE SET 
           last_number = request_sequences.last_number + 1,
           updated_at = CURRENT_TIMESTAMP
         WHERE request_sequences.id = $1
         RETURNING last_number`,
        [`REQ/${year}`]
      );
      
      const nextNumber = parseInt(sequenceResult.rows[0].last_number);
      const formattedNumber = nextNumber.toString().padStart(6, '0'); // 6-digit number
      const reference = `REQ/${year}/${formattedNumber}`;
      
      await query('COMMIT');
      return reference;
      
    } catch (error) {
      await query('ROLLBACK');
      console.error('Error generating request reference:', error);
      throw error;
    }
  }

  /**
   * Initialize sequence for current year if not exists
   */
  static async initializeSequence() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    
    await query(`
      INSERT INTO request_sequences (id, last_number, updated_at)
      VALUES ($1, 0, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING
    `, [`REQ/${year}`]);
  }
}

module.exports = RequestReferenceGenerator;