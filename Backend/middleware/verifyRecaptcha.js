import axios from 'axios';

/**
 * Verify reCAPTCHA token with Google's API
 * @param {string} token - The reCAPTCHA token from the frontend
 * @param {string} remoteIp - Optional IP address of the user
 * @returns {Promise<{success: boolean, score?: number, error?: string}>}
 */
export const verifyRecaptchaToken = async (token, remoteIp = null) => {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY is not configured');
      return { success: false, error: 'reCAPTCHA not configured' };
    }

    if (!token) {
      return { success: false, error: 'reCAPTCHA token is required' };
    }

    // Make request to Google reCAPTCHA API
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secretKey,
          response: token,
          ...(remoteIp && { remoteip: remoteIp })
        }
      }
    );

    const { success, score, 'error-codes': errorCodes } = response.data;

    if (!success) {
      console.error('reCAPTCHA verification failed:', errorCodes);
      return { 
        success: false, 
        error: 'reCAPTCHA verification failed',
        errorCodes 
      };
    }

    // For reCAPTCHA v3, check score (0.0 - 1.0, where 1.0 is very likely a good interaction)
    // For v2, score won't be present
    if (score !== undefined && score < 0.5) {
      console.warn('reCAPTCHA score too low:', score);
      return { 
        success: false, 
        error: 'reCAPTCHA score too low',
        score 
      };
    }

    return { success: true, score };
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error.message);
    return { 
      success: false, 
      error: 'Failed to verify reCAPTCHA' 
    };
  }
};

/**
 * Express middleware to verify reCAPTCHA token
 * Expects token in req.body.recaptchaToken
 */
export const verifyRecaptchaMiddleware = async (req, res, next) => {
  try {
    const { recaptchaToken } = req.body;
    const remoteIp = req.ip || req.connection.remoteAddress;

    const result = await verifyRecaptchaToken(recaptchaToken, remoteIp);

    if (!result.success) {
      return res.status(400).json({ 
        error: result.error || 'reCAPTCHA verification failed' 
      });
    }

    // Store score in request for further use if needed
    req.recaptchaScore = result.score;
    next();
  } catch (error) {
    console.error('reCAPTCHA middleware error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify reCAPTCHA' 
    });
  }
};
