const passport = require('passport');
const BnetStrategy = require('passport-bnet').Strategy;
const config = require('../../shared/config');

passport.use(
  new BnetStrategy(
    {
      clientID: config.bnet.id,
      clientSecret: config.bnet.secret,
      callbackURL: `${config.urls.server}/auth/bnet/callback`,
      region: 'eu', // or 'us', etc. configurable?
      scope: ['wow.profile'],
      state: true, // Explicitly enable state
    },
    function (accessToken, refreshToken, profile, done) {
      return done(null, {
        id: profile.id,
        battletag: profile.battletag,
        token: accessToken,
        refreshToken: refreshToken,
        expiresAt: Date.now() + (profile.expires_in || 86400) * 1000,
        provider: 'bnet',
      });
    },
  ),
);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

module.exports = passport;
