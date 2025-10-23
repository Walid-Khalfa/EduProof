# Database Migration Instructions

## Apply institution_id FK Migration

The migration file `supabase/migrations/20241022000000_add_institution_id_fk.sql` has been created but needs to be applied manually.

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20241022000000_add_institution_id_fk.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute

### Option 2: Supabase CLI (if available locally)

```bash
supabase db push
```

### What This Migration Does

1. **Adds `institution_id` column** to `certificates` table
2. **Backfills existing data** by matching `institution_norm` to `institutions.name_normalized`
3. **Creates FK constraint** linking certificates to institutions
4. **Adds indexes** for performance on `minter_address` and `institution_id`
5. **Notifies PostgREST** to reload schema cache

### Verification

After running the migration, verify it worked:

```sql
-- Check column exists
\d+ public.certificates

-- Check FK constraint exists
SELECT conname, contype 
FROM pg_constraint 
WHERE conname = 'certificates_institution_id_fkey';

-- Check backfill worked
SELECT count(*) 
FROM public.certificates 
WHERE institution_id IS NOT NULL;

-- Check indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'certificates' 
AND indexname IN ('idx_certificates_owner', 'idx_certificates_institution_id');
```

### Testing the API

Once migration is applied, test the owner endpoint:

```bash
# Replace with actual values
export BASE="https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev"
export ADDRESS="0x..." # lowercase wallet address

curl -sS "$BASE/api/certificates/owner/$ADDRESS" | jq
```

Expected response should include embedded `institutions` object:

```json
{
  "ok": true,
  "certificates": [
    {
      "id": "...",
      "cert_id": "...",
      "institutions": {
        "id": "...",
        "name": "...",
        "verified": true
      }
    }
  ]
}
```

## Troubleshooting

If you see "Could not find a relationship" error:
1. Verify the migration ran successfully
2. Check that PostgREST schema cache was reloaded
3. Try manually running: `NOTIFY pgrst, 'reload schema';`
