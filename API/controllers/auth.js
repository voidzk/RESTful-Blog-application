const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const existValidation = require('../utils/validation');
require('dotenv').config();

exports.signup = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        existValidation(errors.isEmpty(), 'Validation failed.', 422);

        const email = req.body.email;
        const name = req.body.name;
        const password = req.body.password;
        const hashedPw = await bcrypt.hash(password, 12);

        const user = new User({
            email: email,
            password: hashedPw,
            name: name,
        });
        const result = await user.save();
        res.status(201).json({ message: 'User created!', userId: result._id });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        let loadedUser;

        const user = await User.findOne({ email: email });
        existValidation(
            user,
            'A user with this email could not be found.',
            401
        );

        loadedUser = user;
        const isEqual = await bcrypt.compare(password, user.password);
        existValidation(isEqual, 'Wrong password!', 401);

        const token = jwt.sign(
            {
                email: loadedUser.email,
                userId: loadedUser._id.toString(),
            },
            process.env.JWT_TOKEN,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            token: token,
            userId: loadedUser._id.toString(),
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        existValidation(user, 'User not found.', 404);
        res.status(200).json({ status: user.status });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateUserStatus = async (req, res, next) => {
    try {
        const newStatus = req.body.status;
        const user = await User.findById(req.userId);
        existValidation(user, 'User not found.', 404);
        user.status = newStatus;
        await user.save();
        res.status(200).json({ message: 'User updated.' });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
