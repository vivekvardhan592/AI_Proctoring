const multer = require("multer");

const storage = multer.memoryStorage(); // no disk
const upload = multer({ storage });

module.exports = upload;