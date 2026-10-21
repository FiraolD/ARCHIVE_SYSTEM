BEGIN;
DELETE FROM document_versions 
 WHERE document_id IN (
   SELECT id FROM documents 
   WHERE product_custom_fields->>'legacy_source' = 'AIC_Claim'
 );
DELETE FROM documents 
 WHERE product_custom_fields->>'legacy_source' = 'AIC_Claim';
COMMIT;
SELECT COUNT(*) AS remaining FROM documents;
