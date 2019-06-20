const fs = require('fs');
const rawdata = fs.readFileSync('config/videos.json');
const videos = JSON.parse(rawdata);

const Video = require('./models/Video');

const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
const mongoose = require('mongoose');
const expressWs = require('express-ws')(app);
const getJSON = require('get-json');
const util = require('util');

var ws_clients = [];

app.set('views', __dirname + '/templates');
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    Video.find({}).exec((err, videos) => {
        res.render('index', {'DATA': JSON.stringify(videos)});
    });
});

app.ws('/video_stat', (ws, req)  => {
    var index = ws_clients.push(ws) - 1;
    ws.on('close', function (conn) {
        console.log('ws.close');
        ws_clients.splice(index, 1);
    });
    ws.on('message', (msg) => {
        console.log(msg);
    });
});

const collectStatFromApi = () => {
    url = util.format('https://www.googleapis.com/youtube/v3/videos?part=statistics&id=%s&key=%s',
        videos.join(','),
        process.env.YOUTUBE_API_KEY
    );
    getJSON(url).then((response) => {
        console.log(response);
        response.items.forEach((element, idx, arr) => {
            const data = {
                video_id: element.id,
                viewCount: parseInt(element.statistics.viewCount, 10),
                likeCount: parseInt(element.statistics.likeCount, 10),
                dislikeCount: parseInt(element.statistics.dislikeCount, 10),
                favoriteCount: parseInt(element.statistics.favoriteCount, 10),
                commentCount: parseInt(element.statistics.commentCount, 10)
            };
            Video.findOneAndUpdate({video_id: element.id}, data, {
                    'new': true,
                    'upsert': true, setDefaultsOnInsert: true, runValidators: true
                },
                (err, obj) => {
                    if (err) {
                        console.log(err);
                        return true;
                    }
                    ws_clients.forEach((wsI, inx, arr) => {
                        try {
                            wsI.send(JSON.stringify(data));
                        }
                        catch (err) {
                            console.log(err);
                        }
                    });
                });

        });
    }).catch((error) => {
        console.log(error);
    });
};

const connectDB = () => {
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/db', {useNewUrlParser: true});
    return mongoose.connection
};

const startApp = () => {
    app.listen(port, () => {
        console.log('Start on port:' + port);
    });
};

connectDB().on('error', console.log).on('disconnected', connectDB).once('open', startApp);
setInterval(collectStatFromApi, 15000);
