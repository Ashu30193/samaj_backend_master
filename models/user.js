const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs"),
  SALT_WORK_FACTOR = 10;

const userSchema = new Schema(
  {
    name: { type: String, valueType: "String", required: true },
    password: { type: String, bcrypt: true },
    dob: { type: Date, valueType: "Date" },

    family: {
      father: { type: String, valueType: "String" },
      mother: { type: String, valueType: "String" },
      grandfather: { type: String, valueType: "String" },
      spouse: { type: String, valueType: "String" },
      marriage_date: { type: Date, valueType: "Date" },
      children: { type: Number, valueType: "Number", default: 0 },
    },

    address: {
      line1: { type: String, valueType: "String" },
      line2: { type: String, valueType: "String" },
      city: { type: String, valueType: "String" },
      zipcode: { type: String, valueType: "String" },
      state: { type: String, valueType: "String" },
      country: { type: String, valueType: "String" },
    },
    community: { type: String, valueType: "String" },

    higher_qualification: { type: String, valueType: "String" },

    business: { type: String, valueType: "String" },
    gst: { type: String, valueType: "String" },
    businessType: { type: String, valueType: "String" },
    annual_income: { type: String, valueType: "String" },
    aadharcard: { type: String },

    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    phone: {
      type: String,
      valueType: "String",
      trim: true,
      required: false, // Phone is optional for iOS App Store compliance
      validate: {
        validator: function (v) {
          // If phone is provided, it must be 10 digits
          if (v && v.length > 0) {
            return /^\d{10}$/.test(v);
          }
          return true; // Empty/undefined is valid
        },
        message: "Phone number must be 10 digits",
      },
    },
    profile_url: { type: String, valueType: "String" },
    profile_images: {
      thumbnail: { type: String },  // 150x150 - for member lists
      medium: { type: String },     // 500x500 - for matrimony cards
      large: { type: String },      // 1080x1080 - for profile view
      original: { type: String },   // Full quality original
    },
    email: {
      type: String,
      lowercase: true,
      unique: true,
      trim: true,
      required: true,
    },
    gender: {
      type: String,
      trim: true,
      valueType: "String",
      enum: ["Male", "Female", "Others"],
    },
    subsDetails: {
      months: { type: Number },
      expire: { type: Date },
      paymentId: { type: String },
    },
    subscription: { type: Boolean, default: false, valueType: "Boolean" },
    hasDetails: { type: Boolean, default: false, valueType: "Boolean" },
    isActive: { type: Boolean, default: true, valueType: "Boolean" },
    isVerified: { type: Boolean, default: null, valueType: "Boolean" },
    isProfileVerified: { type: Boolean, default: null, valueType: "Boolean" },
    isMatrimonialActive: {
      type: Boolean,
      default: false,
      valueType: "Boolean",
    },
    showMatrimonialPopup: {
      type: Boolean,
      default: true,
      valueType: "Boolean",
    },
    manglik: {
      manglik_value: { type: String },
      isPrivate: { type: Boolean, default: false, valueType: "Boolean" },
    },
    marital_status: {
      marital_status_value: { type: String, valueType: "String" },
      isPrivate: { type: Boolean, default: false, valueType: "Boolean" },
    },
    occupation: {
      occupation_value: { type: String, valueType: "String" },
      isPrivate: { type: Boolean, default: false, valueType: "Boolean" },
    },
    clan: {
      clan_value: { type: String, valueType: "String" },
      isPrivate: { type: Boolean, default: false, valueType: "Boolean" },
    },
    pan: {
      pan_value: { type: String, valueType: "String" },
      isPrivate: { type: Boolean, default: false, valueType: "Boolean" },
    },
    resetPasswordOtp: { type: String },

    // Soft delete fields for account deletion
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletionReason: { type: String, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

// Virtual field to check if profile is complete
userSchema.virtual("profileComplete").get(function () {
  // Check if key profile fields are filled
  const hasBasicInfo = this.name && this.email;
  const hasFamilyInfo = this.family?.father || this.family?.grandfather;
  const hasPersonalInfo = this.dob || this.gender;
  const hasAddressInfo = this.address?.city || this.address?.state;
  const hasEducationInfo =
    this.occupation?.occupation_value ||
    this.higher_qualification ||
    this.clan?.clan_value;

  // Profile is complete if user has filled most details
  return !!(
    hasBasicInfo &&
    (hasFamilyInfo || hasPersonalInfo || hasAddressInfo || hasEducationInfo)
  );
});

// Ensure virtuals are included when converting to JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

userSchema.pre("find", function () {
  this.select("-resetPasswordOtp -password");
});

userSchema.pre("save", function (next) {
  var user = this;
  if (!user.isModified("password")) return next();
  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
    if (err) return next(err);
    // hash the password using our new salt
    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) return next(err);
      // override the cleartext password with the hashed one
      user.password = hash;
      next();
    });
  });
});

// Hash password on updateOne
userSchema.pre("updateOne", function (next) {
  const update = this.getUpdate();
  const password = update.password || (update.$set && update.$set.password);
  if (!password) {
    return next();
  }
  try {
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
      if (err) {
        return next(err);
      }
      // hash the password using our new salt
      bcrypt.hash(password, salt, function (err, hash) {
        if (err) {
          return next(err);
        }
        // override the cleartext password with the hashed one
        if (update.$set) {
          update.$set.password = hash;
        } else {
          update.password = hash;
        }
        next();
      });
    });
  } catch (error) {
    return next(error);
  }
});

// Hash password on findOneAndUpdate
userSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  const password = update.password || (update.$set && update.$set.password);
  if (!password) {
    return next();
  }
  try {
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
      if (err) {
        return next(err);
      }
      // hash the password using our new salt
      bcrypt.hash(password, salt, function (err, hash) {
        if (err) {
          return next(err);
        }
        // override the cleartext password with the hashed one
        if (update.$set) {
          update.$set.password = hash;
        } else {
          update.password = hash;
        }
        next();
      });
    });
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

const User = mongoose.model("User", userSchema);

// make this available to our users in our Node applications
module.exports = User;
