var express = require('express');
var router = express.Router();

const idleNodes =  [];

router.get('/:ip', (req, res, next) => {
  console.log(req.params);
});

module.exports = router;
