const Cart = require('../models/cartModel');
const Coupon = require('../models/couponModel');
const coupon = require('../models/couponModel');
const Order = require('../models/orderModel');
 
const ORDER_STATUS = [
    "pending",
    "confirmed",
    "preparing",
    "out for delivery",
    "delivered",
  ];


  exports.createOrder = async (req, res) => {
    try {
      const user = req.user.id;
      const { cartId, coupon, deliveryAddress } = req.body;
  
      const cart = await Cart.findById(cartId);
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }
  
      let totalAmount = cart.totalPrice;
      let finalPrice = totalAmount;
      let appliedCoupon = null;
  
      if (coupon) {
        const findCoupon = await Coupon.findOne({ code: coupon });
  
        if (!findCoupon) {
          return res.status(400).json({ message: "Invalid coupon code" });
        }
  
        if (!findCoupon.isActive) {
          return res.status(400).json({ message: "Coupon is inactive" });
        }
  
        if (new Date() > findCoupon.expiryDate) {
          return res.status(400).json({ message: "Coupon has expired" });
        }
  
        // Check minimum order value
        if (totalAmount < findCoupon.minOrderValue) {
          return res.status(400).json({ message: `Minimum order value must be ₹${findCoupon.minOrderValue}` });
        }
  
        appliedCoupon = findCoupon;
  
        // Calculate discount
        let discountAmount = (totalAmount * findCoupon.discountPercentage) / 100;
  
        // Apply maximum discount cap
        if (discountAmount > findCoupon.maxDiscountValue) {
          discountAmount = findCoupon.maxDiscountValue;
        }
  
        finalPrice = totalAmount - discountAmount;
  
        if (finalPrice < 0) finalPrice = 0;
        finalPrice = parseFloat(finalPrice.toFixed(2));
      }
  
      const order = new Order({
        user,
        cartId,
        coupon: appliedCoupon ? appliedCoupon._id : undefined,
        deliveryAddress,
        finalPrice,
      });
  
      await order.save();
  
      res.status(201).json({ message: "Order created successfully", order: order });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  };
  

  exports.getAllOrders = async (req, res) => {
    try {
      const orders = await Order.find() // No filter here
        .sort({ createdAt: -1 })
        .populate("user", "name email phone")
        .populate({
          path: "cartId",
          select: "items totalPrice",
          populate: {
            path: "items.itemId",
            select: "name",
          },
        })
        .populate("coupon", "code discountPercentage maxDiscountValue")
        .populate("deliveryAddress", "street city state postalCode");
  
      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: "No orders found" });
      }
  
      res.status(200).json({ message: "Orders found successfully", orders });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  exports.getOrderById = async (req, res) => {
    try {
        const user = req.user.Id
      const { orderId } = req.params;
      const order = await Order.findOne({_id:orderId}, {user: user})
        .populate("user", "name email phone")
        .populate({
          path: "cartId",
          select: "items totalPrice",
          populate: {
            path: "items.itemId",
            select: "name",
          },
        })
        .populate("coupon", "code discountPercentage maxDiscountValue")
        .populate("deliveryAddress", "street city state zipCode")
    
        if (!order) {
        return res.status(404).json({ message: "Order not found." });
      }
      res.status(200).json({ message: "Order retrieved successfully", order });
    } catch (error) {
      console.log(error);
      
      res.status(500).json({ message: error.message });
    }
  };

  exports.updateOrderUser = async (req,res)=>{
    try{
        const user = req.user.id
        const orderId  = req.params.orderId;
        const{coupon, status, deliveryAddress} = req.body
        const order = await Order.findById(orderId);

        if(!order){
            return res.status(404).json({message: "No order found"})
        }
        if(order.status === "cancelled"){
            return res.status(400).json({message: "Order is already cancelled"})
        }
        if(coupon) order.coupon = coupon
        if(deliveryAddress) order.deliveryAddress = deliveryAddress
        if(user.toString() === order.user._id.toString()){
            if(status){
                if(status === "cancelled"){
                    order.status = "cancelled"
                }else {
                    return res.status(400).json({ message: "Users are only allowed to cancel orders." });
                }
            }
        }
        await order.save()
        res.status(200).json({message: "Order update successfully", order: order})
    }catch(error){
        res.status(500).json({message: error.message})
    }
}

  exports.updateOrderStatus = async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found." });
      }
      const currentIndex = ORDER_STATUS.indexOf(order.status);
      if (currentIndex === -1 || currentIndex === ORDER_STATUS.length - 1) {
        return res
          .status(400)
          .json({ message: "Order is already in the final state." });
      }
      order.status = ORDER_STATUS[currentIndex + 1];
      await order.save();
      res.status(200).json({
        message: `Order status updated to '${order.status}'`,
        order,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };


  
  
  exports.getUserOrders = async (req, res) => {
    try {
      const userId = req.user.id; // Assuming you have middleware that sets req.user
  
      const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }); // Sort by newest first
  
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  };