const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs"),
  SALT_WORK_FACTOR = 10;

const adminSchema = new Schema(
  {
    first_name: { type: String, valueType: "String", required: true },
    last_name: { type: String, valueType: "String", required: true },
    email: {
      type: String,
      lowercase: true,
      unique: true,
      trim: true,
      required: true,
    },
    password: { type: String, bcrypt: true },
    isActive: { type: Boolean, default: false, valueType: "Boolean" },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "SystemAdmin", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "SystemAdmin", required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
adminSchema.pre("save", function (next) {
  var admin = this;
  if (!admin.isModified("password")) return next();
  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
    if (err) return next(err);
    // hash the password using our new salt
    bcrypt.hash(admin.password, salt, function (err, hash) {
      if (err) return next(err);
      // override the cleartext password with the hashed one
      admin.password = hash;
      next();
    });
  });
});

adminSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

const SystemAdmin = mongoose.model("SystemAdmin", adminSchema);

// make this available to our users in our Node applications
module.exports = SystemAdmin;
