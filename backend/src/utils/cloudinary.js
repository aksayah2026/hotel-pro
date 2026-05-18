const cloudinary = require('cloudinary').v2;

// Check if Cloudinary credentials are set up; fallback gracefully to local disk or log warnings if missing
const isConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('☁️ Cloudinary SDK configured successfully.');
} else {
  console.warn('⚠️ WARNING: Cloudinary credentials are not configured in .env. Falling back to mock uploads.');
}

/**
 * Upload a file buffer to Cloudinary with tenant-wise folder isolation.
 * 
 * @param {Buffer} fileBuffer - The file buffer from multer.
 * @param {string} tenantId - The UUID or ID of the tenant.
 * @param {string} category - The subfolder type: 'aadhaar', 'rooms', 'invoices', 'profiles', 'logos'.
 * @param {Object} options - Additional options for Cloudinary upload.
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
const uploadBuffer = (fileBuffer, tenantId = 'global', category = 'general', options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isConfigured) {
      // In development, if Cloudinary credentials are not configured, simulate success with a local mock URL
      // to prevent breaking development flows when keys are blank.
      const mockFilename = `${category}-${tenantId}-${Date.now()}.jpg`;
      console.warn(`[Cloudinary Mock] Upload simulated for tenant ${tenantId}, category ${category}`);
      return resolve({
        secure_url: `/uploads/mock-${mockFilename}`,
        public_id: `mock/tenant-${tenantId}/${category}/${mockFilename.split('.')[0]}`,
      });
    }

    // Dynamic multi-tenant folder structure: hotelpro/tenant-{tenantId}/{category}/
    const folder = `hotelpro/tenant-${tenantId}/${category}`;
    
    const uploadOptions = {
      folder,
      resource_type: 'auto',
      ...options,
    };

    // Aadhaar/KYC uploads are private government documents, let's mark them as 'private' type in Cloudinary
    if (category === 'aadhaar') {
      uploadOptions.type = 'private'; // Private document restriction in Cloudinary
    }

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        console.error(`[Cloudinary SDK] Upload failed for tenant-${tenantId}/${category}:`, error);
        return reject(error);
      }
      resolve({
        secure_url: result.secure_url,
        public_id: result.public_id,
      });
    });

    stream.end(fileBuffer);
  });
};

/**
 * Reusable helper to upload standard public images (rooms, profiles, logos)
 * Applied advanced transformations:
 * - Auto-format and quality optimization (fetch_format: 'auto', quality: 'auto')
 * - Crop/Resize to maximum standard dimensions (1280px width, 1280px height)
 * - Progressive loading flag for smooth render speeds on slow mobile grids
 */
const uploadImage = async (fileBuffer, tenantId, category = 'rooms') => {
  return uploadBuffer(fileBuffer, tenantId, category, {
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
    transformation: [
      { width: 1280, height: 1280, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
      { flags: 'progressive' }
    ]
  });
};

/**
 * Reusable helper to upload secure KYC/Aadhaar documents
 * Applied tailored text-readability compression:
 * - Restricts extreme resolutions but preserves text legibility
 * - Quality capped at '80' to target a highly efficient 200KB - 500KB footprint
 */
const uploadDocument = async (fileBuffer, tenantId, category = 'aadhaar') => {
  return uploadBuffer(fileBuffer, tenantId, category, {
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'heic', 'heif'],
    transformation: [
      { width: 1600, height: 1600, crop: 'limit' },
      { quality: '80', fetch_format: 'auto' },
      { flags: 'progressive' }
    ]
  });
};

/**
 * Delete an asset from Cloudinary using its public_id.
 * Handles both public images and private document types.
 * 
 * @param {string} publicId - The public_id of the asset in Cloudinary.
 * @returns {Promise<boolean>}
 */
const deleteAsset = async (publicId) => {
  if (!publicId) return false;
  if (!isConfigured || publicId.startsWith('mock/')) {
    console.warn(`[Cloudinary Mock] Delete simulated for public_id: ${publicId}`);
    return true;
  }

  try {
    // Detect if this was a private document (starts with the 'aadhaar' folder pattern)
    const isPrivate = publicId.includes('/aadhaar/');
    const options = isPrivate ? { type: 'private' } : {};
    
    console.log(`[Cloudinary SDK] Deleting asset: ${publicId} (type: ${isPrivate ? 'private' : 'default'})`);
    const result = await cloudinary.uploader.destroy(publicId, options);
    console.log('[Cloudinary SDK] Delete response:', result);
    return result.result === 'ok';
  } catch (error) {
    console.error(`[Cloudinary SDK] Failed to delete asset with public_id ${publicId}:`, error);
    return false;
  }
};

