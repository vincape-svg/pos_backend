const db = require("../config/database");

// GET ALL USERS
const getAllUsers = async () => {
  const [users] = await db.query(
    `SELECT 
      id,
      username,
      email,
      profile_photo,
      status,
      created_at,
      created_by,
      updated_at,
      updated_by
    FROM users
    WHERE status = 1`
  );

  return users;
};


// UPDATE USER
const updateUser = async (
  id,
  username,
  email,
  profilePhoto,
  updatedBy
) => {
  const [result] = await db.query(
    `UPDATE users
     SET username = ?,
         email = ?,
         profile_photo = ?,
         updated_at = NOW(),
         updated_by = ?
     WHERE id = ?
       AND status = 1`,
    [username, email, profilePhoto, updatedBy, id]
  );

  return result;
};


// SOFT DELETE USER
const deleteUser = async (id, deletedBy) => {
  const [result] = await db.query(
    `UPDATE users
     SET status = 0,
         deleted_at = NOW(),
         deleted_by = ?
     WHERE id = ?
       AND status = 1`,
    [deletedBy, id]
  );

  return result;
};


module.exports = {
  getAllUsers,
  updateUser,
  deleteUser
};