var mongodb_url = "mongodb+srv://will:will123456@cluster0.g63je.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

const bodyParser = require('body-parser');
const cors = require('cors');

const mongoose = require('mongoose');

// The schema
const schema = require('./schema');
const Book = schema.Book;
const User = schema.User;

const express = require('express')

const app = express()

const connectToDatabase = function (req, res, next) {
    mongoose.connect(mongodb_url);
    next();
}

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
app.use(cors());

// view engine setup
var path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(connectToDatabase);

app.use(express.static(path.join(__dirname, 'public')));

// Index page
app.get('/', function(req, res) {
    
    Book.find({}, function (err, books) {
        // console.log(books);
        res.render('index', {books: books});
    })
});

// Room page
app.get('/rooms/:id', function(req, res) {
    const id = req.params.id;
    Book.findOne({ id: id }, function (err, book) {
        // console.log(book);
        res.render('room', {book: book});
    });
});

// Forum page
app.get('/forum', function(req, res) {
    const arr = Array.from(io.sockets.adapter.rooms);
    const filtered = arr.filter(room => !room[1].has(room[0]))
    const rooms = filtered.map(i => i[0]);
    // console.log(rooms);
    res.render('forum', {rooms: rooms});
});

// Read for /book/:id
app.get('/book/:id', (req, res) => {
    const id = req.params.id;

    Book.findOne({ id: id }, function (err, doc) {
        if (err) {
            console.log(err);
            res.send({ 'err': err });
            return;
        }
        res.send(doc);
    });

})

// Delete for /book/:id
app.delete('/book/:id', (req, res) => {
    const id = req.params.id;
    // delete room
    io.socketsLeave('room-' + id);
    Book.deleteOne(
        {
            id: id
        },
        (err, docs) => {
            if (err) {
                res.send({ 'err': err })
            }
            else {
                res.send('Delete successfully')
            }
        }
    )
})

// Update for /book/:id
app.put('/book/:id', (req, res) => {
    const id = req.params.id;
    const title = req.body.title;
    const inventory = req.body.inventory;

    Book.updateOne(
        {
            id: id
        },
        {
            title: title,
            inventory: inventory
        },
        (err, docs) => {
            if (err) {
                res.send({ 'err': err })
            }
            else {
                res.send('Updated successfully!')
            }
        }
    )
})

// Create for /book/:id
app.post('/book', (req, res) => {

    Book.find({}, function (err, doc) {
        console.log(doc);

        //only deal with request with x-www-form-urlencoded
        const title = req.body.title;
        const inventory = req.body.inventory;

        const b1 = new Book({ id: doc.length + 1, title: title, inventory: inventory });
        b1.save();
        res.status(200).send('success')
    })

})

// Delete for /room/:id
app.delete('/room/:id', (req, res) => {
    const id = req.params.id;
    // delete room and book
    io.socketsLeave('room-' + id);
    Book.deleteOne(
        {
            id: id
        },
        (err, docs) => {
            if (err) {
                res.send({ 'err': err })
            }
            else {
                res.send('Delete room successfully')
            }
        }
    )
})

// Read for /user/:user_name
app.get('/user/:user_name', (req, res) => {
    const user_name = req.params.user_name;

    User.find({ username: user_name }, function (err, doc) {
        if (err) {
            console.log(err);
            res.send({ 'err': res });
            return;
        }
        res.send(doc);
    });
})

// Delete for /user/:user_name
app.delete('/user/:user_name', (req, res) => {
    const id = req.params.id;

    User.deleteOne(
        {
            username: user_name
        },
        (err, docs) => {
            if (err) {
                res.send({ 'err': err })
            }
            else {
                res.send('Delete successfully')
            }
        }
    )
})

// Update for /user/:user_name
app.put('/user/:user_name', (req, res) => {
    const phone = req.body.phone;

    User.updateOne(
        {
            username: user_name
        },
        {
            phone: phone
        },
        (err, docs) => {
            if (err) {
                res.send({ 'err': err })
            }
            else {
                res.send("Updated Docs : ", docs)
            }
        }
    )
})

// Create for /user/:user_name
app.post('/user', (req, res) => {
    const username = req.body.username
    const phone = req.body.phone;

    const u1 = new User({ username: username, phone: phone });
    u1.save();
    res.status(200).send('success')
})

// borrow method
app.post('/user/:user_name/borrows/:id', (req, res) => {
    const id = req.params.id;
    const username = req.params.user_name;

    User.find({ id: id }, function (err, doc) {
        if (err) {
            console.log(err);
            res.send({ 'err': res });
            return;
        }
        if (doc.length <= 0) {
            res.send({ 'err': 'Book does not exist.' })
        } else {
            User.findOne({ username: username }, function (err, doc) {
                if (err) {
                    console.log(err);
                    res.send({ 'err': res });
                    return;
                }
                if (doc.borrowedBook.length >= 3) {
                    console.log(doc)
                    res.send({ 'err': 'Cannot borrow more than 3 books.' });
                    return;
                }
                let borrowedBooks = doc.borrowedBook;
                borrowedBooks.push(id);
                User.updateOne({ username: username },
                    { borrowedBook: borrowedBooks },
                    (err, docs) => {
                        if (err) {
                            res.send({ 'err': err })
                        }
                        else {
                            res.send('Borrows successfully!')
                        }
                    }
                )
            });
        }
    });
})

// return method
app.post('/user/:user_name/returns/:id', (req, res) => {
    const id = req.params.id;
    const username = req.params.user_name;

    User.find({ id: id }, function (err, doc) {
        if (err) {
            console.log(err);
            res.send({ 'err': res });
            return;
        }
        if (doc.length <= 0) {
            res.send({ 'err': 'Book does not exist.' })
        } else {
            User.findOne({ username: username }, function (err, doc) {
                if (err) {
                    console.log(err);
                    res.send({ 'err': res });
                    return;
                }
                if (doc.borrowedBook.length <= 0) {
                    console.log(doc)
                    res.send({ 'err': 'The user has not borrowed this book.' });
                    return;
                }
                let borrowedBooks = doc.borrowedBook;
                borrowedBooks = borrowedBooks.filter(item => {
                    return item != id && item != (id + '')
                });
                console.log(id)
                console.log(borrowedBooks)
                User.updateOne({ username: username },
                    { borrowedBook: borrowedBooks },
                    (err, docs) => {
                        if (err) {
                            res.send({ 'err': err })
                        }
                        else {
                            res.send('Returns successfully!')
                        }
                    }
                )
            });
        }
    });
})

// get borrowed books
app.get('/user/:user_name/borrowed', (req, res) => {
    const username = req.params.user_name;


    User.findOne({ username: username }, function (err, doc) {
        if (err) {
            res.send({ 'err': err })
        } else {
            res.send({ 'books': doc.borrowedBook })
        }
    })


})

io.on('connection', (socket) => {
    
    socket.on('join', (user, roomNo) => {
        console.log('roomNo: ' + roomNo + ', user: ' + user + ' connected');
        socket.join('room-' + roomNo);
        io.to('room-' + roomNo).emit('message', 'user ' + user + ' joined');
    });
    
    socket.on('leave', (user, roomNo) => {
        console.log('roomNo: ' + roomNo + ', user: ' + user + ' leaved');
        socket.leave('room-' + roomNo);
        io.to('room-' + roomNo).emit('message', 'user ' + user + ' leaved');
    });

    socket.on('message', (roomNo, msg) => {
        console.log('roomNo: ' + roomNo + ', message: ' + msg);
        io.to('room-' + roomNo).emit('message', msg);
    });
});

server.listen(8889, () => {
    console.log('start')
})