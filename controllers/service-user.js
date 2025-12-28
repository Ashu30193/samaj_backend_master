const SystemAdmin = require("../models/admin");
const Role = require("../models/role");

exports.list = async function (req, res) {
  try {
    const { view_size = 10, start_index = 0, keyword = "" } = req.query;

    // Convert to numbers and validate
    const limit = parseInt(view_size, 10);
    const skip = parseInt(start_index, 10);

    // Build filter query
    let filter = {};

    // If keyword is provided, filter by role name or search in admin fields
    if (keyword && keyword.trim() !== "") {
      // Check if keyword matches role types
      const validRoles = ["admin", "manager", "staff"];
      if (validRoles.includes(keyword.toLowerCase())) {
        // Find role by name
        const role = await Role.findOne({ name: keyword.toLowerCase() });
        if (role) {
          filter.role = role._id;
        }
      } else {
        // Search in admin fields (name, email)
        filter.$or = [
          { first_name: { $regex: keyword, $options: "i" } },
          { last_name: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } }
        ];
      }
    }

    // Get admins with pagination
    const admins = await SystemAdmin.find(filter)
      .populate("role", "name")
      .populate("createdBy", "first_name last_name")
      .select("-password") // Exclude password from response
      .skip(skip)
      .limit(limit)
      .sort({ created_at: -1 });

    // Get total count for pagination
    const total = await SystemAdmin.countDocuments(filter);

    // Transform data to match frontend expected format
    const result = admins.map(admin => ({
      id: admin._id,
      to_name: `${admin.first_name} ${admin.last_name}`,
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email,
      enabled: admin.isActive ? 'Y' : 'N',
      isActive: admin.isActive,
      role: admin.role,
      party_id_from: admin.createdBy ? {
        name: `${admin.createdBy.first_name} ${admin.createdBy.last_name}`
      } : null,
      last_invited_on: admin.created_at,
      created_at: admin.created_at,
      updated_at: admin.updated_at
    }));

    // Format response to match frontend expectations
    const response = {
      result: result,
      totalCount: total,
      pagination: {
        total: total,
        view_size: limit,
        start_index: skip,
        current_page: Math.floor(skip / limit) + 1,
        total_pages: Math.ceil(total / limit)
      }
    };

    res.status(200).send(response);

  } catch (error) {
    res.status(500).send({
      message: "Error retrieving admin users",
      error: error.message
    });
  }
};