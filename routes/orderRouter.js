const express = require('express');
const { createOrder, getAllOrders, getOrderById, updateOrderUser, updateOrderStatus, getAllOrdersByUser, getUserOrders } = require('../controllers/orderController');
const { createPayment, verifyPayment, getPayments } = require('../controllers/paymentController');
const roleMiddleware = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post('/create-order',createOrder);
router.get('/get-all-order',getAllOrders);//admin

router.get('/get-order-by-id/:orderId',getOrderById);
router.put('/update-Order/:orderId',updateOrderUser);
router.patch('/update-order-status/:orderId',updateOrderStatus);//admin
router.get('/get-user-order',getUserOrders)

router.post('/:orderId/payment',createPayment);
router.post('/verify-payment',verifyPayment);
router.get('/get-all-payments',getPayments);

module.exports = router;