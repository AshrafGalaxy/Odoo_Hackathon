// middleware.js: Contains middleware functions, primarily for authentication.
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // No token, unauthorized

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Token is invalid
    req.user = user; // Add decoded user payload to the request object
    next();
  });
}

// Replace the old authorizeRole function with this new one
function authorizeRole(roles) {
  return (req, res, next) => {
    // Ensure roles is an array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}


module.exports = { authenticateToken, authorizeRole };