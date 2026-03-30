import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';

const strategy = new OAuth2Strategy(
    {
        authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenURL:         'https://www.linkedin.com/oauth/v2/accessToken',
        clientID:         process.env.LINKEDIN_CLIENT_ID,
        clientSecret:     process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL:      process.env.LINKEDIN_CALLBACK_URL,
        scope:            'openid profile email',  // ← string not array
        state:            true,
    },
    (_accessToken, _refreshToken, _params, profile, done) => done(null, profile)
);

strategy.userProfile = function (accessToken, done) {
    axios
        .get('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
        .then(({ data }) => {
            const profile = {
                provider:    'linkedin',
                id:          data.sub,
                displayName: data.name || `${data.given_name ?? ''} ${data.family_name ?? ''}`.trim(),
                emails:      data.email   ? [{ value: data.email }]   : [],
                photos:      data.picture ? [{ value: data.picture }] : [],
            };
            done(null, profile);
        })
        .catch((err) => done(err));
};

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use('linkedin', strategy);

export default passport;