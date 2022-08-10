const mongoose = require('mongoose');

const { Schema } = mongoose;

const bookSchema = new Schema(
    {
        id: {type: Number},
        title: { type: String },
        inventory: { type: Number },
        date:{ type: Date ,default:Date.now}
    });

const userSchema = new Schema(
    {
        username: { type: String },
        phone: { type: String, validate: /^\d{3}-\d{3}-\d{4}$/},
        borrowedBook: {type: Array}
    }
)

const Book = mongoose.model('Book', bookSchema, 'books');
const User = mongoose.model('User', userSchema, 'users');

module.exports.Book = Book;
module.exports.User = User;