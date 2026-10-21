/**
 * src/scripts/migrateLegacy.js
 * ----------------------------
 * Full-fidelity migration: EVERY row in public."Claim" becomes one document,
 * even byte-identical duplicates. Row identity is derived from:
 *   1. a real id/serial column if the legacy table has one, else
 *   2. ctid (physical row locator, unique per row in Postgres)
 *
 * Idempotent via product_custom_fields->>'legacy_row_key'.
 *
 * Usage:
 *   node src/scripts/migrateLegacy.js --dry-run
 *   node src/scripts/migrateLegacy.js
 */

require('dotenv').config();

const crypto = require('crypto');
const { Pool } = require('pg');
const { pool, query } = require('../config/database');

if (!process.env.LEGACY_DATABASE_URL) {
  console.error('❌ LEGACY_DATABASE_URL missing from .env');
  process.exit(1);
}

const legacy = new Pool({ connectionString: process.env.LEGACY_DATABASE_URL });

const DRY_RUN        = process.argv.includes('--dry-run');
const BATCH_SIZE     = 1000;
const ACTIVITY_BATCH = 1000;
const PROGRESS_EVERY = 10000;

// ---------- Branch map (unchanged) ----------
const BRANCH_MAP = {
  'finifine main (ffn)':    { name: 'Finifine Main',      code: 'FFN' },
  'bole main (bol)':        { name: 'Bole Main',          code: 'BOL' },
  'bole':                   { name: 'Bole Main',          code: 'BOL' },
  'lideta (ldt)':           { name: 'Lideta',             code: 'LDT' },
  'kolfe (kol)':            { name: 'Kolfe',              code: 'KOL' },
  '22 mazoria (22m)':       { name: '22 Mazoria',         code: '22M' },
  'wollosefer (wlf)':       { name: 'Wollosefer',         code: 'WLF' },
  'gofa mazoria (gfm)':     { name: 'Gofa Mazoria',       code: 'GFM' },
  'nefas silk (nfs)':       { name: 'Nefas Silk',         code: 'NFS' },
  'teklehaimanot (tkh)':    { name: 'Teklehaimanot',      code: 'TKH' },
  'kazanchis (kzc)':        { name: 'Kazanchis',          code: 'KZC' },
  'gerji (grj)':            { name: 'Gerji',              code: 'GRJ' },
  'piazza (piz)':           { name: 'Piazza',             code: 'PIZ' },
  'mercato main (mrt)':     { name: 'Mercato Main',       code: 'MRT' },
  'adama (adm)':            { name: 'Adama',              code: 'ADM' },
  'gotera (gtr)':           { name: 'Gotera',             code: 'GTR' },
  'addis ababa main (add)': { name: 'Addis Ababa Main',   code: 'ADD' },
  'dil gebeya (dlg)':       { name: 'Dil Gebeya',         code: 'DLG' },
  'gulele (gll)':           { name: 'Gulele',             code: 'GLL' },
  'centeral mercato (cmr)': { name: 'Central Mercato',    code: 'CMR' },
  'mekele (mkl)':           { name: 'Mekele',             code: 'MKL' },
  'dire dawa (drd)':        { name: 'Dire Dawa',          code: 'DRD' },
  'shashemene (sha)':       { name: 'Shashemene',         code: 'SHA' },
  'sheger(sgr)':            { name: 'Sheger',             code: 'SGR' },
  'bishoftu (bsh)':         { name: 'Bishoftu',           code: 'BSH' },
  'dilla (dla)':            { name: 'Dilla',              code: 'DLA' },
  'ambo (amb)':             { name: 'Ambo',               code: 'AMB' },
  'kalit (klt)':            { name: 'Kalit',              code: 'KLT' },
  'kalit (kly)':            { name: 'Kalit',              code: 'KLT' },
  'megenagna(mgn)':         { name: 'Megenagna',          code: 'MGN' },
  'bahirdar (bhd)':         { name: 'Bahirdar',           code: 'BHD' },
  'bahirdar':               { name: 'Bahirdar',           code: 'BHD' },
  'ghimbi (gmb)':           { name: 'Ghimbi',             code: 'GMB' },
  'sebategna (sea)':        { name: 'Sebategna',          code: 'SEA' },
  'nekemte (nkt)':          { name: 'Nekemte',            code: 'NKT' },
  'hawassa (hws)':          { name: 'Hawassa',            code: 'HWS' },
  'jima (jim)':             { name: 'Jima',               code: 'JIM' },
  'sarbet(sbb)':            { name: 'Sarbet',             code: 'SAB' },
  'sbb':                    { name: 'Sarbet',             code: 'SAB' },
  'sab':                    { name: 'Sarbet',             code: 'SAB' },
  'birbirsa(bsa)':          { name: 'Birbirsa',           code: 'BSA' },
  'lebu(lbu)':              { name: 'Lebu',               code: 'LBU' },
  'cmc':                    { name: 'CMC',                code: 'CMC' },
  'dessie(des)':            { name: 'Dessie',             code: 'DES' },
  'dessie':                 { name: 'Dessie',             code: 'DES' },
  'des':                    { name: 'Dessie',             code: 'DES' },
  'alemgena(alg)':          { name: 'Alemgena',           code: 'ALG' },
  'alg':                    { name: 'Alemgena',           code: 'ALG' },
  'chr(chiro)':             { name: 'Chiro',              code: 'CHR' },
  'gefersa nano (gnb)':     { name: 'Gefersa Nano',       code: 'GNB' },
  'lgt(legetafo)':          { name: 'Legetafo',           code: 'LGT' },
  'lgt(legetafo)48':        { name: 'Legetafo',           code: 'LGT' },
  'bule hora (blh)':        { name: 'Bule Hora',          code: 'BLH' },
  'wolisso(wso)':           { name: 'Wolisso',            code: 'WSO' },
  'dgm(debela gutema)':     { name: 'Debela Gutema',      code: 'DGM' },
  'debelea gutema(dgm)':    { name: 'Debela Gutema',      code: 'DGM' },
  'debela gutema(dgm)':     { name: 'Debela Gutema',      code: 'DGM' },
  'dgm(debela gutema) 46':  { name: 'Debela Gutema',      code: 'DGM' },
  'balerobe(blr)':          { name: 'Balerobe',           code: 'BLR' },
  'debre birhan (dbr)':     { name: 'Debre Birhan',       code: 'DBR' },
  'agamsaa (aga)':          { name: 'Agamsa',             code: 'AGA' },
  'arba minch(arm)':        { name: 'Arba Minch',         code: 'ARM' },
  'jijiga (jig)':           { name: 'Jijiga',             code: 'JIG' },
  'tisyaye kemsi':          { name: 'Tisgaye Kemsi',      code: 'TKM' },
  'tisgaye kemsi':          { name: 'Tisgaye Kemsi',      code: 'TKM' },
  'oda':                    { name: 'Oda',                code: 'ODA' },
  'oad':                    { name: 'Oda',                code: 'ODA' },
  'arkol':                  { name: 'Arkol',              code: 'ARK' },
  'ase':                    { name: 'Ase',                code: 'ASE' },
  'atb':                    { name: 'Atb',                code: 'ATB' },
  'btl':                    { name: 'Btl',                code: 'BTL' },
  'dak':                    { name: 'Dak',                code: 'DAK' },
  'fri':                    { name: 'Fri',                code: 'FRI' },
  'gbg':                    { name: 'Gbg',                code: 'GBG' },
  'har':                    { name: 'Har',                code: 'HAR' },
  'hsn':                    { name: 'Hsn',                code: 'HSN' },
  'mjo':                    { name: 'Mjo',                code: 'MJO' },
  'mtb':                    { name: 'Mtb',                code: 'MTB' },
  'mtu':                    { name: 'Mtu',                code: 'MTU' },
  'sgb':                    { name: 'Sgb',                code: 'SGB' },
  'tbk':                    { name: 'Tbk',                code: 'TBK' },
  'tkh':                    { name: 'Teklehaimanot',      code: 'TKH' },
  'wls':                    { name: 'Wls',                code: 'WLS' },
};
const UNKNOWN_BRANCH = { name: 'Unknown Legacy Branch', code: 'UNK' };

