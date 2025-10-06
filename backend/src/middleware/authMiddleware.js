import { User } from '../models/index.js';
import { verifyToken } from '../utils/token.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token missing' });
  }

  try {
    const payload = verifyToken(token);
    const user = await User.findByPk(payload.sub, {
      attributes: ['id', 'username', 'email', 'active']
    });

    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'User is not authorized' });
    }

    req.user = user.get({ plain: true });
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
