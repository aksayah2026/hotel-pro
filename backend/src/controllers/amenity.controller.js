const prisma = require('../lib/prisma');

// Simple in-memory cache (5 mins)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

// GET /api/amenities
const getAllAmenities = async (req, res) => {
  try {
    const cacheKey = `amenities:${req.user.tenantId}`;
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return res.json({ success: true, data: cached.data });
    }

    const amenities = await prisma.amenity.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { name: 'asc' },
    });
    
    cache.set(cacheKey, { data: amenities, timestamp: Date.now() });

    res.json({ success: true, data: amenities });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/amenities
const createAmenity = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const trimmedName = name.trim();

    const existing = await prisma.amenity.findUnique({
      where: {
        tenantId_name: {
          tenantId: req.user.tenantId,
          name: trimmedName
        }
      }
    });

    if (existing) return res.status(409).json({ success: false, message: 'Amenity already exists for this tenant' });

    const amenity = await prisma.amenity.create({
      data: { 
        name: trimmedName,
        tenantId: req.user.tenantId
      },
    });
    
    // Invalidate cache
    cache.delete(`amenities:${req.user.tenantId}`);
    
    res.status(201).json({ success: true, data: amenity });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/amenities/:id
const deleteAmenity = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const amenity = await prisma.amenity.findFirst({
      where: { id, tenantId: req.user.tenantId }
    });

    if (!amenity) return res.status(404).json({ success: false, message: 'Amenity not found' });

    await prisma.amenity.delete({ where: { id } });
    
    // Invalidate cache
    cache.delete(`amenities:${req.user.tenantId}`);
    
    res.json({ success: true, message: 'Amenity deleted successfully' });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllAmenities, createAmenity, deleteAmenity };
