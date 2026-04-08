const express = require("express");
const router = express.Router();
const {
  protect,
  authorize,
  optionalProtect,
} = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller");

router.get("/", getProducts);
router.get("/:id", optionalProtect, getSingleProduct);

router.post(
  "/",
  protect,
  authorize(["admin"]),
  upload.array("images", 10),
  createProduct,
);

router.put(
  "/:id",
  protect,
  authorize(["admin"]),
  upload.array("images", 10),
  updateProduct,
);

router.delete("/:id", protect, authorize(["admin"]), deleteProduct);

module.exports = router;