// ---------- helpers ----------
const trimOrNull = (v) => {
  const s = (v ?? '').toString().trim();
  return s.length ? s : null;
};
const toNumberOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toIsoDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};
const resolveBranch = (legacyValue) => {
  const key = (legacyValue || '').toString().trim().toLowerCase();
  return BRANCH_MAP[key] || UNKNOWN_BRANCH;
};

/**
 * Content hash — kept for audit purposes only, not for dedup.
 */
function contentHash(c, branchCode) {
  const parts = [
    trimOrNull(c.claim_no)         || '',
    branchCode                     || '',
    trimOrNull(c.name)             || '',
    trimOrNull(c.plateno)          || '',
    toIsoDate(c.date_of_accident)  || '',
    toIsoDate(c.start_date)        || '',
    toIsoDate(c.end_date)          || '',
    c.sum_insured    ?? '',
    c.loss_estimate  ?? '',
    trimOrNull(c.location)         || '',
    trimOrNull(c.remark)           || '',
  ];
  return crypto.createHash('md5').update(parts.join('|')).digest('hex');
}

async function nextLegacyRef(client) {
  const { rows } = await client.query(
    "SELECT 'ARC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || " +
    "LPAD(nextval('legacy_arc_seq')::text, 6, '0') AS ref"
  );
  return rows[0].ref;
}

