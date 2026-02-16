const _ = require("lodash");
const Product = require("../models/product");
const { uploadproductImage, deleteFile, upload } = require("../services/upload-files");
const fs = require("fs");
const formidable = require("formidable");

const convertParams = (model, params) => {
  const finalQuery = {};
  const keys = _.keys(model.schema.obj);
  const query = _.keys(params);
  const final = _.intersectionWith(query, keys);
  const options = ["_ne", "_lt", "_gt", "_lte", "_gte"];
  finalQuery.find = {};
  finalQuery.where = {};
  finalQuery.sort = {};
  finalQuery.start = 0;
  finalQuery.limit = 1000;

  _.map(query, (q) => {
    _.map(options, (option) => {
      if (_.includes(q, option)) {
        var newQuery = {};
        newQuery[option.replace("_", "$")] = params[q];
        finalQuery.where[q.replace(option, "")] = newQuery;
      } else if (_.includes(q, "_sort")) {
        var actualQuery = params[q].split(":");
        finalQuery.sort[actualQuery[0]] = actualQuery[1];
      } else if (_.includes(q, "_start")) {
        finalQuery.start = (parseInt(params[q]) - 1) * parseInt(params._limit);
      } else if (_.includes(q, "_limit")) {
        finalQuery.limit = parseInt(params[q]);
      }
    });
  });
  _.map(final, (f) => {
    if (f === "name") {
      finalQuery.where[f] = { $regex: `^${params[f]}`, $options: "i" };
    } else {
      finalQuery.where[f] = params[f];
    }
  });
  _.map(query, (f) => {
    if (f === "type") {
      finalQuery.where[f] = params[f];
    }
  });
  if (params.keyword) {
    const $or = [
      { name: { $regex: `^${params.keyword}`, $options: "i" } },
      { createdBy: { $regex: `^${params.keyword}`, $options: "i" } },
      { updatedBy: { $regex: `^${params.keyword}`, $options: "i" } },
    ];
    finalQuery.find["$or"] = $or;
  }
  return finalQuery;
};

exports.list = async function (req, res) {
  const filters = await convertParams(Product, req.query);
  Product.find(filters.find)
    .populate("updatedBy")
    .populate("createdBy")
    .populate("category")
    .populate("business")
    .where(filters.where)
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, data) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      Product.countDocuments(
        { ...filters.where, ...filters.find },
        (err, count) => {
          if (err) {
            res.status(400);
            res.send({ message: "Parameters are not valid" });
          }
          const categoryList = {
            data,
            total: count,
          };
          res.status(200).send(categoryList);
        },
      );
    });
};
exports.findOne = function (req, res) {
  const { params } = req;
  Product.findOne({ _id: params.id })
    .populate("updatedBy")
    .populate("createdBy")
    // .populate("category")
    .populate("business")
    .exec(function (err, category) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(category);
    });
};

exports.create = async function (req, res) {
  try {
    console.log("[Product Create] Request received");
    console.log("[Product Create] Body keys:", Object.keys(req.body || {}));
    console.log("[Product Create] Files:", req.files ? Object.keys(req.files) : "No files");
    console.log("[Product Create] User:", req.user ? req.user._id : "No user");

    const { body, user, files } = req;
    let arr = [];

    // Handle image upload if files are provided
    if (files && files.image) {
      console.log("[Product Create] Processing image upload...");
      if (Array.isArray(files.image) && files.image.length > 1) {
        console.log("[Product Create] Multiple images:", files.image.length);
        for (let i = 0; i < files.image.length; i++) {
          try {
            const imageFile = files.image[i];
            // Use tempFilePath if available (useTempFiles: true), otherwise use data
            const filePath = imageFile.tempFilePath;
            console.log("[Product Create] Image", i, "tempFilePath:", filePath);

            const url = await upload(filePath, imageFile.name, "products");
            console.log("[Product Create] Image", i, "upload result:", url);
            if (url) {
              arr.push(url);
            }
          } catch (uploadErr) {
            console.error("[Product Create] Image", i, "upload failed:", uploadErr);
          }
        }
        body.image = arr;
      } else {
        const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
        // Use tempFilePath if available (useTempFiles: true), otherwise use data
        const filePath = imageFile.tempFilePath;
        console.log("[Product Create] Single image:", imageFile.name, "tempFilePath:", filePath, "size:", imageFile.size);

        try {
          const url = await upload(filePath, imageFile.name, "products");
          console.log("[Product Create] Image upload result:", url);
          if (url) {
            body.image = url;
          }
        } catch (uploadErr) {
          console.error("[Product Create] Image upload failed:", uploadErr);
        }
      }
    } else {
      console.log("[Product Create] No image provided");
    }

    if (user) {
      body.createdBy = user._id;
      body.updatedBy = user._id;
    }

    console.log("[Product Create] Creating product with body:", JSON.stringify(body, null, 2));
    const data = await Product.create(body);
    console.log("[Product Create] Product created successfully:", data._id);
    res.status(201).send(data);
  } catch (err) {
    console.error("[Product Create] Error:", err);
    res.status(400).send({ message: err.message || "Failed to create product", error: err });
  }
};

