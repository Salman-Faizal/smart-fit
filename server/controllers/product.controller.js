const Product = require("../models/Product");
const User = require("../models/User");
const { prependUniqueWithLimit } = require("../services/userTracking.service");
const { destroyCloudinaryAsset, destroyCloudinaryAssets } = require("../utils/cloudinaryAsset");

const mapUploadedFiles = (files = []) => {
  return files.map((file) => ({
    url: file.path || file.secure_url,
    publicId: file.filename || file.public_id,
  }));
};

const FIT_ENUM = ["Slim", "Regular", "Relaxed", "Oversized"];
const STYLE_ENUM = ["Classic", "Streetwear", "Smart Casual", "Minimalist"];
const OCCASION_ENUM = ["Casual", "Formal", "Night Out", "Active"];
const COLOR_FAMILY_ENUM = ["Neutrals", "Earth Tones", "Bold & Bright", "Navy & Blues"];

function pickStyleAttrs(body) {
  const attrs = {};
  if (body.fit !== undefined) attrs.fit = FIT_ENUM.includes(body.fit) ? body.fit : null;
  if (body.style !== undefined) attrs.style = STYLE_ENUM.includes(body.style) ? body.style : null;
  if (body.occasion !== undefined) attrs.occasion = OCCASION_ENUM.includes(body.occasion) ? body.occasion : null;
  if (body.colorFamily !== undefined) attrs.colorFamily = COLOR_FAMILY_ENUM.includes(body.colorFamily) ? body.colorFamily : null;
  return attrs;
}

exports.createProduct = async (req, res) => {
  try {
    const { name, description, category, price, stock } = req.body || {};

    if (!name || !category || price === undefined || stock === undefined) {
      return res.status(400).json({
        message: "name, category, price and stock are required",
      });
    }

    const primaryFiles = req.files?.primaryImage || [];
    const secondaryFiles = req.files?.secondaryImages || [];
    const primaryData = mapUploadedFiles(primaryFiles)[0] || null;
    const secondaryData = mapUploadedFiles(secondaryFiles);

    const product = await Product.create({
      name,
      description,
      category,
      price: Number(price),
      stock: Number(stock),
      primaryImage: primaryData?.url || "",
      primaryImagePublicId: primaryData?.publicId || "",
      secondaryImages: secondaryData.map((i) => i.url),
      secondaryImagePublicIds: secondaryData.map((i) => i.publicId),
      images: [primaryData?.url, ...secondaryData.map((i) => i.url)].filter(Boolean),
      imagePublicIds: [primaryData?.publicId, ...secondaryData.map((i) => i.publicId)].filter(Boolean),
      ...pickStyleAttrs(req.body || {}),
    });

    return res.status(201).json(product);
  } catch (_err) {
    return res.status(500).json({ message: "Failed to create product" });
  }
};

