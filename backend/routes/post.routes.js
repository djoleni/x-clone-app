import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import {getUserPosts, getFollowingPosts, getLikedPosts, getAllPosts, createPost, deletePost, commentOnPost,likeUnlikePost } from '../controllers/post.controller.js';

const router = express.Router();

router.get("/all", protectRoute, getAllPosts); //for you
router.get("/following", protectRoute, getFollowingPosts); //post of people YOU follow
router.get("/likes/:id", protectRoute, getLikedPosts); //post liked by user
router.get("/user/:username", protectRoute, getUserPosts); //post of a specific user
router.post("/create", protectRoute, createPost);
router.post("/like/:id", protectRoute, likeUnlikePost);
router.post("/comment/:id", protectRoute, commentOnPost);
router.delete("/:id", protectRoute, deletePost);




export default router;