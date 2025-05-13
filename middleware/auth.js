function requireLogin(req, res, next) {
    if (req.session && req.session.user) {
        next(); // User is logged in, continue
    } else {
        res.redirect('/login'); // Not logged in, redirect
    }
}

module.exports = requireLogin