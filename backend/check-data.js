const { pool } = require('./src/config/database');

async function checkData() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== CHECKING DOCUMENT DATA ===\n');
    
    // Check total documents
    const total = await client.query('SELECT COUNT(*) FROM documents');
    console.log(`Total documents: ${total.rows[0].count}\n`);
    
    // Check which fields have data
    const fields = ['claim_number', 'policy_number', 'insured_name', 'title'];
    
    for (const field of fields) {
      const result = await client.query(
        `SELECT COUNT(*) FROM documents WHERE ${field} IS NOT NULL AND ${field} != ''`
      );
      console.log(`${field}: ${result.rows[0].count} documents have data`);
      
      // Show sample values
      if (parseInt(result.rows[0].count) > 0) {
        const samples = await client.query(
          `SELECT id, ${field} FROM documents WHERE ${field} IS NOT NULL AND ${field} != '' LIMIT 3`
        );
        console.log('  Samples:', samples.rows.map(r => r[field]).join(', '));
      }
      console.log('');
    }
    
    // Show a few complete documents
    const docs = await client.query(`
      SELECT id, title, insured_name, policy_number, claim_number 
      FROM documents 
      LIMIT 5
    `);
    
    console.log('\nSample documents:');
    docs.rows.forEach((doc, i) => {
      console.log(`\n${i+1}. ID: ${doc.id}`);
      console.log(`   Title: ${doc.title}`);
      console.log(`   Insured: ${doc.insured_name || 'N/A'}`);
      console.log(`   Policy: ${doc.policy_number || 'N/A'}`);
      console.log(`   Claim: ${doc.claim_number || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

checkData();