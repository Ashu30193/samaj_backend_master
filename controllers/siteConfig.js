const SiteConfig = require("../models/site-config");
const _ = require("lodash");

const removeIds = (resource) => {
  if (Array.isArray(resource) && resource.length > 0)
    return resource.map((item) => _.pick(item, ["name", "value"]));
  return [];
};

const getAll = async function (_req, res) {
  SiteConfig.find().exec(function (err, site_config_arr) {
    if (err) {
      res.status(400);
      res.send(err);
    }

    const site_config = site_config_arr[0];
    const configRes = {
      marital_status: removeIds(
        (site_config && site_config.marital_status) || [],
      ),
      clan: removeIds((site_config && site_config.clan) || []),
      higher_qualification: removeIds(
        (site_config && site_config.higher_qualification) || [],
      ),
      occupation: removeIds((site_config && site_config.occupation) || []),
      annual_income: removeIds(
        (site_config && site_config.annual_income) || [],
      ),
      job_type: removeIds((site_config && site_config.job_type) || []),
      pay: removeIds((site_config && site_config.pay) || []),
      work_location: removeIds(
        (site_config && site_config.work_location) || [],
      ),
      date_posted: removeIds((site_config && site_config.date_posted) || []),
    };
    res.status(200).send(configRes);
  });
};

const getResource = function (req, res) {
  const { params } = req;
  const { resource } = params;

  SiteConfig.find().exec(function (err, site_config_arr) {
    if (err) {
      res.status(400);
      res.send(err);
    }

    const site_config = site_config_arr[0];
    if (site_config && resource in site_config) {
      res.send({ [resource]: removeIds(site_config[resource]) });
    } else {
      res.status(404);
      res.send({ message: "Resource not found!" });
    }
  });
};

const updateResource = function (req, res) {
  const { body, user, params } = req;
  const { resource } = params;

  if (user && body[resource]) {
    body[resource] = body[resource].map((item) => ({
      ...item,
      updatedBy: user._id,
    }));
  }
  if (resource) {
    SiteConfig.updateMany(
      {},
      { $set: { [resource]: body[resource] } },
      { upsert: true },
      function (err, updatedRes) {
        if (err) {
          res.status(400);
          return res.send(err);
        }

        if (updatedRes.nModified || updatedRes.upserted) {
          res.status(204);
          res.send({ message: "Resource updated successfully!" });
        } else {
          res.status(400);
          res.send({ message: "Resource updation failed!" });
        }
      },
    );
  } else {
    res.status(400);
    res.send({ message: "Resource not found!" });
  }
};

module.exports = { getAll, getResource, updateResource };
