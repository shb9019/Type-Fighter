var express = require('express');
var router = express.Router();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const idleNodes =  [];

router.get('/:id', async (req, res, next) => {
  let index;
  for(index = 0; index < idleNodes.length; index++) {
    if (idleNodes[index].bob == null) {
      idleNodes[index].bob = req.params.id;
      break;
    }
  }

  if (index === idleNodes.length) {
    idleNodes.push({
      alice: req.params.id,
      bob: null
    });

    while(idleNodes[index].bob == null) {
      await sleep(500);
    }
  }

  return res.send(idleNodes[index]);
});

module.exports = router;