/**
 * Extract public_id from a Cloudinary URL.
 * Supports public and private resources under 'hotelpro/'
 * 
 * @param {string} url - The Cloudinary URL.
 * @returns {string|null} The public_id, or null if not a Cloudinary URL.
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    const privateIndex = parts.indexOf('private');
    
    let startIndex = -1;
    if (uploadIndex !== -1) {
      startIndex = uploadIndex + 1;
    } else if (privateIndex !== -1) {
      startIndex = privateIndex + 1;
    }
    
    if (startIndex === -1) return null;
    
    // Skip version (which starts with 'v' followed by digits)
    if (parts[startIndex].startsWith('v') && /^\d+$/.test(parts[startIndex].substring(1))) {
      startIndex++;
    } else if (parts[startIndex + 1] && parts[startIndex + 1].startsWith('v') && /^\d+$/.test(parts[startIndex + 1].substring(1))) {
      // In case there are signatures (s--...--) before version
      startIndex += 2;
    }
    
    // Join the remaining parts and remove file extension
    const pathWithExt = parts.slice(startIndex).join('/');
    const lastDotIndex = pathWithExt.lastIndexOf('.');
    const publicId = lastDotIndex !== -1 ? pathWithExt.substring(0, lastDotIndex) : pathWithExt;
    return publicId || null;
  } catch (error) {
    console.error('[Cloudinary Utils] Failed to extract publicId from URL:', url, error);
    return null;
  }
};

/**
 * Bulk delete all assets inside a tenant's isolated Cloudinary directory and remove the folder structure itself.
 * This utilizes Cloudinary's Admin API to perform a deep-clean sweep.
 * 
 * @param {string} tenantId - The UUID or ID of the tenant.
 * @returns {Promise<boolean>}
 */
const deleteTenantFolder = async (tenantId) => {
  if (!tenantId) return false;
  if (!isConfigured) {
    console.warn(`[Cloudinary Mock] Bulk folder delete simulated for tenant: tenant-${tenantId}`);
    return true;
  }

  const prefix = `hotelpro/tenant-${tenantId}/`;
  console.log(`[Cloudinary SDK] Bulk deleting all assets under prefix: ${prefix}`);
  
  try {
    // 1. Delete all standard public resource types under the tenant prefix (image, video, raw)
    const resourceTypes = ['image', 'video', 'raw'];
    for (const rType of resourceTypes) {
      // Delete public assets
      const publicResult = await cloudinary.api.delete_resources_by_prefix(prefix, {
        resource_type: rType,
        type: 'upload'
      });
      console.log(`[Cloudinary SDK] Delete upload/${rType} result:`, publicResult);

      // Delete private assets (specifically private Aadhaar/KYC documents)
      const privateResult = await cloudinary.api.delete_resources_by_prefix(prefix, {
        resource_type: rType,
        type: 'private'
      });
      console.log(`[Cloudinary SDK] Delete private/${rType} result:`, privateResult);
    }

    // 2. Delete the subfolders under the tenant directory
    // Note: Cloudinary folders cannot be deleted unless they are completely empty of assets.
    // The Admin API provides delete_folder but it will throw an error if the folder is not empty.
    const subfolders = ['aadhaar', 'rooms', 'invoices', 'profiles', 'documents', 'general'];
    for (const sub of subfolders) {
      try {
        const folderPath = `hotelpro/tenant-${tenantId}/${sub}`;
        await cloudinary.api.delete_folder(folderPath);
        console.log(`[Cloudinary SDK] Deleted empty folder: ${folderPath}`);
      } catch (fErr) {
        // If subfolder doesn't exist, ignore the error
        if (fErr.error && fErr.error.http_code !== 404) {
          console.warn(`[Cloudinary SDK] Subfolder ${sub} delete warning:`, fErr.message);
        }
      }
    }

    // 3. Finally delete the root tenant folder itself
    const rootTenantFolder = `hotelpro/tenant-${tenantId}`;
    await cloudinary.api.delete_folder(rootTenantFolder);
    console.log(`[Cloudinary SDK] Successfully deleted tenant root directory: ${rootTenantFolder}`);
    return true;
  } catch (error) {
    console.error(`[Cloudinary SDK] Failed to bulk delete Cloudinary resources for tenant-${tenantId}:`, error);
    return false;
  }
};

/**
 * Generate a highly optimized delivery URL for an asset.
 * Delivers files using modern formats (webp/avif) and automated quality scales.
 * 
 * @param {string} publicId - The Cloudinary public_id of the asset.
 * @param {Object} options - Override options.
 * @returns {string} The optimized delivery URL.
 */
const getDeliveryUrl = (publicId, options = {}) => {
  if (!publicId) return '';
  if (!isConfigured || publicId.startsWith('mock/')) {
    // Development fallback mock path
    return `/uploads/${publicId.split('/').pop()}.jpg`;
  }
  
  // Private documents (Aadhaar cards) need 'private' delivery type in Cloudinary
  const isPrivate = publicId.includes('/aadhaar/');
  
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    type: isPrivate ? 'private' : 'upload',
    secure: true,
    ...options
  });
};

/**
 * Generate a high-performance thumbnail URL for room previews or dashboard cards.
 * Resizes the image aggressively and crops to target dimensions.
 * 
 * @param {string} publicId - The Cloudinary public_id of the asset.
 * @param {number} width - Thumbnail width.
 * @param {number} height - Thumbnail height.
 * @returns {string} The thumbnail delivery URL.
 */
const getThumbnailUrl = (publicId, width = 300, height = 300) => {
  if (!publicId) return '';
  return getDeliveryUrl(publicId, {
    width,
    height,
    crop: 'thumb',
    gravity: 'auto'
  });
};

module.exports = {
  cloudinary,
  isConfigured,
  uploadBuffer,
  uploadImage,
  uploadDocument,
  deleteAsset,
  extractPublicIdFromUrl,
  deleteTenantFolder,
  getDeliveryUrl,
  getThumbnailUrl,
};
