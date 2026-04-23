const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const avatarSchema = new mongoose.Schema(
  { url: String, publicId: String },
  { _id: false },
);

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    fullName: String,
    line1: String,
    line2: String,
    city: String,
    province: String,
    postalCode: String,
    phone: String,
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    avatar: { type: avatarSchema, default: null },
    // Extended profile fields
    phone: String,
    dateOfBirth: Date,
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    // Addresses
    addresses: [addressSchema],
    // Activity / recommendation data
    recentlyViewed: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    viewedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    purchasedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    wishlist: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        addedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    isBanned: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (this.$locals.skipPasswordHash) return;
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
