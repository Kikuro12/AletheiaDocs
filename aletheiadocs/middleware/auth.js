export function requireAuth(req, res, next) {
	if (!req.session.user) {
		return res.redirect('/auth/login');
	}
	next();
}

export function requireAdmin(req, res, next) {
	if (!req.session.user || !req.session.user.is_admin) {
		return res.status(403).send('Forbidden');
	}
	next();
}