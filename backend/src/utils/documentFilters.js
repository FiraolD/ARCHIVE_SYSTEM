function buildWhere(filters = {}, exclude = []) {
  const clauses = [];
  const params = [];

  const push = (val) => {
    params.push(val);
    return `$${params.length}`;
  };

  const {
    search, type, status, branch_id, plate_number, insured_name,
    date_of_accident_from, date_of_accident_to,
    sum_insured_min, sum_insured_max, legacy,
  } = filters;

  if (search && !exclude.includes('search')) {
    const p = push(`%${search}%`);
    clauses.push(`(
      d.title ILIKE ${p} OR
      d.archive_reference_number ILIKE ${p} OR
      d.claim_number ILIKE ${p} OR
      d.policy_number ILIKE ${p} OR
      d.insured_name ILIKE ${p} OR
      d.plate_number ILIKE ${p}
    )`);
  }
  if (type && !exclude.includes('type')) {
    clauses.push(`d.type = ${push(type)}`);
  }
  if (status && !exclude.includes('status')) {
    clauses.push(`d.status = ${push(status)}`);
  }
  if (branch_id && !exclude.includes('branch')) {
    clauses.push(`d.branch_id = ${push(branch_id)}`);
  }
  if (plate_number && !exclude.includes('plate')) {
    clauses.push(`d.plate_number ILIKE ${push(`%${plate_number}%`)}`);
  }
  if (insured_name && !exclude.includes('insured')) {
    clauses.push(`d.insured_name ILIKE ${push(`%${insured_name}%`)}`);
  }
  if (date_of_accident_from && !exclude.includes('accident')) {
    clauses.push(`d.date_of_accident >= ${push(date_of_accident_from)}`);
  }
  if (date_of_accident_to && !exclude.includes('accident')) {
    clauses.push(`d.date_of_accident <= ${push(date_of_accident_to)}`);
  }
  if (sum_insured_min && !exclude.includes('sum')) {
    clauses.push(`d.sum_insured >= ${push(Number(sum_insured_min))}`);
  }
  if (sum_insured_max && !exclude.includes('sum')) {
    clauses.push(`d.sum_insured <= ${push(Number(sum_insured_max))}`);
  }
  if (legacy === 'true' && !exclude.includes('legacy')) {
    clauses.push(`d.product_custom_fields->>'legacy_source' IS NOT NULL`);
  }
  if (legacy === 'false' && !exclude.includes('legacy')) {
    clauses.push(`d.product_custom_fields->>'legacy_source' IS NULL`);
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

module.exports = { buildWhere };
