# SummerPinMIServer


## Introduction to server
The basic server is based on [sample code](https://github.com/opentok/opentok-node/blob/main/sample/Archiving/README.md) provided by Vonage. The server is hosted using Heroku at the address https://pinmi-node-server.herokuapp.com/. The sample code also comes with some files that display a front end if you were to look at the given server URL in a browser. It uses Express to create server routes. You can learn more about Express routes [here](https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/routes). In short, each route is a function that is written to handle http requests to the routes associated URL. The current routes that the server serves are the following:

### Routes in routes/index.js
#### Built in Vonage routes:
* GET ‘/’
* GET ‘/Session’
* GET ‘/room/:name'
* POST '/archive/start'
* POST '/archive/:archiveId/stop'
* GET '/archive/:archiveId/view'
* GET  '/archive/:archiveId'
#### User entry/exit status tracking 
* POST '/enteredRoom/:userMode/:sessionID'
* POST '/exitedRoom/:userMode/:sessionID'
* GET '/isRoomEmpty/:sessionID'
#### Accessing media from s3 bucket 
* GET '/s3/:archiveId'

### How to access server routes:
Each of the routes listed above is connected to a function. To run that function on the server, you make an http request using the base url of the server, and the extension listed above (ex: "https://pinmi-node-server.herokuapp.com" + "/Session"). We are currently making HTTP requests from the client to the server by using the Fetch API. 

