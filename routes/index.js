var express = require('express');
var router = express.Router();
var path = require('path');
var _ = require('lodash');
const cors = require('cors');
const {  getFileStream } = require('./s3');
const fs = require('fs');
const util = require('util');

var apiKey = process.env.TOKBOX_API_KEY;
var secret = process.env.TOKBOX_SECRET;

if (!apiKey || !secret) {
  console.error('=========================================================================================================');
  console.error('');
  console.error('Missing TOKBOX_API_KEY or TOKBOX_SECRET');
  console.error('Find the appropriate values for these by logging into your TokBox Dashboard at: https://tokbox.com/account/#/');
  console.error('Then add them to ', path.resolve('.env'), 'or as environment variables' );
  console.error('');
  console.error('=========================================================================================================');
  process.exit();
}

var OpenTok = require('opentok');
var opentok = new OpenTok(apiKey, secret);

// IMPORTANT: roomToSessionIdDictionary is a variable that associates room names with unique
// unique session IDs. However, since this is stored in memory, restarting your server will
// reset these values if you want to have a room-to-session association in your production
// application you should consider a more persistent storage

var roomToSessionIdDictionary = {};
var archivesCreated = []


// roomtrack will have a key of the session id which has a 
//value that is in object with true booleans cooresponding to caller and callee. 
//This object would have a value for roomActivated
//(Figure out way to delete roomtrack after every day)
var roomTrack = {}

//{room1: {roomActivated: false, caller: false, callee: false}}

function createRoomEntry(roomID, activatedStatus, callerStatus, calleeStatus){
  if (roomTrack[roomID]){
    console.log("Err: Room already Created")
    return -1;
  }
  else{
    //creating object for a new Room entry in the roomTrack Dictionary
    roomTrack[roomID] = {"roomActivated": activatedStatus, "caller": callerStatus, "callee": calleeStatus}
    return 0; 
  }
}

// returns the room name, given a session ID that was associated with it
function findRoomFromSessionId(sessionId) {
  return _.findKey(roomToSessionIdDictionary, function (value) { return value === sessionId; });
}

router.get('/', function (req, res) {
  res.render('index', { title: 'Learning-OpenTok-Node' });
});

/**
 * GET /session redirects to /room/session
 */
router.get('/session', function (req, res) {
  res.redirect('/room/session');
});

router.get('/test1', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  //with no cors headers
  res.send({
    message: "test1 worked"
  });
});

router.get('/test2', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  //with only Access-Control-Allow-Origin header
  res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-node-server.herokuapp.com/test2');
  res.send({
    message: "test2 worked"
  });
});

router.get('/test3', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
    //with no cors headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.send({
    message: "test3 worked"
  });
});

router.get('/test4', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
    //with current headers
  res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Origin, X-Requested-With, Content-type, Accept, Vary");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', "OPTIONS, POST, GET, PUT");
  res.setHeader('Vary', 'Origin');
  res.send({
    message: "test4 worked"
  });
});

router.get('/test5', cors(), function (req, res) {
  res.setHeader('Content-Type', 'application/json');
    //with cors library
    res.send({
      message: "test5 worked"
    });
});

router.options('/test6', cors())

router.get('/test6', cors(), function (req, res) {
  res.setHeader('Content-Type', 'application/json');
    //with cors library and preflight request handled
    res.send({
      message: "test6 worked"
    });
});

/**
 * GET /media/:name
 */

 router.get('/media/:key', function (req, res){
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
  res.setHeader('Vary', 'Origin');
  console.log(req.params);
  const key = req.params.key
  const readStream = getFileStream(key)
  console.log("attempting to fetch s3 archive");

  //readStream.pipe(res);
  // res.send({
  //   key: key,

  // });
});
/**
 * GET /room/:name
 */
