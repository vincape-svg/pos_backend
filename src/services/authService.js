const bcrypt = require("bcrypt");
const userRepository = require("../repositories/userRepository");

const registerUser = async (username, email, password) => {
    const existingUser = await userRepository.findUserByEmail(email);

    if (existingUser) {
        throw new Error("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await userRepository.createUser(
        username,
        email,
        hashedPassword
    );

    return userId;
};

module.exports = {
    registerUser
};