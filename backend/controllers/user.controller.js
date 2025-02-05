import bcrypt from 'bcryptjs';
import {v2 as cloudinary} from "cloudinary";

import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";


export const getUserProfile = async (req, res) => {
    const {username} = req.params; // u ruti imamo 'profile/:username', username je dinamicki parametar pa koristimo req.params

    try{
        const user = await User.findOne({username}).select("-password"); // select("-password") znaci da necemo vratiti password u responseu
        if(!user){
            return res.status(404).json({error: "User not found"});
        }

        res.status(200).json(user);

    } catch(error){
        console.log("Error in getUserProfile controller", error.message);
        res.status(500).json({error: error.message})
    }   

}

export const followUnfollowUser = async (req, res) => {
    try{
        const { id } = req.params;
        const userToFollowUnfollow = await User.findById(id);
        const currentUser = await User.findById(req.user._id);

        if(id === req.user._id.toString()){
            return res.status(400).json({error: "You cannot follow/unfollow yourself"});
        }

        if(!userToFollowUnfollow || !currentUser){
            return res.status(404).json({error: "User not found"});
        }

        const isFollowing = currentUser.following.includes(id);

        if(isFollowing){
            // Unfollow the user
            await currentUser.updateOne({$pull: {following: id}});
            await userToFollowUnfollow.updateOne({$pull: {followers: req.user._id}});
            res.status(200).json({message: "User unfollowed successfully"});

        } else {
            // Follow the user
            await currentUser.updateOne({$push: {following: id}});
            await userToFollowUnfollow.updateOne({$push: {followers: req.user._id}});
            // Send notification to the user
            const newNotification = new Notification({
                type: "follow",
                from: currentUser._id, // ili samo req.user._id
                to: userToFollowUnfollow._id //ili samo id, clean code
            })

            await newNotification.save();

            res.status(200).json({message: "User followed successfully"});
        }

    } catch(error){
        console.log("Error in followUnfollowUser controller", error.message);
        res.status(500).json({error: error.message});


    }




}

export const getSuggestedUsers = async (req,res) => {

    try{
        // We have to exclude the users that the current user is already following and the current user itself
        const userId = req.user._id; //coming from the protectRoute middleware

        const usersFollowedByMe = await User.findById(userId).select("following"); //select only the following field e.g. {_id: user._id, following: [id1, id2, id3]}

        const users = await User.aggregate([
            {
                $match:{
                    _id: {$ne: userId} //'ne' means not equal
                }
            }, 
            {$sample:{size:10}} //randomly select 10 users that are not me
        ])

        const filteredUsers = users.filter(user => !usersFollowedByMe.following.includes(user._id)); 
        const suggestedUsers = filteredUsers.slice(0,4)

        suggestedUsers.forEach(user=>user.password=null)

        res.status(200).json(suggestedUsers);
        

    } catch(error){
        console.log("Error in getSuggestedUsers controller", error.message);
        res.status(500).json({error: error.message})
    }


}

export const updateUser = async (req,res) => {
    const {fullName, email, username, currentPassword, newPassword, bio, link} = req.body;
    let {profileImg, coverImg} = req.body;

    const userId = req.user._id;

    try{
        let user = await User.findById(userId);
        if(!user) return res.status(404).json({error: "User not found"});

        if((!newPassword && currentPassword) || (newPassword && !currentPassword)){
            return res.status(400).json({error: "Please provide both current and new password"});
        }

        if(currentPassword && newPassword){
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if(!isMatch){
                return res.status(400).json({error: "Current password is incorrect"});
            }
            if(newPassword.length < 6) {
                return res.status(400).json({error: "Password must be at least 6 characters long"});
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        if(profileImg){
            if(user.profileImg){
                //https://res.cloudinary.com/dq7n9o0f5/image/upload/v1633662927/zmxorcxexpdbg8r8bkjb.jpg //example of profileImg explains the usage of split, pop and split methods
                await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]); //delete the old profile image from cloudinary
            }

            const uploadedResponse = await cloudinary.uploader.upload(profileImg);
            profileImg = uploadedResponse.secure_url;
        }

        if(coverImg){
            if(user.coverImg){
                await cloudinary.uploader.destroy(user.coverImg.split("/").pop().split(".")[0]); //delete the old profile image from cloudinary
            }
            const uploadedResponse = await cloudinary.uploader.upload(coverImg);
            coverImg = uploadedResponse.secure_url;
        }

        user.fullName = fullName || user.fullName; //if fullName is not provided, keep the old value
        user.email = email || user.email;
        user.username = username || user.username;
        user.bio = bio || user.bio;
        user.link = link || user.link;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;

        user = await user.save();
        
        user.password = null; //don't send the password in the response

        return res.status(200).json(user);


    } catch(error){
        console.log("Error in updateUser controller", error.message);
        res.status(500).json({error: error.message})

    }
}