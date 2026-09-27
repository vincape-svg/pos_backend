const userRepository = require("../repositories/userRepository");

// GET ALL USERS
const getAllUsers = async () => {
  return await userRepository.getAllUsers();
};


// UPDATE USER
const updateUser = async (
  id,
  username,
  email,
  profilePhoto,
  updatedBy
) => {
  return await userRepository.updateUser(
    id,
    username,
    email,
    profilePhoto,
    updatedBy
  );
};


// SOFT DELETE USER
const deleteUser = async (id, deletedBy) => {
  return await userRepository.deleteUser(
    id,
    deletedBy
  );
};


module.exports = {
  getAllUsers,
  updateUser,
  deleteUser
};