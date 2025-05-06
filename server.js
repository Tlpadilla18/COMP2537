// server.js
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const mongoURI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}` +
    `@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`;

// MongoDB connection
mongoose.connect(mongoURI);

// Set up session middleware
app.use(session({
    secret: process.env.NODE_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoURI,
        ttl: 3600 
    }),
    cookie: { maxAge: 3600000 }
}));

// User schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});
const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => {
    if (!req.session.userId) {
        res.render('home', { user: null });
    } else {
        res.render('home', { user: req.session.name });
    }
});

app.get('/signup', (req, res) => res.render('signup', { message: null }));
app.post('/signup', async (req, res) => {
    const schema = Joi.object({
        name: Joi.string().min(1).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(1).required()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.render('signup', { message: error.details[0].message });

    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    try {
        const user = await User.create({ name, email, password: hashed });
        req.session.userId = user._id;
        req.session.name = user.name;
        res.redirect('/members');
    } catch (err) {
        res.render('signup', { message: 'User already exists or invalid input' });
    }
});

app.get('/login', (req, res) => res.render('login', { message: null }));
app.post('/login', async (req, res) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.render('login', { message: error.details[0].message });

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.render('login', { message: 'User and password not found' });
    }

    req.session.userId = user._id;
    req.session.name = user.name;
    res.redirect('/members');
});

app.get('/members', (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
    const randomImage = images[Math.floor(Math.random() * images.length)];
    res.render('members', { name: req.session.name, image: randomImage });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.use((req, res) => {
    res.status(404).render('404');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));