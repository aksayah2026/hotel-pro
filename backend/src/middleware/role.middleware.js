const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please log in."
    });
  }

  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Super Admin access only."
    });
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please log in."
    });
  }

  if (req.user.role !== "TENANT_ADMIN" && req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Administrator access only."
    });
  }

  next();
};

module.exports = {
  requireSuperAdmin,
  requireAdmin
};