router.get('/room/:name', function (req, res) {
  
  var roomName = req.params.name;
  var sessionId;
  var token;
  console.log('attempting to create a session associated with the room: ' + roomName);

  // if the room name is associated with a session ID, fetch that
  if (roomToSessionIdDictionary[roomName]) {
    sessionId = roomToSessionIdDictionary[roomName];

    // generate token
    token = opentok.generateToken(sessionId);
    console.log('token' + token);
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', "OPTIONS, POST, GET, PUT");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send({
      roomname: roomName,
      apiKey: apiKey,
      sessionId: sessionId,
      token: token
    });
  }
  // if this is the first time the room is being accessed, create a new session ID
  else {
    opentok.createSession({ mediaMode: 'routed' }, function (err, session) {
      if (err) {
        console.log(err);
        res.status(500).send({ error: 'createSession error:' + err });
        return;
      }

      // now that the room name has a session associated wit it, store it in memory
      // IMPORTANT: Because this is stored in memory, restarting your server will reset these values
      // if you want to store a room-to-session association in your production application
      // you should use a more persistent storage for them
      roomToSessionIdDictionary[roomName] = session.sessionId;

      console.log("first access");

      // generate token
      token = opentok.generateToken(session.sessionId);
      res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Origin, X-Requested-With, Content-type, Accept, Vary");
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', "OPTIONS, POST, GET, PUT");
      res.setHeader('Vary', 'Origin');
      //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
      res.send({
        apiKey: apiKey,
        sessionId: session.sessionId,
        token: token
      });
    });
  }
});

/**
 * POST /archive/start
 */
