import { User } from '../models/index.js';
import { verifyPassword } from '../utils/password.js';
import { generateToken } from '../utils/token.js';

const sanitizeUser = (user) => {
  if (!user) return null;
  const plain = user.get({ plain: true });
  delete plain.password_hash;
  return plain;
};

export const login = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({
        success: false,
        message: 'username or email and password are required'
      });
    }

    const where = username ? { username } : { email };
    const user = await User.findOne({ where });

    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      data: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
