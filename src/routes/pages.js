const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.render('index'));
router.get('/login', (req, res) => res.render('login'));
router.get('/register', (req, res) => res.render('register'));
router.get('/dashboard', (req, res) => res.render('dashboard'));
router.get('/generate', (req, res) => res.render('generate'));
router.get('/my-videos', (req, res) => res.render('videos'));
router.get('/videos', (req, res) => res.render('videos'));
router.get('/merge', (req, res) => res.render('merge'));
router.get('/buy-credits', (req, res) => res.render('credits'));
router.get('/credits', (req, res) => res.render('credits'));
router.get('/admin', (req, res) => res.render('admin/index'));

module.exports = router;
