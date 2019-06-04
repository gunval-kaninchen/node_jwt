'use strict';
const express = require('express');
const app = express();
const apiRoutes = express.Router();

const bodyParser = require('body-parser');
const levelup = require('levelup');
const leveldown = require('leveldown');
const db = levelup(leveldown('./user'));
const jwt = require('jsonwebtoken');
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

// ユーザ情報取得
const userExist = async (name) => {
    console.log('call userExist : ' + name);
    return JSON.parse(await db.get(name));
}

// 認証
apiRoutes.post('/authenticate', (req, res) => {
    const name = req.body.name;
    const passwd = req.body.password;
    const user = userExist(name).then((user)=>{
        if (!user) {
            res.json({
              success: false,
              message: 'Authentication failed. User not found.'
            });
            return;
        }
        if (user.password != passwd) {
            res.json({
              success: false,
              message: 'Authentication failed. Wrong password.'
            });
            return;
        }
        const token = jwt.sign(user, 'oauthServerSampleSecret', {
            expiresIn: '24h'
        });
        res.json({
            success: true,
            message: 'Authentication successfully finished.',
            token: token
        });
    });
});

// 認可フィルタ
apiRoutes.use( (req, res, next) => {
    const token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (!token) {
      return res.status(403).send({
        success: false,
        message: 'No token provided.'
      });
    }
    jwt.verify(token, 'oauthServerSampleSecret', (err, decoded) => {
      if (err) {
        return res.json({
          success: false,
          message: 'Invalid token'
        });
      }
      req.decoded = decoded;
      next();
    });
});

// ルート
apiRoutes.get('/', (req, res) => {
    res.json({"message" : 'hello! http://localhost:' + port + '/api'});
});

// ユーザ登録
apiRoutes.get('/setup', (req, res) => {
    const demo = {
      name: req.query.name,
      password: req.query.password,
      admin: req.query.admin
    };
    db.put(demo.name, JSON.stringify(demo), (err) => {
        if(err){
            console.log('err', err);
        }
        db.get(demo.name, (err, value) => {
            if(err) {
                console.log('err', err);
            }
            console.log('key=' + JSON.stringify(JSON.parse(value)));
            console.log('User saved successfully');
        });  
    });
    res.json({ result: 'OK'});
});

// leveldb直接
apiRoutes.get('/user', (req, res) => {
    db.get(req.query.name, (err, value) => {
        if(err) {
            console.log('err', err);
        }
        console.log('key=' + JSON.stringify(JSON.parse(value)));
        console.log('User saved successfully');
        res.json(JSON.parse(value));
    });
});

app.use('/api', apiRoutes);

app.listen(port);
console.log('started http://localhost:' + port + '/');