const jwt = require("jsonwebtoken");

const token = jwt.sign(
    { userId: 123 },
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiaWF0IjoxNzgyNTI0MTIyLCJleHAiOjE3ODI1Mjc3MjJ9.2QiZErs8F4DhAq0Tl_ENtJ4Gr7l5HQMfZ7kMnVjBa8Q",
    { expiresIn: "1h" }
);

console.log(token);