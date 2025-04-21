const express = require('express');

const roleMiddleware = require('../middlewares/roleMiddleware');
const { createCoupon, updateCoupon, deleteCoupon, getCoupons, applyCoupon } = require('../controllers/couponController');

const router = express.Router();

router.post('/create-coupon',createCoupon);
router.post('/apply-coupon',applyCoupon);
router.put('/update-coupon/:id',updateCoupon);
router.delete('/delete-coupon/:id',deleteCoupon);
router.get('/get-coupon',getCoupons);
module.exports = router;
