const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { createMenuItem, updateMenuItem, deleteMenuItem, getMenuItemsByName, getAllMenuItems, getMenuItemById, } = require('../controllers/menuController');
const { upload } = require('../middlewares/multer');

const router = express.Router();



router.post('/create-menu',authMiddleware,upload.single('image'),createMenuItem);
router.get('/menu/:name',getMenuItemsByName);
router.get('/menu-item/:id',getMenuItemById)
router.get('/get-all-menu',getAllMenuItems)
router.put('/updateMenu/:menuItemId',authMiddleware,upload.single("image"), updateMenuItem);
router.delete('/deleteMenu/:menuItemId',authMiddleware,deleteMenuItem)





module.exports = router;