exports.getProducts = async (req, res) => {
  try {
    let query = { status: { $ne: "deleted" } };
    const {
      category,
      search,
      sort,
      dateRange,
      page = 1,
      limit = 10,
    } = req.query;

    if (category) {
      const categories = category
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (categories.length > 1) {
        query.category = { $in: categories };
      } else if (categories.length === 1) {
        query.category = categories[0];
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (dateRange) {
      const now = new Date();
      const dateThreshold = new Date(now);

      if (dateRange === "last_week") {
        dateThreshold.setDate(now.getDate() - 7);
        query.createdAt = { $gte: dateThreshold };
      } else if (dateRange === "last_month") {
        dateThreshold.setMonth(now.getMonth() - 1);
        query.createdAt = { $gte: dateThreshold };
      }
    }

    const sortOptions = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      views_desc: { views: -1 },
      created_asc: { createdAt: 1 },
      created_desc: { createdAt: -1 },
      popular_desc: { views: -1, purchases: -1, createdAt: -1 },
    };
    const sortQuery = sortOptions[sort] || { createdAt: -1 };

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortQuery).skip(skip).limit(limitNumber),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      products,
      total,
      page: pageNumber,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (_err) {
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};

exports.getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const shouldTrack = req.user?.role !== "admin";

    const product = shouldTrack
      ? await Product.findByIdAndUpdate(
          id,
          { $inc: { views: 1 } },
          { new: true },
        )
      : await Product.findById(id);

    if (!product || product.status === "deleted") {
      return res.status(404).json({ message: "Product not found" });
    }

    if (shouldTrack && req.user?.id && req.user?.role === "customer") {
      const user = await User.findById(req.user.id).select(
        "recentlyViewed viewedProducts",
      );

      if (user) {
        user.recentlyViewed = prependUniqueWithLimit(
          user.recentlyViewed,
          product._id,
          10,
        );
        user.viewedProducts = prependUniqueWithLimit(
          user.viewedProducts,
          product._id,
        );

        await user.save();
      }
    }

    return res.status(200).json(product);
  } catch (err) {
    console.error("getSingleProduct failed", err);

    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid product id" });
    }

    return res.status(500).json({ message: "Failed to fetch product" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, stock } = req.body || {};

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (price !== undefined) updates.price = Number(price);
    if (stock !== undefined) updates.stock = Number(stock);

    Object.assign(updates, pickStyleAttrs(req.body || {}));

    const hasPrimaryUpload = !!(req.files?.primaryImage?.length);
    const hasSecondaryUpload = !!(req.files?.secondaryImages?.length);
    const clearingPrimary = req.body.clearPrimaryImage === "true";
    const hasKeepList = req.body.keepSecondaryImages !== undefined;
    const hasImageChanges = hasPrimaryUpload || hasSecondaryUpload || clearingPrimary || hasKeepList;

    const hasBodyChanges = Object.keys(updates).length > 0;
    if (!hasBodyChanges && !hasImageChanges) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    if (hasImageChanges) {
      // ── Primary image ──────────────────────────────────────────────────────
      let curPrimary = product.primaryImage || product.images?.[0] || "";
      let curPrimaryPublicId = product.primaryImagePublicId || product.imagePublicIds?.[0] || "";

      if (clearingPrimary && curPrimary) {
        await destroyCloudinaryAsset(curPrimaryPublicId).catch(() => {});
        curPrimary = "";
        curPrimaryPublicId = "";
      }
      if (hasPrimaryUpload) {
        if (curPrimaryPublicId) await destroyCloudinaryAsset(curPrimaryPublicId).catch(() => {});
        const f = mapUploadedFiles(req.files.primaryImage)[0];
        curPrimary = f.url;
        curPrimaryPublicId = f.publicId;
      }
      updates.primaryImage = curPrimary;
      updates.primaryImagePublicId = curPrimaryPublicId;

      // ── Secondary images ───────────────────────────────────────────────────
      const existingSecondary = product.secondaryImages?.length
        ? product.secondaryImages
        : (product.images?.slice(1) || []);
      const existingSecondaryPublicIds = product.secondaryImagePublicIds?.length
        ? product.secondaryImagePublicIds
        : (product.imagePublicIds?.slice(1) || []);

      const keepUrls = hasKeepList
        ? JSON.parse(req.body.keepSecondaryImages || "[]")
        : existingSecondary;

      const removedPublicIds = existingSecondary
        .map((url, idx) => (keepUrls.includes(url) ? null : existingSecondaryPublicIds[idx]))
        .filter(Boolean);
      await destroyCloudinaryAssets(removedPublicIds).catch(() => {});

      const keptPublicIds = keepUrls.map((url) => {
        const idx = existingSecondary.indexOf(url);
        return idx >= 0 ? existingSecondaryPublicIds[idx] : "";
      });

      const newSecondaryData = hasSecondaryUpload ? mapUploadedFiles(req.files.secondaryImages) : [];

      updates.secondaryImages = [...keepUrls, ...newSecondaryData.map((i) => i.url)];
      updates.secondaryImagePublicIds = [...keptPublicIds, ...newSecondaryData.map((i) => i.publicId)];

      // Keep images[] in sync
      updates.images = [updates.primaryImage, ...updates.secondaryImages].filter(Boolean);
      updates.imagePublicIds = [updates.primaryImagePublicId, ...updates.secondaryImagePublicIds].filter(Boolean);
    }

    Object.assign(product, updates);
    await product.save();

    return res.status(200).json(product);
  } catch (_err) {
    return res.status(400).json({ message: "Failed to update product" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await destroyCloudinaryAssets(product.imagePublicIds || []);

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (_err) {
    return res.status(400).json({ message: "Failed to delete product" });
  }
};
