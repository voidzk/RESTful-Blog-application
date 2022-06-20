const fs = require('fs');
const path = require('path');
const io = require('../socket');
const { validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
    try {
        const currentPage = req.query.page || 1;
        const perPage = 2;
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        res.status(200).json({
            message: 'Fetched posts successfully.',
            posts: posts,
            totalItems: totalItems,
        });
    } catch (err) {
        next(err);
    }
};

exports.createPost = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        existValidation(
            errors.isEmpty(),
            'Validation failed, entered data is incorrect.',
            422
        );

        existValidation(req.file, 'No image provided.', 422);

        let imageUrl = req.file.path;
        imageUrl = imageUrl.replace('\\', '/');
        const title = req.body.title;
        const content = req.body.content;

        //--------------------------------------
        const post = new Post({
            title: title,
            content: content,
            imageUrl: imageUrl,
            creator: req.userId,
        });
        await post.save();
        const user = await User.findById(req.userId);
        user.posts.push(post);
        await user.save();
        io.getIO().emit('posts', {
            action: 'create',
            post: {
                ...post._doc,
                creator: { _id: req.userId, name: user.name },
            },
        });
        res.status(201).json({
            message: 'Post created successfully!',
            post: post,
            creator: { _id: user._id, name: user.name },
        });
    } catch (err) {
        next(err);
    }
};

exports.getPost = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const post = await Post.findById(postId);
        existValidation(post, 'Could not find post.', 404);

        res.status(200).json({ message: 'Post fetched.', post: post });
    } catch (err) {
        next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const errors = validationResult(req);
        existValidation(
            errors.isEmpty(),
            'Validation failed, entered data is incorrect.',
            422
        );

        const title = req.body.title;
        const content = req.body.content;
        let imageUrl = req.body.image;

        if (req.file) {
            imageUrl = req.file.path;
            imageUrl = imageUrl.replace('\\', '/');
        }
        existValidation(imageUrl, 'No file picked.', 422);
        const post = await Post.findById(postId).populate('creator');
        existValidation(post, 'Could not find post.', 404);

        existValidation(
            post.creator._id.toString() === req.userId,
            'Not authorized!',
            403
        );

        if (imageUrl !== post.imageUrl) {
            clearImage(post.imageUrl);
        }
        post.title = title;
        post.imageUrl = imageUrl;
        post.content = content;
        const result = await post.save();
        //---------------------------------------
        io.getIO().emit('posts', {
            action: 'update',
            post: result,
        });

        res.status(200).json({ message: 'Post updated!', post: result });
    } catch (err) {
        next(err);
    }
};

exports.deletePost = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const post = await Post.findById(postId);
        existValidation(post, 'Could not find post.', 404);

        existValidation(
            post.creator._id.toString() === req.userId,
            'Not authorized!',
            403
        );

        // Check logged in user
        clearImage(post.imageUrl);
        await Post.findByIdAndRemove(postId);

        const user = await User.findById(req.userId);
        user.posts.pull(postId);
        await user.save();
        //-------------------------------------
        io.getIO().emit('posts', {
            action: 'delete',
            post: postId,
        });
        //-----------------------------------------

        res.status(200).json({ message: 'Deleted post.' });
    } catch (err) {
        next(err);
    }
};

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
};
