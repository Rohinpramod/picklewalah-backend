const express =  require ("express");
const cors = require('cors');
const { PORT, connectDB } = require("./config/db");
const cookieParser = require('cookie-parser') 

const userRoutes = require("./routes/auth");
const itemRoutes = require("./routes/menuiItemsRouter")
const cartRoutes = require("./routes/cartRoutes");
const addressRoutes = require('./routes/addressRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const couponRoutes = require('./routes/couponRoutes'); 
const orderRoutes = require('./routes/orderRouter');

const authMiddleware = require("./middlewares/authMiddleware");
const roleMiddleware = require("./middlewares/roleMiddleware");

const dotenv = require('dotenv');
dotenv.config();
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser()); 
app.use(cors({
    origin:['https://picklewalah.com','pickle-walah-dashboard.vercel.app'],
    credentials:true,
    methods: ["GET","POST","PUT","PATCH","DELETE"],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],

}));



const port = PORT;
const db = connectDB;

db();

app.use("/api/user",userRoutes);
app.use("/api/menu-items",itemRoutes);
app.use('/api/cart',authMiddleware,cartRoutes);
app.use('/api/address',authMiddleware,addressRoutes);
app.use('/api/review',authMiddleware,reviewRoutes);
app.use('/api/coupon',authMiddleware,couponRoutes);
app.use('/api/order',authMiddleware,orderRoutes);


app.get("/", (req,res) => {
    res.send("API Running capstone Project");
    
})

app.listen(port,()=>{
    console.log(`App listening on port ${PORT}`)
})

app.all("*",(req,res) => {
    res.status(404).json({message:"End point does not exist"})
})