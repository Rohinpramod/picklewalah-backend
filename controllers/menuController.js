const mongoose = require("mongoose");

const MenuItem = require("../models/menuItemModel");
const cloudinaryInstance = require("../config/cloudinary");

//create Menu items
exports.createMenuItem = async (req, res) => {
  try {
    const { name, price, category, isAvailable,description,image,quantity,ingredients } = req.body;
    
    let imageUrl = "https://example.com/default-image.jpg"; 

   
    if (req.file) {
      const uploadResponse = await cloudinaryInstance.uploader.upload(req.file.path);
      imageUrl = uploadResponse.url; 
    }

  
    const menuItemIsExist = await MenuItem.findOne({name});

    if (menuItemIsExist) {
      return res.status(400).json({ message: "Menu item already exists" });
    }

    const menuItem = new MenuItem({
      name,
      price,
      category,
      isAvailable,
      description,
      image: imageUrl,
      quantity,
      ingredients
    });


    await menuItem.save();
    
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//get-all-menu
exports.getAllMenuItems = async (req, res)=>{
  try{
    const menus = await MenuItem.find();
    res.status(200).json(menus);
  }catch(error){
    res.status(500).json({message:'Failed to fetch menu items', error});
  }
};

//byName-all hotel items
exports.getMenuItemsByName = async (req, res) => {
  try {
    const name = req.params.name;
    const menuItems = await MenuItem.find({
      name: { $regex: name, $options: "i" }, 
    });

    if (menuItems.length === 0) {
      return res.status(404).json({ message: "No menu items found." });
    }
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//menuItem by ID
exports.getMenuItemById = async (req, res) => {
  const {id} = req.params;

  try{
    const menuItem = await MenuItem.findById(id);

    if(!menuItem){
      return res.status(404).json({message: 'Menu item not found'});
    }
    res.status(200).json(menuItem);
  }catch(error){
    res.status(500).json({message:'server error'});
  }
};


//get-Resturant-all-menu
exports.getMenuItemsByRestaurant = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({
      restaurant: req.params.restaurantId,
    }).populate("menuItem");
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




exports.updateMenuItem = async (req, res) => {
  try {
    const { menuItemId} = req.params;
    const { name, price, category, isAvailable ,ingredients } = req.body;

    let updateFields = { name, price, category, isAvailable, ingredients};

    if (req.file) {
      const uploadResponse = await cloudinaryInstance.uploader.upload(
        req.file.path
      );
      updateFields.imageUrl = uploadResponse.url;
    }

    const menuItem = await MenuItem.findOneAndUpdate(
      { _id: menuItemId},
      updateFields,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res
        .status(404)
        .json({ message: "Menu item not found in the specified restaurant." });
    }

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.deleteMenuItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;

    if (!menuItemId) {
      return res.status(400).json({ message: "Menu item ID is required" });
    }
    
    const deletedMenuItem = await MenuItem.findByIdAndDelete(menuItemId);
    if (!deletedMenuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.status(200).json({ message: "Menu item deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
