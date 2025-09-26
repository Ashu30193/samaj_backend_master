var express = require('express');
var router = express.Router();

var role_controller = require('../controllers/role');


router.get('/list', role_controller.list);
router.get('/:id', role_controller.findOne);
router.post('/create', role_controller.create);
router.put('/update', role_controller.update);
router.delete('/:id', role_controller.delete);


module.exports = router;