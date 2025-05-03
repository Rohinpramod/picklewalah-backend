const RazorPay = require("razorpay");
const Payment = require("../models/paymentModel");
const dotenv = require("dotenv");
const Order = require("../models/orderModel");
const crypto = require("crypto");
const Cart = require("../models/cartModel");
const sendEmail = require('../utils/nodemailer');

dotenv.config();

const razorpay = new RazorPay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});
exports.createPayment = async (req, res) => {
  try {
    const user = req.user.id;
    const { orderId } = req.params;
    

    const order = await Order.findById(orderId);
    if(!order){
      return res.status(404).json({message: 'order not found'})
    }
    
    if (order.status !== "pending") {
      if (order.status === "cancelled") {
        return res
          .status(400)
          .json({ message: "cannot make payment for cancelled order" });
      }
      if (order.status === "delivered") {
        return res
          .status(400)
          .json({ message: "You have already received your order" });
      }
      return res.status(400).json({
        message:
          "You have already made the payment for this order,your order in on the way",
      });
    }
    const amount = order.finalPrice;
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: 'Invalid order amount' });
    }
    const amountInPaisa = amount * 100;
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaisa,
      currency: "INR",
      receipt: `recepit_${Date.now()}`,
      notes: { orderId: order, userId: user },
    });

    const newPayment = new Payment({
      orderId,
      user,
      amount,
      status: "pending",
      transactionId: razorpayOrder.id,
    });

    const savedPayment = await newPayment.save();

    setTimeout(async () => {
      try {
        const payment = await Payment.findById(savedPayment._id);
        if (payment && payment.status === 'pending') {
          await Payment.findByIdAndDelete(payment._id);
          console.log(`Pending payment ${payment._id} deleted after 30 seconds.`);
        }
      } catch (err) {
        console.error(`Error deleting pending payment ${savedPayment._id}:`, err);
      }
    }, 180000);

    res.status(201).json({
      message: "Payment initiated successfully",
      payment: savedPayment,
      razorpayOrder,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message:error.message});
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY)
      .update(sign)
      .digest("hex");
    if (generated_signature === razorpay_signature) {
      const payment = await Payment.findOneAndUpdate(
        { transactionId: razorpay_order_id },
        { status: "success" },
        { new: true }
      );
      const order = await Order.findOneAndUpdate(
        { _id: payment.orderId },
        { status: "confirmed" }
      );

      const cart = await Cart.findOneAndUpdate(
        { _id: order.cartId },
        { cartStatus: "ordered" },
        { new: true }
      );
      const adminEmail = process.env.ADMIN_EMAIL;
      const subject = 'New Payment Successful!';
      const text = `A new payment has been successfully completed.
      
      Order ID: ${order._id}
      User ID: ${payment.user}
      Amount Paid: ₹${payment.amount}
      Transaction ID: ${payment.transactionId}
      
      Please check the admin panel for more details.`;

      await sendEmail(adminEmail, subject, text);
      
      return res.status(200).json({ message: "Payment is successful" });
    } else {
      return res
        .status(400)
        .json({ message: "Payment verification failed at backend" });
    }
  } catch (error) {
    console.error("Error during payment verification:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payment = await Payment.find().populate('user')
    return res
      .status(200)
      .json({ message: "Payment fetched successfully", data: payment })
  } catch (error) {
    console.error("Error during payment fetching:", error);
    return res
      .status(500)
      .json({ message: error.message });
  }
};