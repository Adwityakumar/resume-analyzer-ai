import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * protect — Verifies the JWT and attaches req.user.
 * Expects: Authorization: Bearer <token>
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorised, no token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorised, user not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorised, token invalid or expired.' });
  }
};

/**
 * isRecruiter — Must be used AFTER protect.
 * Blocks any non-recruiter from accessing the route.
 */
export const isRecruiter = (req, res, next) => {
  if (req.user && req.user.role === 'recruiter') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Recruiter accounts only.' });
};
