import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from '../models/User.js';
import GoogleToken from '../models/GoogleToken.js';
import FacebookToken from '../models/FacebookToken.js';
import configService from '../services/configService.js';
import { encrypt } from '../utils/encrypt.js';

export const configurePassport = async () => {
    const GOOGLE_CLIENT_ID = await configService.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = await configService.get('GOOGLE_CLIENT_SECRET');
    const FACEBOOK_APP_ID = await configService.get('FACEBOOK_APP_ID');
    const FACEBOOK_APP_SECRET = await configService.get('FACEBOOK_APP_SECRET');

    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            passReqToCallback: true
        }, async (req, accessToken, refreshToken, params, profile, done) => {
            try {
                let user = req.user;
                if (!user) {
                    user = await User.findOne({ googleId: profile.id });
                    if (!user) {
                        user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
                        if (user) {
                            user.googleId = profile.id;
                            if (profile.photos && profile.photos.length > 0) {
                                user.avatar = user.avatar || profile.photos[0].value;
                            }
                            await user.save();
                        } else {
                            user = await User.create({
                                email: profile.emails[0].value.toLowerCase(),
                                displayName: profile.displayName,
                                googleId: profile.id,
                                avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                                emailVerified: true
                            });
                        }
                    }
                } else {
                    user.googleId = profile.id;
                    await user.save();
                }

                // Tokens logic
                if (accessToken && refreshToken) {
                    const expiryDate = new Date();
                    expiryDate.setSeconds(expiryDate.getSeconds() + (params.expires_in || 3600));

                    await GoogleToken.findOneAndUpdate(
                        { userId: user._id },
                        {
                            userId: user._id,
                            accessToken: encrypt(accessToken),
                            refreshToken: encrypt(refreshToken),
                            expiresAt: expiryDate,
                            scope: params.scope || ''
                        },
                        { upsert: true, returnDocument: 'after' }
                    );
                }

                return done(null, user);
            } catch (err) {
                return done(err, false);
            }
        }));
    }

    if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
        passport.use(new FacebookStrategy({
            clientID: FACEBOOK_APP_ID,
            clientSecret: FACEBOOK_APP_SECRET,
            callbackURL: process.env.FACEBOOK_CALLBACK_URL,
            profileFields: ['id', 'displayName', 'email'],
            passReqToCallback: true
        }, async (req, accessToken, refreshToken, profile, done) => {
            try {
                let user = req.user;
                const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value.toLowerCase() : null;

                if (!user) {
                    user = await User.findOne({ facebookId: profile.id });
                    if (!user && email) {
                        user = await User.findOne({ email });
                        if (user) {
                            user.facebookId = profile.id;
                            await user.save();
                        }
                    }
                    if (!user) {
                        user = await User.create({
                            email: email || `${profile.id}@facebook.com`,
                            displayName: profile.displayName,
                            facebookId: profile.id,
                            emailVerified: true
                        });
                    }
                } else {
                    user.facebookId = profile.id;
                    await user.save();
                }

                return done(null, { user, accessToken });
            } catch (err) {
                return done(err, false);
            }
        }));
    }
};
