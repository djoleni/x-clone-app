import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';

export const protectRoute = async (req, res, next) => {
    try{
        const token = req.cookies.jwt; //za ovo treba middleware cookie-parser
        if(!token){
            return res.status(401).json({error: "Unauthorized: No Token Provided"}) //recimo ako zelimo da ukucamo url koji vodi do naseg profila, a nismo ulogovani
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); //proveravamo token

        if(!decoded){
            return res.status(401).json({error: "Unauthorized: Invalid Token"})
        }
 
        const user = await User.findById(decoded.userId).select("-password"); //token sadrzi userId, pa ga koristimo da nadjemo usera u bazi ali koristimo i '-password' da ne bi vracali password u response

        if(!user){
            return res.status(404).json({error: "User not found"})
        }   //verovatno nece biti potrebno jer je user uvek vezan za token ali za svaki slucaj

        req.user = user; 
        next() //u nasem slucaju to je getMe controller

    } catch(error) {
        console.log("Error in protectRoute middleware", error.message);
        res.status(500).json({error: "Internal server error"})

    }



}