import pool from '../db/connection.js';
import { runFetchNow } from '../jobs/newsFetchJob.js';

// ─── Get Pending News Articles ────────────────────────────────────────────────
export const getPendingNews = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, title, summary, source, image_url, article_url, published_at, fetched_at, created_at
      FROM news 
      WHERE is_automated = TRUE AND status = 'PENDING'
    `;
    
    const params = [];

    if (search) {
      query += ` AND (title LIKE ? OR source LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY fetched_at DESC, created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [articles] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM news WHERE is_automated = TRUE AND status = \'PENDING\'';
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (title LIKE ? OR source LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [[{ total }]] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get pending news error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Get Approved News Articles ───────────────────────────────────────────────
export const getApprovedNews = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, title, summary, source, image_url, article_url, published_at, is_published, created_at
      FROM news 
      WHERE is_automated = TRUE AND status = 'APPROVED'
    `;
    
    const params = [];

    if (search) {
      query += ` AND (title LIKE ? OR source LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [articles] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM news WHERE is_automated = TRUE AND status = \'APPROVED\'';
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (title LIKE ? OR source LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [[{ total }]] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get approved news error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Approve Single Article ───────────────────────────────────────────────────
export const approveArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE news 
       SET status = 'APPROVED', is_published = TRUE, updated_at = NOW() 
       WHERE id = ? AND is_automated = TRUE`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, message: 'Article approved and published' });
  } catch (error) {
    console.error('Approve article error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Reject Single Article ────────────────────────────────────────────────────
export const rejectArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE news 
       SET status = 'REJECTED', is_published = FALSE, updated_at = NOW() 
       WHERE id = ? AND is_automated = TRUE`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, message: 'Article rejected' });
  } catch (error) {
    console.error('Reject article error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Bulk Approve Articles ────────────────────────────────────────────────────
export const bulkApproveArticles = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid article IDs' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.query(
      `UPDATE news 
       SET status = 'APPROVED', is_published = TRUE, updated_at = NOW() 
       WHERE id IN (${placeholders}) AND is_automated = TRUE`,
      ids
    );

    res.json({ 
      success: true, 
      message: `${result.affectedRows} article(s) approved and published` 
    });
  } catch (error) {
    console.error('Bulk approve error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Bulk Reject Articles ─────────────────────────────────────────────────────
export const bulkRejectArticles = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid article IDs' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.query(
      `UPDATE news 
       SET status = 'REJECTED', is_published = FALSE, updated_at = NOW() 
       WHERE id IN (${placeholders}) AND is_automated = TRUE`,
      ids
    );

    res.json({ 
      success: true, 
      message: `${result.affectedRows} article(s) rejected` 
    });
  } catch (error) {
    console.error('Bulk reject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Delete Approved Article ──────────────────────────────────────────────────
export const deleteApprovedArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM news WHERE id = ? AND is_automated = TRUE',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Toggle Article Publish Status ────────────────────────────────────────────
export const togglePublishStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Get current status
    const [[article]] = await pool.query(
      'SELECT is_published FROM news WHERE id = ? AND is_automated = TRUE AND status = \'APPROVED\'',
      [id]
    );

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const newStatus = !article.is_published;

    await pool.query(
      'UPDATE news SET is_published = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    );

    res.json({ 
      success: true, 
      message: newStatus ? 'Article published' : 'Article unpublished',
      is_published: newStatus
    });
  } catch (error) {
    console.error('Toggle publish error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Toggle Article Trending Status ───────────────────────────────────────────
export const toggleTrendingStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Get current status
    const [[article]] = await pool.query(
      'SELECT is_trending FROM news WHERE id = ? AND is_automated = TRUE AND status = \'APPROVED\'',
      [id]
    );

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const newStatus = !article.is_trending;

    await pool.query(
      'UPDATE news SET is_trending = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    );

    res.json({ 
      success: true, 
      message: newStatus ? 'Article marked as trending' : 'Trending status removed',
      is_trending: newStatus
    });
  } catch (error) {
    console.error('Toggle trending error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Manual Trigger News Fetch ────────────────────────────────────────────────
export const triggerNewsFetch = async (req, res) => {
  try {
    console.log('🔄 Manual news fetch triggered by admin');
    
    // Run fetch in background
    runFetchNow().then(result => {
      console.log('Manual fetch completed:', result);
    }).catch(error => {
      console.error('Manual fetch failed:', error);
    });

    res.json({ 
      success: true, 
      message: 'News fetch started in background. Check console for progress.' 
    });
  } catch (error) {
    console.error('Trigger fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Get Fetch Statistics ─────────────────────────────────────────────────────
export const getFetchStats = async (req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN is_published = TRUE THEN 1 ELSE 0 END) as published,
        MAX(fetched_at) as last_fetch
      FROM news 
      WHERE is_automated = TRUE
    `);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
