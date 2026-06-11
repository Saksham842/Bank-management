const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!@#';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'anotherrefreshsecretkey987!@#';

const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists with this email.' });
    }

    const user = new User({ email, password });
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      accessToken,
      user: { id: user._id, email: user.email, name: user.name, income: user.income, currency: user.currency, onboardingDone: user.onboardingDone, twoFactorEnabled: user.twoFactorEnabled }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, token } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check MFA if enabled
    if (user.twoFactorEnabled) {
      if (!token) {
        return res.status(200).json({
          success: true,
          mfaRequired: true,
          message: 'MFA token required.'
        });
      }
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token
      });
      if (!verified) {
        return res.status(400).json({ success: false, message: 'Invalid MFA token.' });
      }
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      accessToken,
      user: { id: user._id, email: user.email, name: user.name, income: user.income, currency: user.currency, onboardingDone: user.onboardingDone, twoFactorEnabled: user.twoFactorEnabled }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User does not exist.' });
    }

    const newAccessToken = generateAccessToken(user);
    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const logout = async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully.' });
};

// Two Factor Authentication API endpoints
const enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const secret = speakeasy.generateSecret({ name: `LedgerApp:${user.email}` });
    user.twoFactorSecret = secret.base32;
    await user.save();

    QRCode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error generating QR code' });
      }
      res.json({
        success: true,
        secret: secret.base32,
        qrCodeUrl: dataUrl
      });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      user.twoFactorEnabled = true;
      await user.save();
      return res.json({ success: true, message: 'Two Factor Authentication verified & enabled successfully.' });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid token. Verification failed.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const disable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = '';
    await user.save();

    res.json({ success: true, message: 'Two Factor Authentication disabled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { register, login, refreshToken, logout, enable2FA, verify2FA, disable2FA };