// ---------- main ----------
async function migrate() {
  console.log('=== Legacy AIC_Claim migration (v3 — full fidelity) ===');
  const startedAt = Date.now();

  // 0. Admin
  const adminResult = await query(
    "SELECT id, name FROM users WHERE role = 'Admin' ORDER BY created_at LIMIT 1"
  );
  if (adminResult.rows.length === 0) {
    throw new Error('No Admin user found. Run `npm run db:setup` first.');
  }
  const adminId = adminResult.rows[0].id;
  console.log('Admin owner:', adminResult.rows[0].name, `(${adminId})`);

  // 1. Detect identity column in legacy table
  const { rows: cols } = await legacy.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Claim'`
  );
  const colNames = new Set(cols.map((r) => r.column_name));
  console.log('Legacy "Claim" columns:', [...colNames].join(', '));

  const CANDIDATES = ['id', 'ID', 'Id', 'claim_id', 'row_id', 'serial'];
  const identityCol = CANDIDATES.find((c) => colNames.has(c));
  const useCtid = !identityCol;
  console.log(
    useCtid
      ? '⚠️  No id column found — falling back to ctid (physical row locator)'
      : `✅ Using identity column: "${identityCol}"`
  );

  // 2. Ensure branches exist
  console.log('Ensuring branches exist...');
  const uniqueBranches = new Map();
  for (const v of Object.values(BRANCH_MAP)) uniqueBranches.set(v.code, v);
  uniqueBranches.set(UNKNOWN_BRANCH.code, UNKNOWN_BRANCH);

  const branchCodeToId = new Map();
  for (const { name, code } of uniqueBranches.values()) {
    const existing = await query('SELECT id FROM branches WHERE code = $1', [code]);
    if (existing.rows.length > 0) {
      branchCodeToId.set(code, existing.rows[0].id);
    } else {
      const ins = await query(
        'INSERT INTO branches (name, code, created_by) VALUES ($1, $2, $3) RETURNING id',
        [name, code, adminId]
      );
      branchCodeToId.set(code, ins.rows[0].id);
      console.log(`  + ${name} (${code})`);
    }
  }

  // 3. Load legacy claims with row identity
  console.log('Reading legacy "Claim" table...');
  const selectCols = [
    'ctid',
    identityCol ? `"${identityCol}" AS __row_id` : 'NULL AS __row_id',
    'claim_no', 'name', 'plateno', 'date_of_accident',
    'start_date', 'end_date', 'sum_insured', 'loss_estimate',
    'branch', 'location', 'remark',
  ].join(', ');

  const { rows: claims } = await legacy.query(
    `SELECT ${selectCols} FROM public."Claim"`
  );
  console.log(`  ${claims.length} legacy claims fetched`);

  // 4. Preload existing row keys
  console.log('Loading existing legacy_row_keys from target...');
  const { rows: existing } = await query(
    `SELECT product_custom_fields->>'legacy_row_key' AS k
     FROM documents
     WHERE product_custom_fields ? 'legacy_row_key'`
  );
  const alreadyMigrated = new Set(existing.map((r) => r.k));
  console.log(`  already migrated: ${alreadyMigrated.size}`);

  // 5. Insert
  console.log('Migrating claims -> documents...');
  let inserted       = 0;
  let skippedEmpty   = 0;
  let skippedAlready = 0;
  let skippedDupRun  = 0;
  const seenThisRun  = new Set();

  if (!DRY_RUN) {
    for (let i = 0; i < claims.length; i += BATCH_SIZE) {
      const slice = claims.slice(i, i + BATCH_SIZE);
      const client = await pool.connect();
      let committed = false;

      try {
        await client.query('BEGIN');

        for (const c of slice) {
          const claimNo = trimOrNull(c.claim_no);
          if (!claimNo) { skippedEmpty++; continue; }

          // Stable, unique row key
          const rowId = c.__row_id !== null && c.__row_id !== undefined
            ? String(c.__row_id)
            : String(c.ctid);
          const rowKey = `claim:${rowId}`;

          if (alreadyMigrated.has(rowKey)) { skippedAlready++; continue; }
          if (seenThisRun.has(rowKey))    { skippedDupRun++;   continue; }
          seenThisRun.add(rowKey);

          const branch   = resolveBranch(c.branch);
          const branchId = branchCodeToId.get(branch.code);
          const archiveRef = await nextLegacyRef(client);
          const chash = contentHash(c, branch.code);

          const customFields = JSON.stringify({
            policy_start_date:     toIsoDate(c.start_date),
            policy_end_date:       toIsoDate(c.end_date),
            legacy_source:         'AIC_Claim',
            legacy_id:             claimNo,
            legacy_row_key:        rowKey,
            legacy_content_hash:   chash,
            legacy_physical_id:    useCtid ? String(c.ctid) : null,
          });

          await client.query(
            `INSERT INTO documents (
               archive_reference_number, physical_placement, title, type, status,
               owner_id, insured_name, claim_number, estimated_loss,
               plate_number, branch_id, receiver_remark, date_added,
               date_of_accident, sum_insured, product_custom_fields
             ) VALUES (
               $1, $2, $3, $4, $5,
               $6, $7, $8, $9,
               $10, $11, $12, $13,
               $14, $15, $16
             )`,
            [
              archiveRef,
              trimOrNull(c.location) || 'Unspecified',
              `Claim File - ${claimNo} - ${trimOrNull(c.name) || 'Unknown'}`,
              'Claim File',
              'Active',
              adminId,
              trimOrNull(c.name),
              claimNo,
              toNumberOrNull(c.loss_estimate),
              trimOrNull(c.plateno),
              branchId,
              trimOrNull(c.remark),
              toIsoDate(c.date_of_accident) || new Date().toISOString().split('T')[0],
              toIsoDate(c.date_of_accident),
              toNumberOrNull(c.sum_insured),
              customFields,
            ]
          );

          inserted++;
        }

        await client.query('COMMIT');
        committed = true;
      } catch (err) {
        if (!committed) {
          try { await client.query('ROLLBACK'); } catch (_) {}
        }
        client.release();
        throw err;
      }
      client.release();

      if (i % PROGRESS_EVERY === 0 || i + BATCH_SIZE >= claims.length) {
        const pct = (((i + slice.length) / claims.length) * 100).toFixed(1);
        console.log(`  ... ${inserted} inserted, ${skippedAlready + skippedDupRun + skippedEmpty} skipped (${pct}%)`);
      }
    }
  } else {
    console.log('DRY RUN — sample (first 3):');
    for (let i = 0; i < Math.min(3, claims.length); i++) {
      const c = claims[i];
      const branch = resolveBranch(c.branch);
      console.log({
        row_id:      c.__row_id ?? String(c.ctid),
        claim_no:    trimOrNull(c.claim_no),
        insured:     trimOrNull(c.name),
        branch:      `${branch.name} (${branch.code})`,
        plate:       trimOrNull(c.plateno),
        accident:    toIsoDate(c.date_of_accident),
        sum_insured: toNumberOrNull(c.sum_insured),
        loss:        toNumberOrNull(c.loss_estimate),
        content_h:   contentHash(c, branch.code).slice(0, 12) + '…',
      });
    }
  }

  console.log('--- Claim migration summary ---');
  console.log('  inserted                :', inserted);
  console.log('  skipped (already in DB) :', skippedAlready);
  console.log('  skipped (dup in run)    :', skippedDupRun);
  console.log('  skipped (empty claim_no):', skippedEmpty);
  console.log('  source rows             :', claims.length);
  console.log(
    '  invariant               :',
    inserted + skippedAlready + skippedDupRun + skippedEmpty,
    '===', claims.length
  );

  // 6. Activities -> audit_logs (unchanged behavior)
  console.log('Reading legacy file_activity...');
  const { rows: activities } = await legacy.query(
    `SELECT claim_no, name, location, date, activity
     FROM public.file_activity
     ORDER BY date ASC`
  );
  console.log(`  ${activities.length} activity rows fetched`);

  if (!DRY_RUN && activities.length > 0) {
    const allClaimNos = [...new Set(
      activities.map((a) => trimOrNull(a.claim_no)).filter(Boolean)
    )];
    const refByClaim = new Map();

    for (let i = 0; i < allClaimNos.length; i += 5000) {
      const chunk = allClaimNos.slice(i, i + 5000);
      const { rows } = await query(
        `SELECT claim_number, MIN(archive_reference_number) AS archive_reference_number
         FROM documents
         WHERE owner_id = $1 AND claim_number = ANY($2)
         GROUP BY claim_number`,
        [adminId, chunk]
      );
      for (const r of rows) refByClaim.set(r.claim_number, r.archive_reference_number);
    }
    console.log(`  archive refs resolved for ${refByClaim.size} claims`);

    const { rows: existingAct } = await query(
      `SELECT resource, details FROM audit_logs WHERE user_name = 'Legacy System'`
    );
    const seenActivity = new Set(existingAct.map((r) => `${r.resource}||${r.details}`));
    console.log(`  existing legacy audit rows: ${seenActivity.size}`);

    let actInserted = 0;
    let actSkipped  = 0;

    for (let i = 0; i < activities.length; i += ACTIVITY_BATCH) {
      const slice = activities.slice(i, i + ACTIVITY_BATCH);
      const rowsToInsert = [];

      for (const a of slice) {
        const claimNo = trimOrNull(a.claim_no);
        if (!claimNo) { actSkipped++; continue; }
        const ref = refByClaim.get(claimNo);
        if (!ref) { actSkipped++; continue; }

        const upper = (a.activity || '').trim().toUpperCase();
        const action =
          upper === 'WITHDRAW' ? 'Checked out (legacy)' :
          upper === 'RETURN'   ? 'Returned (legacy)'    :
          upper === 'RECOVERY' ? 'Recovered (legacy)'   :
          `Legacy: ${a.activity}`;

        const details =
          `Legacy ID: ${claimNo} | Name: ${a.name || '-'} | Location: ${a.location || '-'}`;
        const key = `${ref}||${details}`;
        if (seenActivity.has(key)) { actSkipped++; continue; }
        seenActivity.add(key);

        rowsToInsert.push([
          null, 'Legacy System', action, ref, details,
          a.date ? new Date(a.date) : new Date(),
        ]);
      }

      if (rowsToInsert.length === 0) continue;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const values = [];
        const params = [];
        let p = 0;
        for (const r of rowsToInsert) {
          values.push(`($${++p}, $${++p}, $${++p}, $${++p}, $${++p}, $${++p})`);
          params.push(...r);
        }
        await client.query(
          `INSERT INTO audit_logs
             (user_id, user_name, action, resource, details, timestamp)
           VALUES ${values.join(',')}`,
          params
        );
        await client.query('COMMIT');
        actInserted += rowsToInsert.length;
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
        throw err;
      }
      client.release();

      if (i % PROGRESS_EVERY === 0) {
        console.log(`  ... ${actInserted} activity rows inserted`);
      }
    }

    console.log(`Activity: ${actInserted} inserted, ${actSkipped} skipped`);
  }

  // 7. Final summary — no template literals, no undefined vars
  try {
    const summary = await query(
      "SELECT " +
      "  COUNT(*) AS total, " +
      "  COUNT(*) FILTER (WHERE claim_number IS NOT NULL) AS with_claim_no, " +
      "  COUNT(*) FILTER (WHERE product_custom_fields->>'legacy_source' = 'AIC_Claim') AS legacy " +
      "FROM documents"
    );
    const actTotal = await query(
      "SELECT COUNT(*) AS c FROM audit_logs WHERE user_name = 'Legacy System'"
    );
    console.log('=== Migration complete ===');
    console.log('Total documents    :', summary.rows[0].total);
    console.log('With claim_no      :', summary.rows[0].with_claim_no);
    console.log('Marked as legacy   :', summary.rows[0].legacy);
    console.log('Legacy audit rows  :', actTotal.rows[0].c);
    console.log('Total time (min)   :', ((Date.now() - startedAt) / 60000).toFixed(1));
  } catch (e) {
    console.error('⚠️  Summary print failed (data is already committed):', e.message);
  }
}

migrate()
  .then(async () => { await pool.end(); await legacy.end(); process.exit(0); })
  .catch(async (err) => {
    console.error('❌ Migration failed:', err);
    try { await pool.end();   } catch (_) {}
    try { await legacy.end(); } catch (_) {}
    process.exit(1);
  });