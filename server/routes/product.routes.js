const express = require("express");
const router = express.Router();
const {
  protect,
  authorize,
  optionalProtect,
} = require("../middleware/auth.middleware");
const {
  runUpload,
  uploadProductImages,
} = require("../middleware/upload.middleware");
const {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  getSearchSuggestions,
} = require("../controllers/product.controller");

router.get("/", getProducts);
router.get("/suggestions", getSearchSuggestions);
router.get("/:id", optionalProtect, getSingleProduct);

router.post(
  "/",
  protect,
  authorize(["admin"]),
  runUpload(uploadProductImages),
  createProduct,
);

router.put(
  "/:id",
  protect,
  authorize(["admin"]),
  runUpload(uploadProductImages),
  updateProduct,
);

router.delete("/:id", protect, authorize(["admin"]), deleteProduct);

module.exports = router;
