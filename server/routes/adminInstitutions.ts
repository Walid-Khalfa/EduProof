import express from 'express';
import { requireAdmin } from '../utils/requireAdmin';
import { getSupabaseClient } from '../services/supabase';
import { normalize } from '../utils/normalize';
import { logger } from '../utils/logger';

const router = express.Router();

router.use(requireAdmin);

router.get('/api/admin/institutions', async (req, res) => {
  try {
    const { search, status, limit = '10', offset = '0' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'DATABASE_NOT_CONFIGURED', message: 'Database service is not available' });
    }

    let query = supabase
      .from('institutions')
      .select(`
        id,
        name,
        wallet,
        did_uri,
        min_score,
        status,
        created_at
      `)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    if (search && typeof search === 'string') {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) {
      logger.error('Failed to fetch institutions', { error: itemsError.message });
      return res.status(500).json({ error: 'server_error', message: itemsError.message });
    }

    let countQuery = supabase
      .from('institutions')
      .select('id', { count: 'exact', head: true });

    if (status && typeof status === 'string') {
      countQuery = countQuery.eq('status', status);
    }

    if (search && typeof search === 'string') {
      countQuery = countQuery.ilike('name', `%${search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      logger.error('Failed to count institutions', { error: countError.message });
      return res.status(500).json({ error: 'server_error', message: countError.message });
    }

    const institutionIds = items?.map(i => i.id) || [];
    const { data: certCounts, error: certError } = await supabase
      .from('certificates')
      .select('institution_id')
      .in('institution_id', institutionIds);

    if (certError) {
      logger.warn('Failed to fetch certificate counts', { error: certError.message });
    }

    const certCountMap = new Map<string, number>();
    certCounts?.forEach(cert => {
      const current = certCountMap.get(cert.institution_id) || 0;
      certCountMap.set(cert.institution_id, current + 1);
    });

    const itemsWithCounts = items?.map(inst => ({
      id: inst.id,
      name: inst.name,
      wallet: inst.wallet,
      didUri: inst.did_uri,
      min_score: inst.min_score,
      status: inst.status,
      certificates_count: certCountMap.get(inst.id) || 0,
      created_at: inst.created_at
    }));

    return res.json({
      items: itemsWithCounts || [],
      total: count || 0,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (err: any) {
    logger.error('Unexpected error in GET /api/admin/institutions', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

router.post('/api/admin/institutions', async (req, res) => {
  try {
    const { name, wallet, didUri, min_score = 70, status = 'approved' } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'invalid_payload', message: 'name is required' });
    }

    if (wallet && typeof wallet === 'string' && !wallet.startsWith('0x')) {
      return res.status(400).json({ error: 'invalid_payload', message: 'wallet must start with 0x' });
    }

    if (!['approved', 'revoked'].includes(status)) {
      return res.status(400).json({ error: 'invalid_payload', message: 'status must be approved or revoked' });
    }

    if (typeof min_score !== 'number' || min_score < 0 || min_score > 100) {
      return res.status(400).json({ error: 'invalid_payload', message: 'min_score must be between 0 and 100' });
    }

    const name_normalized = normalize(name);
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'DATABASE_NOT_CONFIGURED', message: 'Database service is not available' });
    }

    const { data: existing, error: checkError } = await supabase
      .from('institutions')
      .select('id')
      .eq('name_normalized', name_normalized)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'duplicate_institution', message: 'Institution with this name already exists' });
    }

    const { data, error } = await supabase
      .from('institutions')
      .insert({
        name,
        name_normalized,
        wallet,
        did_uri: didUri,
        min_score,
        status
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'duplicate_institution', message: 'Institution already exists' });
      }
      logger.error('Failed to create institution', { error: error.message });
      return res.status(500).json({ error: 'server_error', message: error.message });
    }

    return res.status(201).json({
      ok: true,
      institution: {
        id: data.id,
        name: data.name,
        wallet: data.wallet,
        didUri: data.did_uri,
        min_score: data.min_score,
        status: data.status,
        created_at: data.created_at
      }
    });
  } catch (err: any) {
    logger.error('Unexpected error in POST /api/admin/institutions', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

router.patch('/api/admin/institutions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, wallet, didUri, min_score, status } = req.body;

    const updates: any = {};

    if (name !== undefined) {
      updates.name = name;
      updates.name_normalized = normalize(name);
    }

    if (wallet !== undefined) {
      if (wallet && !wallet.startsWith('0x')) {
        return res.status(400).json({ error: 'invalid_payload', message: 'wallet must start with 0x' });
      }
      updates.wallet = wallet;
    }

    if (didUri !== undefined) {
      updates.did_uri = didUri;
    }

    if (min_score !== undefined) {
      if (typeof min_score !== 'number' || min_score < 0 || min_score > 100) {
        return res.status(400).json({ error: 'invalid_payload', message: 'min_score must be between 0 and 100' });
      }
      updates.min_score = min_score;
    }

    if (status !== undefined) {
      if (!['approved', 'revoked'].includes(status)) {
        return res.status(400).json({ error: 'invalid_payload', message: 'status must be approved or revoked' });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'invalid_payload', message: 'No fields to update' });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'DATABASE_NOT_CONFIGURED', message: 'Database service is not available' });
    }

    const { data, error } = await supabase
      .from('institutions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'not_found', message: 'Institution not found' });
      }
      if (error.code === '23505') {
        return res.status(409).json({ error: 'duplicate_institution', message: 'Institution name already exists' });
      }
      logger.error('Failed to update institution', { error: error.message });
      return res.status(500).json({ error: 'server_error', message: error.message });
    }

    return res.json({
      ok: true,
      institution: {
        id: data.id,
        name: data.name,
        wallet: data.wallet,
        didUri: data.did_uri,
        min_score: data.min_score,
        status: data.status,
        updated_at: data.updated_at
      }
    });
  } catch (err: any) {
    logger.error('Unexpected error in PATCH /api/admin/institutions/:id', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

router.post('/api/admin/institutions/:id/revoke', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'DATABASE_NOT_CONFIGURED', message: 'Database service is not available' });
    }

    const { data, error } = await supabase
      .from('institutions')
      .update({ status: 'revoked' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'not_found', message: 'Institution not found' });
      }
      logger.error('Failed to revoke institution', { error: error.message });
      return res.status(500).json({ error: 'server_error', message: error.message });
    }

    return res.json({ ok: true, status: data.status });
  } catch (err: any) {
    logger.error('Unexpected error in POST /api/admin/institutions/:id/revoke', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

router.post('/api/admin/institutions/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ ok: false, error: 'DATABASE_NOT_CONFIGURED', message: 'Database service is not available' });
    }

    const { data, error } = await supabase
      .from('institutions')
      .update({ status: 'approved' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'not_found', message: 'Institution not found' });
      }
      logger.error('Failed to approve institution', { error: error.message });
      return res.status(500).json({ error: 'server_error', message: error.message });
    }

    return res.json({ ok: true, status: data.status });
  } catch (err: any) {
    logger.error('Unexpected error in POST /api/admin/institutions/:id/approve', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

export default router;
