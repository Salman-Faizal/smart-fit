const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
const PAYMENT_SLIP_MIME_TYPES = [...IMAGE_MIME_TYPES, "application/pdf"];

const createFileFilter = (allowedMimeTypes, invalidTypeMessage) => {
  return (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error(invalidTypeMessage), false);
  };
};

const createCloudinaryUploader = ({
  folder,
  allowedMimeTypes,
  invalidTypeMessage,
  maxFileSize,
}) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => ({
      folder,
      resource_type: file.mimetype === "application/pdf" ? "raw" : "image",
      allowed_formats:
        file.mimetype === "application/pdf"
          ? ["pdf"]
          : ["jpg", "jpeg", "png", "webp", "gif", "avif"],
    }),
  });

  return multer({
    storage,
    fileFilter: createFileFilter(allowedMimeTypes, invalidTypeMessage),
    limits: {
      fileSize: maxFileSize,
    },
  });
};

const formatUploadError = (error) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return "Uploaded file exceeds the allowed size";
    }
    return `Upload failed: ${error.message}`;
  }

  return error.message || "Upload failed";
};

const runUpload = (uploader) => (req, res, next) => {
  uploader(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: formatUploadError(error) });
    }

    return next();
  });
};

const productUploader = createCloudinaryUploader({
  folder: "smart-fit/products",
  allowedMimeTypes: IMAGE_MIME_TYPES,
  invalidTypeMessage: "Only image files are allowed for product uploads",
  maxFileSize: 5 * 1024 * 1024,
});

const avatarUploader = createCloudinaryUploader({
  folder: "smart-fit/avatars",
  allowedMimeTypes: IMAGE_MIME_TYPES,
  invalidTypeMessage: "Only image files are allowed for avatar uploads",
  maxFileSize: 3 * 1024 * 1024,
});

const paymentSlipUploader = createCloudinaryUploader({
  folder: "smart-fit/payment-slips",
  allowedMimeTypes: PAYMENT_SLIP_MIME_TYPES,
  invalidTypeMessage: "Only image or PDF files are allowed for payment slips",
  maxFileSize: 10 * 1024 * 1024,
});

module.exports = {
  runUpload,
  uploadProductImages: productUploader.array("images", 10),
  uploadAvatar: avatarUploader.single("avatar"),
  uploadPaymentSlip: paymentSlipUploader.single("paymentSlip"),
};