router.post('/archive/start', function (req, res) {
  const { sessionId, resolution, outputMode, hasVideo} = req.body;
  //var sessionId = json.sessionId;
  opentok.startArchive(sessionId, 
    { name: findRoomFromSessionId(sessionId), resolution: resolution, outputMode: outputMode, hasVideo: hasVideo},
    function (err, archive) {
    if (err) {"Unexpected response from OpenTok"
      console.error('error in startArchive');
      console.error(err.type);
      res.status(500).send({ error: 'startArchive error:' + err });
      return;
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send(archive);
  });
});

/**
 * POST /archive/:archiveId/stop
 */
router.post('/archive/:archiveId/stop', function (req, res) {
  var archiveId = req.params.archiveId;
  console.log('attempting to stop archive: ' + archiveId);
  opentok.stopArchive(archiveId, function (err, archive) {
    if (err) {
      console.error('error in stopArchive');
      console.error(err);
      res.status(500).send({ error: 'stopArchive error:' + err });
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send(archive);
  });
});

/**
 * GET /archive/:archiveId/view
 */
router.get('/archive/:archiveId/view', function (req, res) {
  var archiveId = req.params.archiveId;
  console.log('attempting to view archive: ' + archiveId);
  opentok.getArchive(archiveId, function (err, archive) {
    if (err) {
      console.error('error in getArchive');
      console.error(err);
      res.status(500).send({ error: 'getArchive error:' + err });
      return;
    }

    if (archive.status === 'available') {
      console.log("archive status: ", archive.status)
      res.redirect(archive.url);
    } else {
      console.log("archive status: ", archive.status)
      res.render('view', { title: 'Archiving Pending' });
    }
  });
});

/**
 * GET /archive/:archiveId
 */
router.get('/archive/:archiveId', function (req, res) {
  var archiveId = req.params.archiveId;

  // fetch archive
  console.log('attempting to fetch archive: ' + archiveId);
  opentok.getArchive(archiveId, function (err, archive) {
    if (err) {
      console.error('error in getArchive');
      console.error(err);
      res.status(500).send({ error: 'getArchive error:' + err });
      return;
    }

    // extract as a JSON object
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send(archive);
  });
});


/**
 * POST /enteredRoom/:userMode/:SessionID
 */
router.post('/enteredRoom/:userMode/:sessionID', function (req, res) {
  //userMode must be either "callee" or "caller" 
  var userMode = req.params.userMode; 
  var sessionID = req.params.sessionID;

  var callee = false;
  var caller = false;

  //check the value of userMode and assign the appropriate variables
  if (userMode == "callee"){
    callee = true;
  }
  else if (userMode == "caller"){
    caller = true;
  }
  //userMode was inputted incorrectly
  else{
    //send an error. 
  }

  //check if room is in roomTrack already and if room is actived
  if (roomTrack[sessionID] && roomTrack[sessionID]["roomActivated"]){
    //edit object so that the given usermode is toggled to true 
    roomTrack[sessionID][userMode] = true;
  }
  //else:
  else{
    //Create object (json like structure) where usermode is toggled to true 
    //This object would have a value for roomActivated which is true. 
    //create key value pair in roomTrack. 
    if(createRoomEntry(sessionID, true, caller, callee)){
      //return a success code
    } else {
      //return an error code
    }    
  }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send();
  });

  /**
 * POST /exitedRoom/:userMode/:SessionID
 */
router.post('/exitedRoom/:userMode/:sessionID', function (req, res) {
  var userMode = req.params.userMode;
  var sessionID = req.params.sessionID;

  if(userMode != "caller" && userMode != "callee"){
    //return error
  }

  //check if room is in roomtrack and has been actived
  if(roomTrack[sessionID] && roomTrack[sessionID]["roomActivated"]) {
    //edit object so that the given usermode is toggled to false 
    //send success
    roomTrack[sessionID][userMode] = false;
  }
  else {
    //send error message
  } 

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send();
  });

  /**
   * GET /isRoomEmpty/:sessionID
   */
  router.get('/isRoomEmpty/:sessionID', function (req, res){
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    var sessionID = req.params.sessionID;

    if(roomTrack[sessionID] && roomTrack[sessionID]["roomActivated"]) {
      if(roomTrack[sessionID]["caller"] || roomTrack["callee"]) {
        //send back a not ready code
      }
      else {
        //send back a true response
      }
    }
    else {
      //send back an error
    }
  })

 


/**
 * GET /archive/:archiveId
 */
router.get('/s3/:archiveId', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
  res.setHeader('Vary', 'Origin');

  var archiveId = req.params.archiveId;

  //first get archive and test if the archive exists, and if the archive status is uploaded, stopped, or something else. 
  // fetch archive
  console.log('attempting to return s3 url for ' + archiveId);
  var s3URL = "https://pin-mi-project.s3.amazonaws.com/" + apiKey + "/" + archiveId + "/archive.mp4"
  
  //check if archive exists. 
  opentok.getArchive(archiveId, function (err, archive) {
    if (err) {
      console.error('error in getArchive');
      console.error(err);
      res.status(500).send({ error: 'getArchive error:' + err });
      return;
    }
    else if(archive.status == "uploaded"){//if vonage has archive data set yet 
      res.send({
        duration: archive.duration,
        url :s3URL
      });
    }
    else if (archive.status == "stopped"){
      res.status(202).send({arcStatus: "stopped", message: "process not complete."})
    }
    else if (archive.status == "available"){
      res.send({arcStatus: "available", message: "Archive not saved to s3. Saved in Vonage. Follow redirect", redirect: '/archive/:archiveId'})
    }
    else if (archive.status == "started"){
      //res.send()
    }
  });
});

/**
 * GET /archive
 */
router.get('/archive', function (req, res) {
  var options = {};
  if (req.query.count) {
    options.count = req.query.count;
  }
  if (req.query.offset) {
    options.offset = req.query.offset;
  }

  // list archives
  console.log('attempting to list archives');
  opentok.listArchives(options, function (err, archives) {
    if (err) {
      console.error('error in listArchives');
      console.error(err);
      res.status(500).send({ error: 'infoArchive error:' + err });
      return;
    }

    // extract as a JSON object
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', "Access-Control-Allow-Origin, Origin, X-Requested-With, Content-type, Accept, Vary");
    res.setHeader('Vary', 'Origin');
    //res.setHeader('Access-Control-Allow-Origin', 'https://pinmi-summer.netlify.app/');
    res.send(archives);
  });
});

debugger;
module.exports = router;
