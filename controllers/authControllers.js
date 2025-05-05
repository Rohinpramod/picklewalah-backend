const User = require("../models/userModel");
const Address = require("../models/addressModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/token");
const sendEmail = require("../utils/nodemailer");
const Otp = require("../models/otp");

const emailRegex =
  /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

//signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone, profilePic, role, otp } = req.body;

    // 1. Validate email & required fields
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (!email || !password || !phone || (!otp && !name)) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User email already exists" });
    }

    // 👉 STEP 1: No OTP in body = start signup (generate/send OTP)
    if (!otp) {
      const newOtp = generateOTP();

      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 min
      await Otp.deleteMany({ email }); // Clear previous OTPs
      await Otp.create({ email, otp: newOtp, expiresAt });

      await sendEmail(
        email,
        "Your Pickle Walah OTP Code (Valid for 2 Minutes)",
        `Hi there,\n\nYour one-time password (OTP) is: ${newOtp}\n\nIt will expire in 2 minutes.\n\nThank you,\nPickle Walah Team`,
        `<p>Hi there,</p><p>Your OTP is <strong>${newOtp}</strong>. It will expire in 2 minutes.</p><p>Thank you,<br>Pickle Walah Team</p>`,
        "picklewalah@gmail.com"
      );

      return res.status(200).json({ message: "OTP sent to your email" });
    }

    // 👉 STEP 2: OTP is present = verify OTP + complete signup
    const foundOtp = await Otp.findOne({ email, otp });
    if (!foundOtp || foundOtp.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await Otp.deleteOne({ _id: foundOtp._id }); // Remove OTP after use

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      profilePic,
      role,
    });
    await newUser.save();

    const token = generateToken(newUser, "user");
    res.cookie("token", token);
    res.status(200).json({ message: "Signup successful " });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

//Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "all fields required" });
    }

    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res.status(400).json({ message: "User not found" });
    }
    const isPasswordMatch = bcrypt.compareSync(password, userExist.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "invalid credentials" });
    }
    const token = generateToken(userExist, "user");
    res.cookie("token", token, {
      httpOnly: true, // Prevents access via JavaScript (XSS protection)
      secure: true, // Works only on HTTPS (important in production)
      sameSite: "None", // Allows cross-origin requests
      path: "/", // Available for all routes
    });

    res.json({ message: " Login succssfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Profile
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Retrieve user profile excluding password
    const userProfile = await User.findById(userId).select("-password");

    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    // Retrieve user addresses
    const userAddresses = await Address.find({ user: userId });

    // Combine user profile and addresses
    res.json({
      message: "Profile fetched successfully",
      data: {
        profile: userProfile,
        addresses: userAddresses,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

//RestPassword
exports.resetPassword = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old password and new password are required" });
    }

    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

//Logout
exports.logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true, // Only in HTTPS (production)
      sameSite: "None",
    });
    res.status(200).json({ message: "Logout Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Update-profile
exports.profileUpdate = async (req, res) => {
  try {
    const { name, email, phone, profilePic } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, phone, profilePic },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

//checkUser
exports.checkUser = async (req, res, next) => {
  try {
    res.json({ message: "user autherized" });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Internal server error" });
  }
};

//deleteAccount
exports.deleteUserAccount = async (req, res) => {
  try {
    res.clearCookie("token");
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    const userId = req.user.id;

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User account deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

//get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users from the database
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