exports.update = async function (req, res) {
  const { body, user, params, files } = req;
  if (user) {
    body.updatedBy = user._id;
  }

  let productDetails = await Product.findOne({ _id: params.id });
  if (!productDetails) {
    res.status(400);
    res.send({ message: "Id not found!" });
  }
  let imageArr = productDetails.image;
  let difference = [];
  const existingImage = body.existImage || [];
  if (existingImage) {
    difference = imageArr.filter((x) => !existingImage.includes(x));
  }

  if (difference.length) {
    for (let i = 0; i < difference.length; i++) {
      let deleteImage = await deleteFile(difference[i]);
      if (deleteImage) {
        res.status(deleteImage.statusCode);
        return res.send({ message: deleteImage.message });
      }
      const index = imageArr.indexOf(difference[i]);
      imageArr.splice(index, 1);
    }
  }

  if (files && files.image) {
    if (files.image.length > 1) {
      for (i = 0; i < files.image.length; i++) {
        var { url } = await uploadproductImage(
          files.image[i].data,
          "products",
          files.image[i].name,
        );
        imageArr.push(url);
      }
    } else {
      var { url } = await uploadproductImage(
        files.image.data,
        "products",
        files.image.name,
      );
      imageArr.push(url);
    }
  }
  body.image = imageArr;
  if (params.id) {
    Product.updateOne({ _id: params.id }, body, function (err, data) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      Product.findOne({ _id: params.id })
        .populate("updatedBy")
        .populate("createdBy")
        .populate("category")
        .populate("business")
        .exec(function (err, category) {
          if (err) {
            res.status(400);
            res.send(err);
          }
          res.send(category);
        });
    });
  } else {
    res.status(400);
    res.send({ message: "Id not found!" });
  }
};

exports.delete = async function (req, res) {
  const { params, user } = req;

  if (!params.id) {
    return res.status(400).send({
      success: false,
      message: "Product ID is required"
    });
  }

  try {
    // Find the product first
    const product = await Product.findOne({ _id: params.id });

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found"
      });
    }

    // Verify user owns the product
    if (product.createdBy.toString() !== user._id.toString()) {
      return res.status(403).send({
        success: false,
        message: "Unauthorized - You can only delete your own products"
      });
    }

    // Delete associated images from storage
    if (product.image && product.image.length > 0) {
      console.log("[Product Delete] Deleting associated images:", product.image.length);
      for (const imageUrl of product.image) {
        try {
          // Extract S3 key from URL
          if (imageUrl && imageUrl.includes('amazonaws.com/')) {
            const key = imageUrl.split('amazonaws.com/')[1];
            await deleteFile(key);
            console.log("[Product Delete] Deleted image:", key);
          }
        } catch (imgErr) {
          console.error("[Product Delete] Failed to delete image:", imageUrl, imgErr.message);
          // Continue even if image deletion fails
        }
      }
    }

    // Delete the product
    await Product.deleteOne({ _id: params.id });
    console.log("[Product Delete] Product deleted successfully:", params.id);

    return res.status(200).send({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (err) {
    console.error("[Product Delete] Error:", err);
    return res.status(500).send({
      success: false,
      message: "Failed to delete product",
      error: err.message
    });
  }
};
