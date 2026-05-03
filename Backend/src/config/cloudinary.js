const { Readable } = require("stream");
const cloudinary = require("cloudinary").v2;

function cloudinary_is_configured() {
  const name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  return Boolean(name && key && secret);
}

if (cloudinary_is_configured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
  });
}

/**
 * Derive Cloudinary public_id from secure_url (folder/path without extension).
 * Assumes upload URLs without inline transformation segments (SDK upload_stream default).
 */
function public_id_from_secure_url(secure_url) {
  if (!secure_url || typeof secure_url !== "string") return null;
  const u = secure_url.split("?")[0];
  const key = "/upload/";
  const i = u.indexOf(key);
  if (i === -1) return null;
  let path = u.slice(i + key.length).replace(/^v\d+\//, "");
  path = path.replace(/\.(jpe?g|png|webp|gif)$/i, "");
  return path || null;
}

function upload_image_buffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const upload_stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(upload_stream);
  });
}

/** Delete asset by public_id (folder/path without extension). */
function destroy_public_id(public_id) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(public_id, { resource_type: "image" }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function delete_by_secure_url(secure_url) {
  const pid = public_id_from_secure_url(secure_url);
  if (!pid) {
    console.warn("[cloudinary] Could not parse public_id from URL; skip destroy.");
    return null;
  }
  return destroy_public_id(pid);
}

module.exports = {
  cloudinary,
  cloudinary_is_configured,
  upload_image_buffer,
  public_id_from_secure_url,
  destroy_public_id,
  delete_by_secure_url,
};
