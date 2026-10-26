const router = require('express').Router();
const taskController = require('../controllers/taskController');
router.get('/', taskController.list);
router.get('/:id', taskController.getOne);
router.post('/', taskController.create);
router.patch('/:id', taskController.update);
router.delete('/:id', taskController.remove);
module.exports = router;
