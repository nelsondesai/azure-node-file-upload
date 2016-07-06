// server.js
var express = require('express'),
multipart = require('connect-multiparty'),
azure = require('azure-storage'),
fs = require('fs');
var multipartMiddleware = multipart();
var app = express();
var uuid = require('node-uuid');
var path = require('path');
var bodyParser = require('body-parser');
//config
var config = require('./config.json');

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use( bodyParser.json() ); 
app.use(bodyParser.urlencoded({ extended: true })); 
// public folder
app.use('/public', express.static('public'));

// config service
var STORAGE_KEY = config.STORAGE_KEY;
var STORAGE_ACCOUNT = config.STORAGE_ACCOUNT;
var STORAGE_URI = config.STORAGE_URI; 
var STORAGE_BLOB_NAME = config.STORAGE_BLOB_NAME; 
var blobSvc = azure.createBlobService(STORAGE_ACCOUNT, STORAGE_KEY);

// port 
var port = process.env.PORT || 1337;
app.listen(port);
console.log(port + ' is listening port');

// index page 
app.get('/', function(req, res) {
    res.render('pages/index');
});

// upload page
app.get('/upload', function(req, res) {
	res.render('pages/upload',{
	});
});

// list page 
app.get('/list', function(req, res, next) {    
	res.render('pages/list');	
});

// file upload action
app.post('/file-upload',multipartMiddleware, function(req, res) {    
   var file = req.files.uploadFile; 	
   uplFile(file, STORAGE_BLOB_NAME, function(result){       
       res.send(result);
   });   
   //resp.redirect('/');
});

// delete file
app.post('/delete-file', function(req, res) {
   blobName = req.body.id;
   if(blobName != '')
   {
        blobSvc.deleteBlob(STORAGE_BLOB_NAME, blobName, function(error, response){
            if(!error){
                // Blob has been deleted       
                res.json({"success": true});		
            }
            else{
                console.log(error);
            }
        });
    }
    else
    {
        res.json({"success": false});
    }
});

// delete all blob
app.get('/delete-container', function(req, res) {
    blobSvc.deleteContainer(STORAGE_BLOB_NAME, function(error, response){
        if(!error){
            res.redirect('/');
            // Container has been deleted                    
        }
        else {
            console.log(error);
        }			
    });
});

// get blob list json
app.post('/getBlobs', function(req, res) {
	getBlobsList(STORAGE_BLOB_NAME, function(result){
        var blobList = [];
		var metaTitle = '';
		var count = result.entries.length;
		var i = 0;
		result.entries.forEach(function(entry){
           blobSvc.getBlobProperties(STORAGE_BLOB_NAME, entry.name, function(error, result, response){
				if(!error){				
					if(result.metadata.name != null){	
						metaTitle = result.metadata.name; 						
					}
					else{ 
						metaTitle = entry.name;							
					}	
					blobList.push({name: metaTitle, Uri: STORAGE_URI+STORAGE_BLOB_NAME+'/'+entry.name});											
					i++;					
					if( i == count){		
						res.json(blobList);
					}
				}
				else {
					console.log(error);
				}				
			});						
        });			
    });
});

// create container
function createCont(name,callback){    
    blobSvc.createContainerIfNotExists(name, {publicAccessLevel : 'blob'}, function(error, result, response){
        if(!error){
		    console.log('Container created');
            callback();
        }
        else {
            console.log(error);
        }
    });
}

// upload file
function uplFile(file, containerName, callback){
    createCont(containerName, function(){
        var filePath = file.path;
        var originalName = file.originalFilename;
        var type = file.type;
        var customName = uuid.v4()+path.extname(originalName);
        //var size = file.byteCount - file.byteOffset;
		//var blobOptions = { title : originalName };        
         blobSvc.createBlockBlobFromLocalFile(containerName, customName, filePath, function(error, result, response){
            if(!error){
                // save original image name
				var metadata = 	{ name: originalName };								
				blobSvc.setBlobMetadata(containerName, customName, metadata, function(error, result, response){
                    if(!error){
                        callback(customName); 
                        console.log('File upload with metadata');                        
                    }
                    else {
                        console.log(error);
                    }					 
				});						
            }else {
                console.log(error);
            }
        });
    });  
}

// get blobs list
function getBlobsList(blobname, callback){	
    blobSvc.listBlobsSegmented(blobname, null, function(error, result, response){
        if(!error){
            callback(result);            
        }
        else {
            console.log(error);
        }
    });
}