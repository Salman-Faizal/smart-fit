exports.createProduct = (req, res) => {
  res.status(201).json({
    message: "Product created successfully",
  });
};
