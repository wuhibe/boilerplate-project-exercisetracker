const express = require('express');
const app = express();
let bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date
});
const Exercise = mongoose.model('Exercise', exerciseSchema);
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }]
});
const User = mongoose.model('User', userSchema);


app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  let u = new User({
    username: req.body.username
  });
  u.save((err, data) => {
    if (data) res.json({ 'username': u.username, '_id': u._id });
    else res.json(err);
  });
});

app.get('/api/users', (req, res) => {
  let users = User.find({}).select({ exercises: 0 })
    .exec(function(err, users) {
      if (err) return console.log(err);
      return res.json(users);
    });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  let duration = +req.body.duration,
    description = req.body.description,
    _id = req.params._id,
    date = req.body.date ?
      new Date(req.body.date).toDateString() :
      new Date().toDateString();
  User.findOne({ _id: _id }, (err, user) => {
    if (err) throw err;
    let ex = new Exercise({
      duration: duration,
      description: description,
      date: new Date(date)
    });
    ex.save((err) => {
      if (err) throw err;
      user.exercises.push(ex);
      user.save((err) => {
        if (err) throw err;
        else res.json({
          _id, 'username': user.username,
          date, duration, description
        });
      });
    });
  });
});
const validDate = (date, s) => {
  const beg = '1970-01-02', end = '3000-12-12';
  if ((new Date(date) !== "Invalid Date") &&
    !isNaN(new Date(date))) {
    return new Date(date);
  } else {
    return (s == 'from' ? new Date(beg) : new Date(end));
  }
}
app.get('/api/users/:_id/logs', (req, res) => {
  let _id = req.params._id,
    from = validDate(req.query.from, 'from'),
    to = validDate(req.query.to, 'to'),
    limit = +req.query.limit ?? Infinity;
  User.findOne({ _id: _id }, (err, user) => {
    Exercise.find({
      _id: { $in: user.exercises },
      date: { $gte: from, $lte: to }
    })
      .select({ _id: 0, __v: 0 })
      .limit(limit)
      .then(exs => {
        exs = exs.map(ex => {
          let a = {};
          a['date'] = new Date(ex['date']).toDateString();
          a['description'] = ex.description;
          a['duration'] = ex.duration;
          return a;
        });
        let resobj = {};
        resobj['_id'] = user._id;
        resobj['username'] = user.username;
        resobj['count'] = exs.length;
        resobj['log'] = exs;

        res.json(resobj);
      })
      .catch(err => { console.log(err) });
  });
});
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
