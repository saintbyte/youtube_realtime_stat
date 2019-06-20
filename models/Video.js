const mongoose = require('mongoose');

const videoSchema = mongoose.Schema({
  video_id: { type: String, index: true, unique: true},
  create: { type: Date, default: Date.now },
  viewCount : Number,
  likeCount: Number,
  dislikeCount: Number,
  favoriteCount: Number,
  commentCount: Number
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;