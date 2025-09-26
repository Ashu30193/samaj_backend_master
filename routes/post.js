var express = require("express");
var router = express.Router();

const { validate } = require("../middlewares/policies");

var postController = require("../controllers/post");
var postCommentController = require("../controllers/post-comment");
var postLikeController = require("../controllers/post-likes");

router.post("/create", validate, postController.create);
router.get("/", validate, postController.get);
router.get("/:id", validate, postController.findOne);
router.put("/:id", validate, postController.update);
router.delete("/:id", validate, postController.delete);

router.post(
  "/:post_id/comments/:post_owner_id",
  validate,
  postCommentController.create,
);
router.get("/:post_id/comments", validate, postCommentController.get);
router.put(
  "/:post_id/comments/:comment_id",
  validate,
  postCommentController.update,
);
router.delete(
  "/:post_id/comments/:comment_id",
  validate,
  postCommentController.delete,
);

router.post(
  "/:post_id/likes/:post_owner_id",
  validate,
  postLikeController.create,
);
router.get("/:post_id/likes", validate, postLikeController.get);
router.put("/:post_id/likes/:id", validate, postLikeController.update);
router.put("/:post_id/unlike", validate, postLikeController.unlike);
router.delete("/:post_id/likes/:id", validate, postLikeController.delete);

module.exports = router;
