const mongoose = require("mongoose");
const Coupon = require("../models/couponModel"); 
const Cart = require("../models/cartModel"); 

const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  OUT_FOR_DELIVERY: "out for delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cartId: { type: mongoose.Schema.Types.ObjectId, ref: "Cart", required: true },
    totalAmount: { type: Number, },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
    finalPrice: { type: Number, min: 0 },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    deliveryAddress: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
  },
  { timestamps: true }
);


const Order = mongoose.model("Order", orderSchema);
module.exports = Order;