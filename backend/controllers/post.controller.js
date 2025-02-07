import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import {v2 as cloudinary} from "cloudinary";

export const createPost = async (req, res) => {
    try{
        const {text} = req.body;
        let {img} = req.body;
        const userId = req.user._id.toString();  //toString() is not necessary, but it is good practice

        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({error: "User not found"});
        }

        if(!text && !img){
            return res.status(400).json({error: "Post must have text or image"});
        }

        if(img){
            const uploadedResponse = await cloudinary.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }

        const newPost = new Post({
            user: userId,
            text,
            img,
        })

        await newPost.save();
        res.status(201).json(newPost);

    } catch(error){
        console.log("Error in createPost controller", error.message);
        res.status(500).json({error: error.message});

    }


}

export const deletePost = async (req, res) => {
    try{
        const {id} = req.params; 
        const post = await Post.findById(id);

        if(!post){
            return res.status(404).json({error: "Post not found"});
        }

        if(post.user.toString() !== req.user._id.toString()){
            return res.status(401).json({error: "You are not authorized to delete this post"});
        }
        
        if(post.img){
            const imgId = post.img.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(imgId);
        }

        await Post.findByIdAndDelete(id);

        res.status(200).json({message: "Post deleted successfully"});

    } catch(error){
        console.log("Error in deletePost controller", error.message);
        res.status(500).json({error: error.message});

    }

}

export const commentOnPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text) {
            return res.status(400).json({ error: "Text field is required" });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        const comment = { user: userId, text };
        post.comments.push(comment);
        await post.save();

        // Fetch the post again with populated comments
        const populatedPost = await Post.findById(id).populate({
            path: 'comments.user',
            select: '-password'
        });

        res.status(200).json(populatedPost.comments);
    } catch (error) {
        console.log("Error in commentOnPost controller", error.message);
        res.status(500).json({ error: error.message });
    }
}

export const likeUnlikePost = async (req, res) => {
    try{
        const {id} = req.params;
        const userId = req.user._id;

        const post = await Post.findById(id);
        if(!post){
            return res.status(404).json({error: "Post not found"});
        }

        const isLiked = post.likes.includes(userId);
        
        if(isLiked){
            //unlike
            await Post.updateOne({_id: id}, {$pull: {likes: userId}}); //moglo je i await post.updateOne({$pull: {likes: userId}}); ali cisto da demonstriram da se moze i ovako
            await User.updateOne({_id:userId}, {$pull: {likedPosts: id}}); //remove post from user's likedPosts array
            
            const updatedLikes = post.likes.filter((id)=>id.toString() !== userId.toString());
            res.status(200).json(updatedLikes);
        } else{
            //like
            post.likes.push(userId);
            await User.updateOne({_id:userId}, {$push: {likedPosts: id}}); //add post to user's likedPosts array
            await post.save();

            if(userId.toString() !== post.user.toString()){
                const notification = new Notification({
                    type: "like",
                    from: userId,
                    to: post.user
                })
                await notification.save();
            } //this is how we create a notification when someone likes a post and the post is not their own
           
            const updatedLikes = post.likes;
            res.status(200).json(updatedLikes);
        }

    } catch(error){
        console.log("Error in likeUnlikePost controller", error.message);
        res.status(500).json({error: error.message});
    }
}

export const getAllPosts = async (req, res) => {
    try{
        const posts = await Post.find().sort({createdAt:-1}).populate({
            path: "user",
            select: "-password"

        }).populate({
            path: "comments.user",
            select: "-password"
        })
        //all posts sorted by date in descending order, we have all user data instead of just id but we exclude password

        if(posts.length === 0){
            return res.status(200).json([]);
        }

        res.status(200).json(posts);
    }
    catch(error){
        console.log("Error in getAllPosts controller", error.message);
        res.status(500).json({error: error.message});
    }
}

export const getLikedPosts = async (req, res) => {

    const userId = req.params.id; //ne moze samo req.user._id jer je to id trenutno ulogovanog korisnika, a ne id korisnika cije postove trazimo

    try{
        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({error: "User not found"});
        }

        const likedPosts = await Post.find({_id: {$in: user.likedPosts}}).populate({
            path: "user",
            select: "-password"
        }).populate({
            path: "comments.user",
            select: "-password"
        }) //nadjemo postove ciji je id u nizu likedPosts u user dokumentu

        res.status(200).json(likedPosts);

    } catch(error){
        console.log("Error in getLikedPosts controller", error.message);
        res.status(500).json({error: error.message});
    }



}

export const getFollowingPosts = async (req, res) => {
    try{
        const userId = req.user._id; 
        const user = await User.findById(userId);

        if(!user){
            return res.status(404).json({error: "User not found"});
        }

        const following = user.following;

        const followingPosts = await Post.find({user: {$in: following}})
        .sort({createdAt: -1})
        .populate({
            path: "user",
            select: "-password"
        })
        .populate({
            path: "comments.user",
            select: "-password"
        }) // trazimo Postove ciji je atribut user (tip objectId) jednak nekom od id-jeva usera koje trenutni korsinik prati

        res.status(200).json(followingPosts);


    } catch(error){
        console.log("Error in getFollowingPosts controller", error.message);
        res.status(500).json({error: error.message});
    }


}

export const getUserPosts = async (req, res) => {
    try{
        const {username} = req.params;
        const user = await User.findOne({username});

        const posts = await Post.find({user: user._id})
        .sort({createdAt: -1})
        .populate({
            path: "user",
            select: "-password"
        })
        .populate({
            path: "comments.user",
            select: "-password"
        })

        res.status(200).json(posts);

    } catch(error){
        console.log("Error in getUserPosts controller", error.message);
        res.status(500).json({error: error.message});
    }


    
}