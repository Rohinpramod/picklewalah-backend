const jwt = require('jsonwebtoken');

exports.generateToken = (user, role) => {
    try {
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }  // Token expires in 2 hours
        );
        return token;
    } catch (error) {
        console.log(error);
    }
};
