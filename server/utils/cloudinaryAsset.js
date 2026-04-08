const cloudinary = require("../config/cloudinary");

const destroyCloudinaryAsset = async (publicId, resourceType = "image") => {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error("Failed to delete Cloudinary asset", publicId, error.message);
  }
};

const destroyCloudinaryAssets = async (
  publicIds = [],
  resourceType = "image",
) => {
  await Promise.all(
    publicIds
      .filter(Boolean)
      .map((publicId) => destroyCloudinaryAsset(publicId, resourceType)),
  );
};

module.exports = {
  destroyCloudinaryAsset,
  destroyCloudinaryAssets,
};
