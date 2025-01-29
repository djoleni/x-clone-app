import express from 'express';
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import connectMongoDB from './db/connectMongoDB.js';

dotenv.config() 

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json()); //a middleware method inbuilt in express to recognize the incoming Request Object as a JSON Object. (in our case to parse req.body, which is in JSON format and comes from the frontend)
app.use(express.urlencoded({extended: true})); // to parse form data (urlencoded))

app.use(cookieParser());
app.use("/api/auth", authRoutes);




app.listen(PORT, ()=> {
    console.log(`Server is runnng on port ${PORT}`);
    connectMongoDB();

})